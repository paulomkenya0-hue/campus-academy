const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { db, admin } = require("./admin");

function assertStudent(request) {
  const role = request.auth && request.auth.token && request.auth.token.role;
  if (!request.auth || role !== "student") {
    throw new HttpsError("permission-denied", "Huna ruhusa ya kufanya kitendo hiki.");
  }
}

/**
 * Records a suspicious event during an assessment-mode quiz (tab switch,
 * left fullscreen, blurred window, etc — spec section 16). This never
 * blocks the student itself; it just leaves a record for Admin review.
 * The client decides when to warn/auto-submit based on violation count.
 */
const logSuspiciousEvent = onCall(async (request) => {
  assertStudent(request);
  const { courseId, stageId, topicId, type } = request.data || {};
  if (!courseId || !stageId || !topicId || !type) {
    throw new HttpsError("invalid-argument", "courseId, stageId, topicId na type vinahitajika.");
  }

  const validTypes = ["tab_switch", "window_blur", "fullscreen_exit", "copy_attempt", "right_click"];
  if (!validTypes.includes(type)) {
    throw new HttpsError("invalid-argument", `type lazima iwe mojawapo ya: ${validTypes.join(", ")}`);
  }

  await db.collection("suspiciousEvents").add({
    studentId: request.auth.uid,
    courseId,
    stageId,
    topicId,
    type,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Return the running count for this student+topic so the client can decide
  // whether to show a warning or auto-submit (server is the source of truth,
  // so a student can't reset their own violation count by refreshing).
  const countSnap = await db
    .collection("suspiciousEvents")
    .where("studentId", "==", request.auth.uid)
    .where("topicId", "==", topicId)
    .get();

  return { violationCount: countSnap.size };
});

module.exports = { logSuspiciousEvent };
