import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ShieldAlert,
  Users,
  Briefcase,
  BarChart3,
  Settings,
  Shield,
  RefreshCw,
  Search,
  Filter,
  ExternalLink,
  Eye,
  CheckCircle2,
  Clock,
  AlertTriangle,
  UserCheck,
  UserX,
  Trash2,
  MapPin,
  Calendar,
  Building2,
  X,
  ChevronRight,
  Check,
  FileText,
  Mail,
  TrendingUp,
  Activity,
  Crown,
  Layers,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  getAdminReports,
  getAdminStats,
  getAdminUsers,
  updateAdminReport,
  updateUserRole,
  deleteHazard
} from '../services/hazardService';
import { Badge } from '../components/Badges';

const AUTHORITY_DEPARTMENTS = [
  'BBMP / City Roads & Pavements Dept',
  'City Traffic Police & Management',
  'Stormwater & Sewerage Drainage Board',
  'Electricity & Streetlighting Authority (BESCOM)',
  'Disaster Emergency Response & Fire Services',
  'Sanitation & Solid Waste Management'
];

export default function AdminDashboard() {
  const { user: currentUser, isAdmin, loading: authLoading, session } = useAuth();
  const navigate = useNavigate();

  // Sidebar navigation tabs: 'dashboard' | 'reports' | 'users' | 'assignments' | 'analytics' | 'settings'
  const [activeTab, setActiveTab] = useState('dashboard');

  const [stats, setStats] = useState({
    totalUsers: 0,
    totalReports: 0,
    newReports: 0,
    activeReports: 0,
    verifiedReports: 0,
    inProgressReports: 0,
    resolvedReports: 0,
    awaitingVerification: 0
  });

  const [usersList, setUsersList] = useState([]);
  const [reportsList, setReportsList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [assignmentFilter, setAssignmentFilter] = useState('ALL');

  // Modal State for "View Details"
  const [selectedReport, setSelectedReport] = useState(null);
  const [modalStatus, setModalStatus] = useState('');
  const [modalAssignment, setModalAssignment] = useState('');

  // Notifications & loading indicators
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [copiedSql, setCopiedSql] = useState(false);

  // Load all live admin data from backend/Supabase
  const loadPortalData = async () => {
    if (!session?.access_token) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      const [statsData, usersData, reportsData] = await Promise.all([
        getAdminStats(session.access_token),
        getAdminUsers(session.access_token),
        getAdminReports(session.access_token)
      ]);

      if (statsData) setStats(statsData);
      setUsersList(usersData || []);
      setReportsList(reportsData || []);
    } catch (err) {
      console.error('Admin portal data fetch error:', err);
      setErrorMessage(err.message || 'Failed to load admin portal data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin && session?.access_token) {
      loadPortalData();
    }
  }, [isAdmin, session]);

  // Open Report Details Modal
  const handleOpenDetails = (report) => {
    setSelectedReport(report);
    setModalStatus(report.rawStatus || report.status?.toUpperCase() || 'REPORTED');
    setModalAssignment(report.assigned_to || '');
  };

  // Close Report Details Modal
  const handleCloseDetails = () => {
    setSelectedReport(null);
    setModalStatus('');
    setModalAssignment('');
  };

  // Save changes from inside details modal
  const handleSaveModalChanges = async () => {
    if (!selectedReport) return;
    setActionLoadingId(selectedReport.id);
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      const res = await updateAdminReport(
        selectedReport.id,
        { status: modalStatus, assigned_to: modalAssignment },
        session?.access_token
      );

      const updatedReport = res.data;
      setReportsList((prev) =>
        prev.map((r) => (r.id === selectedReport.id ? { ...r, ...updatedReport } : r))
      );
      setSelectedReport({ ...selectedReport, ...updatedReport });
      setStatusMessage(`Report #${String(selectedReport.id).substring(0, 8)} updated successfully.`);

      const newStats = await getAdminStats(session?.access_token);
      if (newStats) setStats(newStats);
    } catch (err) {
      console.error('Modal update error:', err);
      setErrorMessage(err.message || 'Failed to update report.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Quick inline status change
  const handleStatusChange = async (reportId, newStatus) => {
    setActionLoadingId(reportId);
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      const res = await updateAdminReport(reportId, { status: newStatus }, session?.access_token);
      setReportsList((prev) =>
        prev.map((r) => (r.id === reportId ? { ...r, ...res.data } : r))
      );
      setStatusMessage(`Report status updated to ${newStatus}.`);

      const newStats = await getAdminStats(session?.access_token);
      if (newStats) setStats(newStats);
    } catch (err) {
      console.error('Status update error:', err);
      setErrorMessage(err.message || 'Failed to update status.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Quick inline authority assignment
  const handleAssignmentChange = async (reportId, newAssignment) => {
    setActionLoadingId(reportId);
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      const res = await updateAdminReport(reportId, { assigned_to: newAssignment }, session?.access_token);
      setReportsList((prev) =>
        prev.map((r) => (r.id === reportId ? { ...r, ...res.data } : r))
      );
      setStatusMessage(`Report assigned to ${newAssignment || 'Unassigned'}.`);
    } catch (err) {
      console.error('Assignment error:', err);
      setErrorMessage(err.message || 'Failed to assign report.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Promote or demote user role
  const handleRoleChange = async (targetUserId, newRole) => {
    setActionLoadingId(targetUserId);
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      const res = await updateUserRole(targetUserId, newRole, session?.access_token);
      setStatusMessage(res.message || `User role updated to '${newRole}'.`);

      setUsersList((prev) =>
        prev.map((u) => (u.id === targetUserId ? { ...u, role: newRole } : u))
      );

      const newStats = await getAdminStats(session?.access_token);
      if (newStats) setStats(newStats);
    } catch (err) {
      console.error('Role update error:', err);
      setErrorMessage(err.message || 'Failed to update user role.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Delete a report
  const handleDeleteReport = async (reportId) => {
    if (!window.confirm('Are you sure you want to permanently delete this report?')) return;
    setActionLoadingId(reportId);
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      await deleteHazard(reportId, session?.access_token);
      setReportsList((prev) => prev.filter((r) => r.id !== reportId));
      setStatusMessage(`Report deleted successfully.`);

      const newStats = await getAdminStats(session?.access_token);
      if (newStats) setStats(newStats);
    } catch (err) {
      console.error('Delete error:', err);
      setErrorMessage(err.message || 'Failed to delete report.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Copy SQL snippet
  const handleCopySql = () => {
    const sqlText = `UPDATE public.profiles\nSET role = 'admin', updated_at = now()\nWHERE id = (SELECT id FROM auth.users WHERE email = 'suhaspai13@gmail.com' LIMIT 1);`;
    navigator.clipboard.writeText(sqlText);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  // Auth Loading Screen
  if (authLoading) {
    return (
      <main className="page grid place-items-center bg-slate-50 p-4 min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="animate-spin text-teal-600" size={32} />
          <p className="text-sm font-semibold text-slate-600">Verifying administrator authorization...</p>
        </div>
      </main>
    );
  }

  // Access Control Screen for non-admin accounts
  if (!isAdmin) {
    return (
      <main className="page grid place-items-center bg-slate-50 p-4 min-h-screen">
        <div className="max-w-md w-full rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-800">
            <ShieldAlert size={32} />
          </div>

          <h1 className="mt-5 text-2xl font-black text-slate-900">Admin Authorization Required</h1>

          {currentUser ? (
            <>
              <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                You are authenticated as <span className="font-bold text-slate-800">{currentUser.email}</span>, but your account is not yet assigned the <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-900 font-bold">admin</code> role.
              </p>
              <div className="mt-5 p-4 rounded-xl bg-slate-50 border border-slate-200 text-left text-xs">
                <p className="font-bold text-slate-800 mb-1">To enable this account as Admin:</p>
                <p className="text-slate-500 mb-2">Run this query in your Supabase SQL Editor:</p>
                <pre className="block bg-slate-900 text-teal-300 p-2.5 rounded-lg font-mono text-[11px] overflow-x-auto select-all">
{`UPDATE public.profiles
SET role = 'admin', updated_at = now()
WHERE id = (SELECT id FROM auth.users WHERE email = '${currentUser.email}' LIMIT 1);`}
                </pre>
              </div>
            </>
          ) : (
            <p className="mt-3 text-sm text-slate-600 leading-relaxed">
              Please sign in with an authorized Google administrator account.
            </p>
          )}

          <div className="mt-6 flex flex-col gap-2">
            <button
              onClick={() => navigate('/')}
              className="w-full rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-teal-700 transition"
            >
              Return to Application Home
            </button>
            {currentUser && (
              <button
                onClick={() => window.location.reload()}
                className="w-full rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
              >
                Re-check Admin Role
              </button>
            )}
          </div>
        </div>
      </main>
    );
  }

  // Filtered reports
  const filteredReports = reportsList.filter((r) => {
    // Status filter
    if (statusFilter !== 'ALL') {
      const rStatus = (r.rawStatus || r.status || '').toUpperCase();
      if (statusFilter === 'IN_PROGRESS' && (rStatus !== 'IN_PROGRESS' && rStatus !== 'IN PROGRESS')) {
        return false;
      } else if (statusFilter !== 'IN_PROGRESS' && rStatus !== statusFilter) {
        return false;
      }
    }

    // Category filter
    if (categoryFilter !== 'ALL' && r.category !== categoryFilter) {
      return false;
    }

    // Assignment filter
    if (assignmentFilter !== 'ALL') {
      if (assignmentFilter === 'UNASSIGNED') {
        if (r.assigned_to && r.assigned_to.trim() !== '') return false;
      } else if (r.assigned_to !== assignmentFilter) {
        return false;
      }
    }

    // Search query
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (r.id && String(r.id).toLowerCase().includes(q)) ||
      (r.category && r.category.toLowerCase().includes(q)) ||
      (r.address && r.address.toLowerCase().includes(q)) ||
      (r.description && r.description.toLowerCase().includes(q)) ||
      (r.status && r.status.toLowerCase().includes(q)) ||
      (r.assigned_to && r.assigned_to.toLowerCase().includes(q)) ||
      (r.reporter?.name && r.reporter.name.toLowerCase().includes(q)) ||
      (r.reporter?.email && r.reporter.email.toLowerCase().includes(q))
    );
  });

  // Filtered users
  const filteredUsers = usersList.filter((u) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.role && u.role.toLowerCase().includes(q))
    );
  });

  const adminUsersList = usersList.filter((u) => u.role === 'admin');

  // Analytics aggregates
  const categoryCounts = reportsList.reduce((acc, r) => {
    const cat = r.category || 'Other';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});

  const severityCounts = reportsList.reduce((acc, r) => {
    const sev = (r.severity || 'medium').toLowerCase();
    acc[sev] = (acc[sev] || 0) + 1;
    return acc;
  }, {});

  const resolutionRate = stats.totalReports > 0
    ? Math.round((stats.resolvedReports / stats.totalReports) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Console Bar */}
      <div className="border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-[#0B3B3C] text-white">
              <Crown size={16} className="text-amber-400 fill-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-black text-slate-900 tracking-tight">Authority Admin Portal</h1>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                  Live Supabase
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Logged in as <span className="font-semibold text-slate-700">{currentUser?.email}</span> (Administrator)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadPortalData}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-xs"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin text-teal-600' : 'text-slate-500'} />
              <span>Refresh Data</span>
            </button>

            <Link
              to="/"
              className="flex items-center gap-1.5 rounded-xl bg-teal-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-teal-700 transition shadow-xs"
            >
              <span>Back to App</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </div>

      {/* Main Admin Layout with Sidebar + Content */}
      <div className="mx-auto max-w-7xl w-full flex-1 p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left Sidebar */}
        <aside className="lg:col-span-1">
          <div className="sticky top-20 rounded-2xl border border-slate-200 bg-white p-3 shadow-xs space-y-1">
            <p className="px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
              Admin Navigation
            </p>

            {[
              { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
              { id: 'reports', label: `Reports (${reportsList.length})`, icon: ShieldAlert },
              { id: 'users', label: `Users (${usersList.length})`, icon: Users },
              { id: 'assignments', label: 'Assignments', icon: Briefcase },
              { id: 'analytics', label: 'Analytics', icon: BarChart3 },
              { id: 'settings', label: 'Settings', icon: Settings }
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setSearchQuery('');
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition text-left ${
                    isActive
                      ? 'bg-[#0B3B3C] text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Icon size={16} className={isActive ? 'text-amber-400' : 'text-slate-400'} />
                  <span>{item.label}</span>
                </button>
              );
            })}

            <div className="pt-3 mt-3 border-t border-slate-100 px-3">
              <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                <p className="text-[11px] font-bold text-slate-800">Resolution Rate</p>
                <div className="mt-1 flex items-center justify-between text-xs">
                  <span className="font-black text-emerald-700">{resolutionRate}%</span>
                  <span className="text-[10px] text-slate-500">{stats.resolvedReports}/{stats.totalReports} Closed</span>
                </div>
                <div className="mt-1.5 h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${resolutionRate}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Right Content Area */}
        <div className="lg:col-span-4 space-y-6">
          {/* Status Message Notification */}
          {statusMessage && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-800 flex items-center justify-between shadow-xs">
              <span className="flex items-center gap-2 font-medium">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                {statusMessage}
              </span>
              <button
                onClick={() => setStatusMessage(null)}
                className="text-[11px] font-bold text-emerald-900 hover:underline"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Error Message Notification */}
          {errorMessage && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-800 flex items-center justify-between shadow-xs">
              <span className="flex items-center gap-2 font-medium">
                <AlertTriangle size={16} className="text-red-600 shrink-0" />
                {errorMessage}
              </span>
              <button
                onClick={() => setErrorMessage(null)}
                className="text-[11px] font-bold text-red-900 hover:underline"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* ==================================================================== */}
          {/* 1. DASHBOARD TAB */}
          {/* ==================================================================== */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Four Primary Statistics Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Reports */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Reports</span>
                    <span className="grid h-8 w-8 place-items-center rounded-xl bg-slate-100 text-slate-700">
                      <FileText size={16} />
                    </span>
                  </div>
                  <div className="mt-3">
                    <p className="text-3xl font-black text-slate-900 tracking-tight">{stats.totalReports}</p>
                    <p className="text-[11px] text-slate-500 mt-1">All crowdsourced submissions</p>
                  </div>
                </div>

                {/* New Reports */}
                <div className="rounded-2xl border border-amber-200 bg-white p-5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">New Reports</span>
                    <span className="grid h-8 w-8 place-items-center rounded-xl bg-amber-50 text-amber-700">
                      <Clock size={16} />
                    </span>
                  </div>
                  <div className="mt-3">
                    <p className="text-3xl font-black text-amber-900 tracking-tight">
                      {stats.newReports || stats.awaitingVerification || 0}
                    </p>
                    <p className="text-[11px] text-amber-600 mt-1">Awaiting verification</p>
                  </div>
                </div>

                {/* In Progress */}
                <div className="rounded-2xl border border-purple-200 bg-white p-5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-700 uppercase tracking-wider">In Progress</span>
                    <span className="grid h-8 w-8 place-items-center rounded-xl bg-purple-50 text-purple-700">
                      <Activity size={16} />
                    </span>
                  </div>
                  <div className="mt-3">
                    <p className="text-3xl font-black text-purple-900 tracking-tight">
                      {stats.inProgressReports || 0}
                    </p>
                    <p className="text-[11px] text-purple-600 mt-1">Assigned & under repair</p>
                  </div>
                </div>

                {/* Resolved */}
                <div className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Resolved</span>
                    <span className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
                      <CheckCircle2 size={16} />
                    </span>
                  </div>
                  <div className="mt-3">
                    <p className="text-3xl font-black text-emerald-900 tracking-tight">
                      {stats.resolvedReports || 0}
                    </p>
                    <p className="text-[11px] text-emerald-600 mt-1">Repaired & verified safe</p>
                  </div>
                </div>
              </div>

              {/* Recent Reports Table */}
              <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-black text-slate-900">Recent Reports</h2>
                    <p className="text-xs text-slate-500">Latest hazard reports submitted by citizens</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveTab('reports')}
                      className="text-xs font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1"
                    >
                      <span>View All Reports ({reportsList.length})</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px] text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-100 font-bold uppercase text-[10px] text-slate-500 tracking-wider">
                      <tr>
                        <th className="py-3 px-4">Report ID</th>
                        <th className="py-3 px-4">Issue Category</th>
                        <th className="py-3 px-4">Location</th>
                        <th className="py-3 px-4">Reporter Name</th>
                        <th className="py-3 px-4">Reporter Email</th>
                        <th className="py-3 px-4">Date and Time</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">View Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {reportsList.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-slate-400">
                            No reports have been submitted yet.
                          </td>
                        </tr>
                      ) : (
                        reportsList.slice(0, 7).map((r) => {
                          const displayDate = r.reportedAt
                            ? new Date(r.reportedAt).toLocaleDateString()
                            : 'N/A';
                          const displayTime = r.reportedAt
                            ? new Date(r.reportedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : '';

                          return (
                            <tr key={r.id} className="hover:bg-slate-50/80 transition">
                              <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                                #{String(r.id).substring(0, 8)}
                              </td>

                              <td className="py-3.5 px-4 font-bold text-slate-900">
                                {r.category}
                              </td>

                              <td className="py-3.5 px-4 max-w-[200px]">
                                <span className="truncate block text-slate-600" title={r.address}>
                                  {r.address}
                                </span>
                              </td>

                              <td className="py-3.5 px-4 font-semibold text-slate-800">
                                {r.reporter?.name || 'Community Member'}
                              </td>

                              <td className="py-3.5 px-4 font-mono text-slate-500 truncate max-w-[150px]" title={r.reporter?.email}>
                                {r.reporter?.email || 'N/A'}
                              </td>

                              <td className="py-3.5 px-4 whitespace-nowrap text-slate-600">
                                <span>{displayDate}</span>
                                {displayTime && <span className="text-slate-400 ml-1.5">{displayTime}</span>}
                              </td>

                              <td className="py-3.5 px-4">
                                <Badge value={r.status} />
                              </td>

                              <td className="py-3.5 px-4 text-right">
                                <button
                                  onClick={() => handleOpenDetails(r)}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 transition"
                                >
                                  <Eye size={13} />
                                  <span>View Details</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Quick Summary Panels */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Municipal Assignments Snapshot */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Briefcase size={16} className="text-teal-600" />
                      Department Workloads
                    </h3>
                    <button
                      onClick={() => setActiveTab('assignments')}
                      className="text-xs font-bold text-teal-700 hover:underline"
                    >
                      Manage
                    </button>
                  </div>
                  <div className="space-y-2">
                    {AUTHORITY_DEPARTMENTS.slice(0, 4).map((dept) => {
                      const count = reportsList.filter((r) => r.assigned_to === dept).length;
                      return (
                        <div key={dept} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 text-xs">
                          <span className="font-medium text-slate-700 truncate pr-2">{dept}</span>
                          <span className="font-bold text-slate-900 bg-white border px-2 py-0.5 rounded-md">
                            {count}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Administrators Roster Snapshot */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Crown size={16} className="text-amber-500 fill-amber-500" />
                      Authorized Administrators
                    </h3>
                    <button
                      onClick={() => setActiveTab('users')}
                      className="text-xs font-bold text-teal-700 hover:underline"
                    >
                      Manage
                    </button>
                  </div>
                  <div className="space-y-2">
                    {adminUsersList.slice(0, 4).map((u) => (
                      <div key={u.id} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 text-xs">
                        <div className="flex items-center gap-2 truncate pr-2">
                          <div className="grid h-6 w-6 place-items-center rounded-full bg-slate-800 text-white font-bold text-[10px]">
                            {u.name[0]?.toUpperCase()}
                          </div>
                          <span className="font-bold text-slate-900 truncate">{u.name}</span>
                          <span className="text-slate-400 font-mono text-[11px] truncate">({u.email})</span>
                        </div>
                        <span className="rounded-full bg-amber-100 text-amber-800 font-bold px-2 py-0.5 text-[10px]">
                          Admin
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==================================================================== */}
          {/* 2. REPORTS TAB (Full Management & Search) */}
          {/* ==================================================================== */}
          {activeTab === 'reports' && (
            <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
              <div className="p-5 border-b border-slate-100 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-black text-slate-900">Hazard Reports Directory</h2>
                    <p className="text-xs text-slate-500">
                      Inspect details, update statuses, assign authorities, and manage reports
                    </p>
                  </div>

                  {/* Search and Category Filter */}
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
                      <input
                        className="input pl-9 w-full sm:w-60 text-xs py-2"
                        placeholder="Search ID, category, location, reporter..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>

                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="input text-xs font-semibold py-2 px-3 border-slate-300 rounded-xl cursor-pointer bg-white"
                    >
                      <option value="ALL">All Categories</option>
                      <option value="Pothole">Pothole</option>
                      <option value="Waterlogging">Waterlogging</option>
                      <option value="Fallen Tree">Fallen Tree</option>
                      <option value="Road Debris">Road Debris</option>
                      <option value="Broken Streetlight">Broken Streetlight</option>
                      <option value="Blocked Road">Blocked Road</option>
                      <option value="Accident">Accident</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                {/* Status Filter Chips */}
                <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
                  {[
                    { id: 'ALL', label: `All Reports (${reportsList.length})` },
                    { id: 'REPORTED', label: `New (${stats.newReports || 0})` },
                    { id: 'VERIFIED', label: `Verified (${stats.verifiedReports || 0})` },
                    { id: 'IN_PROGRESS', label: `In Progress (${stats.inProgressReports || 0})` },
                    { id: 'RESOLVED', label: `Resolved (${stats.resolvedReports || 0})` }
                  ].map((flt) => (
                    <button
                      key={flt.id}
                      onClick={() => setStatusFilter(flt.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                        statusFilter === flt.id
                          ? 'bg-[#0B3B3C] text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {flt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reports Table */}
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1100px] text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-100 font-bold uppercase text-[10px] text-slate-500 tracking-wider">
                    <tr>
                      <th className="py-3.5 px-4">Report ID</th>
                      <th className="py-3.5 px-4">Photo</th>
                      <th className="py-3.5 px-4">Category</th>
                      <th className="py-3.5 px-4">Location</th>
                      <th className="py-3.5 px-4">Reporter Identity</th>
                      <th className="py-3.5 px-4">Assigned Department</th>
                      <th className="py-3.5 px-4">Status & Update</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredReports.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-400">
                          No reports match your selected filters.
                        </td>
                      </tr>
                    ) : (
                      filteredReports.map((r) => (
                        <tr key={r.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                            #{String(r.id).substring(0, 8)}
                          </td>

                          <td className="py-3.5 px-4">
                            {r.imageUrl ? (
                              <img
                                src={r.imageUrl}
                                alt={r.category}
                                className="h-10 w-10 rounded-lg object-cover border border-slate-200 cursor-pointer"
                                onClick={() => handleOpenDetails(r)}
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-lg bg-slate-100 border border-slate-200 grid place-items-center text-[9px] text-slate-400 font-bold">
                                None
                              </div>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            <p className="font-extrabold text-slate-900">{r.category}</p>
                            <div className="mt-1 flex items-center gap-1">
                              <Badge value={r.severity} kind="severity" />
                            </div>
                          </td>

                          <td className="py-3.5 px-4 max-w-[200px]">
                            <p className="text-slate-700 truncate" title={r.address}>
                              {r.address}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              {r.reportedAt ? new Date(r.reportedAt).toLocaleDateString() : ''}
                            </p>
                          </td>

                          <td className="py-3.5 px-4 max-w-[180px]">
                            <p className="font-bold text-slate-900 truncate">{r.reporter?.name || 'Citizen'}</p>
                            <p className="font-mono text-[10px] text-slate-500 truncate">{r.reporter?.email || 'N/A'}</p>
                          </td>

                          <td className="py-3.5 px-4 max-w-[180px]">
                            <select
                              value={r.assigned_to || ''}
                              onChange={(e) => handleAssignmentChange(r.id, e.target.value)}
                              disabled={actionLoadingId === r.id}
                              className="w-full text-[11px] font-semibold py-1 px-2 rounded-lg border border-slate-200 bg-white"
                            >
                              <option value="">-- Unassigned --</option>
                              {AUTHORITY_DEPARTMENTS.map((dept) => (
                                <option key={dept} value={dept}>
                                  {dept}
                                </option>
                              ))}
                            </select>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5">
                              <select
                                value={r.rawStatus || 'REPORTED'}
                                onChange={(e) => handleStatusChange(r.id, e.target.value)}
                                disabled={actionLoadingId === r.id}
                                className="text-xs font-bold py-1 px-2 rounded-lg border border-slate-200 bg-white"
                              >
                                <option value="REPORTED">REPORTED</option>
                                <option value="VERIFIED">VERIFIED</option>
                                <option value="IN_PROGRESS">IN_PROGRESS</option>
                                <option value="RESOLVED">RESOLVED</option>
                              </select>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleOpenDetails(r)}
                                className="p-1.5 rounded-lg text-teal-700 bg-teal-50 hover:bg-teal-100 transition font-bold"
                                title="View Complete Report Details"
                              >
                                <Eye size={14} />
                              </button>

                              <button
                                onClick={() => handleDeleteReport(r.id)}
                                disabled={actionLoadingId === r.id}
                                className="p-1.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 transition"
                                title="Delete Hazard Report"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ==================================================================== */}
          {/* 3. USERS TAB */}
          {/* ==================================================================== */}
          {activeTab === 'users' && (
            <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-black text-slate-900">Registered Users Directory</h2>
                  <p className="text-xs text-slate-500">
                    Citizens and administrators authenticated via Google OAuth
                  </p>
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
                  <input
                    className="input pl-9 w-full sm:w-64 text-xs py-2"
                    placeholder="Search name, email, role..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[750px] text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-100 font-bold uppercase text-[10px] text-slate-500 tracking-wider">
                    <tr>
                      <th className="py-3.5 px-4">User</th>
                      <th className="py-3.5 px-4">Email</th>
                      <th className="py-3.5 px-4">Role</th>
                      <th className="py-3.5 px-4">Joined Date</th>
                      <th className="py-3.5 px-4 text-center">Reports Submitted</th>
                      <th className="py-3.5 px-4 text-right">Role Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400">
                          No registered users found.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => {
                        const isSelf = currentUser?.id === u.id;
                        const isAdminUser = u.role === 'admin';

                        return (
                          <tr key={u.id} className="hover:bg-slate-50/80 transition">
                            <td className="py-3.5 px-4 flex items-center gap-2.5">
                              {u.avatar_url ? (
                                <img
                                  src={u.avatar_url}
                                  alt={u.name}
                                  className="h-8 w-8 rounded-full object-cover border border-slate-200"
                                />
                              ) : (
                                <div className="grid h-8 w-8 place-items-center rounded-full bg-slate-800 text-white font-bold text-xs">
                                  {u.name[0]?.toUpperCase()}
                                </div>
                              )}
                              <div>
                                <p className="font-bold text-slate-900">{u.name}</p>
                                {isSelf && <span className="text-[10px] font-bold text-teal-600">(Your Session)</span>}
                              </div>
                            </td>

                            <td className="py-3.5 px-4 font-mono text-slate-600">{u.email}</td>

                            <td className="py-3.5 px-4">
                              {isAdminUser ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-800">
                                  <Crown size={11} className="fill-amber-500 text-amber-500" /> Admin
                                </span>
                              ) : (
                                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                                  Citizen
                                </span>
                              )}
                            </td>

                            <td className="py-3.5 px-4 text-slate-500">
                              {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}
                            </td>

                            <td className="py-3.5 px-4 text-center font-bold text-slate-800">
                              {u.reportCount || 0}
                            </td>

                            <td className="py-3.5 px-4 text-right">
                              {isAdminUser ? (
                                <button
                                  onClick={() => handleRoleChange(u.id, 'user')}
                                  disabled={actionLoadingId === u.id || adminUsersList.length <= 1}
                                  className="inline-flex items-center gap-1 rounded-xl border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 transition disabled:opacity-40"
                                  title={adminUsersList.length <= 1 ? 'Cannot demote the last remaining admin' : 'Remove Admin Privileges'}
                                >
                                  <UserX size={13} />
                                  <span>Demote to User</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleRoleChange(u.id, 'admin')}
                                  disabled={actionLoadingId === u.id}
                                  className="inline-flex items-center gap-1 rounded-xl border border-amber-200 bg-white px-3 py-1.5 text-xs font-bold text-amber-800 hover:bg-amber-50 transition"
                                >
                                  <UserCheck size={13} />
                                  <span>Promote to Admin</span>
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ==================================================================== */}
          {/* 4. ASSIGNMENTS TAB */}
          {/* ==================================================================== */}
          {activeTab === 'assignments' && (
            <div className="space-y-6">
              {/* Department Overview Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {AUTHORITY_DEPARTMENTS.map((dept) => {
                  const assignedReports = reportsList.filter((r) => r.assigned_to === dept);
                  const isSelected = assignmentFilter === dept;
                  return (
                    <div
                      key={dept}
                      onClick={() => setAssignmentFilter(isSelected ? 'ALL' : dept)}
                      className={`cursor-pointer rounded-2xl border p-4 transition shadow-xs ${
                        isSelected
                          ? 'border-teal-500 bg-teal-50/50 ring-2 ring-teal-200'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <Building2 size={18} className="text-teal-700" />
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-800">
                          {assignedReports.length} Reports
                        </span>
                      </div>
                      <h4 className="mt-2 text-xs font-bold text-slate-900 leading-tight">{dept}</h4>
                      <p className="mt-1 text-[11px] text-slate-500">
                        {assignedReports.filter((r) => r.rawStatus === 'RESOLVED').length} resolved
                      </p>
                    </div>
                  );
                })}

                {/* Unassigned Card */}
                <div
                  onClick={() => setAssignmentFilter(assignmentFilter === 'UNASSIGNED' ? 'ALL' : 'UNASSIGNED')}
                  className={`cursor-pointer rounded-2xl border p-4 transition shadow-xs ${
                    assignmentFilter === 'UNASSIGNED'
                      ? 'border-amber-500 bg-amber-50/50 ring-2 ring-amber-200'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <AlertTriangle size={18} className="text-amber-600" />
                    <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                      {reportsList.filter((r) => !r.assigned_to).length} Unassigned
                    </span>
                  </div>
                  <h4 className="mt-2 text-xs font-bold text-slate-900 leading-tight">Unassigned Hazards</h4>
                  <p className="mt-1 text-[11px] text-slate-500">Needs municipal department dispatch</p>
                </div>
              </div>

              {/* Department Assignment Table */}
              <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-black text-slate-900">
                      {assignmentFilter === 'ALL'
                        ? 'All Authority Dispatches'
                        : `Assigned: ${assignmentFilter}`}
                    </h3>
                    <p className="text-xs text-slate-500">Reassign or dispatch hazards to local city bodies</p>
                  </div>

                  {assignmentFilter !== 'ALL' && (
                    <button
                      onClick={() => setAssignmentFilter('ALL')}
                      className="text-xs font-bold text-teal-700 hover:underline"
                    >
                      Clear Filter (Show All)
                    </button>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[850px] text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-100 font-bold uppercase text-[10px] text-slate-500 tracking-wider">
                      <tr>
                        <th className="py-3 px-4">Report ID</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4">Location</th>
                        <th className="py-3 px-4">Current Department</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Reassign</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredReports.map((r) => (
                        <tr key={r.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                            #{String(r.id).substring(0, 8)}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-slate-900">{r.category}</td>
                          <td className="py-3.5 px-4 max-w-[220px] truncate text-slate-600">{r.address}</td>
                          <td className="py-3.5 px-4">
                            <span className="font-semibold text-slate-800">
                              {r.assigned_to || (
                                <span className="text-amber-600 font-bold">Unassigned</span>
                              )}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <Badge value={r.status} />
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <select
                              value={r.assigned_to || ''}
                              onChange={(e) => handleAssignmentChange(r.id, e.target.value)}
                              disabled={actionLoadingId === r.id}
                              className="text-xs font-bold py-1 px-2.5 rounded-xl border border-slate-300 bg-white"
                            >
                              <option value="">-- Unassigned --</option>
                              {AUTHORITY_DEPARTMENTS.map((dept) => (
                                <option key={dept} value={dept}>
                                  {dept}
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ==================================================================== */}
          {/* 5. ANALYTICS TAB */}
          {/* ==================================================================== */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              {/* Category Breakdown */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
                  <BarChart3 size={16} className="text-teal-600" />
                  Hazards by Category
                </h3>
                <p className="text-xs text-slate-500 mb-4">Distribution of reported issues across the city</p>

                <div className="space-y-3">
                  {Object.entries(categoryCounts).map(([cat, count]) => {
                    const pct = stats.totalReports > 0 ? Math.round((count / stats.totalReports) * 100) : 0;
                    return (
                      <div key={cat} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span className="text-slate-800">{cat}</span>
                          <span className="text-slate-500 font-bold">{count} ({pct}%)</span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-teal-600 rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Severity & Resolution Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                  <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <Activity size={16} className="text-purple-600" />
                    Severity Breakdown
                  </h3>
                  <div className="space-y-2.5">
                    {['critical', 'high', 'medium', 'low'].map((sev) => {
                      const count = severityCounts[sev] || 0;
                      const pct = stats.totalReports > 0 ? Math.round((count / stats.totalReports) * 100) : 0;
                      return (
                        <div key={sev} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 text-xs">
                          <span className="font-bold uppercase text-slate-700">{sev}</span>
                          <span className="font-bold text-slate-900">{count} ({pct}%)</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                  <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <TrendingUp size={16} className="text-emerald-600" />
                    Resolution Efficiency
                  </h3>
                  <div className="space-y-3">
                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-center">
                      <p className="text-3xl font-black text-emerald-800">{resolutionRate}%</p>
                      <p className="text-xs font-bold text-emerald-900 mt-1">Hazard Clearance Rate</p>
                    </div>
                    <div className="text-xs text-slate-600 space-y-1">
                      <p>• {stats.resolvedReports} of {stats.totalReports} total reports fully resolved.</p>
                      <p>• {stats.inProgressReports} actively undergoing roadwork repair.</p>
                      <p>• {stats.newReports || 0} awaiting preliminary inspection.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==================================================================== */}
          {/* 6. SETTINGS TAB */}
          {/* ==================================================================== */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              {/* Authority Notification Settings */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                <h3 className="text-base font-black text-slate-900 mb-1 flex items-center gap-2">
                  <Mail size={18} className="text-teal-600" />
                  Municipal Authority Alerts
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  Whenever a citizen reports an issue, an alert email is dispatched to the configured authority mailbox.
                </p>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-700">Authority Dispatch Mailbox:</span>
                    <span className="font-mono font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                      authority@roadreality.gov
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-700">Notification Dispatcher:</span>
                    <span className="font-semibold text-emerald-700">Nodemailer (Active on Server)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-700">Reporter Privacy Protection:</span>
                    <span className="font-semibold text-emerald-700">Enabled (Masked on public API)</span>
                  </div>
                </div>
              </div>

              {/* Administrator Promotion Helper */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                <h3 className="text-base font-black text-slate-900 mb-1 flex items-center gap-2">
                  <Crown size={18} className="text-amber-500 fill-amber-500" />
                  Administrator Promotion SQL
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  Run this exact SQL command in your Supabase SQL Editor to grant administrator privileges to <span className="font-bold text-slate-800">suhaspai13@gmail.com</span>:
                </p>

                <div className="relative">
                  <pre className="block bg-slate-900 text-teal-300 p-4 rounded-xl font-mono text-xs overflow-x-auto select-all leading-relaxed">
{`UPDATE public.profiles
SET role = 'admin', updated_at = now()
WHERE id = (SELECT id FROM auth.users WHERE email = 'suhaspai13@gmail.com' LIMIT 1);`}
                  </pre>

                  <button
                    onClick={handleCopySql}
                    className="absolute top-3 right-3 flex items-center gap-1 rounded-lg bg-slate-800 border border-slate-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-700 transition"
                  >
                    {copiedSql ? (
                      <>
                        <Check size={13} className="text-emerald-400" />
                        <span className="text-emerald-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <span>Copy SQL</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ==================================================================== */}
      {/* REPORT DETAILS & PHOTO MODAL ("View Details") */}
      {/* ==================================================================== */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-5">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[11px] font-mono font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-md">
                  #{String(selectedReport.id).substring(0, 8)}
                </span>
                <h2 className="text-xl font-black text-slate-900 mt-1.5">{selectedReport.category}</h2>
              </div>

              <button
                onClick={handleCloseDetails}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* Photo Section */}
            {selectedReport.imageUrl ? (
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 max-h-72">
                <img
                  src={selectedReport.imageUrl}
                  alt={selectedReport.category}
                  className="w-full h-full object-cover max-h-72"
                />
                <a
                  href={selectedReport.imageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-xl bg-slate-900/80 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-900 transition backdrop-blur-xs"
                >
                  <ExternalLink size={13} />
                  <span>Open Full Photo</span>
                </a>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-xs text-slate-400">
                No photo submitted for this hazard report.
              </div>
            )}

            {/* Status & Department Update Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-2xl bg-slate-50 p-4 border border-slate-200">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Update Report Status
                </label>
                <select
                  value={modalStatus}
                  onChange={(e) => setModalStatus(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800"
                >
                  <option value="REPORTED">REPORTED (New / Unverified)</option>
                  <option value="VERIFIED">VERIFIED (Confirmed by Admin)</option>
                  <option value="IN_PROGRESS">IN_PROGRESS (Crew Dispatched)</option>
                  <option value="RESOLVED">RESOLVED (Repaired & Closed)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Assign Municipal Authority
                </label>
                <select
                  value={modalAssignment}
                  onChange={(e) => setModalAssignment(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800"
                >
                  <option value="">-- Unassigned --</option>
                  {AUTHORITY_DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Report Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-xl border border-slate-100 bg-white">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Location</span>
                <p className="mt-1 font-bold text-slate-800 flex items-start gap-1">
                  <MapPin size={14} className="text-teal-600 shrink-0 mt-0.5" />
                  <span>{selectedReport.address}</span>
                </p>
                {selectedReport.latitude && selectedReport.longitude && (
                  <a
                    href={`https://www.google.com/maps?q=${selectedReport.latitude},${selectedReport.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-teal-700 hover:underline"
                  >
                    <ExternalLink size={11} />
                    <span>Open in Google Maps ({selectedReport.latitude.toFixed(4)}, {selectedReport.longitude.toFixed(4)})</span>
                  </a>
                )}
              </div>

              <div className="p-3.5 rounded-xl border border-slate-100 bg-white">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Reporter Identity</span>
                <p className="mt-1 font-bold text-slate-900">{selectedReport.reporter?.name || 'Citizen'}</p>
                <p className="font-mono text-slate-500 mt-0.5">{selectedReport.reporter?.email || 'Not provided'}</p>
                <p className="text-[10px] text-slate-400 mt-2">
                  Submitted: {selectedReport.reportedAt ? new Date(selectedReport.reportedAt).toLocaleString() : 'N/A'}
                </p>
              </div>
            </div>

            {/* Description */}
            <div className="rounded-xl border border-slate-100 bg-white p-4 text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Citizen Description</span>
              <p className="mt-1 text-slate-700 leading-relaxed italic">
                {selectedReport.description ? `"${selectedReport.description}"` : 'No additional description provided.'}
              </p>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                onClick={handleCloseDetails}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
              >
                Cancel
              </button>

              <button
                onClick={handleSaveModalChanges}
                disabled={actionLoadingId === selectedReport.id}
                className="flex items-center gap-1.5 rounded-xl bg-teal-600 px-5 py-2 text-xs font-bold text-white hover:bg-teal-700 transition shadow-sm disabled:opacity-50"
              >
                {actionLoadingId === selectedReport.id ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <>
                    <Check size={14} />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
