import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowUpRight, Heart, MapPin, Shield, Crown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const footerLinks = [
  { label: 'Home', to: '/' },
  { label: 'Explore Live Map', to: '/explore' },
  { label: 'Report a Hazard', to: '/report' },
  { label: 'My Reports', to: '/my-reports' },
  { label: 'Notifications', to: '/notifications' }
];

export default function Footer() {
  const { isAdmin } = useAuth();

  return (
    <footer className="bg-[#101417] border-t border-[#2E363D] text-[#A8A8A3] py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-4">
          {/* Brand Info */}
          <div className="md:col-span-2 space-y-4">
            <Link to="/" className="inline-flex items-center gap-2.5 font-extrabold text-[#F5F2ED] text-lg tracking-tight group">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[#F5A623] to-[#C87942] text-[#101417] shadow-amber-glow transition-transform group-hover:scale-105">
                <ShieldAlert size={20} className="stroke-[2.5]" />
              </span>
              <span className="font-display font-black text-xl text-[#F5F2ED] group-hover:text-[#F5A623] transition-colors">
                Road Reality
              </span>
            </Link>

            <p className="text-xs text-[#A8A8A3] max-w-md leading-relaxed">
              A real-time, community-driven road hazard reporting platform. Empowering citizens to travel safely and assisting municipal authorities in dispatching maintenance crews faster.
            </p>

            <div className="flex items-center gap-2 text-xs font-bold text-[#F5A623] bg-[#F5A623]/10 border border-[#F5A623]/30 w-fit px-3 py-1.5 rounded-full">
              <span className="h-2 w-2 rounded-full bg-[#F5A623] animate-pulse" />
              Report · Verify · Dispatch · Resolve
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-[#F5F2ED] mb-3">Navigation</h4>
            <ul className="space-y-2 text-xs">
              {footerLinks.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-[#A8A8A3] hover:text-[#F5A623] transition inline-flex items-center gap-1"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              {isAdmin && (
                <li>
                  <Link
                    to="/admin"
                    className="text-[#F5A623] font-bold hover:underline inline-flex items-center gap-1.5"
                  >
                    <Crown size={13} className="fill-[#F5A623]" /> Admin Dashboard
                  </Link>
                </li>
              )}
            </ul>
          </div>

          {/* Civic Impact Box */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-[#F5F2ED] mb-3">Civic Safety</h4>
            <div className="p-4 rounded-2xl bg-[#191D20] border border-[#2E363D] shadow-sm text-xs space-y-2">
              <p className="font-bold text-[#F5F2ED] flex items-center gap-1.5">
                <MapPin size={14} className="text-[#F5A623]" />
                Live Crowdsourced Grid
              </p>
              <p className="text-[11px] text-[#A8A8A3] leading-relaxed">
                Every verified pothole, flooded street, or obstruction logged by citizens helps protect motorists and prevent vehicle collisions.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-[#2E363D] flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-[#A8A8A3]">
          <p>© {new Date().getFullYear()} Road Reality Platform. All rights reserved.</p>
          <p className="flex items-center gap-1">
            Built for safer cities and smarter roads.
          </p>
        </div>
      </div>
    </footer>
  );
}
