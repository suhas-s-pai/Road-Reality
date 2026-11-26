import { Component } from "react";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { RefreshCw, AlertTriangle } from "lucide-react";
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
      <div className="min-h-screen grid place-items-center bg-[#101417] p-4">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="animate-spin text-[#F5A623]" size={32} />
          <p className="text-sm font-semibold text-[#A8A8A3]">Restoring Road Reality session...</p>
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
      <div className="min-h-screen grid place-items-center bg-[#101417] p-4">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="animate-spin text-[#F5A623]" size={32} />
          <p className="text-sm font-semibold text-[#A8A8A3]">Verifying administrator authorization...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Strict route protection: normal users are redirected to citizen homepage
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <AdminDashboard />;
}

// Public Login Route (Skipped if already authenticated)
function PublicLoginRoute() {
  const { user, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#101417] p-4">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="animate-spin text-[#F5A623]" size={32} />
          <p className="text-sm font-semibold text-[#A8A8A3]">Restoring Road Reality session...</p>
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

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("[Road Reality ErrorBoundary]", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen grid place-items-center bg-[#101417] text-[#F5F2ED] p-4">
          <div className="max-w-md w-full rounded-3xl border border-[#EF4444]/40 bg-[#191D20] p-8 text-center shadow-2xl space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30">
              <AlertTriangle size={28} />
            </div>
            <h1 className="text-xl font-black font-display">Something went wrong</h1>
            <p className="text-xs text-[#A8A8A3] leading-relaxed">
              {this.state.error?.message || "An unexpected rendering error occurred."}
            </p>
            <div className="flex gap-3 justify-center pt-2">
              <button
                onClick={() => window.location.reload()}
                className="btn btn-accent text-xs font-bold py-2.5 px-5"
              >
                Reload Page
              </button>
              <a
                href="/"
                className="btn btn-secondary text-xs font-bold py-2.5 px-5"
              >
                Return Home
              </a>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
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
    </ErrorBoundary>
  );
}
