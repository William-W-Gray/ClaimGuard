import { useState } from 'react';
import { useDemoStore } from '@/stores/demoStore';
import { useWSStore } from '@/stores/wsStore';
import { AppShell } from '@/components/layout/AppShell';
import { RiskScoreRing } from '@/components/shared/RiskScoreRing';
import { LatencyBadge } from '@/components/shared/LatencyBadge';
import { StatusBadge } from '@/components/shared/Badges';
import { FlagBadgeList } from '@/components/shared/FlagBadge';
import { DEMO_SCENARIOS } from '@/lib/demoData';
import { cn } from '@/lib/utils';
import type { ScenarioId } from '@/types';
import {
  PlayCircle, RotateCcw, CheckCircle, Circle, Clock, Wifi,
  Server, Smartphone, AlertTriangle, Zap,
} from 'lucide-react';
import { formatCurrency, formatDateTime } from '@/lib/formatters';

const SCENARIO_BG: Record<string, string> = {
  red: 'border-red-200 bg-red-50/50',
  amber: 'border-amber-200 bg-amber-50/50',
  green: 'border-green-200 bg-green-50/50',
};
const SCENARIO_ACCENT: Record<string, string> = {
  red: 'bg-red-600 hover:bg-red-700',
  amber: 'bg-amber-500 hover:bg-amber-600',
  green: 'bg-green-600 hover:bg-green-700',
};

export function DemoControlPage() {
  const {
    activeScenario, isRunning, steps, currentRiskScore, currentDecision,
    currentLatency, whatsappVisible, memberResponse, triggerScenario,
    setMemberResponse, resetDemo,
  } = useDemoStore();
  const { connected } = useWSStore();
  const [selectedScenario, setSelectedScenario] = useState<ScenarioId>('ghost-prescription');

  const activeScenarioData = DEMO_SCENARIOS.find(s => s.id === (activeScenario ?? selectedScenario));

  return (
    <AppShell title="Demo Control Panel" subtitle="Live presentation console · Cimas Healthathon 3.0">
      <div className="max-w-screen-2xl mx-auto space-y-5">

        {/* Status bar */}
        <div className="flex items-center gap-3 flex-wrap">
          {[
            { label: 'Demo Mode', status: 'ACTIVE', color: 'bg-amber-100 text-amber-700 border-amber-200' },
            { label: 'Backend', status: 'SIMULATED', color: 'bg-blue-100 text-blue-700 border-blue-200' },
            { label: 'WebSocket', status: connected ? 'CONNECTED' : 'CONNECTING', color: connected ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-100 text-gray-600 border-gray-200' },
            { label: 'NH263 Bridge', status: 'MOCK ACTIVE', color: 'bg-purple-100 text-purple-700 border-purple-200' },
          ].map(({ label, status, color }) => (
            <div key={label} className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border', color)}>
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              {label}: {status}
            </div>
          ))}
          <button onClick={resetDemo} className="ml-auto btn-secondary text-xs" aria-label="Reset all demo data">
            <RotateCcw size={13} /> Reset All Data
          </button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">

          {/* Scenario Cards */}
          <div className="xl:col-span-4 space-y-3">
            <h2 className="text-sm font-semibold text-gray-700">Select Scenario</h2>
            {DEMO_SCENARIOS.map((scenario) => (
              <div
                key={scenario.id}
                className={cn(
                  'page-card p-4 border-2 cursor-pointer transition-all',
                  SCENARIO_BG[scenario.color],
                  selectedScenario === scenario.id && !activeScenario
                    ? 'ring-2 ring-offset-2 ring-brand-navy'
                    : 'hover:shadow-card-hover',
                  activeScenario === scenario.id && 'ring-2 ring-offset-2 ring-brand-navy',
                )}
                onClick={() => !isRunning && setSelectedScenario(scenario.id)}
                role="button"
                tabIndex={0}
                aria-pressed={selectedScenario === scenario.id}
                onKeyDown={(e) => e.key === 'Enter' && !isRunning && setSelectedScenario(scenario.id)}
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-sm font-bold text-gray-800 normal-case tracking-normal">{scenario.name}</h3>
                  <span className="text-xs font-semibold text-gray-500">Risk: {scenario.expectedRiskScore}</span>
                </div>
                <p className="text-xs text-gray-600 mb-3 leading-relaxed">{scenario.description}</p>
                <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap mb-3">
                  <span>👤 {scenario.memberName}</span>
                  <span>🏥 {scenario.providerName}</span>
                  <span>💰 {formatCurrency(scenario.amount)}</span>
                </div>
                <FlagBadgeList flags={scenario.flags} />
                <button
                  className={cn('mt-3 w-full flex items-center justify-center gap-2 py-2 rounded-lg text-white text-xs font-semibold transition-colors', SCENARIO_ACCENT[scenario.color])}
                  onClick={(e) => { e.stopPropagation(); triggerScenario(scenario.id); setSelectedScenario(scenario.id); }}
                  disabled={isRunning}
                  aria-label={`Trigger ${scenario.name} scenario`}
                >
                  <PlayCircle size={14} />
                  {activeScenario === scenario.id && isRunning ? 'Running…' : 'Trigger Scenario'}
                </button>
              </div>
            ))}
          </div>

          {/* Demo Flow Tracker + Live Output */}
          <div className="xl:col-span-4 space-y-4">
            {/* Flow tracker */}
            <div className="page-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <Zap size={16} className="text-amber-500" />
                <h2 className="text-sm font-semibold text-gray-800">Demo Flow Tracker</h2>
                {isRunning && <span className="text-xs text-amber-600 font-medium animate-pulse">Running…</span>}
              </div>

              {steps.length === 0 ? (
                <div className="text-center py-8">
                  <PlayCircle size={32} className="text-gray-300 mx-auto mb-2" />
                  <p className="text-xs text-gray-400">Trigger a scenario to begin</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {steps.map((step, idx) => (
                    <div key={step.id} className={cn(
                      'flex items-start gap-3 p-3 rounded-xl transition-all',
                      step.active && 'bg-amber-50 border border-amber-200',
                      step.completed && 'opacity-60',
                    )}>
                      <div className="flex-shrink-0 mt-0.5">
                        {step.completed ? (
                          <CheckCircle size={16} className="text-green-500" />
                        ) : step.active ? (
                          <Clock size={16} className="text-amber-500 animate-pulse" />
                        ) : (
                          <Circle size={16} className="text-gray-300" />
                        )}
                      </div>
                      <div>
                        <p className={cn('text-xs font-semibold', step.active ? 'text-amber-700' : step.completed ? 'text-gray-500' : 'text-gray-400')}>
                          {idx + 1}. {step.label}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{step.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Live AI Output */}
            {currentRiskScore > 0 && (
              <div className="page-card p-5 animate-fade-in">
                <h2 className="text-sm font-semibold text-gray-800 mb-4">⚡ FraudShield AI Output</h2>
                <div className="flex items-center gap-4 mb-4">
                  <RiskScoreRing score={currentRiskScore} size={80} strokeWidth={9} />
                  <div>
                    {currentDecision && <StatusBadge decision={currentDecision} />}
                    <LatencyBadge ms={currentLatency} className="mt-2" />
                    <p className="text-xs text-gray-500 mt-2">
                      Scenario: <strong>{activeScenarioData?.name}</strong>
                    </p>
                  </div>
                </div>
                {currentDecision && (
                  <div className={cn('text-xs rounded-lg p-3', currentRiskScore >= 80 ? 'bg-red-50 text-red-700' : currentRiskScore >= 60 ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700')}>
                    {currentRiskScore >= 80
                      ? '🚨 HIGH RISK — Claim held for investigation. Member notification dispatched.'
                      : currentRiskScore >= 60
                      ? '⚠️ MODERATE RISK — Claim pending verification. Auto-approve in 24h.'
                      : '✓ LOW RISK — Claim auto-approved. No member notification required.'}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Phone mock + NH263 mock */}
          <div className="xl:col-span-4 space-y-4">
            {/* Phone mockup */}
            <div className="page-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <Smartphone size={15} className="text-gray-500" />
                <h2 className="text-sm font-semibold text-gray-700">Member Phone — WhatsApp</h2>
              </div>
              {/* Phone frame */}
              <div className="mx-auto w-56 bg-gray-900 rounded-[2rem] p-2 shadow-xl">
                <div className="bg-gray-800 rounded-[1.5rem] overflow-hidden">
                  {/* Status bar */}
                  <div className="flex justify-between items-center px-4 py-2 bg-[#075E54]">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-green-400 flex items-center justify-center text-[8px] font-bold text-white">C</div>
                      <div>
                        <p className="text-white text-[9px] font-semibold">Cimas ClaimGuard</p>
                        <p className="text-green-200 text-[8px]">online</p>
                      </div>
                    </div>
                    <Wifi size={10} className="text-white" />
                  </div>

                  {/* Chat area */}
                  <div className="bg-[#ECE5DD] p-2 min-h-[300px] space-y-2">
                    {whatsappVisible || activeScenario ? (
                      <>
                        <div className="bg-white rounded-xl rounded-tl-none p-2.5 max-w-[90%] shadow-sm text-[9px] leading-relaxed text-gray-800">
                          <p className="font-bold text-green-700 mb-1 text-[8px]">Cimas ClaimGuard</p>
                          Hi <strong>Tendai</strong>! City Pharmacy Bulawayo submitted a claim for 4 medications today (<strong>$88.00</strong>).
                          <br />Your shortfall was $22 — slightly above usual $12–$18.
                          <br /><br />
                          Reply <strong>1</strong> to confirm ✓<br />
                          Reply <strong>2</strong> if something is wrong ✗
                          <p className="text-gray-400 text-right mt-1 text-[8px]">18:42 ✓✓</p>
                        </div>

                        {memberResponse === 'DISPUTED' && (
                          <>
                            <div className="flex justify-end">
                              <div className="bg-[#DCF8C6] rounded-xl rounded-tr-none p-2 shadow-sm text-[9px] font-medium text-gray-800 max-w-[40%]">
                                2<p className="text-gray-400 text-right mt-0.5 text-[8px]">18:43 ✓✓</p>
                              </div>
                            </div>
                            <div className="bg-white rounded-xl rounded-tl-none p-2.5 max-w-[90%] shadow-sm text-[9px] leading-relaxed text-gray-800">
                              Thank you Tendai! We've flagged this for investigation. A Cimas agent will review within 24h.
                              <p className="text-gray-400 text-right mt-1 text-[8px]">18:43 ✓✓</p>
                            </div>
                          </>
                        )}
                        {memberResponse === 'PENDING' && steps.some(s => s.active && s.id === 's3') && (
                          <div className="text-[9px] text-gray-500 text-center py-2">Awaiting member reply…</div>
                        )}
                      </>
                    ) : (
                      <div className="flex items-center justify-center h-full py-12">
                        <p className="text-[10px] text-gray-400 text-center">Trigger a scenario to see<br />WhatsApp notification</p>
                      </div>
                    )}
                  </div>

                  {/* Reply buttons */}
                  {whatsappVisible && memberResponse === 'PENDING' && (
                    <div className="bg-[#ECE5DD] px-2 pb-2 flex gap-2">
                      <button
                        onClick={() => setMemberResponse('CONFIRMED')}
                        className="flex-1 bg-green-500 text-white text-[9px] font-bold py-1.5 rounded-xl"
                        aria-label="Member confirms claim"
                      >
                        1 — Confirm ✓
                      </button>
                      <button
                        onClick={() => setMemberResponse('DISPUTED')}
                        className="flex-1 bg-red-500 text-white text-[9px] font-bold py-1.5 rounded-xl"
                        aria-label="Member disputes claim"
                      >
                        2 — Wrong ✗
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* NH263 Mock */}
            <div className="page-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <Server size={15} className="text-gray-500" />
                <h2 className="text-sm font-semibold text-gray-700">NH263 Portal (Mock)</h2>
              </div>
              <div className="bg-gray-900 rounded-xl p-3 font-mono text-[10px] text-green-400 min-h-28 space-y-1">
                <p className="text-gray-500"># NH263 Webhook Bridge v2.1</p>
                {activeScenario ? (
                  <>
                    <p className="text-blue-400">→ POST /webhook/claim-submitted</p>
                    <p>claimRef: "{activeScenarioData?.id === 'ghost-prescription' ? 'CG-00291' : activeScenarioData?.id === 'shortfall-inflation' ? 'CG-00441' : 'CG-00882'}"</p>
                    <p>amount: {formatCurrency(activeScenarioData?.amount ?? 0)}</p>
                    {steps.some(s => s.completed) && <p className="text-green-400">← 200 OK — received by ClaimGuard</p>}
                    {currentRiskScore > 0 && (
                      <>
                        <p className="text-yellow-400">→ PATCH /claim/status</p>
                        <p>riskScore: {currentRiskScore}</p>
                        <p>decision: "{currentDecision}"</p>
                        <p>latencyMs: {currentLatency}</p>
                      </>
                    )}
                  </>
                ) : (
                  <p className="text-gray-600">Awaiting claim event…</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
