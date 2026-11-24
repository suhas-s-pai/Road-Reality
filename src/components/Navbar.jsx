import { Link, NavLink } from 'react-router-dom';
import {
  Menu,
  ShieldAlert,
  X,
  LogOut,
  User,
  Crown,
  AlertTriangle,
  MapPin,
  Home as HomeIcon,
  FileText,
  Bell,
  ChevronDown
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [userDropdown, setUserDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const { user, isAdmin, signOut, loading, role } = useAuth();

  const userName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split('@')[0] ||
    'User';

  const avatarUrl = user?.user_metadata?.avatar_url;

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setUserDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2.5 font-extrabold text-slate-900 text-lg tracking-tight shrink-0">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-teal-600 text-white shadow-sm">
            <ShieldAlert size={20} />
          </span>
          <span className="font-black text-slate-900 tracking-tight">Road Reality</span>
        </Link>

        {/* Desktop Navigation & Actions */}
        <div className="hidden items-center gap-2 md:flex lg:gap-3">
          {/* Main Nav Links */}
          <nav className="flex items-center gap-1">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition ${
                  isActive
                    ? 'text-teal-800 bg-teal-50 font-bold'
                    : 'text-slate-600 hover:text-teal-700 hover:bg-slate-50'
                }`
              }
            >
              <HomeIcon size={16} />
              Home
            </NavLink>

            <NavLink
              to="/explore"
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition ${
                  isActive
                    ? 'text-teal-800 bg-teal-50 font-bold'
                    : 'text-slate-600 hover:text-teal-700 hover:bg-slate-50'
                }`
              }
            >
              <MapPin size={16} />
              Explore Map
            </NavLink>

            {user && (
              <>
                <NavLink
                  to="/my-reports"
                  className={({ isActive }) =>
                    `flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition ${
                      isActive
                        ? 'text-teal-800 bg-teal-50 font-bold'
                        : 'text-slate-600 hover:text-teal-700 hover:bg-slate-50'
                    }`
                  }
                >
                  <FileText size={16} />
                  My Reports
                </NavLink>

                <NavLink
                  to="/notifications"
                  className={({ isActive }) =>
                    `flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition ${
                      isActive
                        ? 'text-teal-800 bg-teal-50 font-bold'
                        : 'text-slate-600 hover:text-teal-700 hover:bg-slate-50'
                    }`
                  }
                >
                  <Bell size={16} />
                  Notifications
                </NavLink>
              </>
            )}

            {/* DEDICATED ADMIN DASHBOARD BUTTON (Positioned immediately after Notifications and before Report an Issue) */}
            {isAdmin && (
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white transition shadow-sm ${
                    isActive
                      ? 'bg-[#072627] ring-2 ring-teal-400'
                      : 'bg-[#0B3B3C] hover:bg-[#072627]'
                  }`
                }
                title="Authority Admin Portal"
              >
                <Crown size={15} className="text-amber-400 fill-amber-400 shrink-0" />
                <span>Admin Dashboard</span>
              </NavLink>
            )}

            {/* REPORT AN ISSUE (Orange CTA Button immediately following Admin Dashboard) */}
            <Link
              to="/report"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#F97316] hover:bg-orange-600 transition shadow-sm"
            >
              <AlertTriangle size={15} className="shrink-0" />
              <span>Report an Issue</span>
            </Link>
          </nav>

          {/* User Account Pill with Dropdown */}
          {loading ? (
            <div className="h-9 w-28 animate-pulse rounded-xl bg-slate-100" />
          ) : user ? (
            <div className="relative ml-1" ref={dropdownRef}>
              <button
                onClick={() => setUserDropdown(!userDropdown)}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 transition shadow-xs"
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={userName}
                    className="h-6 w-6 rounded-full object-cover border border-slate-200"
                  />
                ) : (
                  <div className="grid h-6 w-6 place-items-center rounded-full bg-slate-800 text-white font-bold text-[11px]">
                    {userName[0]?.toUpperCase() || <User size={12} />}
                  </div>
                )}
                <span className="max-w-[120px] truncate font-bold text-slate-900">{userName}</span>
                <ChevronDown size={14} className="text-slate-400" />
              </button>

              {/* Dropdown Menu */}
              {userDropdown && (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl animate-in fade-in slide-in-from-top-2 z-50">
                  <div className="px-3 py-2 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-900 truncate">{userName}</p>
                    <p className="text-[11px] text-slate-500 font-mono truncate">{user.email}</p>
                    <div className="mt-1 flex items-center gap-1">
                      {isAdmin ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                          <Crown size={10} className="fill-amber-500 text-amber-500" /> Admin
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                          Citizen
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="py-1">
                    <Link
                      to="/profile"
                      onClick={() => setUserDropdown(false)}
                      className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <User size={14} className="text-slate-400" />
                      View Profile
                    </Link>

                    {isAdmin && (
                      <Link
                        to="/admin"
                        onClick={() => setUserDropdown(false)}
                        className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-teal-800 bg-teal-50 hover:bg-teal-100"
                      >
                        <Crown size={14} className="text-amber-500 fill-amber-500" />
                        Admin Dashboard
                      </Link>
                    )}
                  </div>

                  <div className="border-t border-slate-100 pt-1">
                    <button
                      onClick={() => {
                        setUserDropdown(false);
                        signOut();
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                    >
                      <LogOut size={14} />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
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

          {/* Dedicated Admin Dashboard Button for Mobile */}
          {isAdmin && (
            <NavLink
              onClick={() => setOpen(false)}
              to="/admin"
              className="flex items-center gap-2.5 rounded-xl p-3 text-sm font-bold bg-[#0B3B3C] text-white shadow-sm"
            >
              <Crown size={18} className="text-amber-400 fill-amber-400" />
              Admin Dashboard
            </NavLink>
          )}

          <NavLink
            onClick={() => setOpen(false)}
            to="/report"
            className="flex items-center gap-2.5 rounded-xl p-3 text-sm font-bold bg-[#F97316] text-white shadow-sm"
          >
            <AlertTriangle size={18} />
            Report an Issue
          </NavLink>

          <div className="border-t border-slate-200 pt-3 mt-3">
            {user ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2">
                  <div className="flex items-center gap-2">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={userName} className="h-8 w-8 rounded-full border border-slate-200" />
                    ) : (
                      <div className="grid h-8 w-8 place-items-center rounded-full bg-slate-800 text-white font-bold text-xs">
                        {userName[0]?.toUpperCase() || <User size={15} />}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-bold text-slate-800">{userName}</p>
                      <p className="text-xs text-slate-500 font-mono">{user.email}</p>
                    </div>
                  </div>

                  {isAdmin && (
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                      Admin
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  <Link
                    to="/profile"
                    onClick={() => setOpen(false)}
                    className="btn btn-secondary text-xs flex-1 justify-center py-2"
                  >
                    Profile
                  </Link>
                  <button
                    onClick={() => {
                      signOut();
                      setOpen(false);
                    }}
                    className="btn btn-secondary text-red-600 text-xs flex-1 justify-center py-2"
                  >
                    Sign Out
                  </button>
                </div>
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
