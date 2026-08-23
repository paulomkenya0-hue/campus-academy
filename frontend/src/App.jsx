import { Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute.jsx";
import Login from "./pages/Login.jsx";
import Activate from "./pages/Activate.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import CourseView from "./pages/CourseView.jsx";
import StageView from "./pages/StageView.jsx";
import TopicView from "./pages/TopicView.jsx";
import Profile from "./pages/Profile.jsx";
import Leaderboard from "./pages/Leaderboard.jsx";
import CertificateVerify from "./pages/CertificateVerify.jsx";
import AdminDashboard from "./pages/admin/AdminDashboard.jsx";
import StudentImport from "./pages/admin/StudentImport.jsx";
import CourseBuilder from "./pages/admin/CourseBuilder.jsx";
import AuditLogs from "./pages/admin/AuditLogs.jsx";
import BadgeManager from "./pages/admin/BadgeManager.jsx";
import Announcements from "./pages/admin/Announcements.jsx";
import CourseAnalytics from "./pages/admin/CourseAnalytics.jsx";
import LabManager from "./pages/admin/LabManager.jsx";
import CompetitionManager from "./pages/admin/CompetitionManager.jsx";
import CertificateManager from "./pages/admin/CertificateManager.jsx";
import Chat from "./pages/Chat.jsx";
import LabsList from "./pages/LabsList.jsx";
import LabView from "./pages/LabView.jsx";
import CompetitionView from "./pages/CompetitionView.jsx";
import MyCertificates from "./pages/MyCertificates.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/activate" element={<Activate />} />
      <Route path="/certificate/:certId" element={<CertificateVerify />} />

      <Route path="/" element={<ProtectedRoute requireRole="student"><Dashboard /></ProtectedRoute>} />
      <Route path="/course/:courseId" element={<ProtectedRoute requireRole="student"><CourseView /></ProtectedRoute>} />
      <Route path="/course/:courseId/stage/:stageId" element={<ProtectedRoute requireRole="student"><StageView /></ProtectedRoute>} />
      <Route path="/course/:courseId/stage/:stageId/topic/:topicId" element={<ProtectedRoute requireRole="student"><TopicView /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute requireRole="student"><Profile /></ProtectedRoute>} />
      <Route path="/leaderboard" element={<ProtectedRoute requireRole="student"><Leaderboard /></ProtectedRoute>} />
      <Route path="/chat" element={<ProtectedRoute requireRole={["student", "super_admin", "developer"]}><Chat /></ProtectedRoute>} />
      <Route path="/course/:courseId/labs" element={<ProtectedRoute requireRole="student"><LabsList /></ProtectedRoute>} />
      <Route path="/course/:courseId/lab/:labId" element={<ProtectedRoute requireRole="student"><LabView /></ProtectedRoute>} />
      <Route path="/course/:courseId/competition" element={<ProtectedRoute requireRole="student"><CompetitionView /></ProtectedRoute>} />
      <Route path="/certificates" element={<ProtectedRoute requireRole="student"><MyCertificates /></ProtectedRoute>} />

      <Route path="/admin" element={<ProtectedRoute requireRole={["super_admin","developer"]}><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/students" element={<ProtectedRoute requireRole={["super_admin","developer"]}><StudentImport /></ProtectedRoute>} />
      <Route path="/admin/courses" element={<ProtectedRoute requireRole={["super_admin","developer"]}><CourseBuilder /></ProtectedRoute>} />
      <Route path="/admin/badges" element={<ProtectedRoute requireRole={["super_admin","developer"]}><BadgeManager /></ProtectedRoute>} />
      <Route path="/admin/announcements" element={<ProtectedRoute requireRole={["super_admin","developer"]}><Announcements /></ProtectedRoute>} />
      <Route path="/admin/analytics" element={<ProtectedRoute requireRole={["super_admin","developer"]}><CourseAnalytics /></ProtectedRoute>} />
      <Route path="/admin/labs" element={<ProtectedRoute requireRole={["super_admin","developer"]}><LabManager /></ProtectedRoute>} />
      <Route path="/admin/competitions" element={<ProtectedRoute requireRole={["super_admin","developer"]}><CompetitionManager /></ProtectedRoute>} />
      <Route path="/admin/certificates" element={<ProtectedRoute requireRole={["super_admin","developer"]}><CertificateManager /></ProtectedRoute>} />
      <Route path="/admin/audit-logs" element={<ProtectedRoute requireRole={["super_admin","developer"]}><AuditLogs /></ProtectedRoute>} />
    </Routes>
  );
}
