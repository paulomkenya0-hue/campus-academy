const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { db, admin } = require("./admin");
const { getGamificationConfig, levelForXp } = require("./config");
const { logAudit } = require("./auditLog");
const { createNotification } = require("./notifications");
const { checkAndAwardBadges } = require("./badges");

function assertStudent(request) {
  const role = request.auth && request.auth.token && request.auth.token.role;
  if (!request.auth || role !== "student") {
    throw new HttpsError("permission-denied", "Huna ruhusa ya kufanya kitendo hiki.");
  }
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Returns a quiz for a topic WITHOUT correct answers or explanations — those
 * live server-side only. Questions and answer order are randomized.
 * Input: { courseId, stageId, topicId, count? }
 */
const getQuizQuestions = onCall(async (request) => {
  assertStudent(request);
  const { courseId, stageId, topicId, count = 10 } = request.data || {};
  if (!courseId || !stageId || !topicId) {
    throw new HttpsError("invalid-argument", "courseId, stageId na topicId vinahitajika.");
  }

  const questionsRef = db
    .collection("courses").doc(courseId)
    .collection("stages").doc(stageId)
    .collection("topics").doc(topicId)
    .collection("questions")
    .where("status", "==", "published");

  const snap = await questionsRef.get();
  if (snap.empty) {
    throw new HttpsError("not-found", "Hakuna maswali yaliyopatikana kwa mada hii.");
  }

  const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const picked = shuffle(all).slice(0, Math.min(count, all.length));

  const quiz = picked.map((q) => ({
    id: q.id,
    text: q.text,
    choices: shuffle([
      { key: "A", text: q.answerA },
      { key: "B", text: q.answerB },
      { key: "C", text: q.answerC },
      { key: "D", text: q.answerD },
    ]),
    // correctAnswer / explanation intentionally omitted
  }));

  return { quiz };
});

/**
 * Scores a quiz attempt server-side, awards XP, updates streak/level/progress,
 * and unlocks the next stage when eligible. Client sends only the student's
 * chosen answers — never a score or XP value (those are never trusted from
 * the frontend, per spec section 32).
 * Input: { courseId, stageId, topicId, answers: { [questionId]: "A"|"B"|"C"|"D" }, timeTakenSeconds }
 */
const submitQuizAttempt = onCall(async (request) => {
  assertStudent(request);
  const uid = request.auth.uid;
  const { courseId, stageId, topicId, answers, timeTakenSeconds } = request.data || {};

  if (!courseId || !stageId || !topicId || !answers || typeof answers !== "object") {
    throw new HttpsError("invalid-argument", "Taarifa za jaribio hazitoshi.");
  }

  const config = await getGamificationConfig();

  const topicPath = db
    .collection("courses").doc(courseId)
    .collection("stages").doc(stageId)
    .collection("topics").doc(topicId);

  const topicSnap = await topicPath.get();
  const isFinalAssessment = topicSnap.exists ? !!topicSnap.data().isFinalAssessment : false;

  // --- attempt limit check ---
  const priorAttempts = await db
    .collection("quizAttempts")
    .where("studentId", "==", uid)
    .where("topicId", "==", topicId)
    .get();

  if (priorAttempts.size >= config.quiz.maxAttempts) {
    throw new HttpsError(
      "resource-exhausted",
      `Umefikia kikomo cha majaribio (${config.quiz.maxAttempts}) kwa mada hii.`
    );
  }

  // --- fetch correct answers server-side only ---
  const questionIds = Object.keys(answers);
  if (questionIds.length === 0) {
    throw new HttpsError("invalid-argument", "Hujajibu swali lolote.");
  }

  const questionDocs = await Promise.all(
    questionIds.map((qid) => topicPath.collection("questions").doc(qid).get())
  );

  let correctCount = 0;
  const breakdown = [];

  questionDocs.forEach((docSnap) => {
    if (!docSnap.exists) return;
    const q = docSnap.data();
    const studentAnswer = answers[docSnap.id];
    const isCorrect = studentAnswer === q.correctAnswer;
    if (isCorrect) correctCount++;
    breakdown.push({
      questionId: docSnap.id,
      studentAnswer: studentAnswer || null,
      correctAnswer: q.correctAnswer,
      isCorrect,
      explanation: q.explanation || null,
    });
  });

  const total = questionDocs.filter((d) => d.exists).length;
  const percent = total > 0 ? Math.round((correctCount / total) * 100) : 0;
  const passed = percent >= config.quiz.passingScorePercent;

  // --- XP calculation (server-authoritative) ---
  let xpAwarded = 0;
  if (passed) {
    xpAwarded += config.xp.completeQuiz;
    if (percent === 100) xpAwarded += config.xp.perfectScoreBonus;
  }

  const now = admin.firestore.FieldValue.serverTimestamp();
  const batch = db.batch();

  // quizAttempts record
  const attemptRef = db.collection("quizAttempts").doc();
  batch.set(attemptRef, {
    studentId: uid,
    courseId,
    stageId,
    topicId,
    answers,
    breakdown,
    correctCount,
    total,
    percent,
    passed,
    xpAwarded,
    timeTakenSeconds: timeTakenSeconds || null,
    isFinalAssessment,
    createdAt: now,
  });

  // progress record: courseId_stageId_topicId keyed by student
  const progressRef = db.collection("progress").doc(`${uid}_${courseId}_${stageId}`);
  const progressSnap = await progressRef.get();
  const existingTopics = progressSnap.exists ? progressSnap.data().completedTopics || {} : {};
  const wasAlreadyPassed = existingTopics[topicId] === true;

  batch.set(
    progressRef,
    {
      studentId: uid,
      courseId,
      stageId,
      completedTopics: { ...existingTopics, [topicId]: passed || wasAlreadyPassed },
      updatedAt: now,
    },
    { merge: true }
  );

  // --- student doc: XP, level, streak ---
  const studentRef = db.collection("students").doc(uid);
  const studentSnap = await studentRef.get();
  const student = studentSnap.data();

  const newXp = (student.xp || 0) + xpAwarded;
  const newLevel = levelForXp(newXp, config.levels);

  const { streak, dailyXp } = computeStreak(student.streak, config, xpAwarded > 0);

  batch.update(studentRef, {
    xp: newXp,
    level: newLevel,
    streak,
    updatedAt: now,
  });

  if (xpAwarded > 0) {
    const txRef = db.collection("xpTransactions").doc();
    batch.set(txRef, {
      studentId: uid,
      amount: xpAwarded,
      reason: "quiz_completed",
      topicId,
      courseId,
      stageId,
      createdAt: now,
    });
  }
  if (dailyXp > 0) {
    const dailyTxRef = db.collection("xpTransactions").doc();
    batch.set(dailyTxRef, {
      studentId: uid,
      amount: dailyXp,
      reason: "daily_activity",
      createdAt: now,
    });
  }

  await batch.commit();

  // --- stage completion / next-stage unlock (checked after commit, best-effort) ---
  let stageCompleted = false;
  let nextStageUnlocked = null;
  if (passed) {
    const result = await maybeCompleteStageAndUnlockNext({
      uid,
      courseId,
      stageId,
      config,
    });
    stageCompleted = result.stageCompleted;
    nextStageUnlocked = result.nextStageUnlocked;

    if (stageCompleted) {
      await createNotification({
        studentId: uid,
        type: "stage_unlocked",
        title: "🎉 Umekamilisha Stage!",
        body: nextStageUnlocked ? "Stage inayofuata sasa imefunguliwa." : "Umekamilisha stage ya mwisho ya kozi hii!",
        data: { courseId, stageId, nextStageUnlocked },
      });
    }
  }

  // Badge evaluation happens after XP/streak/stage state is fully settled,
  // so criteria like streak_days or course_complete see up-to-date data.
  const newBadges = await checkAndAwardBadges({
    uid, courseId, stageId, percent, timeTakenSeconds, stageCompleted,
  });

  await logAudit({
    actorId: uid,
    actorRole: "student",
    action: "quiz.submitted",
    targetType: "topic",
    targetId: topicId,
    details: { percent, passed, xpAwarded },
  });

  return {
    correctCount,
    total,
    percent,
    passed,
    xpAwarded: xpAwarded + dailyXp,
    breakdown,
    newXp,
    newLevel,
    stageCompleted,
    nextStageUnlocked,
    newBadges,
  };
});

function computeStreak(currentStreak, config, hadQualifyingActivity) {
  const streak = currentStreak || { current: 0, longest: 0, lastActiveDate: null };
  if (!hadQualifyingActivity) return { streak, dailyXp: 0 };

  const today = new Intl.DateTimeFormat("en-CA", { timeZone: config.streak.timezone }).format(
    new Date()
  ); // YYYY-MM-DD in platform timezone, avoids the timezone bugs the spec warns about

  if (streak.lastActiveDate === today) {
    // Already counted today — no double XP, no streak change.
    return { streak, dailyXp: 0 };
  }

  const yesterday = new Intl.DateTimeFormat("en-CA", { timeZone: config.streak.timezone }).format(
    new Date(Date.now() - 24 * 60 * 60 * 1000)
  );

  const newCurrent = streak.lastActiveDate === yesterday ? streak.current + 1 : 1;
  const newLongest = Math.max(streak.longest || 0, newCurrent);

  return {
    streak: { current: newCurrent, longest: newLongest, lastActiveDate: today },
    dailyXp: config.xp.dailyActivity,
  };
}

async function maybeCompleteStageAndUnlockNext({ uid, courseId, stageId, config }) {
  const stageRef = db.collection("courses").doc(courseId).collection("stages").doc(stageId);
  const [stageSnap, topicsSnap] = await Promise.all([
    stageRef.get(),
    stageRef.collection("topics").where("status", "==", "published").get(),
  ]);
  if (!stageSnap.exists || topicsSnap.empty) return { stageCompleted: false, nextStageUnlocked: null };

  const progressRef = db.collection("progress").doc(`${uid}_${courseId}_${stageId}`);
  const progressSnap = await progressRef.get();
  const completedTopics = progressSnap.exists ? progressSnap.data().completedTopics || {} : {};

  const allTopicIds = topicsSnap.docs.map((d) => d.id);
  const allDone = allTopicIds.every((tid) => completedTopics[tid]);
  if (!allDone) return { stageCompleted: false, nextStageUnlocked: null };

  const studentRef = db.collection("students").doc(uid);
  const studentSnap = await studentRef.get();
  const unlockedStages = studentSnap.data().unlockedStages || {};

  if (unlockedStages[`${courseId}_${stageId}_completed`]) {
    return { stageCompleted: true, nextStageUnlocked: null }; // already processed
  }

  const now = admin.firestore.FieldValue.serverTimestamp();
  const currentXp = studentSnap.data().xp || 0;
  const stageBonusXp = config.xp.completeStage;
  const newXp = currentXp + stageBonusXp;
  const newLevel = levelForXp(newXp, config.levels);

  // Find next stage by `order` field to unlock it.
  const stageData = stageSnap.data();
  const nextStageQuery = await db
    .collection("courses").doc(courseId)
    .collection("stages")
    .where("order", "==", (stageData.order || 0) + 1)
    .limit(1)
    .get();

  const updates = {
    [`unlockedStages.${courseId}_${stageId}_completed`]: true,
    xp: newXp,
    level: newLevel,
    updatedAt: now,
  };

  let nextStageUnlocked = null;
  if (!nextStageQuery.empty) {
    const nextStage = nextStageQuery.docs[0];
    updates[`unlockedStages.${courseId}_${nextStage.id}`] = true;
    nextStageUnlocked = nextStage.id;
  }

  await studentRef.update(updates);
  await db.collection("xpTransactions").add({
    studentId: uid,
    amount: stageBonusXp,
    reason: "stage_completed",
    courseId,
    stageId,
    createdAt: now,
  });

  return { stageCompleted: true, nextStageUnlocked };
}

module.exports = { getQuizQuestions, submitQuizAttempt };
