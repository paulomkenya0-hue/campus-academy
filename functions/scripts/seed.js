/**
 * Seeds one demo course with real Kiswahili content and questions, so the
 * MVP acceptance flow (spec section 52) can be tested end to end.
 *
 * Usage:
 *   node scripts/seed.js
 * (requires functions/scripts/serviceAccountKey.json — see setSuperAdmin.js)
 */
const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();
const now = admin.firestore.FieldValue.serverTimestamp();

async function main() {
  const courseRef = await db.collection("courses").add({
    title: "Misingi ya Ethical Hacking",
    description: "Jifunze misingi ya usalama wa mtandao na uhakiki wa kimaadili (ethical hacking).",
    published: true,
    status: "published",
    createdBy: "seed-script",
    createdAt: now,
    updatedAt: now,
  });
  console.log("Course:", courseRef.id);

  const stageRef = await courseRef.collection("stages").add({
    title: "Utangulizi wa Ethical Hacking",
    description: "Elewa dhana za msingi kabla ya kuingia kwenye vitendo.",
    order: 1,
    unlockRule: { type: "previous_stage_completed" },
    published: true,
    status: "published",
    createdAt: now,
    updatedAt: now,
  });
  console.log("Stage:", stageRef.id);

  const topics = [
    {
      title: "Ethical Hacking ni Nini?",
      content:
        "Ethical Hacking ni mchakato wa kutafuta udhaifu (vulnerabilities) kwenye mifumo ya kompyuta au mitandao " +
        "kwa ruhusa halali, kwa lengo la kuboresha usalama kabla mtu mwenye nia mbaya hajautumia udhaifu huo.\n\n" +
        "Tofauti kubwa kati ya Ethical Hacker na mhalifu wa mtandao ni RUHUSA na NIA. Ethical Hacker anafanya kazi " +
        "kwa idhini ya mmiliki wa mfumo, na lengo lake ni kulinda, si kudhuru.",
      questions: [
        {
          text: "Kipengele gani kinamtofautisha Ethical Hacker na mhalifu wa mtandao?",
          answerA: "Aina ya kompyuta anayotumia",
          answerB: "Ruhusa na nia ya kufanya kazi",
          answerC: "Kasi ya intaneti",
          answerD: "Lugha ya programu anayotumia",
          correctAnswer: "B",
          explanation: "Ruhusa halali na nia ya kulinda (siyo kudhuru) ndiyo kinachomtofautisha Ethical Hacker.",
        },
        {
          text: "Ethical Hacking hufanyika kwa lengo gani?",
          answerA: "Kuiba taarifa za siri",
          answerB: "Kuharibu mfumo wa kampuni",
          answerC: "Kuboresha usalama wa mfumo",
          answerD: "Kujionyesha kwenye mitandao ya kijamii",
          correctAnswer: "C",
          explanation: "Lengo kuu ni kutambua na kurekebisha udhaifu kabla haujatumiwa vibaya.",
        },
      ],
    },
    {
      title: "CIA Triad",
      content:
        "CIA Triad ni msingi wa usalama wa taarifa, unaojumuisha vipengele vitatu:\n\n" +
        "• Confidentiality (Usiri) — taarifa zinapatikana kwa watu walioidhinishwa pekee\n" +
        "• Integrity (Uadilifu) — taarifa hazibadilishwi bila idhini\n" +
        "• Availability (Upatikanaji) — mfumo unapatikana wakati unahitajika\n\n" +
        "Kila uamuzi wa usalama unapaswa kuzingatia vipengele hivi vitatu.",
      questions: [
        {
          text: "'C' katika CIA Triad inasimamia nini?",
          answerA: "Control",
          answerB: "Confidentiality",
          answerC: "Compliance",
          answerD: "Cybersecurity",
          correctAnswer: "B",
          explanation: "Confidentiality inahakikisha taarifa zinaonekana kwa watu walioidhinishwa pekee.",
        },
        {
          text: "Kipengele gani cha CIA Triad kinahusu mfumo kupatikana wakati wowote unapohitajika?",
          answerA: "Integrity",
          answerB: "Confidentiality",
          answerC: "Availability",
          answerD: "Authentication",
          correctAnswer: "C",
          explanation: "Availability inahakikisha huduma/mfumo unapatikana kwa watumiaji halali wakati wanapouhitaji.",
        },
      ],
    },
  ];

  let order = 1;
  for (const t of topics) {
    const topicRef = await stageRef.collection("topics").add({
      title: t.title,
      content: t.content,
      order: order++,
      published: true,
      status: "published",
      createdAt: now,
      updatedAt: now,
    });
    console.log("  Topic:", topicRef.id, t.title);

    for (const q of t.questions) {
      await topicRef.collection("questions").add({
        ...q,
        difficulty: "medium",
        xpReward: null,
        status: "published",
        createdBy: "seed-script",
        createdAt: now,
        updatedAt: now,
      });
    }
    console.log(`    +${t.questions.length} questions`);
  }

  await db.collection("config").doc("gamification").set(
    {
      xp: { readTopic: 10, completeQuiz: 50, perfectScoreBonus: 25, completeStage: 100, completePracticalChallenge: 150, dailyActivity: 10 },
      quiz: { passingScorePercent: 60, maxAttempts: 3 },
      streak: { timezone: "Africa/Dar_es_Salaam" },
    },
    { merge: true }
  );

  console.log("\n✅ Seed imekamilika.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
