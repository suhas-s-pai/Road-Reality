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
    <main className="page bg-[#101417] text-[#F5F2ED] min-h-screen py-10 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Profile Card */}
        <div className="card p-6 sm:p-8 bg-[#191D20] border-[#2E363D] shadow-2xl rounded-3xl space-y-6">
          {/* Identity Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#2E363D]">
            <div className="flex items-center gap-4">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={userName}
                  className="h-20 w-20 rounded-2xl object-cover border-2 border-[#F5A623] shadow-amber-glow"
                />
              ) : (
                <div className="grid h-20 w-20 place-items-center rounded-2xl bg-[#22272B] border border-[#2E363D] text-[#F5A623] font-black text-2xl shadow-sm">
                  {userName[0]?.toUpperCase() || <User size={32} />}
                </div>
              )}

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black text-[#F5F2ED] font-display">
                    {userName}
                  </h1>
                  {isAdmin && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#F5A623]/15 border border-[#F5A623]/30 px-2.5 py-0.5 text-xs font-bold text-[#F5A623]">
                      <Crown size={12} className="fill-[#F5A623] text-[#F5A623]" /> Administrator
                    </span>
                  )}
                </div>

                <p className="text-xs text-[#A8A8A3] font-mono flex items-center gap-1.5">
                  <Mail size={13} className="text-[#F5A623] shrink-0" />
                  <span>{user?.email}</span>
                </p>

                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#10B981] bg-[#10B981]/10 border border-[#10B981]/30 w-fit px-2.5 py-0.5 rounded-md mt-1">
                  <CheckCircle2 size={12} />
                  <span>Google Authenticated</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => signOut()}
              className="btn btn-secondary text-xs flex items-center gap-1.5 py-2 px-3 border-[#2E363D] text-[#EF4444] hover:bg-[#EF4444]/15 self-start sm:self-center"
            >
              <LogOut size={14} />
              <span>Sign Out</span>
            </button>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-[#22272B] border border-[#2E363D]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#A8A8A3]">
                Total Hazards Reported
              </span>
              <p className="text-2xl font-black text-[#F5F2ED] font-display mt-1">
                {loading ? '...' : reportCount}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#22272B] border border-[#2E363D]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#A8A8A3]">
                Account Status
              </span>
              <p className="text-base font-bold text-[#F5A623] capitalize mt-1.5">
                {isAdmin ? 'System Administrator' : 'Verified Citizen Reporter'}
              </p>
            </div>
          </div>

          {/* Action Shortcuts */}
          <div className="space-y-2 pt-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#A8A8A3]">Account Actions</h3>

            <div className="grid sm:grid-cols-2 gap-3">
              <Link
                to="/my-reports"
                className="p-3.5 rounded-xl border border-[#2E363D] bg-[#22272B] hover:border-[#F5A623]/40 flex items-center justify-between transition group"
              >
                <div className="flex items-center gap-2.5 text-xs font-bold text-[#F5F2ED]">
                  <FileText size={16} className="text-[#F5A623]" />
                  <span>View My Hazard Reports</span>
                </div>
                <ExternalLink size={14} className="text-[#A8A8A3] group-hover:text-[#F5A623]" />
              </Link>

              {isAdmin && (
                <Link
                  to="/admin"
                  className="p-3.5 rounded-xl border border-[#F5A623]/30 bg-[#22272B] hover:border-[#F5A623] flex items-center justify-between transition group shadow-amber-glow/20"
                >
                  <div className="flex items-center gap-2.5 text-xs font-bold text-[#F5A623]">
                    <Crown size={16} className="text-[#F5A623] fill-[#F5A623]" />
                    <span>Open Authority Admin Portal</span>
                  </div>
                  <ExternalLink size={14} className="text-[#F5A623]" />
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
