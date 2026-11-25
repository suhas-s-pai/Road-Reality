import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getMyReports, getAdminNotifications, respondToRemovalRequest } from '../services/hazardService';
import { useAuth } from '../context/AuthContext';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  Shield,
  RefreshCw,
  CheckCheck,
  MapPin,
  ExternalLink,
  ShieldAlert,
  AlertCircle,
  Crown,
  X
} from 'lucide-react';
import { ago } from '../utils/formatters';

export default function Notifications() {
  const { user, session, isAdmin, setRole, refreshRole } = useAuth();
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [adminNotifs, setAdminNotifs] = useState({ pendingForMe: [], myDecisions: [] });
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);
  const [filter, setFilter] = useState('ALL');
  const [readIds, setReadIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('rr_read_notifs') || '[]');
    } catch (_) {
      return [];
    }
  });

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const reportsPromise = getMyReports(session?.access_token).catch(() => ({ data: [] }));
      const adminPromise = (isAdmin && session?.access_token)
        ? getAdminNotifications(session.access_token).catch(() => ({ pendingForMe: [], myDecisions: [] }))
        : Promise.resolve({ pendingForMe: [], myDecisions: [] });

      const [repRes, admRes] = await Promise.all([reportsPromise, adminPromise]);
      setReports(repRes.data || []);
      setAdminNotifs(admRes || { pendingForMe: [], myDecisions: [] });
    } catch (err) {
      console.warn('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [session, isAdmin]);

  const handleRespondRemoval = async (requestId, action) => {
    setActionLoadingId(requestId);
    setActionMessage(null);
    try {
      const res = await respondToRemovalRequest(requestId, action, '', session?.access_token);
      if (res.approved || res.selfDemoted) {
        setActionMessage("Removal approved. Your administrative role has been updated to Citizen.");
        if (setRole) setRole('user');
        if (refreshRole) await refreshRole();
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 1200);
        return;
      }
      setActionMessage("Removal request declined. You remain an active administrator.");
      await loadNotifications();
    } catch (err) {
      console.error('Failed to process removal response:', err);
      setActionMessage(err.message || 'Error processing removal response.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const markAllRead = () => {
    const allIds = notificationsList.map((n) => n.id);
    setReadIds(allIds);
    try {
      localStorage.setItem('rr_read_notifs', JSON.stringify(allIds));
    } catch (_) {}
  };

  const toggleRead = (id) => {
    const next = readIds.includes(id) ? readIds.filter((x) => x !== id) : [...readIds, id];
    setReadIds(next);
    try {
      localStorage.setItem('rr_read_notifs', JSON.stringify(next));
    } catch (_) {}
  };

  // Generate notification items based on user's reports
  const notificationsList = reports.flatMap((r) => {
    const notifs = [];
    const status = (r.rawStatus || r.status || '').toUpperCase();

    // 1. Initial Submission Confirmation
    notifs.push({
      id: `sub-${r.id}`,
      reportId: r.id,
      category: r.category,
      address: r.address,
      type: 'SUBMISSION',
      title: `Report Recorded: ${r.category}`,
      message: `Your hazard report #${String(r.id).substring(0, 8)} was recorded and posted to the live community map.`,
      timestamp: r.reportedAt,
      icon: CheckCircle2,
      accent: 'text-[#F5A623] bg-[#F5A623]/15 border-[#F5A623]/30'
    });

    // 2. Verification Alert
    if (status === 'VERIFIED' || status === 'IN_PROGRESS' || status === 'RESOLVED') {
      notifs.push({
        id: `ver-${r.id}`,
        reportId: r.id,
        category: r.category,
        address: r.address,
        type: 'VERIFICATION',
        title: `Report Verified: ${r.category}`,
        message: `Road safety officers verified this hazard. Maintenance crew assignment in progress.`,
        timestamp: r.updatedAt || r.reportedAt,
        icon: Shield,
        accent: 'text-[#06B6D4] bg-[#06B6D4]/15 border-[#06B6D4]/30'
      });
    }

    // 3. Work in progress
    if (status === 'IN_PROGRESS' || status === 'RESOLVED') {
      notifs.push({
        id: `inp-${r.id}`,
        reportId: r.id,
        category: r.category,
        address: r.address,
        type: 'PROGRESS',
        title: `Crew Dispatched: ${r.category}`,
        message: `A municipal repair unit has been dispatched to ${r.address || 'the hazard site'}.`,
        timestamp: r.updatedAt || r.reportedAt,
        icon: Clock,
        accent: 'text-[#C87942] bg-[#C87942]/15 border-[#C87942]/30'
      });
    }

    // 4. Resolution
    if (status === 'RESOLVED') {
      notifs.push({
        id: `res-${r.id}`,
        reportId: r.id,
        category: r.category,
        address: r.address,
        type: 'RESOLUTION',
        title: `Hazard Resolved: ${r.category}`,
        message: `Repairs have been marked completed. Road surface is now safe for traffic.`,
        timestamp: r.updatedAt || r.reportedAt,
        icon: CheckCircle2,
        accent: 'text-[#10B981] bg-[#10B981]/15 border-[#10B981]/30'
      });
    }

    return notifs;
  });

  const filteredNotifs = notificationsList.filter((n) => {
    if (filter === 'UNREAD') return !readIds.includes(n.id);
    if (filter === 'UPDATES') return n.type !== 'SUBMISSION';
    return true;
  });

  const unreadCount = notificationsList.filter((n) => !readIds.includes(n.id)).length;

  return (
    <main className="page bg-[#101417] text-[#F5F2ED] min-h-screen py-10 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#2E363D] pb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-[#F5A623] uppercase tracking-wider mb-1">
              <Bell size={15} />
              <span>Notification Center</span>
            </div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-black text-[#F5F2ED] tracking-tight font-display">
                Notifications
              </h1>
              {unreadCount > 0 && (
                <span className="rounded-full bg-[#F5A623] text-[#101417] px-2.5 py-0.5 text-xs font-black shadow-amber-glow">
                  {unreadCount} new
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-[#A8A8A3]">
              Real-time updates regarding your reported hazards, verifications, and road repairs.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadNotifications}
              disabled={loading}
              className="btn btn-secondary text-xs flex items-center gap-1.5 py-2 px-3 border-[#2E363D]"
              title="Refresh"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin text-[#F5A623]' : 'text-[#A8A8A3]'} />
              <span>Refresh</span>
            </button>

            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="btn btn-secondary text-xs flex items-center gap-1.5 py-2 px-3 border-[#2E363D] text-[#F5A623]"
              >
                <CheckCheck size={14} />
                <span>Mark All Read</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-2">
          {[
            { id: 'ALL', label: `All Updates (${notificationsList.length})` },
            { id: 'UNREAD', label: `Unread (${unreadCount})` },
            { id: 'UPDATES', label: `Authority Actions` }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                filter === tab.id
                  ? 'bg-[#22272B] text-[#F5A623] border border-[#F5A623]/40'
                  : 'bg-[#191D20] text-[#A8A8A3] border border-[#2E363D] hover:text-[#F5F2ED]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Action Message Banner */}
        {actionMessage && (
          <div className="rounded-2xl border border-[#F5A623]/40 bg-[#F5A623]/10 p-4 text-xs text-[#F5A623] flex items-center justify-between shadow-sm animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} />
              <span className="font-semibold">{actionMessage}</span>
            </div>
            <button onClick={() => setActionMessage(null)} className="text-[#F5A623] hover:opacity-75">
              <X size={15} />
            </button>
          </div>
        )}

        {/* URGENT ADMIN NOTIFICATIONS: Two-Person Removal Approval Requests */}
        {isAdmin && adminNotifs.pendingForMe?.length > 0 && (
          <div className="space-y-3">
            {adminNotifs.pendingForMe.map((req) => (
              <div
                key={req.id}
                className="card p-5 rounded-3xl border border-[#EF4444]/60 bg-gradient-to-r from-[#EF4444]/20 via-[#191D20] to-[#EF4444]/10 shadow-2xl space-y-3 animate-in fade-in"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[#EF4444]/25 text-[#EF4444] border border-[#EF4444]/50 shrink-0">
                      <ShieldAlert size={22} className="animate-pulse" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#EF4444] bg-[#EF4444]/20 px-2 py-0.5 rounded-full border border-[#EF4444]/40">
                          ACTION REQUIRED
                        </span>
                        <span className="text-xs text-[#A8A8A3]">Two-Person Removal Protocol</span>
                      </div>
                      <h3 className="text-base font-black text-[#F5F2ED] mt-1">
                        Administrator Removal Request Awaiting Your Authorization
                      </h3>
                      <p className="text-xs text-[#A8A8A3] mt-1 leading-relaxed">
                        Administrator <strong className="text-[#F5F2ED] font-mono">{req.requester_email}</strong> has requested the revocation of your administrator privileges. In accordance with the Two-Person Approval policy, you will remain an active Administrator unless you authorize this action.
                      </p>
                      {req.reason && (
                        <div className="mt-2 text-xs p-2.5 rounded-xl bg-[#101417] border border-[#2E363D] text-[#E8C18A] flex items-center gap-2">
                          <span className="font-bold text-[#A8A8A3]">Reason stated:</span>
                          <span>&ldquo;{req.reason}&rdquo;</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex sm:flex-col gap-2 shrink-0">
                    <button
                      onClick={() => handleRespondRemoval(req.id, 'approve')}
                      disabled={actionLoadingId === req.id}
                      className="btn text-xs font-bold py-2 px-4 rounded-xl bg-[#EF4444] text-white hover:bg-[#DC2626] transition shadow-md"
                    >
                      {actionLoadingId === req.id ? 'Processing...' : 'Approve Removal'}
                    </button>
                    <button
                      onClick={() => handleRespondRemoval(req.id, 'decline')}
                      disabled={actionLoadingId === req.id}
                      className="btn btn-secondary text-xs font-bold py-2 px-4 rounded-xl border-[#2E363D] text-[#F5F2ED] hover:bg-[#22272B] transition"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ADMIN NOTIFICATIONS: Removal Request Decisions for Requester */}
        {isAdmin && adminNotifs.myDecisions?.length > 0 && (
          <div className="space-y-3">
            {adminNotifs.myDecisions.map((dec) => (
              <div
                key={dec.id}
                className="card p-4 rounded-2xl border border-[#06B6D4]/40 bg-[#06B6D4]/10 space-y-1"
              >
                <div className="flex items-center gap-2">
                  <Crown size={15} className="text-[#06B6D4]" />
                  <h4 className="text-xs font-bold text-[#F5F2ED]">
                    Removal Request Decision: <span className="font-mono text-[#06B6D4]">{dec.target_email}</span>
                  </h4>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                    dec.status === 'approved' ? 'bg-[#10B981]/20 text-[#10B981]' : 'bg-[#EF4444]/20 text-[#EF4444]'
                  }`}>
                    {dec.status}
                  </span>
                </div>
                <p className="text-xs text-[#A8A8A3]">
                  {dec.status === 'approved'
                    ? `The target administrator approved the request. Administrator privileges have been revoked.`
                    : `The target administrator declined the removal request. They remain an active administrator.`}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Notifications List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card p-5 animate-pulse bg-[#191D20] border-[#2E363D] rounded-2xl h-24" />
            ))}
          </div>
        ) : filteredNotifs.length === 0 ? (
          <div className="card p-12 text-center bg-[#191D20] border-[#2E363D] rounded-3xl">
            <Bell size={36} className="mx-auto text-[#A8A8A3] mb-3" />
            <h3 className="text-base font-bold text-[#F5F2ED]">No notifications to display</h3>
            <p className="text-xs text-[#A8A8A3] mt-1 max-w-sm mx-auto">
              You will receive alerts here as authorities review and resolve your reported hazards.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredNotifs.map((notif) => {
              const Icon = notif.icon;
              const isRead = readIds.includes(notif.id);

              return (
                <div
                  key={notif.id}
                  className={`card p-4 rounded-2xl transition border ${
                    isRead
                      ? 'bg-[#191D20] border-[#2E363D] opacity-80'
                      : 'bg-[#22272B] border-[#F5A623]/30 shadow-amber-glow/20'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className={`h-10 w-10 rounded-xl flex items-center justify-center border font-bold shrink-0 mt-0.5 ${notif.accent}`}>
                        <Icon size={18} />
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-extrabold text-sm text-[#F5F2ED]">{notif.title}</h3>
                          {!isRead && (
                            <span className="h-2 w-2 rounded-full bg-[#F5A623] shrink-0 animate-pulse" />
                          )}
                        </div>

                        <p className="text-xs text-[#A8A8A3] mt-1 leading-relaxed">
                          {notif.message}
                        </p>

                        <div className="flex items-center gap-3 mt-2 text-[11px] text-[#A8A8A3] font-mono">
                          {notif.address && (
                            <span className="flex items-center gap-1 truncate max-w-xs">
                              <MapPin size={11} className="text-[#F5A623]" /> {notif.address}
                            </span>
                          )}
                          <span>•</span>
                          <span>{ago(notif.timestamp)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => toggleRead(notif.id)}
                        className="text-[11px] font-bold text-[#A8A8A3] hover:text-[#F5F2ED] px-2 py-1"
                        title={isRead ? 'Mark as unread' : 'Mark as read'}
                      >
                        {isRead ? 'Unread' : 'Mark read'}
                      </button>

                      <Link
                        to={`/hazards/${notif.reportId}`}
                        className="grid h-8 w-8 place-items-center rounded-xl bg-[#101417] text-[#A8A8A3] hover:text-[#F5A623] hover:bg-[#F5A623]/10 border border-[#2E363D] transition"
                        title="View report"
                      >
                        <ExternalLink size={13} />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
