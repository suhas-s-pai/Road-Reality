import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getMyReports } from '../services/hazardService';
import {
  User,
  Shield,
  Mail,
  Calendar,
  FileText,
  LogOut,
  Crown,
  ExternalLink,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

export default function Profile() {
  const { user, session, role, isAdmin, signOut } = useAuth();
  const [reportCount, setReportCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const userName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split('@')[0] ||
    'Citizen';

  const avatarUrl = user?.user_metadata?.avatar_url;

  useEffect(() => {
    getMyReports(session?.access_token)
      .then((res) => {
        setReportCount((res.data || []).length);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [session]);

  return (
    <main className="page bg-slate-50 min-h-screen py-10 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Profile Card */}
        <div className="card p-6 sm:p-8 bg-white border border-slate-200/90 shadow-sm space-y-6">
          {/* Identity Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div className="flex items-center gap-4">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={userName}
                  className="h-20 w-20 rounded-2xl object-cover border-2 border-teal-500 shadow-sm"
                />
              ) : (
                <div className="grid h-20 w-20 place-items-center rounded-2xl bg-[#0B3B3C] text-white font-black text-2xl shadow-sm">
                  {userName[0]?.toUpperCase() || <User size={32} />}
                </div>
              )}

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    {userName}
                  </h1>
                  {isAdmin && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                      <Crown size={12} className="fill-amber-500 text-amber-500" /> Admin
                    </span>
                  )}
                </div>

                <p className="text-xs sm:text-sm text-slate-500 font-mono flex items-center gap-1.5">
                  <Mail size={13} className="text-teal-600 shrink-0" />
                  <span>{user?.email}</span>
                </p>

                <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 w-fit px-2 py-0.5 rounded-md">
                  <CheckCircle2 size={11} />
                  <span>Google Authenticated Session</span>
                </div>
              </div>
            </div>

            <button
              onClick={signOut}
              className="btn btn-secondary text-xs text-red-600 hover:bg-red-50 hover:border-red-200 flex items-center gap-1.5 self-start sm:self-auto"
            >
              <LogOut size={14} />
              <span>Sign Out</span>
            </button>
          </div>

          {/* Account Metrics Grid */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Reports</p>
              <p className="text-2xl font-black text-slate-900 mt-1">{loading ? '...' : reportCount}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Submitted Hazards</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Account Role</p>
              <p className="text-2xl font-black text-teal-700 mt-1 uppercase">{role || 'USER'}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Permissions Tier</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status</p>
              <p className="text-2xl font-black text-emerald-600 mt-1">Active</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Verified Citizen</p>
            </div>
          </div>

          {/* Actions & Navigation Section */}
          <div className="pt-2 space-y-2">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Account Shortcuts
            </h3>

            <div className="grid sm:grid-cols-2 gap-3">
              <Link
                to="/my-reports"
                className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-white hover:border-teal-400 hover:shadow-xs transition"
              >
                <div className="flex items-center gap-2.5">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-teal-50 text-teal-700">
                    <FileText size={16} />
                  </span>
                  <div>
                    <p className="text-xs font-bold text-slate-900">My Hazard Reports</p>
                    <p className="text-[11px] text-slate-500">Track all submitted road reports</p>
                  </div>
                </div>
                <ExternalLink size={14} className="text-slate-400" />
              </Link>

              <Link
                to="/explore"
                className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-white hover:border-teal-400 hover:shadow-xs transition"
              >
                <div className="flex items-center gap-2.5">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-orange-50 text-orange-600">
                    <AlertTriangle size={16} />
                  </span>
                  <div>
                    <p className="text-xs font-bold text-slate-900">Explore Road Map</p>
                    <p className="text-[11px] text-slate-500">View real-time road conditions</p>
                  </div>
                </div>
                <ExternalLink size={14} className="text-slate-400" />
              </Link>

              {isAdmin && (
                <Link
                  to="/admin"
                  className="sm:col-span-2 flex items-center justify-between p-3.5 rounded-xl border border-teal-200 bg-teal-50/60 hover:bg-teal-50 hover:shadow-xs transition"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#0B3B3C] text-white">
                      <Crown size={16} className="text-amber-400 fill-amber-400" />
                    </span>
                    <div>
                      <p className="text-xs font-bold text-[#0B3B3C]">Authority Admin Dashboard</p>
                      <p className="text-[11px] text-teal-700">Manage all road hazard reports, users & dispatch</p>
                    </div>
                  </div>
                  <ExternalLink size={14} className="text-teal-700" />
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
