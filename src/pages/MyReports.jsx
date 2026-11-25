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
  Shield,
  Layers
} from 'lucide-react';

const STATUS_TABS = [
  { id: 'ALL', label: 'All' },
  { id: 'REPORTED', label: 'New' },
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
      return rStatus === 'IN_PROGRESS' || rStatus === 'IN PROGRESS' || rStatus === 'VERIFIED';
    }
    return rStatus === activeTab;
  });

  const totalCount = reports.length;
  const newCount = reports.filter((r) => (r.rawStatus || r.status || '').toUpperCase() === 'REPORTED').length;
  const inProgressCount = reports.filter((r) => {
    const s = (r.rawStatus || r.status || '').toUpperCase();
    return s === 'IN_PROGRESS' || s === 'VERIFIED';
  }).length;
  const resolvedCount = reports.filter((r) => (r.rawStatus || r.status || '').toUpperCase() === 'RESOLVED').length;

  return (
    <main className="page bg-[#101417] text-[#F5F2ED] min-h-screen py-10 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header Bar matching reference image 04 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#2E363D] pb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-[#F5A623] uppercase tracking-wider mb-1">
              <FileText size={15} />
              <span>Citizen Tracking</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#F5F2ED] tracking-tight font-display">
              My Reports
            </h1>
            <p className="mt-1 text-xs text-[#A8A8A3]">
              Track the issues you've reported and monitor authority repairs.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={loadReports}
              disabled={loading}
              className="btn btn-secondary text-xs flex items-center gap-1.5 py-2 px-3 border-[#2E363D] text-[#F5F2ED]"
              title="Refresh reports"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin text-[#F5A623]' : 'text-[#A8A8A3]'} />
              <span>Refresh</span>
            </button>

            <Link
              to="/report"
              className="btn btn-accent text-xs font-extrabold flex items-center gap-1.5 py-2 px-4 shadow-amber-glow"
            >
              <Plus size={15} className="stroke-[3]" />
              <span>Report a Hazard</span>
            </Link>
          </div>
        </div>

        {/* Filter Tabs matching reference image 04 MY REPORTS */}
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'ALL', label: `All (${totalCount})` },
            { id: 'REPORTED', label: `New (${newCount})` },
            { id: 'IN_PROGRESS', label: `In Progress (${inProgressCount})` },
            { id: 'RESOLVED', label: `Resolved (${resolvedCount})` }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === tab.id
                  ? 'bg-[#22272B] text-[#F5A623] border border-[#F5A623]/40 shadow-sm'
                  : 'bg-[#191D20] text-[#A8A8A3] border border-[#2E363D] hover:bg-[#22272B] hover:text-[#F5F2ED]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Reports List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card p-5 animate-pulse bg-[#191D20] border-[#2E363D] rounded-2xl h-24" />
            ))}
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="card p-12 text-center bg-[#191D20] border-[#2E363D] rounded-3xl">
            <AlertTriangle size={36} className="mx-auto text-[#F5A623] mb-3" />
            <h3 className="text-base font-bold text-[#F5F2ED]">No reports in this tab</h3>
            <p className="text-xs text-[#A8A8A3] mt-1 max-w-sm mx-auto">
              You haven't submitted any hazard reports matching this filter yet.
            </p>
            <Link to="/report" className="btn btn-accent text-xs font-bold mt-5 inline-flex">
              Report a Road Hazard
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredReports.map((report) => {
              const status = (report.rawStatus || report.status || '').toUpperCase();
              return (
                <Link
                  key={report.id}
                  to={`/hazards/${report.id}`}
                  className="card group block p-4 bg-[#191D20] border-[#2E363D] hover:border-[#F5A623]/40 hover:bg-[#22272B] transition rounded-2xl"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* Left: Thumbnail & Info */}
                    <div className="flex items-center gap-3.5">
                      {report.imageUrl ? (
                        <img
                          src={report.imageUrl}
                          alt={report.category}
                          className="h-14 w-14 rounded-xl object-cover border border-white/10 shrink-0"
                        />
                      ) : (
                        <div className="grid h-14 w-14 place-items-center rounded-xl bg-[#22272B] border border-[#2E363D] text-2xl shrink-0">
                          ⚠️
                        </div>
                      )}

                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-extrabold text-sm text-[#F5F2ED] group-hover:text-[#F5A623] transition-colors">
                            {report.category}
                          </h3>
                          <span className="text-[10px] font-mono font-bold text-[#A8A8A3] bg-[#101417] px-2 py-0.5 rounded border border-white/5">
                            #{String(report.id).substring(0, 8)}
                          </span>
                        </div>

                        <p className="text-xs text-[#A8A8A3] flex items-center gap-1 mt-1 truncate max-w-md">
                          <MapPin size={12} className="text-[#F5A623] shrink-0" />
                          <span className="truncate">{report.address}</span>
                        </p>

                        <p className="text-[11px] text-[#A8A8A3] mt-1 font-mono">
                          Submitted: {report.reportedAt ? new Date(report.reportedAt).toLocaleDateString() : 'Recently'} • {ago(report.reportedAt)}
                        </p>
                      </div>
                    </div>

                    {/* Right: Status Badge & Chevron */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                      <Badge value={report.status} />
                      <div className="grid h-8 w-8 place-items-center rounded-xl bg-[#101417] text-[#A8A8A3] group-hover:text-[#F5A623] group-hover:bg-[#F5A623]/10 border border-[#2E363D] transition">
                        <ArrowRight size={14} />
                      </div>
                    </div>
                  </div>

                  {/* 4-Step Visual Progress Bar */}
                  <div className="mt-4 pt-3 border-t border-[#2E363D] grid grid-cols-4 gap-2 text-center text-[10px] font-bold">
                    <div className="text-[#F5A623]">
                      <span className="h-1 w-full bg-[#F5A623] rounded-full block mb-1" />
                      Reported
                    </div>
                    <div className={status === 'VERIFIED' || status === 'IN_PROGRESS' || status === 'RESOLVED' ? 'text-[#06B6D4]' : 'text-[#A8A8A3]'}>
                      <span className={`h-1 w-full rounded-full block mb-1 ${status === 'VERIFIED' || status === 'IN_PROGRESS' || status === 'RESOLVED' ? 'bg-[#06B6D4]' : 'bg-[#2E363D]'}`} />
                      Verified
                    </div>
                    <div className={status === 'IN_PROGRESS' || status === 'RESOLVED' ? 'text-[#C87942]' : 'text-[#A8A8A3]'}>
                      <span className={`h-1 w-full rounded-full block mb-1 ${status === 'IN_PROGRESS' || status === 'RESOLVED' ? 'bg-[#C87942]' : 'bg-[#2E363D]'}`} />
                      In Progress
                    </div>
                    <div className={status === 'RESOLVED' ? 'text-[#10B981]' : 'text-[#A8A8A3]'}>
                      <span className={`h-1 w-full rounded-full block mb-1 ${status === 'RESOLVED' ? 'bg-[#10B981]' : 'bg-[#2E363D]'}`} />
                      Resolved
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
