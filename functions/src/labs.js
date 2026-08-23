const crypto = require("crypto");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { db, admin } = require("./admin");
const { getGamificationConfig } = require("./config");
const { logAudit } = require("./auditLog");
const { createNotification } = require("./notifications");
const { checkAndAwardBadges } = require("./badges");

function assertAdmin(request) {
  const role = request.auth && request.auth.token && request.auth.token.role;
  if (!request.auth || (role !== "super_admin" && role !== "developer")) {
    throw new HttpsError("permission-denied", "Huna ruhusa ya kufanya kitendo hiki.");
  }
}
function assertStudent(request) {
  const role = request.auth && request.auth.token && request.auth.token.role;
  if (!request.auth || role !== "student") {
    throw new HttpsError("permission-denied", "Huna ruhusa ya kufanya kitendo hiki.");
  }
}

function hashFlag(flag, salt) {
  return crypto.createHash("sha256").update(`${salt}:${flag.trim()}`).digest("hex");
}

/**
 * Admin creates a lab. The flag is hashed (salted SHA-256) before storage —
 * never stored or logged in plaintext, so it can't leak via a Firestore
 * export, an admin console browse, or an audit log entry (spec section 26/32).
 */
const createLab = onCall(async (request) => {
  assertAdmin(request);
  const { courseId, title, description, instructions, flag, xpReward, difficulty } = request.data || {};

  if (!courseId || !title || !instructions || !flag) {
    throw new HttpsError("invalid-argument", "courseId, title, instructions na flag vinahitajika.");
  }

  const salt = crypto.randomBytes(16).toString("hex");
  const flagHash = hashFlag(flag, salt);
  const now = admin.firestore.FieldValue.serverTimestamp();

  const ref = await db.collection("labs").add({
    courseId,
    title: title.trim(),
    description: description || "",
    instructions, // e.g. "Pata flag iliyofichwa kwenye mazingira ya mafunzo yaliyotolewa."
    flagHash,
    salt,
    xpReward: typeof xpReward === "number" ? xpReward : null, // null = use config default
    difficulty: difficulty || "medium",
    published: false,
    createdBy: request.auth.uid,
    createdAt: now,
    updatedAt: now,
  });

  await logAudit({ actorId: request.auth.uid, actorRole: "admin", action: "lab.created", targetType: "lab", targetId: ref.id, details: { courseId, title } });
  return { labId: ref.id };
});

const setLabPublished = onCall(async (request) => {
  assertAdmin(request);
  const { labId, published } = request.data || {};
  if (!labId || typeof published !== "boolean") throw new HttpsError("invalid-argument", "labId na published vinahitajika.");
  await db.collection("labs").doc(labId).update({ published, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
  return { ok: true };
});

/**
 * Student submits a flag guess. Never trust a client-computed "correct" —
 * the server hashes the submission with the lab's stored salt and compares.
 * Repeated wrong guesses are logged (count only, never the guesses
 * themselves) so admins can spot brute-forcing.
 */
const submitLabFlag = onCall(async (request) => {
  assertStudent(request);
  const uid = request.auth.uid;
  const { labId, flag } = request.data || {};
  if (!labId || !flag) throw new HttpsError("invalid-argument", "labId na flag vinahitajika.");

  const labSnap = await db.collection("labs").doc(labId).get();
  if (!labSnap.exists || !labSnap.data().published) {
    throw new HttpsError("not-found", "Lab haijapatikana.");
  }
  const lab = labSnap.data();

  const attemptId = `${uid}_${labId}`;
  const attemptRef = db.collection("labAttempts").doc(attemptId);
  const attemptSnap = await attemptRef.get();

  if (attemptSnap.exists && attemptSnap.data().solved) {
    return { correct: true, alreadySolved: true, xpAwarded: 0 };
  }

  const submittedHash = hashFlag(String(flag), lab.salt);
  const correct = submittedHash === lab.flagHash;
  const now = admin.firestore.FieldValue.serverTimestamp();
  const priorTries = attemptSnap.exists ? attemptSnap.data().tries || 0 : 0;

  await attemptRef.set(
    {
      studentId: uid,
      labId,
      courseId: lab.courseId,
      tries: priorTries + 1,
      solved: correct || (attemptSnap.exists && attemptSnap.data().solved) || false,
      lastAttemptAt: now,
      ...(correct ? { solvedAt: now } : {}),
    },
    { merge: true }
  );

  if (!correct) {
    return { correct: false, alreadySolved: false, xpAwarded: 0, tries: priorTries + 1 };
  }

  const config = await getGamificationConfig();
  const xpAwarded = typeof lab.xpReward === "number" ? lab.xpReward : config.xp.completePracticalChallenge;

  const studentRef = db.collection("students").doc(uid);
  const studentSnap = await studentRef.get();
  const newXp = (studentSnap.data().xp || 0) + xpAwarded;
  const { levelForXp } = require("./config");
  const newLevel = levelForXp(newXp, config.levels);

  await studentRef.update({ xp: newXp, level: newLevel, updatedAt: now });
  await db.collection("xpTransactions").add({
    studentId: uid,
    amount: xpAwarded,
    reason: "lab_solved",
    labId,
    courseId: lab.courseId,
    createdAt: now,
  });

  await createNotification({
    studentId: uid,
    type: "lab_solved",
    title: "🚩 Umepata Flag!",
    body: `${lab.title} — +${xpAwarded} XP`,
    data: { labId },
  });

  await checkAndAwardBadges({ uid, courseId: lab.courseId, stageId: null, percent: null, timeTakenSeconds: null, stageCompleted: false });

  await logAudit({ actorId: uid, actorRole: "student", action: "lab.solved", targetType: "lab", targetId: labId, details: { tries: priorTries + 1 } });

  return { correct: true, alreadySolved: false, xpAwarded, newXp, newLevel };
});

module.exports = { createLab, setLabPublished, submitLabFlag };
