const functions = require("firebase-functions/v2/https");
const { HttpsError, onCall } = functions;
const { db, auth, admin } = require("./admin");
const { logAudit } = require("./auditLog");

const STUDENT_EMAIL_DOMAIN = "students.campusacademy.app";

/** RUCU/2026/001 -> rucu-2026-001 (safe Firestore doc id + email local-part) */
function slugifyRegNumber(regNumber) {
  return String(regNumber || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function emailForRegNumber(regNumber) {
  return `${slugifyRegNumber(regNumber)}@${STUDENT_EMAIL_DOMAIN}`;
}

function randomActivationCode() {
  // Human-typeable, not used as a password — just proves the student received
  // this code from the school/admin offline (printed list, SMS, etc).
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function assertAdmin(request) {
  const role = request.auth && request.auth.token && request.auth.token.role;
  if (!request.auth || (role !== "super_admin" && role !== "developer")) {
    throw new HttpsError("permission-denied", "Huna ruhusa ya kufanya kitendo hiki.");
  }
}

/**
 * Admin bulk-imports approved students (spec section 29 / CSV import).
 * Input: { students: [{ regNumber, firstName, lastName, email?, phone? }, ...] }
 * Validates before committing anything.
 */
const importStudents = onCall(async (request) => {
  assertAdmin(request);
  const { students } = request.data || {};

  if (!Array.isArray(students) || students.length === 0) {
    throw new HttpsError("invalid-argument", "Orodha ya wanafunzi haipo au ni tupu.");
  }
  if (students.length > 500) {
    throw new HttpsError("invalid-argument", "Kiwango cha juu ni wanafunzi 500 kwa mara moja.");
  }

  const errors = [];
  const seen = new Set();
  const cleaned = [];

  students.forEach((s, idx) => {
    const regNumber = String(s.regNumber || "").trim();
    const firstName = String(s.firstName || "").trim();
    const lastName = String(s.lastName || "").trim();
    if (!regNumber || !firstName || !lastName) {
      errors.push({ row: idx, error: "regNumber, firstName na lastName vinahitajika." });
      return;
    }
    const slug = slugifyRegNumber(regNumber);
    if (seen.has(slug)) {
      errors.push({ row: idx, error: `Namba ya usajili imerudiwa: ${regNumber}` });
      return;
    }
    seen.add(slug);
    cleaned.push({
      slug,
      regNumber,
      firstName,
      lastName,
      email: s.email ? String(s.email).trim() : null,
      phone: s.phone ? String(s.phone).trim() : null,
      activationCode: randomActivationCode(),
    });
  });

  if (errors.length > 0) {
    return { committed: false, errors, count: 0 };
  }

  const batch = db.batch();
  const now = admin.firestore.FieldValue.serverTimestamp();

  for (const s of cleaned) {
    const ref = db.collection("approvedStudents").doc(s.slug);
    batch.set(
      ref,
      {
        regNumber: s.regNumber,
        firstName: s.firstName,
        lastName: s.lastName,
        email: s.email,
        phone: s.phone,
        status: "approved",
        activated: false,
        activationCode: s.activationCode,
        importedAt: now,
        importedBy: request.auth.uid,
      },
      { merge: true }
    );
  }

  await batch.commit();
  await logAudit({
    actorId: request.auth.uid,
    actorRole: "admin",
    action: "students.imported",
    targetType: "approvedStudents",
    details: { count: cleaned.length },
  });

  // Return activation codes to the admin ONLY in this response, so they can
  // be shared with students offline. They are never logged or emailed automatically.
  return {
    committed: true,
    count: cleaned.length,
    students: cleaned.map((s) => ({
      regNumber: s.regNumber,
      activationCode: s.activationCode,
    })),
  };
});

/**
 * Student activates their account for the first time.
 * Requires the regNumber + the one-time activation code the admin gave them,
 * and lets them set their own password immediately (no shared/surname passwords).
 */
const activateAccount = onCall(async (request) => {
  const { regNumber, activationCode, newPassword } = request.data || {};

  if (!regNumber || !activationCode || !newPassword) {
    throw new HttpsError("invalid-argument", "Taarifa zote zinahitajika.");
  }
  if (String(newPassword).length < 8) {
    throw new HttpsError("invalid-argument", "Password lazima iwe na herufi 8 au zaidi.");
  }

  const slug = slugifyRegNumber(regNumber);
  const ref = db.collection("approvedStudents").doc(slug);
  const snap = await ref.get();

  // Deliberately generic message — do not reveal whether the regNumber exists
  // at all (avoids account enumeration, spec section 5).
  const genericError = "Samahani, taarifa ulizoweka si sahihi au akaunti tayari imeanzishwa.";

  if (!snap.exists) throw new HttpsError("not-found", genericError);
  const data = snap.data();

  if (data.status !== "approved") throw new HttpsError("permission-denied", genericError);
  if (data.activated) throw new HttpsError("failed-precondition", genericError);
  if (data.activationCode !== String(activationCode).trim().toUpperCase()) {
    throw new HttpsError("permission-denied", genericError);
  }

  const email = emailForRegNumber(regNumber);
  const userRecord = await auth.createUser({
    email,
    password: newPassword,
    displayName: `${data.firstName} ${data.lastName}`,
  });

  await auth.setCustomUserClaims(userRecord.uid, { role: "student" });

  const now = admin.firestore.FieldValue.serverTimestamp();
  await db.collection("students").doc(userRecord.uid).set({
    regNumber: data.regNumber,
    firstName: data.firstName,
    lastName: data.lastName,
    displayName: `${data.firstName} ${data.lastName}`,
    bio: "",
    photoURL: null,
    xp: 0,
    level: 1,
    streak: { current: 0, longest: 0, lastActiveDate: null },
    unlockedStages: {},
    status: "active",
    createdAt: now,
    updatedAt: now,
  });

  await ref.update({
    activated: true,
    activationCode: admin.firestore.FieldValue.delete(),
    activatedUid: userRecord.uid,
    activatedAt: now,
  });

  await logAudit({
    actorId: userRecord.uid,
    actorRole: "student",
    action: "account.activated",
    targetType: "student",
    targetId: userRecord.uid,
  });

  return { email }; // client uses this to call signInWithEmailAndPassword
});

/** Admin resets a student's password to a fresh temporary one; forces re-activation-style change. */
const adminResetPassword = onCall(async (request) => {
  assertAdmin(request);
  const { uid } = request.data || {};
  if (!uid) throw new HttpsError("invalid-argument", "uid inahitajika.");

  const tempPassword = randomActivationCode() + randomActivationCode().toLowerCase();
  await auth.updateUser(uid, { password: tempPassword });
  await db.collection("students").doc(uid).update({
    mustChangePassword: true,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await logAudit({
    actorId: request.auth.uid,
    actorRole: "admin",
    action: "student.password_reset",
    targetType: "student",
    targetId: uid,
  });

  // Returned once, directly to the admin, never logged or stored in plaintext.
  return { tempPassword };
});

/** Admin disables or reactivates a student account. */
const setStudentStatus = onCall(async (request) => {
  assertAdmin(request);
  const { uid, status } = request.data || {};
  if (!uid || !["active", "disabled"].includes(status)) {
    throw new HttpsError("invalid-argument", "uid na status (active|disabled) vinahitajika.");
  }

  await auth.updateUser(uid, { disabled: status === "disabled" });
  await db.collection("students").doc(uid).update({
    status,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await logAudit({
    actorId: request.auth.uid,
    actorRole: "admin",
    action: status === "disabled" ? "student.disabled" : "student.reactivated",
    targetType: "student",
    targetId: uid,
  });

  return { ok: true };
});

module.exports = {
  importStudents,
  activateAccount,
  adminResetPassword,
  setStudentStatus,
  emailForRegNumber,
  slugifyRegNumber,
};
