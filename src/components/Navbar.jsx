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
  const { user, isAdmin, signOut, loading } = useAuth();

  const userName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split('@')[0] ||
    'Citizen';

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
    <header className="sticky top-0 z-50 border-b border-[#2E363D] bg-[#101417]/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Brand Logo matching reference */}
        <Link to="/" className="flex items-center gap-3 shrink-0 group">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-[#F5A623] to-[#C87942] text-[#101417] shadow-amber-glow transition-transform group-hover:scale-105">
            <ShieldAlert size={22} className="stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-base tracking-tight text-[#F5F2ED] group-hover:text-[#F5A623] transition-colors">
                Road Reality
              </span>
            </div>
            <p className="text-[9px] font-bold tracking-widest text-[#A8A8A3] uppercase -mt-0.5">
              Road Safety Platform
            </p>
          </div>
        </Link>

        {/* Desktop Navigation & Actions */}
        <div className="hidden items-center gap-2 md:flex lg:gap-3">
          {/* Main Nav Links */}
          <nav className="flex items-center gap-1">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  isActive
                    ? 'text-[#F5A623] bg-[#22272B] border border-[#F5A623]/30 shadow-sm'
                    : 'text-[#A8A8A3] hover:text-[#F5F2ED] hover:bg-[#191D20]'
                }`
              }
            >
              <HomeIcon size={14} />
              Home
            </NavLink>

            <NavLink
              to="/explore"
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  isActive
                    ? 'text-[#F5A623] bg-[#22272B] border border-[#F5A623]/30 shadow-sm'
                    : 'text-[#A8A8A3] hover:text-[#F5F2ED] hover:bg-[#191D20]'
                }`
              }
            >
              <MapPin size={14} />
              Explore Map
            </NavLink>

            {user && (
              <>
                <NavLink
                  to="/my-reports"
                  className={({ isActive }) =>
                    `flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      isActive
                        ? 'text-[#F5A623] bg-[#22272B] border border-[#F5A623]/30 shadow-sm'
                        : 'text-[#A8A8A3] hover:text-[#F5F2ED] hover:bg-[#191D20]'
                    }`
                  }
                >
                  <FileText size={14} />
                  My Reports
                </NavLink>

                <NavLink
                  to="/notifications"
                  className={({ isActive }) =>
                    `relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      isActive
                        ? 'text-[#F5A623] bg-[#22272B] border border-[#F5A623]/30 shadow-sm'
                        : 'text-[#A8A8A3] hover:text-[#F5F2ED] hover:bg-[#191D20]'
                    }`
                  }
                >
                  <Bell size={14} />
                  Notifications
                  <span className="h-1.5 w-1.5 rounded-full bg-[#F5A623] animate-pulse" />
                </NavLink>
              </>
            )}

            {/* DEDICATED ADMIN DASHBOARD BUTTON (strictly positioned after Notifications and before Report a Hazard) */}
            {isAdmin && (
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition shadow-sm ${
                    isActive
                      ? 'bg-[#22272B] text-[#F5A623] border border-[#F5A623] shadow-amber-glow'
                      : 'bg-[#191D20] text-[#E8C18A] border border-[#C87942]/40 hover:border-[#F5A623] hover:text-[#F5A623]'
                  }`
                }
                title="Municipal Authority Admin Portal"
              >
                <Crown size={14} className="text-[#F5A623] fill-[#F5A623] shrink-0" />
                <span>Admin Dashboard</span>
              </NavLink>
            )}

            {/* REPORT A HAZARD (Amber to Copper Gradient CTA Button) */}
            <Link
              to="/report"
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-extrabold text-[#101417] bg-gradient-to-r from-[#F5A623] to-[#C87942] hover:brightness-110 shadow-amber-glow transition ml-1"
            >
              <AlertTriangle size={14} className="shrink-0 stroke-[2.5]" />
              <span>Report a Hazard</span>
            </Link>
          </nav>

          {/* User Account Pill with Dropdown */}
          {loading ? (
            <div className="h-9 w-24 animate-pulse rounded-xl bg-[#22272B]" />
          ) : user ? (
            <div className="relative ml-1" ref={dropdownRef}>
              <button
                onClick={() => setUserDropdown(!userDropdown)}
                className="flex items-center gap-2 rounded-xl border border-[#2E363D] bg-[#191D20] px-3 py-1.5 text-xs font-semibold text-[#F5F2ED] hover:bg-[#22272B] hover:border-[#F5A623]/40 transition shadow-xs"
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={userName}
                    className="h-6 w-6 rounded-full object-cover border border-[#2E363D]"
                  />
                ) : (
                  <div className="grid h-6 w-6 place-items-center rounded-full bg-gradient-to-br from-[#F5A623] to-[#C87942] text-[#101417] font-bold text-[10px]">
                    {userName[0]?.toUpperCase() || <User size={12} />}
                  </div>
                )}
                <span className="max-w-[110px] truncate font-bold text-[#F5F2ED]">{userName}</span>
                <ChevronDown size={13} className="text-[#A8A8A3]" />
              </button>

              {/* Dropdown Menu */}
              {userDropdown && (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-[#2E363D] bg-[#22272B] p-2 shadow-2xl animate-in fade-in slide-in-from-top-2 z-50">
                  <div className="px-3 py-2 border-b border-[#2E363D]">
                    <p className="text-xs font-bold text-[#F5F2ED] truncate">{userName}</p>
                    <p className="text-[11px] text-[#A8A8A3] font-mono truncate">{user.email}</p>
                    <div className="mt-1.5 flex items-center gap-1">
                      {isAdmin ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#F5A623]/15 border border-[#F5A623]/30 px-2 py-0.5 text-[10px] font-bold text-[#F5A623]">
                          <Crown size={10} className="fill-[#F5A623] text-[#F5A623]" /> Administrator
                        </span>
                      ) : (
                        <span className="rounded-full bg-[#191D20] border border-[#2E363D] px-2 py-0.5 text-[10px] font-semibold text-[#A8A8A3]">
                          Verified Citizen
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="py-1">
                    <Link
                      to="/profile"
                      onClick={() => setUserDropdown(false)}
                      className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-[#F5F2ED] hover:bg-[#191D20] hover:text-[#F5A623] transition-colors"
                    >
                      <User size={14} className="text-[#A8A8A3]" />
                      View Profile
                    </Link>

                    {isAdmin && (
                      <Link
                        to="/admin"
                        onClick={() => setUserDropdown(false)}
                        className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-[#F5A623] bg-[#F5A623]/10 hover:bg-[#F5A623]/20 transition-colors"
                      >
                        <Crown size={14} className="text-[#F5A623] fill-[#F5A623]" />
                        Admin Dashboard
                      </Link>
                    )}
                  </div>

                  <div className="border-t border-[#2E363D] pt-1">
                    <button
                      onClick={() => {
                        setUserDropdown(false);
                        signOut();
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors"
                    >
                      <LogOut size={14} />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login" className="btn btn-secondary text-xs py-1.5 px-3 border-[#2E363D] text-[#F5F2ED]">
              Sign in with Google
            </Link>
          )}
        </div>

        {/* Mobile Hamburger Button */}
        <button
          aria-label="Toggle navigation menu"
          className="md:hidden p-2 text-[#F5F2ED] rounded-xl bg-[#191D20] border border-[#2E363D] hover:bg-[#22272B]"
          onClick={() => setOpen(!open)}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {open && (
        <nav className="border-t border-[#2E363D] bg-[#101417] p-4 space-y-2 md:hidden shadow-2xl animate-in fade-in slide-in-from-top-2">
          <NavLink
            onClick={() => setOpen(false)}
            to="/"
            end
            className={({ isActive }) =>
              `flex items-center gap-2.5 rounded-xl p-3 text-sm font-bold ${
                isActive ? 'bg-[#22272B] text-[#F5A623] border border-[#F5A623]/30' : 'text-[#A8A8A3] hover:bg-[#191D20]'
              }`
            }
          >
            <HomeIcon size={18} className="text-[#F5A623]" />
            Home
          </NavLink>

          <NavLink
            onClick={() => setOpen(false)}
            to="/explore"
            className={({ isActive }) =>
              `flex items-center gap-2.5 rounded-xl p-3 text-sm font-bold ${
                isActive ? 'bg-[#22272B] text-[#F5A623] border border-[#F5A623]/30' : 'text-[#A8A8A3] hover:bg-[#191D20]'
              }`
            }
          >
            <MapPin size={18} className="text-[#F5A623]" />
            Explore Live Map
          </NavLink>

          {user && (
            <>
              <NavLink
                onClick={() => setOpen(false)}
                to="/my-reports"
                className={({ isActive }) =>
                  `flex items-center gap-2.5 rounded-xl p-3 text-sm font-bold ${
                    isActive ? 'bg-[#22272B] text-[#F5A623] border border-[#F5A623]/30' : 'text-[#A8A8A3] hover:bg-[#191D20]'
                  }`
                }
              >
                <FileText size={18} className="text-[#F5A623]" />
                My Reports
              </NavLink>

              <NavLink
                onClick={() => setOpen(false)}
                to="/notifications"
                className={({ isActive }) =>
                  `flex items-center gap-2.5 rounded-xl p-3 text-sm font-bold ${
                    isActive ? 'bg-[#22272B] text-[#F5A623] border border-[#F5A623]/30' : 'text-[#A8A8A3] hover:bg-[#191D20]'
                  }`
                }
              >
                <Bell size={18} className="text-[#F5A623]" />
                Notifications
              </NavLink>
            </>
          )}

          {/* Dedicated Admin Dashboard Button for Mobile */}
          {isAdmin && (
            <NavLink
              onClick={() => setOpen(false)}
              to="/admin"
              className="flex items-center gap-2.5 rounded-xl p-3 text-sm font-bold bg-[#191D20] text-[#F5A623] border border-[#F5A623]/40 shadow-sm"
            >
              <Crown size={18} className="text-[#F5A623] fill-[#F5A623]" />
              Admin Dashboard
            </NavLink>
          )}

          <NavLink
            onClick={() => setOpen(false)}
            to="/report"
            className="flex items-center gap-2.5 rounded-xl p-3 text-sm font-bold bg-gradient-to-r from-[#F5A623] to-[#C87942] text-[#101417] shadow-amber-glow"
          >
            <AlertTriangle size={18} className="stroke-[2.5]" />
            Report a Hazard
          </NavLink>

          <div className="border-t border-[#2E363D] pt-3 mt-3">
            {user ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 rounded-xl bg-[#191D20]">
                  <div className="flex items-center gap-2">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={userName} className="h-8 w-8 rounded-full border border-[#2E363D]" />
                    ) : (
                      <div className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-[#F5A623] to-[#C87942] text-[#101417] font-bold text-xs">
                        {userName[0]?.toUpperCase() || <User size={15} />}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-bold text-[#F5F2ED]">{userName}</p>
                      <p className="text-xs text-[#A8A8A3] font-mono">{user.email}</p>
                    </div>
                  </div>

                  {isAdmin && (
                    <span className="text-[10px] font-bold text-[#F5A623] bg-[#F5A623]/15 border border-[#F5A623]/30 px-2 py-0.5 rounded-full">
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
                    className="btn btn-secondary text-[#EF4444] text-xs flex-1 justify-center py-2"
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
