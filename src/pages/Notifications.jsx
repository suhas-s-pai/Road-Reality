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
      title: `Report Submitted: ${r.category}`,
      message: `Your hazard report #${String(r.id).substring(0, 8)} has been saved and shared with community drivers.`,
      timestamp: r.reportedAt,
      icon: CheckCircle2,
      color: 'text-teal-600 bg-teal-50 border-teal-200'
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
        message: `Authorities have officially verified your hazard report. Dispatch planning is underway.`,
        timestamp: r.updatedAt || r.reportedAt,
        icon: Shield,
        color: 'text-sky-600 bg-sky-50 border-sky-200'
      });
    }

    // 3. Work in progress
    if (status === 'IN_PROGRESS' || status === 'RESOLVED') {
      notifs.push({
        id: `prog-${r.id}`,
        reportId: r.id,
        category: r.category,
        address: r.address,
        type: 'IN_PROGRESS',
        title: `Repair Crew Dispatched`,
        message: `A road maintenance team has been deployed to ${r.address || 'the hazard site'}.`,
        timestamp: r.updatedAt || r.reportedAt,
        icon: AlertTriangle,
        color: 'text-purple-600 bg-purple-50 border-purple-200'
      });
    }

    // 4. Hazard Resolved
    if (status === 'RESOLVED') {
      notifs.push({
        id: `res-${r.id}`,
        reportId: r.id,
        category: r.category,
        address: r.address,
        type: 'RESOLVED',
        title: `Hazard Resolved & Repaired`,
        message: `Great news! The ${r.category} hazard has been fully repaired and verified safe for motorists.`,
        timestamp: r.updatedAt || r.reportedAt,
        icon: CheckCircle2,
        color: 'text-emerald-600 bg-emerald-50 border-emerald-200'
      });
    }

    return notifs;
  });

  // Sort by latest timestamp
  notificationsList.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));

  const unreadCount = notificationsList.filter((n) => !readIds.includes(n.id)).length;

  const filteredNotifs = notificationsList.filter((n) => {
    if (filter === 'UNREAD') return !readIds.includes(n.id);
    return true;
  });

  return (
    <main className="page bg-slate-50 min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-teal-100 text-teal-800">
                <Bell size={18} />
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Activity Notifications
              </h1>
              {unreadCount > 0 && (
                <span className="rounded-full bg-amber-500 text-white font-bold text-xs px-2.5 py-0.5">
                  {unreadCount} New
                </span>
              )}
            </div>
            <p className="mt-1 text-xs sm:text-sm text-slate-600">
              Live updates on your reported road hazards, municipal verifications, and crew dispatches.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadNotifications}
              disabled={loading}
              className="btn btn-secondary text-xs flex items-center gap-1.5"
              title="Refresh"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin text-teal-600' : 'text-slate-500'} />
              <span>Refresh</span>
            </button>

            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="btn btn-secondary text-xs font-bold flex items-center gap-1.5 hover:text-teal-700"
              >
                <CheckCheck size={14} />
                <span>Mark All Read</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilter('ALL')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
              filter === 'ALL'
                ? 'bg-[#0B3B3C] text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            All Notifications ({notificationsList.length})
          </button>

          <button
            onClick={() => setFilter('UNREAD')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
              filter === 'UNREAD'
                ? 'bg-[#0B3B3C] text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            Unread ({unreadCount})
          </button>
        </div>

        {/* Notifications Feed */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card p-4 animate-pulse space-y-2 bg-white">
                <div className="h-4 bg-slate-200 rounded w-1/4" />
                <div className="h-3 bg-slate-100 rounded w-3/4" />
              </div>
            ))}
          </div>
        ) : filteredNotifs.length === 0 ? (
          <div className="card p-12 text-center bg-white border border-slate-200 shadow-xs">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-teal-50 text-teal-700 mb-3">
              <CheckCircle2 size={28} />
            </div>
            <h3 className="text-lg font-bold text-slate-900">All Caught Up!</h3>
            <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              {filter === 'UNREAD'
                ? 'You have read all your notifications.'
                : 'You will receive notifications whenever a road report status changes or authorities dispatch repairs.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredNotifs.map((n) => {
              const Icon = n.icon;
              const isRead = readIds.includes(n.id);

              return (
                <div
                  key={n.id}
                  onClick={() => toggleRead(n.id)}
                  className={`card p-4 transition-all duration-150 cursor-pointer flex items-start justify-between gap-4 ${
                    isRead ? 'bg-white/80 opacity-75' : 'bg-white border-teal-200/80 shadow-xs'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className={`grid h-9 w-9 place-items-center rounded-xl border shrink-0 ${n.color}`}>
                      <Icon size={18} />
                    </span>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900 leading-tight">{n.title}</h4>
                        {!isRead && (
                          <span className="h-2 w-2 rounded-full bg-orange-500 shrink-0" />
                        )}
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed">{n.message}</p>

                      <div className="pt-1 flex items-center gap-3 text-[11px] text-slate-400">
                        <span className="flex items-center gap-1">
                          <Clock size={11} />
                          {n.timestamp ? new Date(n.timestamp).toLocaleString() : 'Recent'}
                        </span>
                        {n.address && (
                          <span className="flex items-center gap-1 text-slate-500 truncate max-w-xs">
                            <MapPin size={11} className="text-teal-600 shrink-0" />
                            <span className="truncate">{n.address}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <Link
                    to={`/hazards/${n.reportId}`}
                    onClick={(e) => e.stopPropagation()}
                    className="p-2 rounded-xl text-slate-400 hover:text-teal-700 hover:bg-slate-100 transition shrink-0"
                    title="View Report"
                  >
                    <ExternalLink size={16} />
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
