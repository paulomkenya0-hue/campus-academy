const { db, admin } = require("./admin");

/**
 * Writes an audit log entry. Never include passwords or secrets in `details`.
 */
async function logAudit({ actorId, actorRole, action, targetType, targetId, details = {} }) {
  await db.collection("auditLogs").add({
    actorId: actorId || null,
    actorRole: actorRole || null,
    action,
    targetType: targetType || null,
    targetId: targetId || null,
    details,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

module.exports = { logAudit };
