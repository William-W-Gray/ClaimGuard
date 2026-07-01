import { useState, useMemo } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { DETECTION_RATES } from '@/lib/constants';
import { formatCurrency, formatMillions, formatPercent, formatNumber } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { TrendingUp, DollarSign, BarChart3, Globe } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const AFRICA_MARKERS = [
  { name: 'Zimbabwe', x: 52, y: 63, active: true },
  { name: 'South Africa', x: 50, y: 72, active: false },
  { name: 'Zambia', x: 50, y: 55, active: false },
  { name: 'Kenya', x: 57, y: 42, active: false },
  { name: 'Nigeria', x: 40, y: 38, active: false },
  { name: 'Tanzania', x: 55, y: 50, active: false },
];

function Slider({ label, min, max, step = 1, value, onChange, format = String }: {
  label: string; min: number; max: number; step?: number;
  value: number; onChange: (v: number) => void; format?: (v: number) => string;
}) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <label className="text-xs font-medium text-gray-600">{label}</label>
        <span className="text-sm font-bold text-brand-navy">{format(value)}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none bg-gray-200 cursor-pointer
                   [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4
                   [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full
                   [&::-webkit-slider-thumb]:bg-brand-navy [&::-webkit-slider-thumb]:cursor-pointer
                   [&::-webkit-slider-thumb]:shadow-md"
        aria-label={label}
        aria-valuenow={value}
        aria-valuemin={min}
        aria-valuemax={max}
      />
      <div className="flex justify-between text-[10px] text-gray-400 mt-1">
        <span>{format(min)}</span>
        <span>{format(max)}</span>
      </div>
    </div>
  );
}

export function ROICalculatorPage() {
  const [annualClaimsVolume, setAnnualClaimsVolume] = useState(160_000_000);
  const [fraudErrorRate, setFraudErrorRate] = useState(20);
  const [detectionScenario, setDetectionScenario] = useState<'pessimistic' | 'conservative' | 'optimistic'>('conservative');
  const [modelImprovementRate, setModelImprovementRate] = useState(15);
  const [buildCost, setBuildCost] = useState(80_000);
  const [annualMaintenance, setAnnualMaintenance] = useState(40_000);

  const roi = useMemo(() => {
    const detectionRate = DETECTION_RATES[detectionScenario];
    const fraudExposure = annualClaimsVolume * (fraudErrorRate / 100);
    const year1Savings = fraudExposure * detectionRate;
    const year1SystemCost = buildCost + annualMaintenance;
    const year1NetReturn = year1Savings - year1SystemCost;
    const roiPercent = (year1NetReturn / year1SystemCost) * 100;

    const improvement = 1 + modelImprovementRate / 100;
    const year2Savings = year1Savings * improvement;
    const year3Savings = year2Savings * improvement;
    const year3Cost = annualMaintenance * 2;
    const year3NetReturn = year3Savings - year3Cost;

    const year4Savings = year3Savings * improvement;
    const year5Savings = year4Savings * improvement;
    const year5Cost = annualMaintenance * 2;
    const year5NetReturn = year5Savings - year5Cost;

    const fiveYearCumulative = year1NetReturn + (year2Savings - annualMaintenance) + year3NetReturn + (year4Savings - annualMaintenance) + year5NetReturn;

    return {
      fraudExposure, year1Savings, year1SystemCost, year1NetReturn, roiPercent,
      year3Projection: year3NetReturn, year5Projection: year5NetReturn, fiveYearCumulative,
    };
  }, [annualClaimsVolume, fraudErrorRate, detectionScenario, modelImprovementRate, buildCost, annualMaintenance]);

  const chartData = [
    { year: 'Year 1', savings: Math.round(roi.year1Savings), cost: roi.year1SystemCost, net: Math.round(roi.year1NetReturn) },
    { year: 'Year 2', savings: Math.round(roi.year1Savings * (1 + modelImprovementRate / 100)), cost: annualMaintenance, net: Math.round(roi.year1Savings * (1 + modelImprovementRate / 100) - annualMaintenance) },
    { year: 'Year 3', savings: Math.round(roi.year1Savings * Math.pow(1 + modelImprovementRate / 100, 2)), cost: annualMaintenance, net: Math.round(roi.year3Projection) },
    { year: 'Year 5', savings: Math.round(roi.year1Savings * Math.pow(1 + modelImprovementRate / 100, 4)), cost: annualMaintenance, net: Math.round(roi.year5Projection) },
  ];

  return (
    <AppShell title="ROI Calculator" subtitle="Project the financial return of ClaimGuard 360° deployment">
      <div className="max-w-screen-2xl mx-auto space-y-5">

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          {/* Inputs */}
          <div className="page-card p-6 space-y-5">
            <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <BarChart3 size={16} className="text-brand-navy" /> Input Parameters
            </h2>

            <Slider label="Annual Claims Volume" min={10_000_000} max={500_000_000} step={5_000_000}
              value={annualClaimsVolume} onChange={setAnnualClaimsVolume}
              format={(v) => formatMillions(v)} />

            <Slider label="Estimated Fraud / Error Rate" min={5} max={40} step={1}
              value={fraudErrorRate} onChange={setFraudErrorRate}
              format={(v) => formatPercent(v, 0)} />

            <div>
              <label className="text-xs font-medium text-gray-600 block mb-2">Detection Scenario</label>
              <div className="flex gap-2">
                {(['pessimistic', 'conservative', 'optimistic'] as const).map((s) => (
                  <button key={s} onClick={() => setDetectionScenario(s)}
                    className={cn('flex-1 py-2 text-xs font-medium rounded-lg capitalize transition-colors border',
                      detectionScenario === s ? 'bg-brand-navy text-white border-brand-navy' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    )}
                    aria-pressed={detectionScenario === s}
                  >
                    {s}<br />
                    <span className="text-[9px] opacity-70">{formatPercent(DETECTION_RATES[s] * 100, 0)}</span>
                  </button>
                ))}
              </div>
            </div>

            <Slider label="Model Improvement Rate (annual)" min={5} max={40} step={5}
              value={modelImprovementRate} onChange={setModelImprovementRate}
              format={(v) => formatPercent(v, 0)} />

            <Slider label="Build Cost" min={20_000} max={300_000} step={5_000}
              value={buildCost} onChange={setBuildCost}
              format={(v) => formatCurrency(v)} />

            <Slider label="Annual Maintenance Cost" min={10_000} max={150_000} step={5_000}
              value={annualMaintenance} onChange={setAnnualMaintenance}
              format={(v) => formatCurrency(v)} />
          </div>

          {/* Results */}
          <div className="xl:col-span-2 space-y-4">
            {/* Key metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Year 1 Savings', value: formatMillions(roi.year1Savings), sub: `Detection: ${formatPercent(DETECTION_RATES[detectionScenario] * 100, 0)}`, color: '#16A34A', icon: <DollarSign size={18} /> },
                { label: 'Year 1 Cost', value: formatCurrency(roi.year1SystemCost), sub: 'Build + Maintenance', color: '#DC2626', icon: <TrendingUp size={18} /> },
                { label: 'Year 1 Net Return', value: formatMillions(roi.year1NetReturn), sub: roi.year1NetReturn > 0 ? 'Profitable' : 'Investment phase', color: roi.year1NetReturn > 0 ? '#16A34A' : '#D97706', icon: <TrendingUp size={18} /> },
                { label: 'Year 1 ROI', value: `${formatNumber(Math.round(roi.roiPercent))}%`, sub: 'Return on investment', color: '#1A4D8F', icon: <BarChart3 size={18} /> },
              ].map((m) => (
                <div key={m.label} className="metric-card">
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{m.label}</p>
                    <span style={{ color: m.color }}>{m.icon}</span>
                  </div>
                  <p className="text-2xl font-bold" style={{ color: m.color }}>{m.value}</p>
                  <p className="text-xs text-gray-400 mt-1">{m.sub}</p>
                </div>
              ))}
            </div>

            {/* Projection chart */}
            <div className="page-card p-5">
              <h2 className="text-sm font-semibold text-gray-800 mb-4">5-Year Projection</h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(v) => `$${v / 1000}k`} tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="savings" name="Savings" fill="#16A34A" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="cost" name="System Cost" fill="#DC2626" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="net" name="Net Return" fill="#1A4D8F" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Multi-year summary */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Year 3 Net Return', value: formatMillions(roi.year3Projection) },
                { label: 'Year 5 Net Return', value: formatMillions(roi.year5Projection) },
                { label: '5-Year Cumulative', value: formatMillions(roi.fiveYearCumulative) },
              ].map((m) => (
                <div key={m.label} className="bg-gradient-to-br from-brand-navy to-blue-900 rounded-xl p-4 text-white">
                  <p className="text-xs text-blue-200 mb-1">{m.label}</p>
                  <p className="text-xl font-bold">{m.value}</p>
                </div>
              ))}
            </div>

            {/* Africa expansion map */}
            <div className="page-card p-5">
              <div className="flex items-center gap-2 mb-3">
                <Globe size={16} className="text-brand-navy" />
                <h2 className="text-sm font-semibold text-gray-800">Africa Expansion Potential</h2>
              </div>
              <div className="relative bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl overflow-hidden h-48">
                {/* Stylised Africa continent outline */}
                <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full opacity-20">
                  <path d="M35,15 Q40,10 50,12 Q60,10 65,18 Q70,22 68,30 Q72,38 70,45 Q75,52 72,60 Q74,68 70,73 Q65,82 58,85 Q52,90 48,87 Q42,85 38,80 Q33,75 30,68 Q25,60 27,52 Q23,45 25,38 Q22,30 25,23 Q28,17 35,15Z" fill="#4B9CD3" />
                </svg>
                {/* Markers */}
                {AFRICA_MARKERS.map((marker) => (
                  <div
                    key={marker.name}
                    className="absolute flex flex-col items-center"
                    style={{ left: `${marker.x}%`, top: `${marker.y}%`, transform: 'translate(-50%, -50%)' }}
                  >
                    <div className={cn(
                      'w-3 h-3 rounded-full border-2 border-white shadow-lg',
                      marker.active ? 'bg-brand-navy animate-pulse' : 'bg-gray-400'
                    )} />
                    <span className="text-[8px] text-white font-semibold mt-0.5 whitespace-nowrap drop-shadow">
                      {marker.name}
                    </span>
                  </div>
                ))}
                <div className="absolute bottom-3 left-3 flex items-center gap-2 text-[9px] text-white">
                  <div className="w-2.5 h-2.5 rounded-full bg-brand-navy" /> Active
                  <div className="w-2.5 h-2.5 rounded-full bg-gray-400 ml-1" /> Pipeline
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
