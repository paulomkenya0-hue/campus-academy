const auth = require("./auth");
const quiz = require("./quiz");
const content = require("./content");
const certificate = require("./certificate");
const leaderboard = require("./leaderboard");

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

  // Certificates
  issueCertificate: certificate.issueCertificate,
  revokeCertificate: certificate.revokeCertificate,

  // Leaderboard / chat moderation
  rebuildLeaderboardScheduled: leaderboard.rebuildLeaderboardScheduled,
  rebuildLeaderboardNow: leaderboard.rebuildLeaderboardNow,
  moderateDeleteMessage: leaderboard.moderateDeleteMessage,
  muteStudent: leaderboard.muteStudent,
};
