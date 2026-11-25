import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { ShieldAlert, AlertCircle, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { isSupabaseConfigured } from '../services/supabase';

export default function Auth() {
  const { user, signInWithGoogle, signOut, loading: authLoading, error: authError } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/';

  useEffect(() => {
    if (user && !authLoading) {
      navigate(from, { replace: true });
    }
  }, [user, authLoading, navigate, from]);

  const handleGoogleLogin = async () => {
    setSubmitting(true);
    setErrorMessage(null);

    try {
      await signInWithGoogle();
    } catch (err) {
      console.error('Google login error:', err);
      setErrorMessage(err.message || 'Google sign-in failed. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <main className="page grid place-items-center bg-[#101417] p-4 min-h-[85vh]">
      <div className="card w-full max-w-md p-8 shadow-2xl text-center bg-[#191D20] border-[#2E363D] rounded-3xl animate-in fade-in space-y-6">
        {/* Brand Header */}
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#F5A623] to-[#C87942] text-[#101417] shadow-amber-glow">
          <ShieldAlert size={30} className="stroke-[2.5]" />
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#F5F2ED] font-display">
            Welcome to Road Reality
          </h1>
          <p className="mt-1.5 text-xs text-[#A8A8A3]">
            Know the road before you drive.
          </p>
        </div>

        {/* Supabase Warning if not configured */}
        {!isSupabaseConfigured && (
          <div className="rounded-2xl border border-[#F5A623]/30 bg-[#F5A623]/10 p-4 text-left text-xs text-[#F5A623]">
            <p className="font-bold flex items-center gap-1.5 text-[#F5A623]">
              <AlertCircle size={16} />
              Supabase Configuration Notice
            </p>
            <p className="mt-1 text-[11px] text-[#A8A8A3]">
              Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your root .env file.
            </p>
          </div>
        )}

        {errorMessage && (
          <div className="rounded-2xl border border-[#EF4444]/30 bg-[#EF4444]/10 p-3.5 text-xs text-[#EF4444] text-left">
            {errorMessage}
          </div>
        )}

        {/* Google OAuth Login Button */}
        <div className="space-y-3 pt-2">
          <button
            onClick={handleGoogleLogin}
            disabled={submitting || authLoading}
            className="w-full flex items-center justify-center gap-3 rounded-2xl bg-white px-5 py-3.5 text-xs font-bold text-slate-900 hover:bg-slate-100 transition shadow-md disabled:opacity-50"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>{submitting ? 'Connecting with Google...' : 'Continue with Google'}</span>
          </button>
        </div>

        <p className="text-[11px] text-[#A8A8A3] leading-relaxed pt-2">
          By signing in, you access real-time road hazard tracking, personal submission history, and municipal verification alerts.
        </p>
      </div>
    </main>
  );
}
