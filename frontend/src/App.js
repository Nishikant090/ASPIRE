/**
 * App.js - Root component with role-based routing
 */

import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import GuestRoute from "./components/GuestRoute";
import AdminLayout from "./components/admin/AdminLayout";
import Home from "./pages/Home";
import Browse from "./pages/Browse";
import OpportunityDetail from "./pages/OpportunityDetail";
import CompanyJobDetail from "./pages/CompanyJobDetail";
import Dashboard from "./pages/Dashboard";
import AdminOpportunities from "./pages/Admin";
import Login from "./pages/Login";
import Register from "./pages/Register";
import VerifyEmail from "./pages/VerifyEmail";
import NotFound from "./pages/NotFound";
import AdminLogin from "./pages/AdminLogin";
import CompanyRegister from "./pages/company/CompanyRegister";
import CompanyLogin from "./pages/company/CompanyLogin";
import CompanyDashboard from "./pages/company/CompanyDashboard";
import CompanyJobs from "./pages/company/CompanyJobs";
import PostJob from "./pages/company/PostJob";
import CompanyApplicants from "./pages/company/CompanyApplicants";
import CompanyProfile from "./pages/company/CompanyProfile";
import AdminCompanies from "./pages/admin/AdminCompanies";
import AdminOverview from "./pages/admin/AdminOverview";
import AdminStudents from "./pages/admin/AdminStudents";
import AdminJobs from "./pages/admin/AdminJobs";
import AdminLogs from "./pages/admin/AdminLogs";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import "./styles/global.css";
import PageBackBar from "./components/PageBackBar";
import { getBackNavigation } from "./utils/backNavigation";

function AppShell() {
  const location = useLocation();
  const isAdminPanel = location.pathname.startsWith("/admin") && !location.pathname.startsWith("/admin/login");
  const backNav = !isAdminPanel ? getBackNavigation(location.pathname) : null;

  return (
    <>
      {!isAdminPanel && <Navbar />}
      <div className="main-content">
        {backNav && (
          <div className="page-back-bar">
            <div className="container">
              <PageBackBar />
            </div>
          </div>
        )}
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/browse" element={<Browse />} />
          <Route path="/opportunity/:id" element={<OpportunityDetail />} />
          <Route path="/company-job/:id" element={<CompanyJobDetail />} />

          <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />
          <Route path="/verify-email/:studentId" element={<VerifyEmail />} />
          <Route path="/verify-company-email/:companyId" element={<VerifyEmail />} />
          <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute allowedRoles={["student"]}><Dashboard /></ProtectedRoute>} />

          <Route path="/admin/login" element={<GuestRoute><AdminLogin /></GuestRoute>} />
          <Route path="/admin" element={<ProtectedRoute allowedRoles={["admin"]}><AdminLayout /></ProtectedRoute>}>
            <Route index element={<AdminOverview />} />
            <Route path="students" element={<AdminStudents />} />
            <Route path="companies" element={<AdminCompanies />} />
            <Route path="jobs" element={<AdminJobs />} />
            <Route path="opportunities" element={<AdminOpportunities />} />
            <Route path="applications" element={<AdminOpportunities defaultTab="applications" />} />
            <Route path="logs" element={<AdminLogs />} />
          </Route>

          <Route path="/company/register" element={<GuestRoute allowedRoles={["company"]}><CompanyRegister /></GuestRoute>} />
          <Route path="/company/login" element={<GuestRoute><CompanyLogin /></GuestRoute>} />
          <Route path="/company/dashboard" element={<ProtectedRoute allowedRoles={["company"]}><CompanyDashboard /></ProtectedRoute>} />
          <Route path="/company/jobs" element={<ProtectedRoute allowedRoles={["company"]}><CompanyJobs /></ProtectedRoute>} />
          <Route path="/company/jobs/new" element={<ProtectedRoute allowedRoles={["company"]}><PostJob /></ProtectedRoute>} />
          <Route path="/company/jobs/:id" element={<ProtectedRoute allowedRoles={["company"]}><PostJob /></ProtectedRoute>} />
          <Route path="/company/applicants" element={<ProtectedRoute allowedRoles={["company"]}><CompanyApplicants /></ProtectedRoute>} />
          <Route path="/company/profile" element={<ProtectedRoute allowedRoles={["company"]}><CompanyProfile /></ProtectedRoute>} />

          <Route path="/forgot-password/student" element={<ForgotPassword userType="student" />} />
          <Route path="/reset-password/student" element={<ResetPassword userType="student" />} />
          <Route path="/forgot-password/company" element={<ForgotPassword userType="company" />} />
          <Route path="/reset-password/company" element={<ResetPassword userType="company" />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </>
  );
}

function App() {
  return (
    <Router>
      <AppShell />
    </Router>
  );
}

export default App;
