import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts';
import { fetchSavingsData } from '@/lib/api';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';

type Scenario = 'pessimistic' | 'conservative' | 'optimistic';

const SCENARIO_MULTIPLIERS: Record<Scenario, number> = {
  pessimistic: 0.6,
  conservative: 1.0,
  optimistic: 1.4,
};

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-lg p-3 text-xs">
      <p className="font-semibold text-gray-700 mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-gray-500">{p.name}:</span>
          <span className="font-semibold text-gray-800">{formatCurrency(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

export function SavingsChart() {
  const [scenario, setScenario] = useState<Scenario>('conservative');
  const { data = [], isLoading } = useQuery({ queryKey: ['savings'], queryFn: fetchSavingsData });

  const multiplier = SCENARIO_MULTIPLIERS[scenario];
  const adjusted = data.map((d) => ({
    ...d,
    savings: Math.round(d.savings * multiplier),
    cumulative: Math.round(d.cumulative * multiplier),
  }));

  const visibleData = adjusted.filter((d) => d.savings > 0);

  if (isLoading) {
    return (
      <div className="page-card p-5">
        <div className="h-72 flex items-center justify-center">
          <div className="skeleton h-56 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="page-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-800">Fraud Savings — 2026</h2>
          <p className="text-xs text-gray-400 mt-0.5">Monthly recovered savings vs Q3 target</p>
        </div>
        <div className="flex gap-1.5">
          {(['pessimistic', 'conservative', 'optimistic'] as Scenario[]).map((s) => (
            <button
              key={s}
              onClick={() => setScenario(s)}
              className={cn(
                'px-2.5 py-1 text-xs font-medium rounded-lg transition-colors capitalize',
                scenario === s
                  ? 'bg-brand-navy text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
              aria-pressed={scenario === s}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={visibleData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="savingsGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#1A4D8F" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#1A4D8F" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="cumulativeGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#16A34A" stopOpacity={0.12} />
              <stop offset="95%" stopColor="#16A34A" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={(v) => `$${v / 1000}k`} tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11, paddingTop: 12 }} />
          <ReferenceLine
            y={adjusted[5]?.target ?? 180000}
            stroke="#D97706"
            strokeDasharray="5 3"
            label={{ value: 'Q3 Target', position: 'insideTopRight', fontSize: 10, fill: '#D97706' }}
          />
          <Area type="monotone" dataKey="savings" name="Monthly savings" stroke="#1A4D8F" strokeWidth={2} fill="url(#savingsGrad)" />
          <Area type="monotone" dataKey="cumulative" name="Running total" stroke="#16A34A" strokeWidth={2} fill="url(#cumulativeGrad)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
