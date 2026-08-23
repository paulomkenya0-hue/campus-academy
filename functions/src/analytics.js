const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { db } = require("./admin");

function assertAdmin(request) {
  const role = request.auth && request.auth.token && request.auth.token.role;
  if (!request.auth || (role !== "super_admin" && role !== "developer")) {
    throw new HttpsError("permission-denied", "Huna ruhusa ya kufanya kitendo hiki.");
  }
}

/**
 * Computes per-course analytics on demand: enrollment proxy, completion rate,
 * average quiz score, and per-topic performance breakdown. Kept as a callable
 * (rather than a live Firestore query) because it aggregates across many
 * quizAttempts docs — cheap at MVP scale, and easy to move to a scheduled
 * pre-aggregation job later if the student count grows.
 */
const getCourseAnalytics = onCall(async (request) => {
  assertAdmin(request);
  const { courseId } = request.data || {};
  if (!courseId) throw new HttpsError("invalid-argument", "courseId inahitajika.");

  const [attemptsSnap, stagesSnap, activeStudentsSnap] = await Promise.all([
    db.collection("quizAttempts").where("courseId", "==", courseId).get(),
    db.collection("courses").doc(courseId).collection("stages").where("published", "==", true).get(),
    db.collection("students").where("status", "==", "active").get(),
  ]);

  const totalAttempts = attemptsSnap.size;
  let totalPercent = 0;
  const topicStats = {}; // topicId -> { attempts, passed, totalPercent }

  attemptsSnap.forEach((doc) => {
    const a = doc.data();
    totalPercent += a.percent || 0;
    if (!topicStats[a.topicId]) topicStats[a.topicId] = { attempts: 0, passed: 0, totalPercent: 0 };
    topicStats[a.topicId].attempts += 1;
    topicStats[a.topicId].totalPercent += a.percent || 0;
    if (a.passed) topicStats[a.topicId].passed += 1;
  });

  const avgScore = totalAttempts > 0 ? Math.round(totalPercent / totalAttempts) : 0;

  const lastStageId = stagesSnap.docs
    .sort((a, b) => (a.data().order || 0) - (b.data().order || 0))
    .slice(-1)[0]?.id;

  let completedCount = 0;
  if (lastStageId) {
    activeStudentsSnap.forEach((doc) => {
      const unlocked = doc.data().unlockedStages || {};
      if (unlocked[`${courseId}_${lastStageId}_completed`]) completedCount += 1;
    });
  }

  const topicBreakdown = Object.entries(topicStats).map(([topicId, s]) => ({
    topicId,
    attempts: s.attempts,
    passRate: s.attempts > 0 ? Math.round((s.passed / s.attempts) * 100) : 0,
    avgScore: s.attempts > 0 ? Math.round(s.totalPercent / s.attempts) : 0,
  }));

  return {
    totalAttempts,
    avgScore,
    completedCount,
    activeStudentCount: activeStudentsSnap.size,
    topicBreakdown,
  };
});

module.exports = { getCourseAnalytics };
