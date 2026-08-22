const { db } = require("./admin");

// Default gamification rules (section 17-19 of the spec).
// Admin can override any of these by writing to config/gamification in Firestore;
// we merge defaults with whatever is stored there so the app never breaks if a
// field is missing.
const DEFAULTS = {
  xp: {
    readTopic: 10,
    completeQuiz: 50,
    perfectScoreBonus: 25,
    completeStage: 100,
    completePracticalChallenge: 150,
    dailyActivity: 10,
  },
  levels: [
    { level: 1, minXp: 0 },
    { level: 2, minXp: 100 },
    { level: 3, minXp: 250 },
    { level: 4, minXp: 500 },
    { level: 5, minXp: 900 },
    { level: 6, minXp: 1500 },
    { level: 7, minXp: 2300 },
    { level: 8, minXp: 3300 },
    { level: 9, minXp: 4500 },
    { level: 10, minXp: 6000 },
  ],
  quiz: {
    passingScorePercent: 60,
    maxAttempts: 3,
  },
  streak: {
    timezone: "Africa/Dar_es_Salaam",
  },
};

let cache = null;
let cacheAt = 0;
const CACHE_MS = 60_000;

async function getGamificationConfig() {
  const now = Date.now();
  if (cache && now - cacheAt < CACHE_MS) return cache;

  const snap = await db.collection("config").doc("gamification").get();
  const stored = snap.exists ? snap.data() : {};

  cache = {
    xp: { ...DEFAULTS.xp, ...(stored.xp || {}) },
    levels: stored.levels && stored.levels.length ? stored.levels : DEFAULTS.levels,
    quiz: { ...DEFAULTS.quiz, ...(stored.quiz || {}) },
    streak: { ...DEFAULTS.streak, ...(stored.streak || {}) },
  };
  cacheAt = now;
  return cache;
}

function levelForXp(xp, levels) {
  let current = levels[0];
  for (const l of levels) {
    if (xp >= l.minXp) current = l;
    else break;
  }
  return current.level;
}

module.exports = { getGamificationConfig, levelForXp, DEFAULTS };
