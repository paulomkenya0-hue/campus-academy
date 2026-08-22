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

/** Rebuilds the all-time leaderboard (top 100). Runs hourly; also callable manually by admin. */
async function rebuildLeaderboard() {
  const snap = await db
    .collection("students")
    .where("status", "==", "active")
    .orderBy("xp", "desc")
    .limit(100)
    .get();

  const entries = snap.docs.map((d, i) => {
    const s = d.data();
    return {
      rank: i + 1,
      studentId: d.id,
      displayName: s.displayName,
      photoURL: s.photoURL || null,
      xp: s.xp || 0,
      level: s.level || 1,
    };
  });

  await db.collection("leaderboards").doc("all-time").set({
    entries,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return entries.length;
}

const rebuildLeaderboardScheduled = onSchedule("every 60 minutes", async () => {
  await rebuildLeaderboard();
});

const rebuildLeaderboardNow = onCall(async (request) => {
  assertAdmin(request);
  const count = await rebuildLeaderboard();
  return { ok: true, count };
});

/** Admin deletes a chat message (moderation). */
const moderateDeleteMessage = onCall(async (request) => {
  assertAdmin(request);
  const { roomId, messageId, reason } = request.data || {};
  if (!roomId || !messageId) throw new HttpsError("invalid-argument", "roomId na messageId vinahitajika.");

  await db.collection("chatRooms").doc(roomId).collection("messages").doc(messageId).delete();
  await logAudit({
    actorId: request.auth.uid,
    actorRole: "admin",
    action: "chat.message_deleted",
    targetType: "chatMessage",
    targetId: messageId,
    details: { roomId, reason: reason || null },
  });
  return { ok: true };
});

/** Admin mutes a student from chat for a duration (minutes). */
const muteStudent = onCall(async (request) => {
  assertAdmin(request);
  const { uid, minutes, reason } = request.data || {};
  if (!uid || !minutes) throw new HttpsError("invalid-argument", "uid na minutes vinahitajika.");

  const mutedUntil = admin.firestore.Timestamp.fromMillis(Date.now() + minutes * 60 * 1000);
  await db.collection("students").doc(uid).update({ mutedUntil });
  await logAudit({
    actorId: request.auth.uid,
    actorRole: "admin",
    action: "chat.student_muted",
    targetType: "student",
    targetId: uid,
    details: { minutes, reason: reason || null },
  });
  return { ok: true, mutedUntil: mutedUntil.toDate().toISOString() };
});

module.exports = {
  rebuildLeaderboardScheduled,
  rebuildLeaderboardNow,
  moderateDeleteMessage,
  muteStudent,
};
