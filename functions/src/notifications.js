const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { db, admin } = require("./admin");
const { logAudit } = require("./auditLog");

function assertAdmin(request) {
  const role = request.auth && request.auth.token && request.auth.token.role;
  if (!request.auth || (role !== "super_admin" && role !== "developer")) {
    throw new HttpsError("permission-denied", "Huna ruhusa ya kufanya kitendo hiki.");
  }
}

/**
 * Internal helper — used by other Cloud Functions (quiz.js, badges.js) to
 * push a personal notification to one student. Not exposed as a callable.
 */
async function createNotification({ studentId, type, title, body, data = {} }) {
  await db.collection("notifications").add({
    studentId,
    type, // 'badge' | 'stage_unlocked' | 'quiz_result' | 'certificate_available' | 'announcement'
    title,
    body,
    data,
    read: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

/**
 * Admin broadcasts a platform-wide announcement. Rather than fan out a
 * notification document to every student (expensive at scale), this writes
 * ONE announcement doc that all signed-in students can read directly; the
 * frontend shows it in the notification bell alongside personal notifications.
 */
const createAnnouncement = onCall(async (request) => {
  assertAdmin(request);
  const { title, body } = request.data || {};
  if (!title || !body) throw new HttpsError("invalid-argument", "title na body vinahitajika.");

  const ref = await db.collection("announcements").add({
    title,
    body,
    createdBy: request.auth.uid,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await logAudit({
    actorId: request.auth.uid,
    actorRole: "admin",
    action: "announcement.created",
    targetType: "announcement",
    targetId: ref.id,
    details: { title },
  });

  return { announcementId: ref.id };
});

/**
 * Daily streak reminder — runs once a day; notifies students who haven't
 * had a qualifying activity yet today (per platform timezone) so their
 * streak doesn't break. Keeps the message encouraging, not nagging.
 */
const streakReminderScheduled = onSchedule(
  { schedule: "0 15 * * *", timeZone: "UTC" }, // ~18:00 East Africa Time
  async () => {
    const { getGamificationConfig } = require("./config");
    const config = await getGamificationConfig();
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: config.streak.timezone }).format(new Date());

    const snap = await db.collection("students").where("status", "==", "active").get();
    const batchPromises = [];

    snap.forEach((doc) => {
      const s = doc.data();
      if (s.streak?.current > 0 && s.streak?.lastActiveDate !== today) {
        batchPromises.push(
          createNotification({
            studentId: doc.id,
            type: "streak_reminder",
            title: "🔥 Usipoteze mfululizo wako!",
            body: `Una mfululizo wa siku ${s.streak.current}. Kamilisha mada moja leo ili usiuvunje.`,
          })
        );
      }
    });

    await Promise.all(batchPromises);
  }
);

module.exports = { createNotification, createAnnouncement, streakReminderScheduled };
