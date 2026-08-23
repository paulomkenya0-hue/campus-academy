// node scripts/importStudents.js wanafunzi.csv
// CSV: regNumber,firstName,lastName
const admin = require("firebase-admin");
const fs = require("fs");
const serviceAccount = require("./serviceAccountKey.json");
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

function slug(r) { return r.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""); }
function randPass() { return Math.random().toString(36).slice(2, 10) + "A1!"; }

async function main() {
  const csvPath = process.argv[2];
  if (!csvPath) { console.error("Tumia: node importStudents.js wanafunzi.csv"); process.exit(1); }
  const rows = fs.readFileSync(csvPath, "utf8").trim().split("\n").slice(1);

  for (const row of rows) {
    const [regNumber, firstName, lastName] = row.split(",").map((s) => s.trim());
    if (!regNumber) continue;
    const email = `${slug(regNumber)}@students.campusacademy.app`;
    const tempPassword = randPass();

    let user;
    try {
      user = await admin.auth().createUser({ email, password: tempPassword, displayName: `${firstName} ${lastName}` });
    } catch (e) {
      console.log(`SKIP ${regNumber}: ${e.message}`); continue;
    }
    await admin.auth().setCustomUserClaims(user.uid, { role: "student" });
    await admin.firestore().collection("students").doc(user.uid).set({
      regNumber, firstName, lastName, displayName: `${firstName} ${lastName}`,
      bio: "", photoBase64: null, xp: 0, level: 1,
      streak: { current: 0, longest: 0, lastActiveDate: null },
      unlockedStages: {}, mustChangePassword: true, status: "active",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log(`${regNumber} → ${email} | password ya muda: ${tempPassword}`);
  }
  process.exit(0);
}
main();
