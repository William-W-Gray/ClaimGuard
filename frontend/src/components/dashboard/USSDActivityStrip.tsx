import { useQuery } from '@tanstack/react-query';
import { fetchUSSDStats } from '@/lib/api';
import { Hash } from 'lucide-react';

export function USSDActivityStrip() {
  const { data } = useQuery({ queryKey: ['ussd-stats'], queryFn: fetchUSSDStats });

  if (!data) return null;

  return (
    <div className="flex items-center gap-3 bg-sidebar-bg text-slate-300 text-xs rounded-xl px-5 py-3 flex-wrap">
      <div className="flex items-center gap-2 text-white font-semibold">
        <Hash size={14} className="text-blue-400" />
        <span>USSD *483*360#</span>
      </div>
      <span className="text-slate-600">|</span>
      <span className="text-slate-400">Econet</span>
      <span className="text-slate-400">NetOne</span>
      <span className="text-slate-400">Telecel</span>
      <span className="text-slate-600">|</span>
      <span><span className="text-white font-semibold">{data.totalSessions}</span> sessions today</span>
      <span className="text-green-400">✓ {data.confirmations} confirmed</span>
      <span className="text-red-400">✗ {data.disputes} disputed</span>
      <span className="text-slate-400">{data.completed} completed</span>
    </div>
  );
}
