const auth = require("./auth");
const quiz = require("./quiz");
const content = require("./content");
const certificate = require("./certificate");
const leaderboard = require("./leaderboard");
const badges = require("./badges");
const notifications = require("./notifications");
const analytics = require("./analytics");
const labs = require("./labs");
const competition = require("./competition");
const anticheat = require("./anticheat");

module.exports = {
  // Auth / whitelist / accounts
  importStudents: auth.importStudents,
  activateAccount: auth.activateAccount,
  adminResetPassword: auth.adminResetPassword,
  setStudentStatus: auth.setStudentStatus,

  // Quiz / XP / streak / stage unlock
  getQuizQuestions: quiz.getQuizQuestions,
  submitQuizAttempt: quiz.submitQuizAttempt,

  // Content management
  createCourse: content.createCourse,
  createStage: content.createStage,
  createTopic: content.createTopic,
  createQuestion: content.createQuestion,
  setPublishStatus: content.setPublishStatus,
  setTopicFinalAssessment: content.setTopicFinalAssessment,
  setTopicAssessmentMode: content.setTopicAssessmentMode,

  // Certificates
  issueCertificate: certificate.issueCertificate,
  revokeCertificate: certificate.revokeCertificate,

  // Leaderboard / chat moderation
  rebuildLeaderboardScheduled: leaderboard.rebuildLeaderboardScheduled,
  rebuildLeaderboardNow: leaderboard.rebuildLeaderboardNow,
  moderateDeleteMessage: leaderboard.moderateDeleteMessage,
  muteStudent: leaderboard.muteStudent,

  // Badges
  createBadge: badges.createBadge,

  // Notifications / announcements
  createAnnouncement: notifications.createAnnouncement,
  streakReminderScheduled: notifications.streakReminderScheduled,

  // Analytics
  getCourseAnalytics: analytics.getCourseAnalytics,

  // Labs (CTF-style)
  createLab: labs.createLab,
  setLabPublished: labs.setLabPublished,
  submitLabFlag: labs.submitLabFlag,

  // Competitions
  createCompetition: competition.createCompetition,
  runQualification: competition.runQualification,
  submitRoundScore: competition.submitRoundScore,
  publishFinalResults: competition.publishFinalResults,

  // Anti-cheating
  logSuspiciousEvent: anticheat.logSuspiciousEvent,
};
