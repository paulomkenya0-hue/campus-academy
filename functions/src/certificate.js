const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { db, admin } = require("./admin");
const { logAudit } = require("./auditLog");

function assertAdmin(request) {
  const role = request.auth && request.auth.token && request.auth.token.role;
  if (!request.auth || (role !== "super_admin" && role !== "developer")) {
    throw new HttpsError("permission-denied", "Huna ruhusa ya kufanya kitendo hiki.");
  }
}

function makeCertificateId() {
  const year = new Date().getFullYear();
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `CERT-${year}-${rand}`;
}

/**
 * Admin issues a certificate after verifying course completion.
 * Only non-sensitive fields are stored on the certificate doc, since it is
 * publicly readable at /certificate/{certId} for verification (spec 44/47).
 */
const issueCertificate = onCall(async (request) => {
  assertAdmin(request);
  const { studentUid, courseId, finalScore } = request.data || {};
  if (!studentUid || !courseId) {
    throw new HttpsError("invalid-argument", "studentUid na courseId vinahitajika.");
  }

  const [studentSnap, courseSnap] = await Promise.all([
    db.collection("students").doc(studentUid).get(),
    db.collection("courses").doc(courseId).get(),
  ]);
  if (!studentSnap.exists) throw new HttpsError("not-found", "Mwanafunzi hajapatikana.");
  if (!courseSnap.exists) throw new HttpsError("not-found", "Kozi haijapatikana.");

  const student = studentSnap.data();
  const course = courseSnap.data();
  const certId = makeCertificateId();
  const now = admin.firestore.FieldValue.serverTimestamp();

  await db.collection("certificates").doc(certId).set({
    certId,
    studentName: student.displayName,
    studentUid,
    courseId,
    courseName: course.title,
    finalScore: typeof finalScore === "number" ? finalScore : null,
    issuedBy: request.auth.uid,
    completionDate: now,
    status: "valid",
  });

  await logAudit({
    actorId: request.auth.uid,
    actorRole: "admin",
    action: "certificate.issued",
    targetType: "certificate",
    targetId: certId,
    details: { studentUid, courseId },
  });

  return { certId };
});

/** Admin revokes a certificate (e.g. issued in error). */
const revokeCertificate = onCall(async (request) => {
  assertAdmin(request);
  const { certId } = request.data || {};
  if (!certId) throw new HttpsError("invalid-argument", "certId inahitajika.");

  await db.collection("certificates").doc(certId).update({ status: "revoked" });
  await logAudit({ actorId: request.auth.uid, actorRole: "admin", action: "certificate.revoked", targetType: "certificate", targetId: certId });
  return { ok: true };
});

module.exports = { issueCertificate, revokeCertificate };
