/**
 * App.js - Root component
 * Sets up React Router with all page routes and global layout
 */

import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Browse from "./pages/Browse";
import OpportunityDetail from "./pages/OpportunityDetail";
import CompanyJobDetail from "./pages/CompanyJobDetail";
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/Admin";
import Login from "./pages/Login";
import AdminLogin from "./pages/AdminLogin";


import CompanyRegister    from "./pages/company/CompanyRegister";
import CompanyLogin       from "./pages/company/CompanyLogin";
import CompanyDashboard   from "./pages/company/CompanyDashboard";
import CompanyJobs        from "./pages/company/CompanyJobs";
import PostJob            from "./pages/company/PostJob";
import CompanyApplicants  from "./pages/company/CompanyApplicants";
import CompanyProfile     from "./pages/company/CompanyProfile";
import AdminCompanies     from "./pages/admin/AdminCompanies";

import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword  from "./pages/ResetPassword";


import "./styles/global.css";

function App() {
  return (
    <Router>
      {/* Navbar is shown on every page */}
      <Navbar />

      {/* Main content area - padded for fixed navbar */}
      <div className="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/browse" element={<Browse />} />
          <Route path="/opportunity/:id" element={<OpportunityDetail />} />
          <Route path="/company-job/:id" element={<CompanyJobDetail />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<Admin />} />
          
          {/* Company Routes */}
          <Route path="/company/register"   element={<CompanyRegister />}   />
          <Route path="/company/login"      element={<CompanyLogin />}      />
          <Route path="/company/dashboard"  element={<CompanyDashboard />}  />
          <Route path="/company/jobs"       element={<CompanyJobs />}       />
          <Route path="/company/jobs/new"   element={<PostJob />}           />
          <Route path="/company/jobs/:id"   element={<PostJob />}           />
          <Route path="/company/applicants" element={<CompanyApplicants />} />
          <Route path="/company/profile"    element={<CompanyProfile />}    />

          {/* Forgot & Reset Password — Student */}
<Route path="/forgot-password/student" element={<ForgotPassword userType="student" />} />
<Route path="/reset-password/student"  element={<ResetPassword  userType="student" />} />

{/* Forgot & Reset Password — Company */}
<Route path="/forgot-password/company" element={<ForgotPassword userType="company" />} />
<Route path="/reset-password/company"  element={<ResetPassword  userType="company" />} />

{/* Admin Routes */}
<Route path="/admin/companies"    element={<AdminCompanies />}    />        </Routes>
      </div>
    </Router>
  );
}

export default App;
