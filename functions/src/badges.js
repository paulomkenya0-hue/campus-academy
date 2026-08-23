const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { db, admin } = require("./admin");
const { logAudit } = require("./auditLog");
const { createNotification } = require("./notifications");

function assertAdmin(request) {
  const role = request.auth && request.auth.token && request.auth.token.role;
  if (!request.auth || (role !== "super_admin" && role !== "developer")) {
    throw new HttpsError("permission-denied", "Huna ruhusa ya kufanya kitendo hiki.");
  }
}

const VALID_CRITERIA_TYPES = [
  "streak_days",        // { type: 'streak_days', days: 7 }
  "perfect_score",      // { type: 'perfect_score' } — 100% on any quiz
  "first_stage_complete", // { type: 'first_stage_complete' }
  "course_complete",     // { type: 'course_complete', courseId }
  "fast_quiz",           // { type: 'fast_quiz', underSeconds: 60 }
];

/** Admin creates a badge definition (spec section 20). */
const createBadge = onCall(async (request) => {
  assertAdmin(request);
  const { key, name, description, icon, criteria } = request.data || {};

  if (!key || !name || !criteria || !VALID_CRITERIA_TYPES.includes(criteria.type)) {
    throw new HttpsError(
      "invalid-argument",
      `key, name, na criteria.type sahihi vinahitajika (moja ya: ${VALID_CRITERIA_TYPES.join(", ")}).`
    );
  }

  const now = admin.firestore.FieldValue.serverTimestamp();
  await db.collection("badges").doc(key).set({
    key,
    name,
    description: description || "",
    icon: icon || "🏅",
    criteria,
    published: true,
    createdBy: request.auth.uid,
    createdAt: now,
    updatedAt: now,
  });

  await logAudit({ actorId: request.auth.uid, actorRole: "admin", action: "badge.created", targetType: "badge", targetId: key, details: { name } });
  return { key };
});

/**
 * Evaluates every published badge against the student's current state plus
 * the context of the quiz attempt just submitted, and awards any newly
 * earned ones. Called from quiz.js after a successful submission — never
 * exposed directly to the client (XP-adjacent, must stay server-authoritative).
 */
async function checkAndAwardBadges({ uid, courseId, stageId, percent, timeTakenSeconds, stageCompleted }) {
  const [badgesSnap, studentSnap, earnedSnap] = await Promise.all([
    db.collection("badges").where("published", "==", true).get(),
    db.collection("students").doc(uid).get(),
    db.collection("studentBadges").where("studentId", "==", uid).get(),
  ]);

  if (badgesSnap.empty) return [];

  const student = studentSnap.data();
  const earnedKeys = new Set(earnedSnap.docs.map((d) => d.data().badgeKey));
  const newlyAwarded = [];

  for (const badgeDoc of badgesSnap.docs) {
    const badge = badgeDoc.data();
    if (earnedKeys.has(badge.key)) continue;

    let eligible = false;
    switch (badge.criteria.type) {
      case "streak_days":
        eligible = (student.streak?.current || 0) >= badge.criteria.days;
        break;
      case "perfect_score":
        eligible = percent === 100;
        break;
      case "first_stage_complete":
        eligible = stageCompleted === true;
        break;
      case "fast_quiz":
        eligible = typeof timeTakenSeconds === "number" && timeTakenSeconds > 0 && timeTakenSeconds <= badge.criteria.underSeconds;
        break;
      case "course_complete":
        if (stageCompleted && badge.criteria.courseId === courseId) {
          eligible = await isCourseFullyComplete(uid, courseId);
        }
        break;
      default:
        eligible = false;
    }

    if (eligible) {
      await db.collection("studentBadges").add({
        studentId: uid,
        badgeKey: badge.key,
        earnedAt: admin.firestore.FieldValue.serverTimestamp(),
        context: { courseId: courseId || null, stageId: stageId || null },
      });
      await createNotification({
        studentId: uid,
        type: "badge",
        title: `${badge.icon} Umepata Beji Mpya!`,
        body: badge.name,
        data: { badgeKey: badge.key },
      });
      newlyAwarded.push(badge.key);
    }
  }

  return newlyAwarded;
}

async function isCourseFullyComplete(uid, courseId) {
  const stagesSnap = await db.collection("courses").doc(courseId).collection("stages")
    .where("published", "==", true).get();
  if (stagesSnap.empty) return false;

  const studentSnap = await db.collection("students").doc(uid).get();
  const unlockedStages = studentSnap.data().unlockedStages || {};

  return stagesSnap.docs.every((s) => unlockedStages[`${courseId}_${s.id}_completed`] === true);
}

module.exports = { createBadge, checkAndAwardBadges };
