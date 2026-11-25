import { label } from '../utils/formatters';

const badgeStyles = {
  // Statuses
  reported: 'bg-amber-50 text-amber-800 border-amber-200',
  new: 'bg-amber-50 text-amber-800 border-amber-200',
  under_review: 'bg-amber-50 text-amber-800 border-amber-200',
  verified: 'bg-sky-50 text-sky-800 border-sky-200',
  in_progress: 'bg-purple-50 text-purple-800 border-purple-200',
  resolved: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  rejected: 'bg-red-50 text-red-800 border-red-200',

  // Severities
  critical: 'bg-rose-50 text-rose-800 border-rose-200',
  high: 'bg-orange-50 text-orange-800 border-orange-200',
  medium: 'bg-amber-50 text-amber-800 border-amber-200',
  low: 'bg-emerald-50 text-emerald-800 border-emerald-200'
};

const dotColors = {
  critical: 'bg-rose-500',
  high: 'bg-orange-500',
  medium: 'bg-amber-500',
  low: 'bg-emerald-500',
  reported: 'bg-amber-500',
  new: 'bg-amber-500',
  verified: 'bg-sky-500',
  in_progress: 'bg-purple-500 animate-pulse',
  resolved: 'bg-emerald-500'
};

export function Badge({ value, kind = 'status', className = '' }) {
  if (!value) return null;
  const normalizedKey = String(value).toLowerCase().replace(/[\s-]+/g, '_');
  const style = badgeStyles[normalizedKey] || 'bg-slate-100 text-slate-700 border-slate-200';
  const dotColor = dotColors[normalizedKey] || 'bg-slate-400';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold tracking-tight shadow-2xs ${style} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${dotColor}`} />
      <span>{label(value)}</span>
    </span>
  );
}
