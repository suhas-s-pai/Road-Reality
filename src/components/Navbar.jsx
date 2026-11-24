import { Link, NavLink } from 'react-router-dom';
import { Menu, ShieldAlert, X, LogOut, User, Shield, AlertTriangle, MapPin, Home as HomeIcon, FileText, Bell } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { user, isAdmin, signOut, loading } = useAuth();

  const userName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split('@')[0] ||
    'User';
  const avatarUrl = user?.user_metadata?.avatar_url;

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2.5 font-extrabold text-slate-900 text-lg tracking-tight">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-teal-600 text-white shadow-sm">
            <ShieldAlert size={20} />
          </span>
          <span>Road Reality</span>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden items-center gap-1 md:flex lg:gap-2">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `px-3 py-2 rounded-lg text-sm font-semibold transition ${
                isActive
                  ? 'text-teal-700 bg-teal-50 font-bold'
                  : 'text-slate-600 hover:text-teal-600 hover:bg-slate-50'
              }`
            }
          >
            Home
          </NavLink>

          <NavLink
            to="/explore"
            className={({ isActive }) =>
              `px-3 py-2 rounded-lg text-sm font-semibold transition ${
                isActive
                  ? 'text-teal-700 bg-teal-50 font-bold'
                  : 'text-slate-600 hover:text-teal-600 hover:bg-slate-50'
              }`
            }
          >
            Explore Map
          </NavLink>

          {user && (
            <>
              <NavLink
                to="/my-reports"
                className={({ isActive }) =>
                  `px-3 py-2 rounded-lg text-sm font-semibold transition ${
                    isActive
                      ? 'text-teal-700 bg-teal-50 font-bold'
                      : 'text-slate-600 hover:text-teal-600 hover:bg-slate-50'
                  }`
                }
              >
                My Reports
              </NavLink>

              <NavLink
                to="/notifications"
                className={({ isActive }) =>
                  `px-3 py-2 rounded-lg text-sm font-semibold transition ${
                    isActive
                      ? 'text-teal-700 bg-teal-50 font-bold'
                      : 'text-slate-600 hover:text-teal-600 hover:bg-slate-50'
                  }`
                }
              >
                Notifications
              </NavLink>
            </>
          )}

          {/* DEDICATED ADMIN DASHBOARD BUTTON (Clearly visible for authorized admins) */}
          {isAdmin && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `ml-1 flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold tracking-wide transition shadow-sm ${
                  isActive
                    ? 'bg-amber-600 text-white ring-2 ring-amber-300'
                    : 'bg-amber-500 hover:bg-amber-600 text-white'
                }`
              }
              title="Open Authority Administration Console"
            >
              <Shield size={14} className="fill-white/20" />
              Admin Dashboard
            </NavLink>
          )}
        </nav>

        {/* Right Action Section */}
        <div className="hidden items-center gap-3 md:flex">
          <Link
            to="/report"
            className="btn btn-accent text-xs font-bold py-2 px-4 shadow-sm flex items-center gap-1.5"
          >
            <AlertTriangle size={15} />
            Report an Issue
          </Link>

          {loading ? (
            <div className="h-8 w-16 animate-pulse rounded-lg bg-slate-100" />
          ) : user ? (
            <div className="flex items-center gap-2.5 border-l border-slate-200 pl-3">
              <Link
                to="/profile"
                className="flex items-center gap-2 rounded-lg p-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                title="View user profile"
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt={userName} className="h-7 w-7 rounded-full object-cover border border-slate-200" />
                ) : (
                  <div className="grid h-7 w-7 place-items-center rounded-full bg-teal-100 text-teal-800 font-bold text-xs">
                    {userName[0]?.toUpperCase() || <User size={13} />}
                  </div>
                )}
                <span className="max-w-[100px] truncate text-slate-900 font-medium">{userName}</span>
              </Link>

              <button
                onClick={signOut}
                title="Sign out"
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-red-600 transition"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <Link to="/login" className="btn btn-secondary text-xs py-2 px-3">
              Sign in with Google
            </Link>
          )}
        </div>

        {/* Mobile Hamburger Button */}
        <button
          aria-label="Toggle navigation menu"
          className="md:hidden p-2 text-slate-700 rounded-lg hover:bg-slate-100"
          onClick={() => setOpen(!open)}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {open && (
        <nav className="border-t border-slate-200 bg-white p-4 space-y-2 md:hidden shadow-lg animate-in fade-in slide-in-from-top-2">
          <NavLink
            onClick={() => setOpen(false)}
            to="/"
            end
            className={({ isActive }) =>
              `flex items-center gap-2.5 rounded-xl p-3 text-sm font-semibold ${
                isActive ? 'bg-teal-50 text-teal-800 font-bold' : 'text-slate-700 hover:bg-slate-50'
              }`
            }
          >
            <HomeIcon size={18} className="text-teal-600" />
            Home
          </NavLink>

          <NavLink
            onClick={() => setOpen(false)}
            to="/explore"
            className={({ isActive }) =>
              `flex items-center gap-2.5 rounded-xl p-3 text-sm font-semibold ${
                isActive ? 'bg-teal-50 text-teal-800 font-bold' : 'text-slate-700 hover:bg-slate-50'
              }`
            }
          >
            <MapPin size={18} className="text-teal-600" />
            Explore Map
          </NavLink>

          <NavLink
            onClick={() => setOpen(false)}
            to="/report"
            className="flex items-center gap-2.5 rounded-xl p-3 text-sm font-bold bg-orange-500 text-white"
          >
            <AlertTriangle size={18} />
            Report an Issue
          </NavLink>

          {user && (
            <>
              <NavLink
                onClick={() => setOpen(false)}
                to="/my-reports"
                className={({ isActive }) =>
                  `flex items-center gap-2.5 rounded-xl p-3 text-sm font-semibold ${
                    isActive ? 'bg-teal-50 text-teal-800 font-bold' : 'text-slate-700 hover:bg-slate-50'
                  }`
                }
              >
                <FileText size={18} className="text-teal-600" />
                My Reports
              </NavLink>

              <NavLink
                onClick={() => setOpen(false)}
                to="/notifications"
                className={({ isActive }) =>
                  `flex items-center gap-2.5 rounded-xl p-3 text-sm font-semibold ${
                    isActive ? 'bg-teal-50 text-teal-800 font-bold' : 'text-slate-700 hover:bg-slate-50'
                  }`
                }
              >
                <Bell size={18} className="text-teal-600" />
                Notifications
              </NavLink>
            </>
          )}

          {/* Mobile Dedicated Admin Dashboard Button */}
          {isAdmin && (
            <NavLink
              onClick={() => setOpen(false)}
              to="/admin"
              className="flex items-center gap-2.5 rounded-xl p-3 text-sm font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-sm"
            >
              <Shield size={18} />
              Admin Dashboard
            </NavLink>
          )}

          <div className="border-t border-slate-200 pt-3 mt-3">
            {user ? (
              <div className="flex items-center justify-between p-2">
                <Link
                  to="/profile"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 text-sm font-bold text-slate-800"
                >
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={userName} className="h-8 w-8 rounded-full border border-slate-200" />
                  ) : (
                    <div className="grid h-8 w-8 place-items-center rounded-full bg-teal-100 text-teal-800 font-bold text-xs">
                      {userName[0]?.toUpperCase() || <User size={15} />}
                    </div>
                  )}
                  <span>{userName}</span>
                </Link>

                <button
                  onClick={() => {
                    signOut();
                    setOpen(false);
                  }}
                  className="btn btn-secondary text-red-600 text-xs py-1.5 px-3"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <Link
                onClick={() => setOpen(false)}
                to="/login"
                className="btn btn-primary w-full justify-center text-sm"
              >
                Sign in with Google
              </Link>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
