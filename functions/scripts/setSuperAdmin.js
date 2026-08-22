/**
 * Run this ONCE, locally, with a Firebase service account key, to create the
 * first Super Admin. After this, the Super Admin manages everything else
 * through the Admin Dashboard — no further script edits needed.
 *
 * Usage:
 *   1. Download a service account key from Firebase Console
 *      (Project settings > Service accounts > Generate new private key)
 *      and save it as functions/scripts/serviceAccountKey.json
 *      (this file is gitignored — never commit it).
 *   2. node scripts/setSuperAdmin.js admin@example.com "YourStrongPassword123" "Jina Lako"
 */
const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

async function main() {
  const [, , email, password, displayName] = process.argv;
  if (!email || !password) {
    console.error('Usage: node setSuperAdmin.js <email> <password> ["Display Name"]');
    process.exit(1);
  }

  let user;
  try {
    user = await admin.auth().getUserByEmail(email);
    console.log(`Akaunti ipo tayari: ${user.uid}. Nasasisha claims...`);
  } catch (e) {
    user = await admin.auth().createUser({
      email,
      password,
      displayName: displayName || "Super Admin",
    });
    console.log(`Akaunti mpya imeundwa: ${user.uid}`);
  }

  await admin.auth().setCustomUserClaims(user.uid, { role: "super_admin" });

  await admin.firestore().collection("admins").doc(user.uid).set({
    email,
    displayName: displayName || "Super Admin",
    role: "super_admin",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log("✅ Super Admin imewekwa. UID:", user.uid);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
