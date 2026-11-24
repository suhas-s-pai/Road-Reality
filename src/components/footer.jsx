import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowUpRight, Heart, MapPin, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const footerLinks = [
  { label: 'Home', to: '/' },
  { label: 'Explore Map', to: '/explore' },
  { label: 'Report an Issue', to: '/report' },
  { label: 'My Reports', to: '/my-reports' },
  { label: 'Notifications', to: '/notifications' }
];

export default function Footer() {
  const { isAdmin } = useAuth();

  return (
    <footer className="bg-slate-50 border-t border-slate-200 text-slate-600 py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-4">
          {/* Brand Info */}
          <div className="md:col-span-2 space-y-4">
            <Link to="/" className="inline-flex items-center gap-2.5 font-black text-slate-900 text-lg tracking-tight">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-teal-600 text-white shadow-sm">
                <ShieldAlert size={18} />
              </span>
              <span>Road Reality</span>
            </Link>

            <p className="text-sm text-slate-600 max-w-md leading-relaxed">
              A real-time, community-driven road hazard reporting platform. Helping citizens navigate safely and empowering local road authorities to verify and repair hazards faster.
            </p>

            <div className="flex items-center gap-2 text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-200 w-fit px-3 py-1.5 rounded-full">
              <span className="h-2 w-2 rounded-full bg-teal-600 animate-pulse" />
              Report · Verify · Track · Resolve
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-3">Navigation</h4>
            <ul className="space-y-2 text-sm">
              {footerLinks.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-slate-600 hover:text-teal-600 transition inline-flex items-center gap-1"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              {isAdmin && (
                <li>
                  <Link
                    to="/admin"
                    className="text-amber-800 font-bold hover:underline inline-flex items-center gap-1"
                  >
                    <Shield size={13} /> Admin Dashboard
                  </Link>
                </li>
              )}
            </ul>
          </div>

          {/* Civic Impact Box */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-3">Community Safety</h4>
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm text-xs space-y-2">
              <p className="font-bold text-slate-800 flex items-center gap-1.5">
                <MapPin size={14} className="text-orange-500" />
                Crowdsourced Live Map
              </p>
              <p className="text-slate-500 leading-relaxed">
                Every verified pothole, waterlogged street, or fallen tree report helps protect motorists and pedestrians.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-slate-200/80 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
          <p>© {new Date().getFullYear()} Road Reality. All community road reports are publicly accessible.</p>
          <p className="flex items-center gap-1 text-slate-500">
            Civic Technology for Road Safety
          </p>
        </div>
      </div>
    </footer>
  );
}
