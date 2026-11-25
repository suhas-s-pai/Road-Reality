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
  Compass,
  Sparkles,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import { getHazards, getNearbyHazards } from '../services/hazardService';
import { useUserLocation } from '../hooks/useUserLocation';
import HazardCard from '../components/HazardCard';

const categoriesGrid = [
  { name: 'Pothole', desc: 'Craters, road cracks & asphalt surface damage', icon: '🕳️' },
  { name: 'Waterlogging', desc: 'Flooded streets, flash floods & drainage blocks', icon: '🌊' },
  { name: 'Fallen Tree', desc: 'Blocked branches, debris & storm damage', icon: '🌳' },
  { name: 'Road Debris', desc: 'Spills, gravel, obstacles & highway obstructions', icon: '🚧' },
  { name: 'Broken Streetlight', desc: 'Dark stretches & compromised night visibility', icon: '💡' },
  { name: 'Blocked Road', desc: 'Closures, active accidents & emergency diversions', icon: '⛔' }
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
  const totalCount = reports.length;
  const newCount = reports.filter((r) => (r.status || '').toUpperCase() === 'REPORTED').length;
  const inProgressCount = reports.filter((r) => {
    const s = (r.status || '').toUpperCase();
    return s === 'IN_PROGRESS' || s === 'VERIFIED';
  }).length;
  const resolvedCount = reports.filter((r) => (r.status || '').toUpperCase() === 'RESOLVED').length;

  return (
    <main className="bg-[#101417] text-[#F5F2ED] min-h-screen">
      {/* ==================================================================== */}
      {/* 1. HERO SECTION — CINEMATIC DUSK ROAD AT NIGHT */}
      {/* ==================================================================== */}
      <section className="relative overflow-hidden border-b border-[#2E363D] pt-12 pb-20 lg:pt-16 lg:pb-24">
        {/* Ambient atmospheric glows */}
        <div className="absolute top-0 right-1/4 -z-10 h-96 w-96 rounded-full bg-[#F5A623]/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 left-10 -z-10 h-80 w-80 rounded-full bg-[#C87942]/10 blur-3xl pointer-events-none" />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            {/* Left Column: Hero Text & CTAs */}
            <div className="lg:col-span-7 space-y-6">
              {/* Eyebrow Pill */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#191D20] border border-[#2E363D] text-[#A8A8A3] text-[11px] font-bold tracking-widest uppercase">
                <span className="h-2 w-2 rounded-full bg-[#F5A623] animate-pulse" />
                <span>CITIZEN × ROADS × SAFETY</span>
              </div>

              {/* Main Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.08] font-display">
                REPORT ROAD <br />
                <span className="text-[#F5F2ED]">HAZARDS.</span> <br />
                <span className="bg-gradient-to-r from-[#F5A623] via-[#E8C18A] to-[#C87942] bg-clip-text text-transparent">
                  MAKE ROADS SAFER.
                </span>
              </h1>

              {/* Subhead */}
              <p className="text-base sm:text-lg text-[#A8A8A3] leading-relaxed max-w-xl">
                A real-time, citizen-powered platform to report potholes, flooded streets, obstacles and other road issues before they cause accidents.
              </p>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5">
                <Link
                  to="/report"
                  className="btn btn-accent text-sm font-extrabold py-3.5 px-7 shadow-amber-glow flex items-center justify-center gap-2 group"
                >
                  <AlertTriangle size={18} className="stroke-[2.5]" />
                  <span>Report a Hazard</span>
                  <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                </Link>

                <Link
                  to="/explore"
                  className="btn btn-primary text-sm font-bold py-3.5 px-6 border-[#2E363D] text-[#F5F2ED] hover:border-[#F5A623] hover:text-[#F5A623] flex items-center justify-center gap-2"
                >
                  <MapPin size={18} className="text-[#F5A623]" />
                  <span>Explore Live Map</span>
                </Link>
              </div>

              {/* Real-time sync note */}
              {placeName && (
                <p className="text-xs text-[#A8A8A3] flex items-center gap-1.5 pt-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
                  <span>Active monitoring detected near <strong className="text-[#F5F2ED]">{placeName}</strong></span>
                </p>
              )}
            </div>

            {/* Right Column: Cinematic Road Photography Card */}
            <div className="lg:col-span-5 relative">
              <div className="relative rounded-3xl overflow-hidden border border-[#2E363D] bg-[#191D20] shadow-2xl group">
                {/* Cinematic Road Photograph (Dusk / Wet Asphalt / Taillights) */}
                <div className="relative h-80 sm:h-96 w-full overflow-hidden">
                  <img
                    src="https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=1200&q=80"
                    alt="Cinematic wet highway at dusk with taillights reflecting on pavement"
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105 filter brightness-95"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#101417] via-[#101417]/30 to-transparent" />

                  {/* Pulsing Hazard Pin on Image */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
                    <span className="absolute h-16 w-16 rounded-full bg-[#F5A623]/30 pulse-location" />
                    <span className="relative grid h-10 w-10 place-items-center rounded-full bg-[#F5A623] text-[#101417] shadow-amber-glow font-black text-sm">
                      <AlertTriangle size={18} className="stroke-[2.5]" />
                    </span>
                  </div>

                  {/* Floating live alert chip */}
                  <div className="absolute bottom-4 left-4 right-4 rounded-2xl border border-white/10 bg-[#191D20]/90 p-3.5 backdrop-blur-md flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#F5A623]/15 text-[#F5A623] border border-[#F5A623]/30 font-bold text-xs">
                        ⚠️
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#F5F2ED]">Severe Pothole Alert</p>
                        <p className="text-[11px] text-[#A8A8A3]">Outer Ring Road • Verified 12m ago</p>
                      </div>
                    </div>
                    <span className="rounded-full bg-[#C87942]/20 border border-[#C87942]/40 px-2.5 py-0.5 text-[10px] font-bold text-[#E8C18A]">
                      Crew Dispatched
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 4 LIVE DATABASE STATISTIC CARDS */}
          <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Total Reports */}
            <div className="card p-5 bg-[#191D20] border-[#2E363D] hover:border-[#06B6D4]/40 transition group">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-[#A8A8A3]">Total Reports</span>
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#06B6D4]/15 text-[#06B6D4] border border-[#06B6D4]/30">
                  <Layers size={16} />
                </span>
              </div>
              <p className="text-3xl font-black text-[#F5F2ED] tracking-tight font-display">
                {totalCount}
              </p>
              <p className="text-[11px] text-[#A8A8A3] mt-1">Crowdsourced incidents</p>
            </div>

            {/* New Reports */}
            <div className="card p-5 bg-[#191D20] border-[#2E363D] hover:border-[#F5A623]/40 transition group">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-[#A8A8A3]">New Reports</span>
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#F5A623]/15 text-[#F5A623] border border-[#F5A623]/30">
                  <AlertTriangle size={16} />
                </span>
              </div>
              <p className="text-3xl font-black text-[#F5A623] tracking-tight font-display">
                {newCount}
              </p>
              <p className="text-[11px] text-[#A8A8A3] mt-1">Awaiting dispatch</p>
            </div>

            {/* In Progress */}
            <div className="card p-5 bg-[#191D20] border-[#2E363D] hover:border-[#C87942]/40 transition group">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-[#A8A8A3]">In Progress</span>
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#C87942]/15 text-[#E8C18A] border border-[#C87942]/30">
                  <Clock size={16} />
                </span>
              </div>
              <p className="text-3xl font-black text-[#E8C18A] tracking-tight font-display">
                {inProgressCount}
              </p>
              <p className="text-[11px] text-[#A8A8A3] mt-1">Crews assigned</p>
            </div>

            {/* Resolved */}
            <div className="card p-5 bg-[#191D20] border-[#2E363D] hover:border-[#10B981]/40 transition group">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-[#A8A8A3]">Resolved</span>
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30">
                  <CheckCircle size={16} />
                </span>
              </div>
              <p className="text-3xl font-black text-[#10B981] tracking-tight font-display">
                {resolvedCount}
              </p>
              <p className="text-[11px] text-[#A8A8A3] mt-1">Safely repaired</p>
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* 2. LIVE HAZARDS PREVIEW SECTION (Real Supabase Records) */}
      {/* ==================================================================== */}
      <section className="py-16 bg-[#101417] border-b border-[#2E363D]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#F5A623] uppercase tracking-wider mb-1">
                <Activity size={14} />
                <span>Live Feed</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-[#F5F2ED] tracking-tight font-display">
                Recent Road Hazards
              </h2>
              {placeName && (
                <p className="text-xs text-[#A8A8A3] flex items-center gap-1 mt-1">
                  <MapPin size={13} className="text-[#F5A623]" /> Showing real reports near {placeName}
                </p>
              )}
            </div>

            <Link
              to="/explore"
              className="btn btn-secondary text-xs font-bold self-start sm:self-auto flex items-center gap-1.5 border-[#2E363D] text-[#F5F2ED] hover:border-[#F5A623] hover:text-[#F5A623]"
            >
              <span>Explore Live Map</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          {loadingReports ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="card p-5 animate-pulse space-y-3 bg-[#191D20] border-[#2E363D]">
                  <div className="h-40 bg-[#22272B] rounded-xl" />
                  <div className="h-4 bg-[#22272B] rounded w-2/3" />
                  <div className="h-3 bg-[#22272B] rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : recentReports.length === 0 ? (
            <div className="card p-12 text-center bg-[#191D20] border border-[#2E363D] rounded-3xl">
              <ShieldCheck size={40} className="mx-auto text-[#F5A623] mb-3" />
              <h3 className="font-bold text-[#F5F2ED] text-base">No active road hazards reported yet</h3>
              <p className="text-xs text-[#A8A8A3] mt-1 max-w-md mx-auto">
                Be the first to report a pothole, flood, or road block in your area to alert fellow drivers.
              </p>
              <Link to="/report" className="btn btn-accent mt-5 inline-flex text-xs font-bold">
                Report First Hazard
              </Link>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {recentReports.map((r) => (
                <HazardCard hazard={r} key={r.id} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ==================================================================== */}
      {/* 3. HOW ROAD REALITY WORKS (Refined 4-Step Process) */}
      {/* ==================================================================== */}
      <section className="py-20 bg-[#101417] border-b border-[#2E363D]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-bold text-[#F5A623] uppercase tracking-widest">
              Civic Infrastructure Workflow
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-[#F5F2ED] tracking-tight font-display mt-1">
              How Road Reality Works
            </h2>
            <p className="text-sm text-[#A8A8A3] mt-2">
              Transforming citizen observations into verified, resolved road infrastructure repairs.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                step: '01',
                title: 'Report',
                desc: 'Citizen captures hazard category. GPS coordinates and submission timestamp are captured automatically.',
                icon: AlertTriangle,
                accent: 'text-[#F5A623] bg-[#F5A623]/10 border-[#F5A623]/30'
              },
              {
                step: '02',
                title: 'Verify',
                desc: 'Municipal authorities and community officers verify incident severity and validate traffic safety impact.',
                icon: ShieldCheck,
                accent: 'text-[#06B6D4] bg-[#06B6D4]/10 border-[#06B6D4]/30'
              },
              {
                step: '03',
                title: 'Dispatch',
                desc: 'Road work maintenance crews and traffic police departments are assigned with live task tracking.',
                icon: Compass,
                accent: 'text-[#C87942] bg-[#C87942]/10 border-[#C87942]/30'
              },
              {
                step: '04',
                title: 'Resolve',
                desc: 'Pothole patched, road obstruction cleared, and the incident is marked safely resolved on the live map.',
                icon: CheckCircle,
                accent: 'text-[#10B981] bg-[#10B981]/10 border-[#10B981]/30'
              }
            ].map((st) => {
              const Icon = st.icon;
              return (
                <div
                  key={st.step}
                  className="card p-6 bg-[#191D20] border-[#2E363D] hover:border-[#F5A623]/40 transition space-y-4 rounded-2xl"
                >
                  <div className="flex items-center justify-between">
                    <div className={`h-11 w-11 rounded-xl flex items-center justify-center border font-bold text-lg ${st.accent}`}>
                      <Icon size={20} />
                    </div>
                    <span className="text-xs font-mono font-bold text-[#A8A8A3] tracking-widest">
                      {st.step}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-[#F5F2ED]">{st.title}</h3>
                    <p className="text-xs text-[#A8A8A3] mt-2 leading-relaxed">{st.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* 4. HAZARD CATEGORIES GRID */}
      {/* ==================================================================== */}
      <section className="py-20 bg-[#101417] border-b border-[#2E363D]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold text-[#F5A623] uppercase tracking-widest">
              Reportable Hazards
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-[#F5F2ED] tracking-tight font-display mt-1">
              Select an Issue Category
            </h2>
            <p className="text-sm text-[#A8A8A3] mt-2">
              Select any category to jump directly into the streamlined 3-step report form.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {categoriesGrid.map((cat) => (
              <Link
                key={cat.name}
                to={`/report?category=${encodeURIComponent(cat.name)}`}
                className="card p-5 bg-[#191D20] border-[#2E363D] hover:border-[#F5A623] hover:shadow-amber-glow transition flex items-start gap-4 group rounded-2xl"
              >
                <span className="text-3xl shrink-0 group-hover:scale-110 transition">{cat.icon}</span>
                <div className="flex-1">
                  <h3 className="font-extrabold text-[#F5F2ED] group-hover:text-[#F5A623] transition">
                    {cat.name}
                  </h3>
                  <p className="text-xs text-[#A8A8A3] mt-1">{cat.desc}</p>
                  <span className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-bold text-[#F5A623] group-hover:underline">
                    Report this issue <ChevronRight size={13} />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* 5. BOTTOM TRUST INDICATORS BANNER (Matching Reference Image) */}
      {/* ==================================================================== */}
      <section className="py-12 bg-[#191D20] border-t border-[#2E363D]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-6 py-2">
            {/* Logo branding pill */}
            <div className="flex items-center gap-3">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-[#F5A623] to-[#C87942] text-[#101417]">
                <ShieldCheck size={18} className="stroke-[2.5]" />
              </div>
              <div>
                <p className="font-bold text-sm text-[#F5F2ED]">Road Reality</p>
                <p className="text-[10px] font-semibold text-[#A8A8A3] uppercase">Road Safety Platform</p>
              </div>
            </div>

            {/* Platform Feature Badges */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs font-semibold text-[#A8A8A3]">
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#101417] border border-[#2E363D]">
                <CheckCircle size={14} className="text-[#10B981]" /> Report Instantly
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#101417] border border-[#2E363D]">
                <MapPin size={14} className="text-[#F5A623]" /> Live Map Tracking
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#101417] border border-[#2E363D]">
                <Activity size={14} className="text-[#06B6D4]" /> Real-time Updates
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#101417] border border-[#2E363D]">
                <Layers size={14} className="text-[#E8C18A]" /> Data & Analytics
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#101417] border border-[#2E363D]">
                <Users size={14} className="text-[#C87942]" /> Authority Management
              </span>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
