const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { db, admin } = require("./admin");
const { logAudit } = require("./auditLog");

function assertAdmin(request) {
  const role = request.auth && request.auth.token && request.auth.token.role;
  if (!request.auth || (role !== "super_admin" && role !== "developer")) {
    throw new HttpsError("permission-denied", "Huna ruhusa ya kufanya kitendo hiki.");
  }
}

const createCourse = onCall(async (request) => {
  assertAdmin(request);
  const { title, description } = request.data || {};
  if (!title || !title.trim()) throw new HttpsError("invalid-argument", "Jina la kozi linahitajika.");

  const now = admin.firestore.FieldValue.serverTimestamp();
  const ref = await db.collection("courses").add({
    title: title.trim(),
    description: description || "",
    published: false,
    status: "draft",
    createdBy: request.auth.uid,
    createdAt: now,
    updatedAt: now,
  });

  await logAudit({ actorId: request.auth.uid, actorRole: "admin", action: "course.created", targetType: "course", targetId: ref.id, details: { title } });
  return { courseId: ref.id };
});

const createStage = onCall(async (request) => {
  assertAdmin(request);
  const { courseId, title, description, order, unlockRule } = request.data || {};
  if (!courseId || !title || typeof order !== "number") {
    throw new HttpsError("invalid-argument", "courseId, title na order (namba) vinahitajika.");
  }

  const now = admin.firestore.FieldValue.serverTimestamp();
  const ref = await db.collection("courses").doc(courseId).collection("stages").add({
    title: title.trim(),
    description: description || "",
    order,
    // unlockRule: e.g. { type: "previous_stage_completed" } — default; admin can extend later
    unlockRule: unlockRule || { type: "previous_stage_completed" },
    published: false,
    status: "draft",
    createdAt: now,
    updatedAt: now,
  });

  await logAudit({ actorId: request.auth.uid, actorRole: "admin", action: "stage.created", targetType: "stage", targetId: ref.id, details: { courseId, title, order } });
  return { stageId: ref.id };
});

const createTopic = onCall(async (request) => {
  assertAdmin(request);
  const { courseId, stageId, title, content, order } = request.data || {};
  if (!courseId || !stageId || !title || !content) {
    throw new HttpsError("invalid-argument", "courseId, stageId, title na content vinahitajika.");
  }

  const now = admin.firestore.FieldValue.serverTimestamp();
  const ref = await db
    .collection("courses").doc(courseId)
    .collection("stages").doc(stageId)
    .collection("topics").add({
      title: title.trim(),
      content, // rich text / markdown lesson body, Kiswahili-first
      order: order || 0,
      published: false,
      status: "draft",
      createdAt: now,
      updatedAt: now,
    });

  await logAudit({ actorId: request.auth.uid, actorRole: "admin", action: "topic.created", targetType: "topic", targetId: ref.id, details: { courseId, stageId, title } });
  return { topicId: ref.id };
});

const createQuestion = onCall(async (request) => {
  assertAdmin(request);
  const {
    courseId, stageId, topicId,
    text, answerA, answerB, answerC, answerD,
    correctAnswer, explanation, difficulty, xpReward,
  } = request.data || {};

  if (!courseId || !stageId || !topicId || !text || !answerA || !answerB || !answerC || !answerD) {
    throw new HttpsError("invalid-argument", "Sehemu zote za swali zinahitajika.");
  }
  if (!["A", "B", "C", "D"].includes(correctAnswer)) {
    throw new HttpsError("invalid-argument", "correctAnswer lazima iwe A, B, C, au D.");
  }

  const now = admin.firestore.FieldValue.serverTimestamp();
  const ref = await db
    .collection("courses").doc(courseId)
    .collection("stages").doc(stageId)
    .collection("topics").doc(topicId)
    .collection("questions").add({
      text: text.trim(),
      answerA, answerB, answerC, answerD,
      correctAnswer,
      explanation: explanation || "",
      difficulty: difficulty || "medium",
      xpReward: typeof xpReward === "number" ? xpReward : null,
      status: "draft",
      createdBy: request.auth.uid,
      createdAt: now,
      updatedAt: now,
    });

  await logAudit({ actorId: request.auth.uid, actorRole: "admin", action: "question.created", targetType: "question", targetId: ref.id, details: { courseId, stageId, topicId } });
  return { questionId: ref.id };
});

/** Generic publish/unpublish toggle for course, stage, topic, or question. */
const setPublishStatus = onCall(async (request) => {
  assertAdmin(request);
  const { path, published } = request.data || {};
  // path example: "courses/abc" or "courses/abc/stages/def/topics/ghi"
  if (!path || typeof published !== "boolean") {
    throw new HttpsError("invalid-argument", "path na published (boolean) vinahitajika.");
  }

  const segments = path.split("/").filter(Boolean);
  if (segments.length % 2 !== 0) {
    throw new HttpsError("invalid-argument", "path si sahihi.");
  }

  const status = published ? "published" : "draft";
  await db.doc(path).update({
    published,
    status,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await logAudit({ actorId: request.auth.uid, actorRole: "admin", action: published ? "content.published" : "content.unpublished", targetType: segments[segments.length - 2], targetId: segments[segments.length - 1], details: { path } });
  return { ok: true };
});

/** Marks (or unmarks) a topic's quiz as the course's Final Assessment,
 * used by the competition qualification scoring (spec section 24). */
const setTopicFinalAssessment = onCall(async (request) => {
  assertAdmin(request);
  const { courseId, stageId, topicId, isFinalAssessment } = request.data || {};
  if (!courseId || !stageId || !topicId || typeof isFinalAssessment !== "boolean") {
    throw new HttpsError("invalid-argument", "courseId, stageId, topicId na isFinalAssessment vinahitajika.");
  }
  await db.collection("courses").doc(courseId).collection("stages").doc(stageId)
    .collection("topics").doc(topicId)
    .update({ isFinalAssessment, updatedAt: admin.firestore.FieldValue.serverTimestamp() });

  await logAudit({ actorId: request.auth.uid, actorRole: "admin", action: "topic.final_assessment_flag_set", targetType: "topic", targetId: topicId, details: { isFinalAssessment } });
  return { ok: true };
});

/** Toggles assessment-mode restrictions (timer, tab-switch detection, no back-nav warning) for a topic's quiz. */
const setTopicAssessmentMode = onCall(async (request) => {
  assertAdmin(request);
  const { courseId, stageId, topicId, assessmentMode, timeLimitSeconds } = request.data || {};
  if (!courseId || !stageId || !topicId || typeof assessmentMode !== "boolean") {
    throw new HttpsError("invalid-argument", "courseId, stageId, topicId na assessmentMode vinahitajika.");
  }
  await db.collection("courses").doc(courseId).collection("stages").doc(stageId)
    .collection("topics").doc(topicId)
    .update({
      assessmentMode,
      timeLimitSeconds: typeof timeLimitSeconds === "number" ? timeLimitSeconds : null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

  await logAudit({ actorId: request.auth.uid, actorRole: "admin", action: "topic.assessment_mode_set", targetType: "topic", targetId: topicId, details: { assessmentMode, timeLimitSeconds } });
  return { ok: true };
});

module.exports = { createCourse, createStage, createTopic, createQuestion, setPublishStatus, setTopicFinalAssessment, setTopicAssessmentMode };
