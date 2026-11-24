import { Link } from 'react-router-dom';
import { MapPin, Car } from 'lucide-react';
import { Badge } from './Badges';
import { ago } from '../utils/formatters';

export default function HazardCard({ hazard }) {
  if (!hazard) return null;

  return (
    <Link
      to={`/hazards/${hazard.id}`}
      className="card block overflow-hidden transition hover:-translate-y-0.5 hover:shadow-md bg-white border border-slate-200"
    >
      {hazard.imageUrl ? (
        <img
          src={hazard.imageUrl}
          alt={`${hazard.category} report`}
          className="h-36 w-full object-cover"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      ) : (
        <div className="h-36 w-full bg-slate-100 flex flex-col items-center justify-center text-slate-400 gap-1 border-b">
          <span className="text-2xl">⚠️</span>
          <span className="text-xs font-semibold">No photograph</span>
        </div>
      )}

      <div className="p-4">
        <div className="flex justify-between items-start gap-2">
          <h3 className="font-bold text-slate-900 truncate">{hazard.category}</h3>
          <Badge value={hazard.severity} kind="severity" />
        </div>

        <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-600 truncate" title={hazard.address}>
          <MapPin size={13} className="shrink-0 text-brand" />
          <span className="truncate">{hazard.address}</span>
        </p>

        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
          <Badge value={hazard.status} />
          {hazard.trafficImpact !== 'no' && (
            <span className="flex items-center gap-1 text-slate-500 font-medium">
              <Car size={13} />
              Traffic affected
            </span>
          )}
        </div>

        <p className="mt-2 text-[11px] text-slate-400 text-right">
          Reported {ago(hazard.reportedAt)}
        </p>
      </div>
    </Link>
  );
}
