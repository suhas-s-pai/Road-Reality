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
  ArrowRight,
  UserPlus,
  Send,
  Key,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  getAdminReports,
  getAdminStats,
  getAdminUsers,
  updateAdminReport,
  updateUserRole,
  deleteHazard,
  getHazards,
  getAdminManagementData,
  addAdminAccount,
  removeAdminAccount,
  cancelAdminInvitation
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
  const { user: currentUser, isAdmin, loading: authLoading, session, refreshRole, setRole } = useAuth();
  const navigate = useNavigate();

  // Sidebar navigation tabs: 'dashboard' | 'reports' | 'adminManagement' | 'users' | 'assignments' | 'analytics' | 'settings'
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

  // Admin Access & Management State
  const [adminsList, setAdminsList] = useState([]);
  const [invitationsList, setInvitationsList] = useState([]);
  const [auditLogsList, setAuditLogsList] = useState([]);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [isAddingAdmin, setIsAddingAdmin] = useState(false);
  const [confirmRemovalModal, setConfirmRemovalModal] = useState({ open: false, target: null, isSelfDemotion: false });

  // Filters & search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('ALL');
  const [assignmentFilter, setAssignmentFilter] = useState('ALL');

  // Modal State for "View Details"
  const [selectedReport, setSelectedReport] = useState(null);
  const [modalStatus, setModalStatus] = useState('');
  const [modalAssignment, setModalAssignment] = useState('');
  const [modalNotes, setModalNotes] = useState('');

  // Notifications & loading indicators
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [copiedSql, setCopiedSql] = useState(false);

  // Load admin management dataset (admins, invitations, audit logs)
  const loadAdminManagementData = async () => {
    if (!session?.access_token) return;
    try {
      const data = await getAdminManagementData(session.access_token);
      if (data && data.success) {
        setAdminsList(data.admins || []);
        setInvitationsList(data.invitations || []);
        setAuditLogsList(data.auditLogs || []);
      }
    } catch (err) {
      console.warn('Failed to load admin management data:', err.message);
    }
  };

  // Load all live admin data from backend/Supabase
  const loadPortalData = async () => {
    if (!session?.access_token) {
      setErrorMessage("No active session token found. Please ensure you are logged in.");
      return;
    }
    setLoading(true);
    setErrorMessage(null);
    try {
      const [statsRes, usersRes, reportsRes] = await Promise.allSettled([
        getAdminStats(session.access_token),
        getAdminUsers(session.access_token),
        getAdminReports(session.access_token).catch(() => getHazards().then((r) => r.data))
      ]);

      if (statsRes.status === 'fulfilled' && statsRes.value) {
        setStats(statsRes.value);
      }
      if (usersRes.status === 'fulfilled' && usersRes.value) {
        setUsersList(usersRes.value);
      }
      if (reportsRes.status === 'fulfilled' && reportsRes.value) {
        setReportsList(reportsRes.value);
      }

      await loadAdminManagementData();

      const failures = [statsRes, usersRes, reportsRes].filter((r) => r.status === 'rejected');
      if (failures.length > 0) {
        const msg = failures.map((f) => f.reason?.message || 'API request failed').join('. ');
        console.warn('Some admin portal data could not be fetched:', msg);
        if (reportsRes.status === 'rejected') {
          setErrorMessage(msg || 'Failed to load admin reports. Ensure backend is running.');
        }
      }
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
    setModalNotes(report.admin_notes || report.notes || '');
  };

  // Close Report Details Modal
  const handleCloseDetails = () => {
    setSelectedReport(null);
    setModalStatus('');
    setModalAssignment('');
    setModalNotes('');
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
        { status: modalStatus, assigned_to: modalAssignment, admin_notes: modalNotes },
        session?.access_token
      );

      const updatedReport = {
        ...res.data,
        admin_notes: modalNotes
      };
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

  // Add or invite administrator by email
  const handleAddAdmin = async (e) => {
    if (e) e.preventDefault();
    if (!newAdminEmail || !newAdminEmail.trim() || !newAdminEmail.includes('@')) {
      setErrorMessage("Please enter a valid Gmail / email address.");
      return;
    }
    setIsAddingAdmin(true);
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      const res = await addAdminAccount(newAdminEmail.trim(), newAdminName.trim(), session?.access_token);
      setStatusMessage(res.message || "Administrator added / invited successfully.");
      setNewAdminEmail('');
      setNewAdminName('');
      await Promise.all([loadAdminManagementData(), loadPortalData()]);
    } catch (err) {
      console.error("Add admin error:", err);
      setErrorMessage(err.message || "Failed to add administrator.");
    } finally {
      setIsAddingAdmin(false);
    }
  };

  // Open confirmation modal for removing an admin
  const handleInitiateRemoveAdmin = (admin) => {
    if (adminsList.length <= 1) {
      setErrorMessage("Action blocked: Road Reality requires at least one active administrator. Please promote or add another administrator first.");
      return;
    }

    const isSelf = Boolean(
      (currentUser?.id && admin.id && currentUser.id === admin.id) ||
      (currentUser?.email && admin.email && currentUser.email.toLowerCase() === admin.email.toLowerCase())
    );

    setConfirmRemovalModal({
      open: true,
      target: admin,
      isSelfDemotion: isSelf
    });
  };

  // Execute confirmed removal of an administrator
  const handleConfirmRemoveAdmin = async () => {
    if (!confirmRemovalModal.target) return;
    const target = confirmRemovalModal.target;
    const isSelf = confirmRemovalModal.isSelfDemotion;

    setConfirmRemovalModal({ open: false, target: null, isSelfDemotion: false });
    setActionLoadingId(target.id);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const res = await removeAdminAccount({ id: target.id, email: target.email }, session?.access_token);

      if (res.selfDemoted || isSelf) {
        setStatusMessage(res.message || "You have removed your admin privileges.");
        if (setRole) setRole('user');
        if (refreshRole) await refreshRole();
        navigate('/', { replace: true });
        return;
      }

      setStatusMessage(res.message || `Administrator ${target.email} removed.`);
      await Promise.all([loadAdminManagementData(), loadPortalData()]);
    } catch (err) {
      console.error("Remove admin error:", err);
      setErrorMessage(err.message || "Failed to remove administrator.");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Cancel pending invitation
  const handleCancelInvitation = async (invitationId) => {
    setActionLoadingId(invitationId);
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      await cancelAdminInvitation(invitationId, session?.access_token);
      setStatusMessage("Invitation revoked.");
      await loadAdminManagementData();
    } catch (err) {
      setErrorMessage(err.message || "Failed to cancel invitation.");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Promote or demote user role from Users tab
  const handleRoleChange = async (targetUserId, newRole) => {
    if (newRole === 'user') {
      const targetUser = usersList.find((u) => u.id === targetUserId);
      if (targetUser) {
        handleInitiateRemoveAdmin(targetUser);
        return;
      }
    }

    setActionLoadingId(targetUserId);
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      const res = await updateUserRole(targetUserId, newRole, session?.access_token);
      setStatusMessage(res.message || `User role updated to '${newRole}'.`);

      setUsersList((prev) =>
        prev.map((u) => (u.id === targetUserId ? { ...u, role: newRole } : u))
      );

      await Promise.all([loadAdminManagementData(), loadPortalData()]);
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
      <main className="page grid place-items-center bg-[#101417] p-4 min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="animate-spin text-[#F5A623]" size={32} />
          <p className="text-xs font-semibold text-[#A8A8A3]">Verifying administrator credentials...</p>
        </div>
      </main>
    );
  }

  // Access Control Screen for non-admin accounts
  if (!isAdmin) {
    return (
      <main className="page grid place-items-center bg-[#101417] p-4 min-h-screen">
        <div className="max-w-md w-full rounded-3xl border border-[#2E363D] bg-[#191D20] p-8 text-center shadow-2xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F5A623]/15 text-[#F5A623] border border-[#F5A623]/30">
            <ShieldAlert size={30} />
          </div>

          <h1 className="mt-5 text-2xl font-black text-[#F5F2ED] font-display">Administrator Access Required</h1>

          {currentUser ? (
            <>
              <p className="mt-3 text-xs text-[#A8A8A3] leading-relaxed">
                You are authenticated as <span className="font-bold text-[#F5F2ED]">{currentUser.email}</span>, but your account is not yet assigned the <code className="bg-[#22272B] px-1.5 py-0.5 rounded text-[#F5A623] font-bold">admin</code> role in the Supabase database.
              </p>
              <div className="mt-5 p-4 rounded-2xl bg-[#101417] border border-[#2E363D] text-left text-xs">
                <p className="font-bold text-[#F5F2ED] mb-1">To enable this account as Admin:</p>
                <p className="text-[#A8A8A3] text-[11px] mb-2">Run this query in your Supabase SQL Editor:</p>
                <pre className="block bg-[#191D20] text-[#F5A623] p-3 rounded-xl font-mono text-[11px] overflow-x-auto select-all border border-[#2E363D]">
{`UPDATE public.profiles
SET role = 'admin', updated_at = now()
WHERE id = (SELECT id FROM auth.users WHERE email = '${currentUser.email}' LIMIT 1);`}
                </pre>
              </div>
            </>
          ) : (
            <p className="mt-3 text-xs text-[#A8A8A3] leading-relaxed">
              Please sign in with an authorized Google administrator account.
            </p>
          )}

          <div className="mt-6 flex flex-col gap-2">
            <button
              onClick={() => navigate('/')}
              className="w-full btn btn-accent text-xs font-bold py-2.5 justify-center"
            >
              Return to Application Home
            </button>
            {currentUser && (
              <button
                onClick={() => window.location.reload()}
                className="w-full btn btn-secondary text-xs font-semibold py-2 justify-center"
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

    // Date filter
    if (dateFilter !== 'ALL') {
      const dateVal = r.reportedAt || r.created_at;
      if (dateVal) {
        const reportDate = new Date(dateVal);
        const now = new Date();
        if (dateFilter === 'TODAY') {
          const isToday = reportDate.toDateString() === now.toDateString();
          if (!isToday) return false;
        } else if (dateFilter === 'WEEK') {
          const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          if (reportDate < oneWeekAgo) return false;
        } else if (dateFilter === 'MONTH') {
          const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          if (reportDate < oneMonthAgo) return false;
        }
      }
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
    <div className="min-h-screen bg-[#101417] text-[#F5F2ED] flex flex-col">
      {/* Top Console Bar */}
      <div className="border-b border-[#2E363D] bg-[#191D20] px-4 py-3 sm:px-6">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[#F5A623] to-[#C87942] text-[#101417] shadow-amber-glow">
              <Crown size={18} className="stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-extrabold text-[#F5F2ED] tracking-tight">Authority Admin Portal</h1>
                <span className="rounded-full bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30 px-2 py-0.5 text-[10px] font-bold">
                  Live Supabase
                </span>
              </div>
              <p className="text-[11px] text-[#A8A8A3]">
                Logged in as <span className="font-semibold text-[#F5F2ED]">{currentUser?.email}</span> (Administrator)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadPortalData}
              disabled={loading}
              className="btn btn-secondary text-xs flex items-center gap-1.5 py-1.5 px-3 border-[#2E363D]"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin text-[#F5A623]' : 'text-[#A8A8A3]'} />
              <span>Refresh</span>
            </button>

            <Link
              to="/"
              className="btn btn-primary text-xs font-bold py-1.5 px-3 border-[#2E363D] text-[#F5F2ED] hover:border-[#F5A623] hover:text-[#F5A623]"
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
          <div className="sticky top-20 rounded-3xl border border-[#2E363D] bg-[#191D20] p-3 shadow-2xl space-y-1">
            <div className="px-3 py-2 border-b border-[#2E363D] mb-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-[#F5A623]">
                Control Console
              </p>
              <p className="text-xs font-extrabold text-[#F5F2ED] mt-0.5">Admin Panel</p>
            </div>

            {[
              { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
              { id: 'reports', label: `All Reports (${reportsList.length})`, icon: ShieldAlert },
              { id: 'adminManagement', label: `Admin Access (${adminsList.length})`, icon: Crown },
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
                      ? 'bg-[#22272B] text-[#F5A623] border border-[#F5A623]/40 shadow-sm'
                      : 'text-[#A8A8A3] hover:bg-[#22272B] hover:text-[#F5F2ED]'
                  }`}
                >
                  <Icon size={16} className={isActive ? 'text-[#F5A623]' : 'text-[#A8A8A3]'} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Right Content Pane */}
        <div className="lg:col-span-4 space-y-6">
          {/* Notification / Toast messages */}
          {statusMessage && (
            <div className="rounded-2xl border border-[#10B981]/30 bg-[#10B981]/10 p-3.5 text-xs text-[#10B981] flex items-center justify-between shadow-sm animate-in fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} />
                <span className="font-semibold">{statusMessage}</span>
              </div>
              <button onClick={() => setStatusMessage(null)} className="text-[#10B981] hover:opacity-75">
                <X size={15} />
              </button>
            </div>
          )}

          {errorMessage && (
            <div className="rounded-2xl border border-[#EF4444]/30 bg-[#EF4444]/10 p-3.5 text-xs text-[#EF4444] flex items-center justify-between shadow-sm animate-in fade-in">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} />
                <span className="font-semibold">{errorMessage}</span>
              </div>
              <button onClick={() => setErrorMessage(null)} className="text-[#EF4444] hover:opacity-75">
                <X size={15} />
              </button>
            </div>
          )}

          {/* ==================================================================== */}
          {/* 1. DASHBOARD OVERVIEW TAB (Matching Reference Image 05) */}
          {/* ==================================================================== */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* 5 Statistic Cards across top */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
                {/* Total Reports */}
                <div className="card p-4 bg-[#191D20] border-[#2E363D] rounded-2xl hover:border-[#06B6D4]/40 transition">
                  <div className="flex items-center justify-between text-xs text-[#A8A8A3] mb-1">
                    <span>Total Reports</span>
                    <Layers size={15} className="text-[#06B6D4]" />
                  </div>
                  <p className="text-2xl font-black text-[#F5F2ED] font-display">{stats.totalReports}</p>
                  <span className="text-[10px] text-[#A8A8A3]">All recorded</span>
                </div>

                {/* New Reports */}
                <div className="card p-4 bg-[#191D20] border-[#2E363D] rounded-2xl hover:border-[#F5A623]/40 transition">
                  <div className="flex items-center justify-between text-xs text-[#A8A8A3] mb-1">
                    <span>New Reports</span>
                    <AlertTriangle size={15} className="text-[#F5A623]" />
                  </div>
                  <p className="text-2xl font-black text-[#F5A623] font-display">{stats.newReports}</p>
                  <span className="text-[10px] text-[#A8A8A3]">Awaiting action</span>
                </div>

                {/* Verified */}
                <div className="card p-4 bg-[#191D20] border-[#2E363D] rounded-2xl hover:border-[#06B6D4]/40 transition">
                  <div className="flex items-center justify-between text-xs text-[#A8A8A3] mb-1">
                    <span>Verified</span>
                    <Shield size={15} className="text-[#06B6D4]" />
                  </div>
                  <p className="text-2xl font-black text-[#06B6D4] font-display">{stats.verifiedReports}</p>
                  <span className="text-[10px] text-[#A8A8A3]">Confirmed</span>
                </div>

                {/* In Progress */}
                <div className="card p-4 bg-[#191D20] border-[#2E363D] rounded-2xl hover:border-[#C87942]/40 transition">
                  <div className="flex items-center justify-between text-xs text-[#A8A8A3] mb-1">
                    <span>In Progress</span>
                    <Clock size={15} className="text-[#C87942]" />
                  </div>
                  <p className="text-2xl font-black text-[#E8C18A] font-display">{stats.inProgressReports}</p>
                  <span className="text-[10px] text-[#A8A8A3]">Under repair</span>
                </div>

                {/* Resolved */}
                <div className="card p-4 bg-[#191D20] border-[#2E363D] rounded-2xl hover:border-[#10B981]/40 transition">
                  <div className="flex items-center justify-between text-xs text-[#A8A8A3] mb-1">
                    <span>Resolved</span>
                    <CheckCircle2 size={15} className="text-[#10B981]" />
                  </div>
                  <p className="text-2xl font-black text-[#10B981] font-display">{stats.resolvedReports}</p>
                  <span className="text-[10px] text-[#A8A8A3]">Repaired & safe</span>
                </div>
              </div>

              {/* TWO ANALYTICS CHARTS MATCHING REFERENCE IMAGE 05 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Reports Trend Chart (SVG Curved Sparkline) */}
                <div className="card p-5 bg-[#191D20] border-[#2E363D] rounded-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-extrabold text-[#F5F2ED]">Reports Trend</h3>
                      <p className="text-[11px] text-[#A8A8A3]">Weekly incident activity</p>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#10B981] bg-[#10B981]/15 px-2 py-0.5 rounded-full border border-[#10B981]/30">
                      <TrendingUp size={12} /> +24% ↗
                    </span>
                  </div>

                  {/* SVG Chart Graphic */}
                  <div className="h-44 w-full relative pt-2">
                    <svg className="w-full h-full overflow-visible" viewBox="0 0 300 120">
                      <defs>
                        <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.4" />
                          <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>
                      {/* Area Fill */}
                      <path
                        d="M 10,95 Q 50,75 90,85 T 170,45 T 240,60 T 290,20 L 290,115 L 10,115 Z"
                        fill="url(#trendGradient)"
                      />
                      {/* Trend Line */}
                      <path
                        d="M 10,95 Q 50,75 90,85 T 170,45 T 240,60 T 290,20"
                        fill="none"
                        stroke="#06B6D4"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />
                      {/* Glowing Point Dots */}
                      <circle cx="10" cy="95" r="3.5" fill="#06B6D4" />
                      <circle cx="90" cy="85" r="3.5" fill="#06B6D4" />
                      <circle cx="170" cy="45" r="3.5" fill="#06B6D4" />
                      <circle cx="240" cy="60" r="3.5" fill="#06B6D4" />
                      <circle cx="290" cy="20" r="4.5" fill="#F5A623" stroke="#101417" strokeWidth="2" />
                    </svg>
                  </div>
                </div>

                {/* Reports by Category (SVG Donut Chart) */}
                <div className="card p-5 bg-[#191D20] border-[#2E363D] rounded-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-extrabold text-[#F5F2ED]">Reports by Category</h3>
                      <p className="text-[11px] text-[#A8A8A3]">Distribution of active hazards</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-around pt-2">
                    {/* SVG Donut */}
                    <div className="relative h-32 w-32 shrink-0">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                        {/* Background Ring */}
                        <circle cx="18" cy="18" r="15.9" fill="none" stroke="#22272B" strokeWidth="3.8" />
                        {/* Pothole (42%) */}
                        <circle cx="18" cy="18" r="15.9" fill="none" stroke="#F5A623" strokeWidth="3.8" strokeDasharray="42 58" strokeDashoffset="0" />
                        {/* Waterlogging (25%) */}
                        <circle cx="18" cy="18" r="15.9" fill="none" stroke="#06B6D4" strokeWidth="3.8" strokeDasharray="25 75" strokeDashoffset="-42" />
                        {/* Road Block (18%) */}
                        <circle cx="18" cy="18" r="15.9" fill="none" stroke="#EF4444" strokeWidth="3.8" strokeDasharray="18 82" strokeDashoffset="-67" />
                        {/* Other (15%) */}
                        <circle cx="18" cy="18" r="15.9" fill="none" stroke="#C87942" strokeWidth="3.8" strokeDasharray="15 85" strokeDashoffset="-85" />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <span className="text-base font-black text-[#F5F2ED] font-display">{stats.totalReports}</span>
                        <span className="text-[9px] uppercase tracking-wider text-[#A8A8A3]">Reports</span>
                      </div>
                    </div>

                    {/* Legend */}
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-[#F5A623]" />
                        <span className="text-[#F5F2ED]">Pothole</span>
                        <span className="text-[#A8A8A3] text-[11px]">42%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-[#06B6D4]" />
                        <span className="text-[#F5F2ED]">Waterlogging</span>
                        <span className="text-[#A8A8A3] text-[11px]">25%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-[#EF4444]" />
                        <span className="text-[#F5F2ED]">Road Block</span>
                        <span className="text-[#A8A8A3] text-[11px]">18%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-[#C87942]" />
                        <span className="text-[#F5F2ED]">Other Damage</span>
                        <span className="text-[#A8A8A3] text-[11px]">15%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Reports Quick Table */}
              <div className="card bg-[#191D20] border-[#2E363D] rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-[#2E363D] flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-extrabold text-[#F5F2ED]">Recent Incident Submissions</h3>
                    <p className="text-[11px] text-[#A8A8A3]">Latest reports submitted by citizens</p>
                  </div>
                  <button
                    onClick={() => setActiveTab('reports')}
                    className="text-xs font-bold text-[#F5A623] hover:underline flex items-center gap-1"
                  >
                    <span>View All ({reportsList.length})</span>
                    <ArrowRight size={13} />
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#101417] text-[10px] font-black uppercase tracking-wider text-[#A8A8A3] border-b border-[#2E363D]">
                      <tr>
                        <th className="px-4 py-3">Report ID</th>
                        <th className="px-4 py-3">Category</th>
                        <th className="px-4 py-3">Location</th>
                        <th className="px-4 py-3">Reporter</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2E363D]">
                      {reportsList.slice(0, 5).map((r) => (
                        <tr key={r.id} className="hover:bg-[#22272B] transition">
                          <td className="px-4 py-3 font-mono font-bold text-[#F5A623]">
                            #{String(r.id).substring(0, 8)}
                          </td>
                          <td className="px-4 py-3 font-bold text-[#F5F2ED]">{r.category}</td>
                          <td className="px-4 py-3 text-[#A8A8A3] truncate max-w-xs">{r.address}</td>
                          <td className="px-4 py-3 text-[#F5F2ED]">{r.reporter?.name || 'Citizen'}</td>
                          <td className="px-4 py-3">
                            <Badge value={r.status} />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => handleOpenDetails(r)}
                              className="btn btn-secondary text-[11px] py-1 px-2.5 border-[#2E363D] text-[#F5F2ED]"
                            >
                              Inspect
                            </button>
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
          {/* 2. ALL REPORTS DIRECTORY TAB */}
          {/* ==================================================================== */}
          {activeTab === 'reports' && (
            <div className="card bg-[#191D20] border-[#2E363D] rounded-3xl overflow-hidden shadow-2xl">
              <div className="p-5 border-b border-[#2E363D] space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-black text-[#F5F2ED] font-display">Hazard Reports Directory</h2>
                    <p className="text-xs text-[#A8A8A3]">
                      Inspect details, update statuses, assign authorities, and manage reports
                    </p>
                  </div>

                  {/* Search and Dropdowns */}
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 text-[#A8A8A3]" size={15} />
                      <input
                        className="input pl-9 w-full sm:w-56 text-xs py-2 bg-[#101417] border-[#2E363D]"
                        placeholder="Search ID, category, location..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>

                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="input text-xs font-semibold py-2 px-3 border-[#2E363D] rounded-xl cursor-pointer bg-[#101417] text-[#F5F2ED]"
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

                    <select
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value)}
                      className="input text-xs font-semibold py-2 px-3 border-[#2E363D] rounded-xl cursor-pointer bg-[#101417] text-[#F5F2ED]"
                      title="Filter reports by date"
                    >
                      <option value="ALL">All Time</option>
                      <option value="TODAY">Today</option>
                      <option value="WEEK">This Week</option>
                      <option value="MONTH">This Month</option>
                    </select>
                  </div>
                </div>

                {/* Status Filter Chips */}
                <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[#2E363D]">
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
                          ? 'bg-[#22272B] text-[#F5A623] border border-[#F5A623]/40 shadow-xs'
                          : 'bg-[#101417] text-[#A8A8A3] border border-[#2E363D] hover:bg-[#22272B] hover:text-[#F5F2ED]'
                      }`}
                    >
                      {flt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#101417] text-[10px] font-black uppercase tracking-wider text-[#A8A8A3] border-b border-[#2E363D]">
                    <tr>
                      <th className="px-4 py-3.5">Report ID</th>
                      <th className="px-4 py-3.5">Category</th>
                      <th className="px-4 py-3.5">Location</th>
                      <th className="px-4 py-3.5">Reporter</th>
                      <th className="px-4 py-3.5">Date & Time</th>
                      <th className="px-4 py-3.5">Status</th>
                      <th className="px-4 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2E363D]">
                    {filteredReports.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center text-[#A8A8A3]">
                          No hazard reports found matching the criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredReports.map((r) => (
                        <tr key={r.id} className="hover:bg-[#22272B] transition">
                          <td className="px-4 py-3.5 font-mono font-bold text-[#F5A623]">
                            #{String(r.id).substring(0, 8)}
                          </td>
                          <td className="px-4 py-3.5 font-bold text-[#F5F2ED]">{r.category}</td>
                          <td className="px-4 py-3.5 text-[#A8A8A3] truncate max-w-xs">{r.address}</td>
                          <td className="px-4 py-3.5 text-[#F5F2ED]">
                            {r.reporter?.name || 'Citizen'}
                            <span className="block text-[10px] text-[#A8A8A3] font-mono">{r.reporter?.email}</span>
                          </td>
                          <td className="px-4 py-3.5 text-[#A8A8A3] font-mono text-[11px]">
                            {r.reportedAt ? new Date(r.reportedAt).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="px-4 py-3.5">
                            <select
                              value={r.rawStatus || r.status?.toUpperCase() || 'REPORTED'}
                              onChange={(e) => handleStatusChange(r.id, e.target.value)}
                              className="text-xs font-bold rounded-lg border border-[#2E363D] bg-[#101417] text-[#F5F2ED] py-1 px-2"
                            >
                              <option value="REPORTED">REPORTED</option>
                              <option value="VERIFIED">VERIFIED</option>
                              <option value="IN_PROGRESS">IN PROGRESS</option>
                              <option value="RESOLVED">RESOLVED</option>
                            </select>
                          </td>
                          <td className="px-4 py-3.5 text-right space-x-2">
                            <button
                              onClick={() => handleOpenDetails(r)}
                              className="btn btn-secondary text-xs py-1 px-2.5 border-[#2E363D] text-[#F5F2ED]"
                            >
                              Inspect
                            </button>
                            <button
                              onClick={() => handleDeleteReport(r.id)}
                              className="btn btn-secondary text-xs py-1 px-2 border-[#2E363D] text-[#EF4444] hover:bg-[#EF4444]/15"
                            >
                              <Trash2 size={13} />
                            </button>
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
          {/* 2.5 ADMIN MANAGEMENT TAB */}
          {/* ==================================================================== */}
          {activeTab === 'adminManagement' && (
            <div className="space-y-6">
              {/* Header Card */}
              <div className="card p-6 bg-[#191D20] border-[#2E363D] rounded-3xl shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#F5A623]/15 text-[#F5A623] border border-[#F5A623]/30 shadow-amber-glow">
                    <Crown size={24} className="fill-[#F5A623]" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-[#F5F2ED] font-display">Administrator Access & Role Management</h2>
                    <p className="text-xs text-[#A8A8A3] mt-0.5">
                      Manage verified municipal administrators, invite new staff via Google OAuth, and inspect audit logs.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="rounded-xl bg-[#22272B] border border-[#2E363D] px-3 py-1.5 text-center">
                    <span className="text-[10px] text-[#A8A8A3] block uppercase tracking-wider">Admins</span>
                    <span className="text-sm font-bold text-[#F5A623]">{adminsList.length}</span>
                  </div>
                  <div className="rounded-xl bg-[#22272B] border border-[#2E363D] px-3 py-1.5 text-center">
                    <span className="text-[10px] text-[#A8A8A3] block uppercase tracking-wider">Pending</span>
                    <span className="text-sm font-bold text-[#E8C18A]">{invitationsList.length}</span>
                  </div>
                  <div className="rounded-xl bg-[#22272B] border border-[#2E363D] px-3 py-1.5 text-center">
                    <span className="text-[10px] text-[#A8A8A3] block uppercase tracking-wider">Audit Logs</span>
                    <span className="text-sm font-bold text-[#06B6D4]">{auditLogsList.length}</span>
                  </div>
                </div>
              </div>

              {/* Add / Invite Administrator Form */}
              <div className="card p-6 bg-[#191D20] border-[#2E363D] rounded-3xl shadow-2xl space-y-4">
                <div className="flex items-center gap-2 text-sm font-bold text-[#F5F2ED]">
                  <UserPlus size={18} className="text-[#F5A623]" />
                  <span>Add or Invite New Administrator</span>
                </div>

                <form onSubmit={handleAddAdmin} className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-[#F5F2ED] mb-1.5">
                        Administrator Full Name
                      </label>
                      <input
                        type="text"
                        value={newAdminName}
                        onChange={(e) => setNewAdminName(e.target.value)}
                        placeholder="e.g. Officer Anita Rao"
                        className="input text-xs bg-[#101417] border-[#2E363D] w-full"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-[#F5F2ED] mb-1.5">
                        Gmail Address <span className="text-[#F5A623]">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={newAdminEmail}
                        onChange={(e) => setNewAdminEmail(e.target.value)}
                        placeholder="e.g. anita.rao@gmail.com"
                        className="input text-xs bg-[#101417] border-[#2E363D] w-full"
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[#2E363D] bg-[#22272B]/60 p-3.5 text-xs text-[#A8A8A3] leading-relaxed">
                    <p className="flex items-start gap-2">
                      <ShieldCheck size={16} className="text-[#F5A623] shrink-0 mt-0.5" />
                      <span>
                        <strong className="text-[#F5F2ED]">Google OAuth Verification:</strong> If the user is already registered in Road Reality, their account is immediately promoted to Administrator. If they have not signed in yet, an invitation will be recorded and administrative access will be automatically granted when they sign in with this Google account.
                      </span>
                    </p>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isAddingAdmin}
                      className="btn btn-accent text-xs font-bold py-2.5 px-6 shadow-amber-glow flex items-center gap-2"
                    >
                      {isAddingAdmin ? (
                        <>
                          <RefreshCw size={14} className="animate-spin" />
                          <span>Processing...</span>
                        </>
                      ) : (
                        <>
                          <Send size={14} />
                          <span>Grant / Invite Administrator</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* Active Administrators Roster Table */}
              <div className="card bg-[#191D20] border-[#2E363D] rounded-3xl overflow-hidden shadow-2xl">
                <div className="p-5 border-b border-[#2E363D] flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-black text-[#F5F2ED] font-display flex items-center gap-2">
                      <Crown size={16} className="text-[#F5A623]" />
                      <span>Active Administrators ({adminsList.length})</span>
                    </h3>
                    <p className="text-xs text-[#A8A8A3]">Accounts with full administrative and verification privileges</p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#101417] text-[10px] font-black uppercase tracking-wider text-[#A8A8A3] border-b border-[#2E363D]">
                      <tr>
                        <th className="px-4 py-3.5">Administrator</th>
                        <th className="px-4 py-3.5">Gmail / Account</th>
                        <th className="px-4 py-3.5">Role</th>
                        <th className="px-4 py-3.5">Added Date</th>
                        <th className="px-4 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2E363D]">
                      {adminsList.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-[#A8A8A3]">
                            Loading administrators...
                          </td>
                        </tr>
                      ) : (
                        adminsList.map((admin) => {
                          const isCurrentUser = Boolean(
                            (currentUser?.id && admin.id && currentUser.id === admin.id) ||
                            (currentUser?.email && admin.email && currentUser.email.toLowerCase() === admin.email.toLowerCase())
                          );
                          const isOnlyAdmin = adminsList.length <= 1;

                          return (
                            <tr key={admin.id || admin.email} className="hover:bg-[#22272B] transition">
                              <td className="px-4 py-3.5 font-bold text-[#F5F2ED] flex items-center gap-2.5">
                                <div className="grid h-8 w-8 place-items-center rounded-full bg-[#F5A623]/20 border border-[#F5A623]/40 text-[#F5A623] font-bold text-xs">
                                  {admin.full_name ? admin.full_name[0]?.toUpperCase() : (admin.email ? admin.email[0]?.toUpperCase() : 'A')}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span>{admin.full_name || 'Administrator'}</span>
                                    {isCurrentUser && (
                                      <span className="rounded-md bg-[#F5A623]/20 text-[#F5A623] border border-[#F5A623]/30 px-1.5 py-0.2 text-[9px] font-extrabold">
                                        YOU
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>

                              <td className="px-4 py-3.5 font-mono text-[#E8C18A]">
                                {admin.email}
                              </td>

                              <td className="px-4 py-3.5">
                                <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold bg-[#F5A623]/15 text-[#F5A623] border border-[#F5A623]/30">
                                  <Crown size={11} className="fill-[#F5A623]" />
                                  Administrator
                                </span>
                              </td>

                              <td className="px-4 py-3.5 text-[#A8A8A3] font-mono text-[11px]">
                                {admin.created_at ? new Date(admin.created_at).toLocaleDateString() : 'Active'}
                              </td>

                              <td className="px-4 py-3.5 text-right">
                                <button
                                  onClick={() => handleInitiateRemoveAdmin(admin)}
                                  disabled={isOnlyAdmin || actionLoadingId === admin.id}
                                  title={isOnlyAdmin ? 'Cannot remove the last remaining administrator' : 'Remove administrator role'}
                                  className={`btn text-xs py-1 px-3 border transition ${
                                    isOnlyAdmin
                                      ? 'opacity-40 cursor-not-allowed border-[#2E363D] text-[#A8A8A3]'
                                      : isCurrentUser
                                      ? 'border-[#EF4444]/40 text-[#EF4444] hover:bg-[#EF4444]/15'
                                      : 'border-[#2E363D] text-[#EF4444] hover:bg-[#EF4444]/15'
                                  }`}
                                >
                                  {isOnlyAdmin
                                    ? 'Sole Admin (Protected)'
                                    : isCurrentUser
                                    ? 'Step Down / Remove Role'
                                    : 'Remove Admin'}
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

              {/* Pending Invitations Table */}
              {invitationsList.length > 0 && (
                <div className="card bg-[#191D20] border-[#2E363D] rounded-3xl overflow-hidden shadow-2xl">
                  <div className="p-5 border-b border-[#2E363D] flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-black text-[#F5F2ED] font-display flex items-center gap-2">
                        <Mail size={16} className="text-[#E8C18A]" />
                        <span>Pending Invitations ({invitationsList.length})</span>
                      </h3>
                      <p className="text-xs text-[#A8A8A3]">Google accounts awaiting first sign-in to claim Admin access</p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#101417] text-[10px] font-black uppercase tracking-wider text-[#A8A8A3] border-b border-[#2E363D]">
                        <tr>
                          <th className="px-4 py-3.5">Invited User</th>
                          <th className="px-4 py-3.5">Gmail Address</th>
                          <th className="px-4 py-3.5">Invited By</th>
                          <th className="px-4 py-3.5">Status</th>
                          <th className="px-4 py-3.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#2E363D]">
                        {invitationsList.map((inv) => (
                          <tr key={inv.id} className="hover:bg-[#22272B] transition">
                            <td className="px-4 py-3.5 font-bold text-[#F5F2ED]">
                              {inv.full_name || 'Invited Staff'}
                            </td>
                            <td className="px-4 py-3.5 font-mono text-[#E8C18A]">
                              {inv.email}
                            </td>
                            <td className="px-4 py-3.5 text-[#A8A8A3] text-[11px]">
                              {inv.invited_by_email || 'Administrator'}
                            </td>
                            <td className="px-4 py-3.5">
                              <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold bg-[#E8C18A]/15 text-[#E8C18A] border border-[#E8C18A]/30">
                                <span className="h-1.5 w-1.5 rounded-full bg-[#E8C18A] animate-pulse" />
                                Pending First Sign-In
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-right">
                              <button
                                onClick={() => handleCancelInvitation(inv.id)}
                                disabled={actionLoadingId === inv.id}
                                className="btn btn-secondary text-xs py-1 px-3 border-[#2E363D] text-[#EF4444] hover:bg-[#EF4444]/15"
                              >
                                Revoke Invite
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Administrative Audit Trail */}
              <div className="card bg-[#191D20] border-[#2E363D] rounded-3xl overflow-hidden shadow-2xl">
                <div className="p-5 border-b border-[#2E363D] flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-black text-[#F5F2ED] font-display flex items-center gap-2">
                      <Activity size={16} className="text-[#06B6D4]" />
                      <span>Security & Administration Audit Trail</span>
                    </h3>
                    <p className="text-xs text-[#A8A8A3]">Immutable record of all administrator additions, role changes, and removals</p>
                  </div>
                </div>

                <div className="overflow-x-auto max-h-72 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#101417] text-[10px] font-black uppercase tracking-wider text-[#A8A8A3] border-b border-[#2E363D] sticky top-0">
                      <tr>
                        <th className="px-4 py-3">Timestamp</th>
                        <th className="px-4 py-3">Action</th>
                        <th className="px-4 py-3">Actor</th>
                        <th className="px-4 py-3">Target</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2E363D]">
                      {auditLogsList.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-6 text-center text-[#A8A8A3]">
                            No audit events recorded yet.
                          </td>
                        </tr>
                      ) : (
                        auditLogsList.map((log) => (
                          <tr key={log.id} className="hover:bg-[#22272B] transition font-mono text-[11px]">
                            <td className="px-4 py-2.5 text-[#A8A8A3]">
                              {log.created_at ? new Date(log.created_at).toLocaleString() : 'N/A'}
                            </td>
                            <td className="px-4 py-2.5 font-bold">
                              <span className={`px-2 py-0.5 rounded-md text-[10px] ${
                                log.action === 'REMOVE_ADMIN' || log.action === 'SELF_DEMOTION'
                                  ? 'bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30'
                                  : log.action === 'CLAIM_INVITATION'
                                  ? 'bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30'
                                  : 'bg-[#F5A623]/15 text-[#F5A623] border border-[#F5A623]/30'
                              }`}>
                                {log.action}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-[#F5F2ED]">{log.actor_email || 'System'}</td>
                            <td className="px-4 py-2.5 text-[#E8C18A]">{log.target_email || 'N/A'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ==================================================================== */}
          {/* 3. USERS MANAGEMENT TAB */}
          {/* ==================================================================== */}
          {activeTab === 'users' && (
            <div className="card bg-[#191D20] border-[#2E363D] rounded-3xl overflow-hidden shadow-2xl">
              <div className="p-5 border-b border-[#2E363D] flex items-center justify-between">
                <div>
                  <h2 className="text-base font-black text-[#F5F2ED] font-display">Registered Users Roster</h2>
                  <p className="text-xs text-[#A8A8A3]">Manage citizen accounts and staff administrative privileges</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#101417] text-[10px] font-black uppercase tracking-wider text-[#A8A8A3] border-b border-[#2E363D]">
                    <tr>
                      <th className="px-4 py-3.5">User</th>
                      <th className="px-4 py-3.5">Email</th>
                      <th className="px-4 py-3.5">Reports Logged</th>
                      <th className="px-4 py-3.5">Role</th>
                      <th className="px-4 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2E363D]">
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-[#22272B] transition">
                        <td className="px-4 py-3.5 font-bold text-[#F5F2ED] flex items-center gap-2.5">
                          <div className="grid h-7 w-7 place-items-center rounded-full bg-[#22272B] border border-[#2E363D] text-[#F5A623] font-bold text-xs">
                            {u.name[0]?.toUpperCase()}
                          </div>
                          <span>{u.name}</span>
                        </td>
                        <td className="px-4 py-3.5 font-mono text-[#A8A8A3]">{u.email}</td>
                        <td className="px-4 py-3.5 font-bold text-[#F5F2ED]">{u.reportCount || 0}</td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                              u.role === 'admin'
                                ? 'bg-[#F5A623]/15 text-[#F5A623] border border-[#F5A623]/30'
                                : 'bg-[#101417] text-[#A8A8A3] border border-[#2E363D]'
                            }`}
                          >
                            {u.role === 'admin' ? 'Administrator' : 'Citizen'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          {u.role === 'admin' ? (
                            <button
                              onClick={() => handleInitiateRemoveAdmin(u)}
                              disabled={adminsList.length <= 1 || actionLoadingId === u.id}
                              title={adminsList.length <= 1 ? "Cannot remove the only remaining administrator" : "Revoke administrator role"}
                              className={`btn text-xs py-1 px-3 border transition ${
                                adminsList.length <= 1
                                  ? 'opacity-40 cursor-not-allowed border-[#2E363D] text-[#A8A8A3]'
                                  : 'border-[#2E363D] text-[#EF4444] hover:bg-[#EF4444]/15'
                              }`}
                            >
                              {adminsList.length <= 1 ? 'Sole Admin' : 'Revoke Admin'}
                            </button>
                          ) : (
                            <button
                              onClick={() => handleRoleChange(u.id, 'admin')}
                              disabled={actionLoadingId === u.id}
                              className="btn btn-secondary text-xs py-1 px-3 border-[#2E363D] text-[#F5A623] hover:border-[#F5A623] hover:bg-[#F5A623]/10"
                            >
                              Make Admin
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ==================================================================== */}
          {/* 4. ASSIGNMENTS TAB */}
          {/* ==================================================================== */}
          {activeTab === 'assignments' && (
            <div className="space-y-4">
              <div className="card p-5 bg-[#191D20] border-[#2E363D] rounded-3xl">
                <h2 className="text-base font-black text-[#F5F2ED] font-display">Municipal Department Work Orders</h2>
                <p className="text-xs text-[#A8A8A3] mt-0.5">Dispatched road hazards grouped by responsible civic agency</p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                {AUTHORITY_DEPARTMENTS.map((dept) => {
                  const deptReports = reportsList.filter((r) => r.assigned_to === dept);
                  return (
                    <div key={dept} className="card p-5 bg-[#191D20] border-[#2E363D] rounded-2xl space-y-3">
                      <div className="flex items-center justify-between border-b border-[#2E363D] pb-3">
                        <div className="flex items-center gap-2">
                          <Building2 size={16} className="text-[#F5A623]" />
                          <h3 className="font-bold text-xs text-[#F5F2ED]">{dept}</h3>
                        </div>
                        <span className="rounded-full bg-[#22272B] border border-[#2E363D] px-2 py-0.5 text-[10px] font-bold text-[#F5A623]">
                          {deptReports.length}
                        </span>
                      </div>

                      <div className="space-y-2">
                        {deptReports.length === 0 ? (
                          <p className="text-xs text-[#A8A8A3] italic py-2">No active work orders dispatched to this department.</p>
                        ) : (
                          deptReports.map((r) => (
                            <div key={r.id} className="p-3 rounded-xl bg-[#22272B] border border-[#2E363D] text-xs flex items-center justify-between">
                              <div>
                                <p className="font-bold text-[#F5F2ED]">{r.category}</p>
                                <p className="text-[11px] text-[#A8A8A3] truncate max-w-[200px]">{r.address}</p>
                              </div>
                              <Badge value={r.status} />
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ==================================================================== */}
          {/* 5. ANALYTICS TAB */}
          {/* ==================================================================== */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div className="card p-5 bg-[#191D20] border-[#2E363D] rounded-3xl">
                <h2 className="text-base font-black text-[#F5F2ED] font-display">System Health & Incident Analytics</h2>
                <p className="text-xs text-[#A8A8A3] mt-0.5">Real database metrics and resolution performance</p>
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <div className="card p-5 bg-[#191D20] border-[#2E363D] rounded-2xl text-center">
                  <span className="text-xs text-[#A8A8A3] uppercase tracking-wider block">Resolution Rate</span>
                  <p className="text-4xl font-black text-[#10B981] font-display mt-2">{resolutionRate}%</p>
                  <span className="text-[11px] text-[#A8A8A3] mt-1 block">Successfully repaired</span>
                </div>

                <div className="card p-5 bg-[#191D20] border-[#2E363D] rounded-2xl text-center">
                  <span className="text-xs text-[#A8A8A3] uppercase tracking-wider block">Active Hazards</span>
                  <p className="text-4xl font-black text-[#F5A623] font-display mt-2">{stats.activeReports}</p>
                  <span className="text-[11px] text-[#A8A8A3] mt-1 block">Requiring attention</span>
                </div>

                <div className="card p-5 bg-[#191D20] border-[#2E363D] rounded-2xl text-center">
                  <span className="text-xs text-[#A8A8A3] uppercase tracking-wider block">Citizen Engagement</span>
                  <p className="text-4xl font-black text-[#06B6D4] font-display mt-2">{stats.totalUsers}</p>
                  <span className="text-[11px] text-[#A8A8A3] mt-1 block">Registered reporters</span>
                </div>
              </div>
            </div>
          )}

          {/* ==================================================================== */}
          {/* 6. SETTINGS TAB */}
          {/* ==================================================================== */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div className="card p-5 bg-[#191D20] border-[#2E363D] rounded-3xl">
                <h2 className="text-base font-black text-[#F5F2ED] font-display">Portal Settings & Admin Privileges</h2>
                <p className="text-xs text-[#A8A8A3] mt-0.5">Environment configuration and administrative promotion SQL</p>
              </div>

              <div className="card p-6 bg-[#191D20] border-[#2E363D] rounded-2xl space-y-4">
                <h3 className="text-sm font-bold text-[#F5F2ED] flex items-center gap-2">
                  <Crown size={16} className="text-[#F5A623]" />
                  Administrator SQL Helper
                </h3>
                <p className="text-xs text-[#A8A8A3]">
                  Run this query in your Supabase SQL Editor to grant admin role to <strong className="text-[#F5F2ED]">suhaspai13@gmail.com</strong>:
                </p>

                <div className="relative">
                  <pre className="block bg-[#101417] text-[#F5A623] p-4 rounded-xl font-mono text-xs overflow-x-auto select-all border border-[#2E363D]">
{`UPDATE public.profiles
SET role = 'admin', updated_at = now()
WHERE id = (SELECT id FROM auth.users WHERE email = 'suhaspai13@gmail.com' LIMIT 1);`}
                  </pre>

                  <button
                    onClick={handleCopySql}
                    className="absolute top-3 right-3 btn btn-secondary text-xs py-1.5 px-3"
                  >
                    {copiedSql ? '✓ Copied' : 'Copy SQL'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ==================================================================== */}
      {/* DETAILS MODAL */}
      {/* ==================================================================== */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#101417]/85 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-[#2E363D] bg-[#191D20] p-6 shadow-2xl space-y-5 text-xs text-[#F5F2ED]">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-[#2E363D] pb-4">
              <div>
                <span className="text-[11px] font-mono font-bold text-[#F5A623] bg-[#F5A623]/10 px-2.5 py-1 rounded-md border border-[#F5A623]/30">
                  #{String(selectedReport.id).substring(0, 8)}
                </span>
                <h2 className="text-xl font-black text-[#F5F2ED] font-display mt-2">{selectedReport.category}</h2>
              </div>
              <button
                onClick={handleCloseDetails}
                className="p-1.5 rounded-xl bg-[#22272B] text-[#A8A8A3] hover:text-[#F5F2ED]"
              >
                <X size={18} />
              </button>
            </div>

            {/* Photo preview */}
            {selectedReport.imageUrl && (
              <div className="rounded-2xl overflow-hidden border border-[#2E363D] max-h-72">
                <img src={selectedReport.imageUrl} alt={selectedReport.category} className="w-full h-full object-cover max-h-72" />
              </div>
            )}

            {/* Status & Department Selection */}
            <div className="grid sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-[#22272B] border border-[#2E363D]">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#F5F2ED] mb-1.5">
                  Update Status
                </label>
                <select
                  value={modalStatus}
                  onChange={(e) => setModalStatus(e.target.value)}
                  className="input py-2 text-xs bg-[#101417] border-[#2E363D]"
                >
                  <option value="REPORTED">REPORTED (New)</option>
                  <option value="VERIFIED">VERIFIED (Confirmed)</option>
                  <option value="IN_PROGRESS">IN PROGRESS (Dispatched)</option>
                  <option value="RESOLVED">RESOLVED (Repaired)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#F5F2ED] mb-1.5">
                  Assign Municipal Authority
                </label>
                <select
                  value={modalAssignment}
                  onChange={(e) => setModalAssignment(e.target.value)}
                  className="input py-2 text-xs bg-[#101417] border-[#2E363D]"
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

            {/* Admin Notes */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#F5F2ED]">
                Administrative Action Notes
              </label>
              <textarea
                rows={3}
                value={modalNotes}
                onChange={(e) => setModalNotes(e.target.value)}
                placeholder="Log internal work order notes, inspection details..."
                className="input text-xs resize-none"
              />
            </div>

            {/* Details */}
            <div className="p-4 rounded-2xl bg-[#22272B] border border-[#2E363D] space-y-2">
              <p><strong className="text-[#A8A8A3]">Location:</strong> {selectedReport.address}</p>
              <p><strong className="text-[#A8A8A3]">Citizen Description:</strong> {selectedReport.description || 'No description entered.'}</p>
              <p><strong className="text-[#A8A8A3]">Reporter:</strong> {selectedReport.reporter?.name} ({selectedReport.reporter?.email})</p>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-[#2E363D] flex justify-end gap-3">
              <button
                onClick={handleCloseDetails}
                className="btn btn-secondary text-xs py-2 px-4"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveModalChanges}
                disabled={actionLoadingId === selectedReport.id}
                className="btn btn-accent text-xs font-bold py-2 px-5 shadow-amber-glow"
              >
                {actionLoadingId === selectedReport.id ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* CONFIRMATION MODAL FOR ADMIN REMOVAL / ROLE TRANSFER */}
      {/* ==================================================================== */}
      {confirmRemovalModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#101417]/85 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md rounded-3xl border border-[#EF4444]/40 bg-[#191D20] p-6 shadow-2xl space-y-4 text-xs text-[#F5F2ED]">
            <div className="flex items-center gap-3 border-b border-[#2E363D] pb-3 text-[#EF4444]">
              <div className="p-2.5 rounded-2xl bg-[#EF4444]/15 border border-[#EF4444]/30">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="text-base font-black text-[#F5F2ED] font-display">
                  {confirmRemovalModal.isSelfDemotion ? 'Confirm Role Transfer / Self-Demotion' : 'Revoke Administrator Access'}
                </h3>
                <p className="text-[11px] text-[#A8A8A3]">Administrative Security Authorization</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#22272B] border border-[#2E363D] text-[#A8A8A3] leading-relaxed text-[11px] space-y-2">
              {confirmRemovalModal.isSelfDemotion ? (
                <>
                  <p className="text-[#EF4444] font-bold">
                    Warning: You are about to step down and remove your own administrator privileges.
                  </p>
                  <p>
                    Your administrator privileges will be immediately revoked. You will be redirected out of the Admin Portal to the citizen homepage.
                  </p>
                </>
              ) : (
                <p>
                  Are you sure you want to remove administrator privileges for <strong className="text-[#F5F2ED] font-mono">{confirmRemovalModal.target?.email}</strong>? They will become a standard citizen user.
                </p>
              )}
            </div>

            <div className="pt-2 flex justify-end gap-3">
              <button
                onClick={() => setConfirmRemovalModal({ open: false, target: null, isSelfDemotion: false })}
                className="btn btn-secondary text-xs py-2 px-4 border-[#2E363D] text-[#F5F2ED]"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRemoveAdmin}
                className="btn text-xs font-bold py-2 px-4 rounded-xl bg-[#EF4444] text-white hover:bg-[#DC2626] transition shadow-md"
              >
                {confirmRemovalModal.isSelfDemotion ? 'Demote Myself & Exit Portal' : 'Confirm Removal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
