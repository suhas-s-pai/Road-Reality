import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import { useAuth } from "./context/AuthContext";

import Navbar from "./components/Navbar";
import Footer from "./components/footer";

import Home from "./pages/Home";
import Explore from "./pages/Explore";
import HazardDetails from "./pages/HazardDetails";
import ReportHazard from "./pages/ReportHazard";
import MyReports from "./pages/MyReports";
import Notifications from "./pages/Notifications";
import Profile from "./pages/Profile";
import SimplePage from "./pages/SimplePage";
import AdminDashboard from "./pages/AdminDashboard";
import Auth from "./pages/Auth";

// Guard for protected application routes (requires authenticated user)
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-surface p-4">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="animate-spin text-brand" size={32} />
          <p className="text-sm font-semibold text-slate-600">Restoring Road Reality session...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

// Guard for Admin Portal route (requires authenticated user with role === 'admin')
function AdminRoute() {
  const { user, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-surface p-4">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="animate-spin text-brand" size={32} />
          <p className="text-sm font-semibold text-slate-600">Verifying administrator authorization...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // AdminDashboard handles role check and displays clear Access Restricted message if role !== 'admin'
  return <AdminDashboard />;
}

// Public Login Route (Skipped if already authenticated)
function PublicLoginRoute() {
  const { user, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-surface p-4">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="animate-spin text-brand" size={32} />
          <p className="text-sm font-semibold text-slate-600">Restoring Road Reality session...</p>
        </div>
      </div>
    );
  }

  if (user) {
    // Navigate based on user role (Admin -> /admin, User -> /)
    return <Navigate to={isAdmin ? "/admin" : "/"} replace />;
  }

  return <Auth />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Dedicated Login Route for Unauthenticated Users */}
        <Route path="/login" element={<PublicLoginRoute />} />

        {/* Main Application Protected Routes */}
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <div className="flex min-h-screen flex-col bg-surface text-ink font-sans">
                <Navbar />

                <div className="flex-1">
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/explore" element={<Explore />} />
                    <Route path="/hazards/:id" element={<HazardDetails />} />
                    <Route path="/report" element={<ReportHazard />} />
                    <Route path="/my-reports" element={<MyReports />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/notifications" element={<Notifications />} />
                    <Route path="/admin" element={<AdminRoute />} />
                    <Route path="*" element={<SimplePage type="notfound" />} />
                  </Routes>
                </div>

                <Footer />
              </div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
