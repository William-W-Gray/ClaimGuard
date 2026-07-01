import { create } from 'zustand';
import type { ScenarioId, DemoStep, ClaimDecision } from '@/types';
import { runDemoScenario } from '@/lib/api';

const GHOST_STEPS: DemoStep[] = [
  { id: 's1', label: 'Claim submitted via NH263', description: 'NH263 webhook received by ClaimGuard', delayMs: 0, completed: false, active: false },
  { id: 's2', label: 'NH263 status updated', description: 'Claim flagged as PEND_INVESTIGATE in NH263', delayMs: 1500, completed: false, active: false },
  { id: 's3', label: 'WhatsApp notification sent', description: 'MemberGuard dispatched alert to Tendai Moyo', delayMs: 3000, completed: false, active: false },
  { id: 's4', label: 'Investigation queue updated', description: 'Claim CG-00291 added to priority queue', delayMs: 5000, completed: false, active: false },
  { id: 's5', label: 'Member response received', description: 'Tendai replied: "2 — Something is wrong"', delayMs: 8000, completed: false, active: false },
  { id: 's6', label: 'TrustScore updated', description: 'City Pharmacy Bulawayo: 88 → 81', delayMs: 8500, completed: false, active: false },
];

interface DemoState {
  activeScenario: ScenarioId | null;
  isRunning: boolean;
  steps: DemoStep[];
  memberResponse: 'PENDING' | 'CONFIRMED' | 'DISPUTED';
  currentRiskScore: number;
  currentDecision: ClaimDecision | null;
  currentLatency: number;
  whatsappVisible: boolean;
  triggerScenario: (id: ScenarioId) => void;
  setMemberResponse: (r: 'CONFIRMED' | 'DISPUTED') => void;
  resetDemo: () => void;
}

function getStepsForScenario(id: ScenarioId): DemoStep[] {
  if (id === 'ghost-prescription') return GHOST_STEPS.map((s) => ({ ...s }));
  if (id === 'shortfall-inflation') return GHOST_STEPS.slice(0, 3).map((s) => ({ ...s }));
  return GHOST_STEPS.slice(0, 1).map((s) => ({ ...s }));
}

export const useDemoStore = create<DemoState>((set, get) => ({
  activeScenario: null,
  isRunning: false,
  steps: [],
  memberResponse: 'PENDING',
  currentRiskScore: 0,
  currentDecision: null,
  currentLatency: 0,
  whatsappVisible: false,

  triggerScenario: (id: ScenarioId) => {
    const steps = getStepsForScenario(id);
    set({
      activeScenario: id,
      isRunning: true,
      steps,
      memberResponse: 'PENDING',
      whatsappVisible: false,
      currentRiskScore: 0,
      currentDecision: null,
      currentLatency: 0,
    });

    const markStep = (stepIndex: number) => {
      const current = get().steps;
      const updated = current.map((s, i) => ({
        ...s,
        completed: i < stepIndex,
        active: i === stepIndex,
      }));

      // Animate risk score on first step
      if (stepIndex === 0) {
        const scores = { 'ghost-prescription': 89, 'shortfall-inflation': 67, 'clean-claim': 18 };
        const decisions: Record<ScenarioId, ClaimDecision> = {
          'ghost-prescription': 'PEND_INVESTIGATE',
          'shortfall-inflation': 'PEND_VERIFY',
          'clean-claim': 'APPROVE',
        };
        const latencies = { 'ghost-prescription': 680, 'shortfall-inflation': 420, 'clean-claim': 310 };
        set({
          steps: updated,
          currentRiskScore: scores[id],
          currentDecision: decisions[id],
          currentLatency: latencies[id],
        });
      } else if (stepIndex === 2) {
        set({ steps: updated, whatsappVisible: true });
      } else if (stepIndex === current.length) {
        set({ steps: current.map((s) => ({ ...s, completed: true, active: false })), isRunning: false });
      } else {
        set({ steps: updated });
      }
    };

    // Fire the real scenario on the backend — it broadcasts WebSocket events
    // that drive the live feed, notifications and TrustScore across the app.
    runDemoScenario(id).catch(() => {
      /* backend offline: local choreography below still runs */
    });

    // Local step choreography for this page's timeline visualization.
    steps.forEach((step, index) => {
      setTimeout(() => markStep(index), step.delayMs);
    });
    const lastDelay = steps.length ? steps[steps.length - 1].delayMs : 0;
    setTimeout(() => markStep(steps.length), lastDelay + 800);

    // Safety: force-complete after all steps.
    setTimeout(() => {
      set((state) => ({
        steps: state.steps.map((s) => ({ ...s, completed: true, active: false })),
        isRunning: false,
      }));
    }, 10000);
  },

  setMemberResponse: (r) => set({ memberResponse: r }),

  resetDemo: () => {
    set({
      activeScenario: null,
      isRunning: false,
      steps: [],
      memberResponse: 'PENDING',
      currentRiskScore: 0,
      currentDecision: null,
      currentLatency: 0,
      whatsappVisible: false,
    });
  },
}));
