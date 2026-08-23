const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { db, admin } = require("./admin");
const { getGamificationConfig } = require("./config");
const { logAudit } = require("./auditLog");
const { createNotification } = require("./notifications");

function assertAdmin(request) {
  const role = request.auth && request.auth.token && request.auth.token.role;
  if (!request.auth || (role !== "super_admin" && role !== "developer")) {
    throw new HttpsError("permission-denied", "Huna ruhusa ya kufanya kitendo hiki.");
  }
}

/** Admin creates a competition tied to a course (spec section 24). */
const createCompetition = onCall(async (request) => {
  assertAdmin(request);
  const { courseId, title, scoringWeights, topN } = request.data || {};
  if (!courseId || !title) throw new HttpsError("invalid-argument", "courseId na title vinahitajika.");

  const config = await getGamificationConfig();
  const now = admin.firestore.FieldValue.serverTimestamp();

  const ref = await db.collection("competitions").add({
    courseId,
    title: title.trim(),
    scoringWeights: scoringWeights || config.competition.scoringWeights,
    topN: topN || config.competition.topN,
    status: "open", // open -> qualified -> final_in_progress -> completed
    createdBy: request.auth.uid,
    createdAt: now,
    updatedAt: now,
  });

  await logAudit({ actorId: request.auth.uid, actorRole: "admin", action: "competition.created", targetType: "competition", targetId: ref.id, details: { courseId, title } });
  return { competitionId: ref.id };
});

/**
 * Computes each active student's weighted qualification score for the
 * competition's course (quizzes % + labs % + final assessment %, weighted
 * per spec section 24), ranks them, and marks the top N as qualified.
 * Re-runnable — always recomputes from current data.
 */
const runQualification = onCall(async (request) => {
  assertAdmin(request);
  const { competitionId } = request.data || {};
  if (!competitionId) throw new HttpsError("invalid-argument", "competitionId inahitajika.");

  const compSnap = await db.collection("competitions").doc(competitionId).get();
  if (!compSnap.exists) throw new HttpsError("not-found", "Mashindano hayajapatikana.");
  const comp = compSnap.data();
  const { courseId, scoringWeights } = comp;

  const [attemptsSnap, labsSnap, labAttemptsSnap, studentsSnap, finalAssessmentSnap] = await Promise.all([
    db.collection("quizAttempts").where("courseId", "==", courseId).get(),
    db.collection("labs").where("courseId", "==", courseId).where("published", "==", true).get(),
    db.collection("labAttempts").where("courseId", "==", courseId).where("solved", "==", true).get(),
    db.collection("students").where("status", "==", "active").get(),
    db.collection("quizAttempts").where("courseId", "==", courseId).where("isFinalAssessment", "==", true).get(),
  ]);

  // Aggregate per-student quiz average.
  const quizByStudent = {};
  attemptsSnap.forEach((doc) => {
    const a = doc.data();
    if (!quizByStudent[a.studentId]) quizByStudent[a.studentId] = { sum: 0, count: 0 };
    quizByStudent[a.studentId].sum += a.percent || 0;
    quizByStudent[a.studentId].count += 1;
  });

  const totalLabs = labsSnap.size;
  const labsSolvedByStudent = {};
  labAttemptsSnap.forEach((doc) => {
    const a = doc.data();
    labsSolvedByStudent[a.studentId] = (labsSolvedByStudent[a.studentId] || 0) + 1;
  });

  const finalByStudent = {};
  finalAssessmentSnap.forEach((doc) => {
    const a = doc.data();
    // Keep the best final assessment attempt if a student has more than one.
    if (!finalByStudent[a.studentId] || a.percent > finalByStudent[a.studentId]) {
      finalByStudent[a.studentId] = a.percent || 0;
    }
  });

  const scored = [];
  studentsSnap.forEach((doc) => {
    const uid = doc.id;
    const quizPct = quizByStudent[uid] ? quizByStudent[uid].sum / quizByStudent[uid].count : 0;
    const labsPct = totalLabs > 0 ? ((labsSolvedByStudent[uid] || 0) / totalLabs) * 100 : 0;
    const finalPct = finalByStudent[uid] || 0;

    const weighted =
      quizPct * scoringWeights.quizzes + labsPct * scoringWeights.labs + finalPct * scoringWeights.finalAssessment;

    // Only rank students who have at least attempted something in this course.
    if (quizByStudent[uid] || labsSolvedByStudent[uid] || finalByStudent[uid]) {
      scored.push({ studentId: uid, displayName: doc.data().displayName, quizPct, labsPct, finalPct, weighted });
    }
  });

  scored.sort((a, b) => b.weighted - a.weighted);
  const qualified = scored.slice(0, comp.topN);

  const batch = db.batch();
  const now = admin.firestore.FieldValue.serverTimestamp();

  // Clear previous qualification results for this competition before writing fresh ones.
  const existing = await db.collection("competitionParticipants").where("competitionId", "==", competitionId).get();
  existing.forEach((doc) => batch.delete(doc.ref));

  qualified.forEach((s, i) => {
    const ref = db.collection("competitionParticipants").doc(`${competitionId}_${s.studentId}`);
    batch.set(ref, {
      competitionId,
      studentId: s.studentId,
      displayName: s.displayName,
      qualifyingRank: i + 1,
      qualifyingScore: Math.round(s.weighted * 100) / 100,
      breakdown: { quizPct: Math.round(s.quizPct), labsPct: Math.round(s.labsPct), finalPct: Math.round(s.finalPct) },
      createdAt: now,
    });
  });

  batch.update(db.collection("competitions").doc(competitionId), { status: "qualified", updatedAt: now });
  await batch.commit();

  for (const s of qualified) {
    await createNotification({
      studentId: s.studentId,
      type: "competition_qualified",
      title: "🏅 Umefuzu kwa Mashindano ya Mwisho!",
      body: `${comp.title} — nafasi #${qualified.indexOf(s) + 1}`,
      data: { competitionId },
    });
  }

  await logAudit({ actorId: request.auth.uid, actorRole: "admin", action: "competition.qualification_run", targetType: "competition", targetId: competitionId, details: { qualifiedCount: qualified.length } });

  return { qualified: qualified.map((s, i) => ({ rank: i + 1, studentId: s.studentId, displayName: s.displayName, score: Math.round(s.weighted * 100) / 100 })) };
});

/** Admin manually enters a qualified participant's score for one round. */
const submitRoundScore = onCall(async (request) => {
  assertAdmin(request);
  const { competitionId, studentId, roundNumber, roundTitle, score } = request.data || {};
  if (!competitionId || !studentId || !roundNumber || typeof score !== "number") {
    throw new HttpsError("invalid-argument", "competitionId, studentId, roundNumber na score vinahitajika.");
  }

  const participantRef = db.collection("competitionParticipants").doc(`${competitionId}_${studentId}`);
  const participantSnap = await participantRef.get();
  if (!participantSnap.exists) throw new HttpsError("not-found", "Mwanafunzi hakufuzu kwenye mashindano haya.");

  await participantRef.set(
    { rounds: { [`round${roundNumber}`]: { title: roundTitle || `Round ${roundNumber}`, score } } },
    { merge: true }
  );

  await logAudit({ actorId: request.auth.uid, actorRole: "admin", action: "competition.round_score_submitted", targetType: "competitionParticipant", targetId: `${competitionId}_${studentId}`, details: { roundNumber, score } });
  return { ok: true };
});

/**
 * Admin publishes final results after reviewing all round scores (spec
 * section 25 — manual review before publishing). Sums all round scores,
 * ranks participants, and writes final placements.
 */
const publishFinalResults = onCall(async (request) => {
  assertAdmin(request);
  const { competitionId } = request.data || {};
  if (!competitionId) throw new HttpsError("invalid-argument", "competitionId inahitajika.");

  const participantsSnap = await db.collection("competitionParticipants").where("competitionId", "==", competitionId).get();
  if (participantsSnap.empty) throw new HttpsError("failed-precondition", "Hakuna washiriki waliofuzu.");

  const results = participantsSnap.docs.map((doc) => {
    const p = doc.data();
    const roundTotal = Object.values(p.rounds || {}).reduce((sum, r) => sum + (r.score || 0), 0);
    return { studentId: p.studentId, displayName: p.displayName, roundTotal, docId: doc.id };
  });

  results.sort((a, b) => b.roundTotal - a.roundTotal);

  const medals = ["🥇", "🥈", "🥉"];
  const now = admin.firestore.FieldValue.serverTimestamp();
  const batch = db.batch();

  results.forEach((r, i) => {
    const place = i + 1;
    const resultRef = db.collection("competitionResults").doc(`${competitionId}_${r.studentId}`);
    batch.set(resultRef, {
      competitionId,
      studentId: r.studentId,
      displayName: r.displayName,
      place,
      medal: medals[i] || null,
      totalScore: r.roundTotal,
      publishedAt: now,
    });
  });

  batch.update(db.collection("competitions").doc(competitionId), { status: "completed", updatedAt: now });
  await batch.commit();

  for (const r of results) {
    await createNotification({
      studentId: r.studentId,
      type: "competition_result",
      title: `${medals[results.indexOf(r)] || "🏅"} Matokeo ya Mashindano`,
      body: `Umeshika nafasi ya #${results.indexOf(r) + 1}`,
      data: { competitionId },
    });
  }

  await logAudit({ actorId: request.auth.uid, actorRole: "admin", action: "competition.results_published", targetType: "competition", targetId: competitionId, details: { participantCount: results.length } });

  return { results: results.map((r, i) => ({ place: i + 1, studentId: r.studentId, displayName: r.displayName, totalScore: r.roundTotal })) };
});

module.exports = { createCompetition, runQualification, submitRoundScore, publishFinalResults };
