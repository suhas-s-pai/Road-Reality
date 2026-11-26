import { label } from '../utils/formatters';

const badgeStyles = {
  // Statuses
  reported: 'bg-[#F5A623]/10 text-[#F5A623] border-[#F5A623]/30',
  new: 'bg-[#F5A623]/10 text-[#F5A623] border-[#F5A623]/30',
  under_review: 'bg-[#F5A623]/10 text-[#F5A623] border-[#F5A623]/30',
  verified: 'bg-[#06B6D4]/10 text-[#06B6D4] border-[#06B6D4]/30',
  in_progress: 'bg-[#C87942]/15 text-[#E8C18A] border-[#C87942]/40',
  resolved: 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30',
  rejected: 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/30',

  // Severities
  critical: 'bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/40',
  high: 'bg-[#F5A623]/15 text-[#F5A623] border-[#F5A623]/40',
  medium: 'bg-[#E8C18A]/10 text-[#E8C18A] border-[#E8C18A]/30',
  low: 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30'
};

const dotColors = {
  critical: 'bg-[#EF4444] shadow-[0_0_6px_#EF4444]',
  high: 'bg-[#F5A623] shadow-[0_0_6px_#F5A623]',
  medium: 'bg-[#E8C18A]',
  low: 'bg-[#10B981]',
  reported: 'bg-[#F5A623] shadow-[0_0_6px_#F5A623]',
  new: 'bg-[#F5A623]',
  verified: 'bg-[#06B6D4] shadow-[0_0_6px_#06B6D4]',
  in_progress: 'bg-[#C87942] animate-pulse',
  resolved: 'bg-[#10B981] shadow-[0_0_6px_#10B981]'
};

export function Badge({ value, kind = 'status', className = '' }) {
  if (!value) return null;
  const normalizedKey = String(value).toLowerCase().replace(/[\s-]+/g, '_');
  const style = badgeStyles[normalizedKey] || 'bg-[#2E363D] text-[#A8A8A3] border-white/10';
  const dotColor = dotColors[normalizedKey] || 'bg-slate-500';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold tracking-tight shadow-sm ${style} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${dotColor}`} />
      <span>{label(value)}</span>
    </span>
  );
}
