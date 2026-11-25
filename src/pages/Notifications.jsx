import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getMyReports } from '../services/hazardService';
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
  ExternalLink
} from 'lucide-react';
import { ago } from '../utils/formatters';

export default function Notifications() {
  const { user, session } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
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
      const res = await getMyReports(session?.access_token);
      setReports(res.data || []);
    } catch (err) {
      console.warn('Failed to fetch reports for notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [session]);

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
