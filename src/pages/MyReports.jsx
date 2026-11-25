import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMyReports } from '../services/hazardService';
import { useAuth } from '../context/AuthContext';
import { Badge } from '../components/Badges';
import { ago } from '../utils/formatters';
import {
  FileText,
  Plus,
  RefreshCw,
  AlertTriangle,
  MapPin,
  Clock,
  ArrowRight,
  CheckCircle2,
  Activity,
  Shield,
  Layers,
  ChevronRight
} from 'lucide-react';

const STATUS_TABS = [
  { id: 'ALL', label: 'All Reports' },
  { id: 'REPORTED', label: 'New' },
  { id: 'VERIFIED', label: 'Verified' },
  { id: 'IN_PROGRESS', label: 'In Progress' },
  { id: 'RESOLVED', label: 'Resolved' }
];

export default function MyReports() {
  const { user, session } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL');

  const loadReports = async () => {
    setLoading(true);
    try {
      const res = await getMyReports(session?.access_token);
      setReports(res.data || []);
    } catch (err) {
      console.warn('Failed to load my reports:', err);
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [session]);

  const filteredReports = reports.filter((r) => {
    if (activeTab === 'ALL') return true;
    const rStatus = (r.rawStatus || r.status || '').toUpperCase();
    if (activeTab === 'IN_PROGRESS') {
      return rStatus === 'IN_PROGRESS' || rStatus === 'IN PROGRESS';
    }
    return rStatus === activeTab;
  });

  const totalCount = reports.length;
  const activeCount = reports.filter((r) => (r.rawStatus || r.status || '').toUpperCase() !== 'RESOLVED').length;
  const resolvedCount = reports.filter((r) => (r.rawStatus || r.status || '').toUpperCase() === 'RESOLVED').length;

  return (
    <main className="page bg-slate-50 min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-teal-100 text-teal-800">
                <FileText size={18} />
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                My Hazard Reports
              </h1>
            </div>
            <p className="mt-1 text-xs sm:text-sm text-slate-600">
              Track real-time progress, authority dispatches, and repairs on hazards you reported.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={loadReports}
              disabled={loading}
              className="btn btn-secondary text-xs flex items-center gap-1.5"
              title="Refresh reports"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin text-teal-600' : 'text-slate-500'} />
              <span>Refresh</span>
            </button>

            <Link
              to="/report"
              className="btn btn-accent text-xs font-bold flex items-center gap-1.5 shadow-sm"
            >
              <Plus size={15} />
              <span>Report New Hazard</span>
            </Link>
          </div>
        </div>

        {/* Metric Summary Cards */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          <div className="card p-4 sm:p-5 bg-white text-center">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Reports</p>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">{totalCount}</p>
          </div>

          <div className="card p-4 sm:p-5 bg-white text-center">
            <p className="text-xs font-bold text-amber-700 uppercase tracking-wider">Under Action</p>
            <p className="text-2xl sm:text-3xl font-black text-amber-600 mt-1">{activeCount}</p>
          </div>

          <div className="card p-4 sm:p-5 bg-white text-center">
            <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Resolved</p>
            <p className="text-2xl sm:text-3xl font-black text-emerald-600 mt-1">{resolvedCount}</p>
          </div>
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {STATUS_TABS.map((tab) => {
            const count =
              tab.id === 'ALL'
                ? totalCount
                : tab.id === 'IN_PROGRESS'
                ? reports.filter((r) => ['IN_PROGRESS', 'IN PROGRESS'].includes((r.rawStatus || r.status || '').toUpperCase())).length
                : reports.filter((r) => (r.rawStatus || r.status || '').toUpperCase() === tab.id).length;

            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  isActive
                    ? 'bg-[#0B3B3C] text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Reports Content List */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card p-5 animate-pulse space-y-3 bg-white">
                <div className="h-5 bg-slate-200 rounded w-1/3" />
                <div className="h-4 bg-slate-100 rounded w-1/2" />
                <div className="h-10 bg-slate-100 rounded" />
              </div>
            ))}
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="card p-12 text-center bg-white border border-slate-200 shadow-xs">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-amber-50 text-amber-700 mb-3">
              <AlertTriangle size={28} />
            </div>
            <h3 className="text-lg font-bold text-slate-900">No Reports Found</h3>
            <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              {activeTab === 'ALL'
                ? "You haven't submitted any hazard reports yet. Spot a pothole or flooded road to create your first report."
                : `No hazard reports under '${activeTab}' status.`}
            </p>
            <div className="mt-5">
              <Link to="/report" className="btn btn-accent text-xs font-bold inline-flex items-center gap-2">
                <Plus size={15} />
                Report a Hazard
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredReports.map((r) => {
              const statusNormalized = (r.rawStatus || r.status || 'REPORTED').toUpperCase();
              const isResolved = statusNormalized === 'RESOLVED';
              const isInProgress = statusNormalized === 'IN_PROGRESS' || statusNormalized === 'IN PROGRESS';
              const isVerified = statusNormalized === 'VERIFIED' || isInProgress || isResolved;

              return (
                <div
                  key={r.id}
                  className="card p-5 bg-white border border-slate-200/90 shadow-xs hover:border-teal-300 transition-all duration-200 space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      {r.imageUrl ? (
                        <img
                          src={r.imageUrl}
                          alt={r.category}
                          className="h-16 w-16 rounded-xl object-cover border border-slate-200 shrink-0"
                        />
                      ) : (
                        <div className="grid h-16 w-16 place-items-center rounded-xl bg-slate-100 text-slate-400 font-bold text-xs shrink-0 border border-slate-200">
                          No Photo
                        </div>
                      )}

                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded">
                            #{String(r.id).substring(0, 8)}
                          </span>
                          <h3 className="text-base font-extrabold text-slate-900">{r.category}</h3>
                          <Badge value={r.severity} kind="severity" />
                        </div>

                        <p className="mt-1 text-xs text-slate-600 flex items-center gap-1.5" title={r.address}>
                          <MapPin size={13} className="text-teal-600 shrink-0" />
                          <span className="truncate max-w-md">{r.address}</span>
                        </p>

                        {r.description && (
                          <p className="mt-1.5 text-xs text-slate-500 italic line-clamp-1">
                            "{r.description}"
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                      <Badge value={r.status} />
                      <Link
                        to={`/hazards/${r.id}`}
                        className="btn btn-secondary text-xs font-bold py-1.5 px-3 flex items-center gap-1 hover:text-teal-700"
                      >
                        <span>Details</span>
                        <ChevronRight size={13} />
                      </Link>
                    </div>
                  </div>

                  {/* 4-Step Progress Tracker */}
                  <div className="pt-3 border-t border-slate-100">
                    <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-bold">
                      <div className="space-y-1">
                        <div className="h-1.5 w-full rounded-full bg-teal-600" />
                        <span className="text-teal-800">1. Reported</span>
                      </div>
                      <div className="space-y-1">
                        <div
                          className={`h-1.5 w-full rounded-full ${
                            isVerified ? 'bg-teal-600' : 'bg-slate-200'
                          }`}
                        />
                        <span className={isVerified ? 'text-teal-800' : 'text-slate-400'}>2. Verified</span>
                      </div>
                      <div className="space-y-1">
                        <div
                          className={`h-1.5 w-full rounded-full ${
                            isInProgress || isResolved ? 'bg-purple-600' : 'bg-slate-200'
                          }`}
                        />
                        <span className={isInProgress || isResolved ? 'text-purple-800' : 'text-slate-400'}>
                          3. In Progress
                        </span>
                      </div>
                      <div className="space-y-1">
                        <div
                          className={`h-1.5 w-full rounded-full ${
                            isResolved ? 'bg-emerald-600' : 'bg-slate-200'
                          }`}
                        />
                        <span className={isResolved ? 'text-emerald-800' : 'text-slate-400'}>4. Resolved</span>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        Submitted: {r.reportedAt ? new Date(r.reportedAt).toLocaleDateString() : 'Recent'}
                      </span>
                      {r.assigned_to && (
                        <span className="text-slate-600 font-semibold">
                          Assigned: {r.assigned_to}
                        </span>
                      )}
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
