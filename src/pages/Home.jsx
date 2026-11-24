import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  MapPin,
  ArrowRight,
  ShieldCheck,
  CheckCircle,
  Clock,
  Car,
  ChevronRight,
  Activity,
  Layers,
  Users,
  Compass
} from 'lucide-react';
import { getHazards, getNearbyHazards } from '../services/hazardService';
import { useUserLocation } from '../hooks/useUserLocation';
import { Badge } from '../components/Badges';

const categoriesGrid = [
  { name: 'Pothole', desc: 'Craters, road cracks & surface damage', icon: '🕳️' },
  { name: 'Waterlogging', desc: 'Flooded streets & drainage blocks', icon: '🌊' },
  { name: 'Fallen Tree', desc: 'Blocked branches & storm damage', icon: '🌳' },
  { name: 'Road Debris', desc: 'Spills, gravel, glass & obstacles', icon: '🚧' },
  { name: 'Broken Streetlight', desc: 'Dark road stretches & electrical hazards', icon: '💡' },
  { name: 'Blocked Road', desc: 'Closures, accidents & diversions', icon: '⛔' }
];

export default function Home() {
  const { latitude, longitude, placeName, loading: locLoading } = useUserLocation(true);
  const [reports, setReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(true);

  useEffect(() => {
    async function loadReports() {
      setLoadingReports(true);
      try {
        let res;
        if (latitude && longitude) {
          res = await getNearbyHazards(latitude, longitude, 50);
        } else {
          res = await getHazards();
        }
        setReports(res.data || []);
      } catch (err) {
        console.warn('Could not load reports for home:', err.message);
      } finally {
        setLoadingReports(false);
      }
    }
    loadReports();
  }, [latitude, longitude]);

  const recentReports = reports.slice(0, 3);
  const activeCount = reports.filter((r) => (r.status || '').toUpperCase() !== 'RESOLVED').length;
  const resolvedCount = reports.filter((r) => (r.status || '').toUpperCase() === 'RESOLVED').length;

  return (
    <main className="bg-white text-slate-900 min-h-screen">
      {/* 1. HERO SECTION (Clean, Light, Obvious Actions) */}
      <section className="relative overflow-hidden bg-gradient-to-b from-teal-50/60 via-white to-white border-b border-slate-100 py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            {/* Live Status Pill */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-100/80 border border-teal-200 text-teal-800 text-xs font-bold tracking-wide mb-6">
              <span className="h-2 w-2 rounded-full bg-teal-600 animate-pulse" />
              LIVE ROAD HAZARD TRACKING
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.1]">
              Know road dangers <br />
              <span className="text-teal-600">before you drive.</span>
            </h1>

            <p className="mt-5 text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
              Real-time road hazard reports from citizens on the ground. Spot dangerous potholes, flooded streets, and road obstacles before they cause accidents.
            </p>

            {/* MAIN ACTIONS (Obvious, Vibrant Teal & Orange) */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5 sm:gap-4">
              <Link
                to="/report"
                className="btn btn-accent w-full sm:w-auto text-sm font-bold py-3.5 px-7 shadow-md flex items-center justify-center gap-2"
              >
                <AlertTriangle size={18} />
                Report an Issue
                <ArrowRight size={16} />
              </Link>

              <Link
                to="/explore"
                className="btn btn-primary w-full sm:w-auto text-sm font-bold py-3.5 px-7 shadow-md flex items-center justify-center gap-2"
              >
                <MapPin size={18} />
                Explore Live Map
              </Link>
            </div>

            {/* Quick Metrics Bar */}
            <div className="mt-12 grid grid-cols-3 gap-4 max-w-xl mx-auto pt-8 border-t border-slate-200/80 text-center">
              <div>
                <p className="text-2xl sm:text-3xl font-black text-slate-900">{reports.length || 0}</p>
                <p className="text-xs font-semibold text-slate-500 mt-0.5">Total Reports</p>
              </div>
              <div className="border-x border-slate-200">
                <p className="text-2xl sm:text-3xl font-black text-orange-500">{activeCount || 0}</p>
                <p className="text-xs font-semibold text-slate-500 mt-0.5">Active Hazards</p>
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-black text-teal-600">{resolvedCount || 0}</p>
                <p className="text-xs font-semibold text-slate-500 mt-0.5">Resolved Fixes</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. RECENT ROAD HAZARDS (Real Supabase Data) */}
      <section className="py-14 bg-slate-50 border-b border-slate-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <span className="text-xs font-bold text-teal-600 uppercase tracking-wider">Live Updates</span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-0.5">
                Recent Hazards Near You
              </h2>
              {placeName && (
                <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                  <MapPin size={13} className="text-teal-600" /> Showing reports around {placeName}
                </p>
              )}
            </div>

            <Link
              to="/explore"
              className="btn btn-secondary text-xs font-bold self-start sm:self-auto flex items-center gap-1.5"
            >
              Open Interactive Map <ArrowRight size={14} />
            </Link>
          </div>

          {loadingReports ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="card p-5 animate-pulse space-y-3 bg-white">
                  <div className="h-32 bg-slate-100 rounded-xl" />
                  <div className="h-4 bg-slate-100 rounded w-2/3" />
                  <div className="h-3 bg-slate-100 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : recentReports.length === 0 ? (
            <div className="card p-10 text-center bg-white border border-slate-200">
              <ShieldCheck size={36} className="mx-auto text-teal-600 mb-2" />
              <h3 className="font-bold text-slate-900">No active road hazards reported yet</h3>
              <p className="text-sm text-slate-500 mt-1">
                Be the first to report a pothole or road block in your area.
              </p>
              <Link to="/report" className="btn btn-accent mt-4 inline-flex text-xs">
                Report First Hazard
              </Link>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {recentReports.map((r) => (
                <div
                  key={r.id}
                  className="card overflow-hidden bg-white hover:border-teal-400 hover:shadow-md transition flex flex-col justify-between"
                >
                  <div>
                    {r.imageUrl ? (
                      <img src={r.imageUrl} alt={r.category} className="h-44 w-full object-cover border-b" />
                    ) : (
                      <div className="h-32 w-full bg-slate-100 flex flex-col items-center justify-center text-slate-400 border-b">
                        <AlertTriangle size={24} className="text-slate-300 mb-1" />
                        <span className="text-xs font-semibold">No photograph attached</span>
                      </div>
                    )}

                    <div className="p-5 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-base font-extrabold text-slate-900">{r.category}</span>
                        <Badge value={r.status} />
                      </div>

                      <p className="text-xs text-slate-600 flex items-start gap-1">
                        <MapPin size={14} className="text-teal-600 shrink-0 mt-0.5" />
                        <span className="line-clamp-1">{r.address || 'Address pending'}</span>
                      </p>

                      {r.description ? (
                        <p className="text-xs text-slate-500 line-clamp-2 italic">"{r.description}"</p>
                      ) : (
                        <p className="text-xs text-slate-400 italic">No description provided</p>
                      )}
                    </div>
                  </div>

                  <div className="p-5 pt-0 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock size={13} />
                      {r.reportedAt ? new Date(r.reportedAt).toLocaleDateString() : 'Recent'}
                    </span>

                    <Link
                      to={`/hazards/${r.id}`}
                      className="font-bold text-teal-700 hover:text-teal-900 hover:underline flex items-center gap-0.5"
                    >
                      View Details →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 3. HOW ROAD REALITY WORKS (Simple 4-Step Process) */}
      <section className="py-16 bg-white border-b border-slate-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold text-teal-600 uppercase tracking-wider">Workflow</span>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight mt-1">
              How Road Reality Works
            </h2>
            <p className="text-sm text-slate-600 mt-2">
              A transparent civic platform turning road problems into verified solutions.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                step: '01',
                title: 'Report',
                desc: 'Citizens select the issue category. Location and time are captured automatically.',
                icon: AlertTriangle,
                color: 'bg-orange-50 text-orange-600 border-orange-200'
              },
              {
                step: '02',
                title: 'Verify',
                desc: 'Authority officers and community members review and verify the danger level.',
                icon: ShieldCheck,
                color: 'bg-teal-50 text-teal-600 border-teal-200'
              },
              {
                step: '03',
                title: 'Track',
                desc: 'Road work crews are dispatched and progress updates appear on the live map.',
                icon: Compass,
                color: 'bg-blue-50 text-blue-600 border-blue-200'
              },
              {
                step: '04',
                title: 'Resolve',
                desc: 'Repairs are completed and marked resolved so drivers can travel safely.',
                icon: CheckCircle,
                color: 'bg-emerald-50 text-emerald-600 border-emerald-200'
              }
            ].map((st) => {
              const Icon = st.icon;
              return (
                <div key={st.step} className="card p-6 border border-slate-200 bg-white space-y-3">
                  <div className={`h-11 w-11 rounded-xl flex items-center justify-center border font-bold text-lg ${st.color}`}>
                    <Icon size={20} />
                  </div>
                  <div>
                    <span className="text-xs font-mono font-bold text-slate-400">STEP {st.step}</span>
                    <h3 className="text-lg font-bold text-slate-900 mt-0.5">{st.title}</h3>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{st.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 4. COMMON ROAD HAZARD CATEGORIES */}
      <section className="py-16 bg-slate-50 border-b border-slate-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-bold text-teal-600 uppercase tracking-wider">Hazard Types</span>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight mt-1">
              What You Can Report
            </h2>
            <p className="text-sm text-slate-600 mt-2">
              Select any category to jump directly to the short report form.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {categoriesGrid.map((cat) => (
              <Link
                key={cat.name}
                to={`/report?category=${encodeURIComponent(cat.name)}`}
                className="card p-5 bg-white hover:border-teal-500 hover:shadow-md transition flex items-start gap-4 group"
              >
                <span className="text-3xl shrink-0 group-hover:scale-110 transition">{cat.icon}</span>
                <div className="flex-1">
                  <h3 className="font-extrabold text-slate-900 group-hover:text-teal-700 transition">
                    {cat.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">{cat.desc}</p>
                  <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-teal-600 group-hover:underline">
                    Report this hazard <ChevronRight size={13} />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 5. CALL TO ACTION FOOTER BANNER */}
      <section className="py-16 bg-white">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="card p-8 sm:p-12 bg-gradient-to-br from-teal-500 to-teal-700 text-white shadow-xl text-center border-none">
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight">
              Notice a dangerous road condition?
            </h2>
            <p className="mt-3 text-teal-100 text-sm sm:text-base max-w-xl mx-auto">
              It takes 10 seconds to submit a report. Help prevent vehicle damage and accidents for your entire city.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3">
              <Link
                to="/report"
                className="btn btn-accent text-sm font-bold py-3 px-8 shadow-md"
              >
                Report an Issue Now
              </Link>
              <Link
                to="/explore"
                className="btn bg-white/10 hover:bg-white/20 border border-white/30 text-white text-sm font-bold py-3 px-6"
              >
                View Live Map
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
