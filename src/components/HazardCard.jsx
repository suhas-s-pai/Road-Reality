import { Link } from 'react-router-dom';
import { MapPin, Car, ArrowRight } from 'lucide-react';
import { Badge } from './Badges';
import { ago } from '../utils/formatters';

const categoryIcons = {
  Pothole: '🕳️',
  Waterlogging: '🌊',
  'Fallen Tree': '🌳',
  'Road Debris': '🚧',
  'Broken Streetlight': '💡',
  'Blocked Road': '⛔',
  Accident: '🚨',
  Other: '⚠️'
};

export default function HazardCard({ hazard, className = '' }) {
  if (!hazard) return null;

  const catIcon = categoryIcons[hazard.category] || '⚠️';

  return (
    <Link
      to={`/hazards/${hazard.id}`}
      className={`card group block overflow-hidden rounded-2xl border border-[#2E363D] bg-[#22272B] transition-all duration-200 hover:-translate-y-1 hover:border-[#F5A623]/50 hover:shadow-amber-glow ${className}`}
    >
      {/* Photo / Visual Banner */}
      <div className="relative h-44 w-full overflow-hidden bg-[#191D20]">
        {hazard.imageUrl ? (
          <img
            src={hazard.imageUrl}
            alt={`${hazard.category} hazard`}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextElementSibling.style.display = 'flex';
            }}
          />
        ) : null}

        <div
          className={`h-full w-full flex-col items-center justify-center gap-1.5 bg-gradient-to-b from-[#191D20] to-[#101417] text-[#A8A8A3] ${
            hazard.imageUrl ? 'hidden' : 'flex'
          }`}
        >
          <span className="text-3xl">{catIcon}</span>
          <span className="text-xs font-semibold text-[#A8A8A3]">No Photo Submitted</span>
        </div>

        {/* Floating Category Pill on Photo */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-[#101417]/85 px-2.5 py-1 text-[11px] font-bold text-[#F5F2ED] shadow-sm backdrop-blur-md border border-white/10">
          <span>{catIcon}</span>
          <span className="truncate max-w-[120px]">{hazard.category}</span>
        </div>

        {/* Floating Severity Badge */}
        <div className="absolute top-3 right-3">
          <Badge value={hazard.severity} kind="severity" />
        </div>
      </div>

      {/* Card Content */}
      <div className="p-4 space-y-3">
        <div>
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-bold text-[#F5F2ED] text-sm truncate group-hover:text-[#F5A623] transition-colors">
              {hazard.category}
            </h3>
            <Badge value={hazard.status} />
          </div>

          <p
            className="mt-1.5 flex items-start gap-1.5 text-xs text-[#A8A8A3] line-clamp-1"
            title={hazard.address}
          >
            <MapPin size={13} className="shrink-0 text-[#F5A623] mt-0.5" />
            <span className="truncate">{hazard.address}</span>
          </p>
        </div>

        {hazard.description && (
          <p className="text-xs text-[#A8A8A3] line-clamp-2 italic leading-relaxed">
            "{hazard.description}"
          </p>
        )}

        {/* Card Footer */}
        <div className="pt-2.5 border-t border-[#2E363D] flex items-center justify-between text-xs text-[#A8A8A3]">
          <div className="flex items-center gap-1.5">
            {hazard.trafficImpact === 'yes' && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#F5A623] bg-[#F5A623]/10 px-2 py-0.5 rounded-md border border-[#F5A623]/20">
                <Car size={12} />
                Traffic slowed
              </span>
            )}
          </div>

          <span className="text-[11px] text-[#A8A8A3] font-medium">
            {ago(hazard.reportedAt)}
          </span>
        </div>
      </div>
    </Link>
  );
}
