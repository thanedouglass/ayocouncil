import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChairmanDossier,
  CompiledDiagnosticSchema,
  ElegbaResponse,
  IntakeSessionState,
  OperationalAssumption,
  TriageResult
} from './types';
import { CouncilDossierPane } from './components/CouncilDossierPane';
import { ElegbaInterventionPane } from './components/ElegbaInterventionPane';
import { EmergencyOverride } from './components/EmergencyOverride';
import { FrictionGate } from './components/FrictionGate';
import { AustereIntakePanel } from './components/AustereIntakePanel';
import { CouncilVFXCanvas, VFXMode } from './components/CouncilVFXCanvas';
import { STONES, StoneKey, stoneByKey } from './lib/stones';
import { Radio, Zap, ChevronUp, ChevronDown, AlertTriangle, MonitorPlay, ShieldCheck, Trash2 } from 'lucide-react';

const SAMPLE_QUERIES = [
  'Should I walk away from my high-paying corporate role to bootstrap an esoteric philosophical AI collective?',
  'Should I sever ties with my erratic co-founder, or is this tension the exact crucible our project needs?',
  'Should I surrender to the natural flow of events or mount a relentless, aggressive push forward?'
];

const spring = { type: 'spring', stiffness: 220, damping: 26 } as const;

// ------------------------------------------------------------------
// SIMULATION / PREVIEW MODE — when the backend is unreachable, the
// terminal keeps flowing with clearly-labeled simulated payloads
// instead of surfacing raw errors.
// ------------------------------------------------------------------
const SIM_SEAT_DEFS = [
  { seatId: 'seat_1_stoic_empiricist', seatName: 'The Stoic Empiricist', archetype: 'Discipline of perception' },
  { seatId: 'seat_2_existentialist', seatName: 'The Existentialist', archetype: 'Freedom under absurdity' },
  { seatId: 'seat_3_cyberneticist', seatName: 'The Cyberneticist', archetype: 'Feedback and signal' },
  { seatId: 'seat_4_mystic_cosmologist', seatName: 'The Mystic Cosmologist', archetype: 'Pattern beyond the veil' },
  { seatId: 'seat_5_pragmatist', seatName: 'The Pragmatist', archetype: 'Cash value of ideas' },
  { seatId: 'seat_6_psychoanalytic', seatName: 'The Archetypal Analyst', archetype: 'The shadow speaks' },
  { seatId: 'seat_7_dialectical', seatName: 'The Dialectician', archetype: 'Thesis meets antithesis' }
];

function makeSimulatedDossier(query: string): ChairmanDossier {
  return {
    cosmicAlignments: [
      `[SIMULATED] All seats registered the inquiry: "${query.slice(0, 80)}..."`,
      '[SIMULATED] Consensus placeholder — connect the backend for live deliberation.'
    ],
    keyTensions: ['[SIMULATED] Preview tension: certainty vs. exploration.'],
    somaticPrescriptions: ['[SIMULATED] Preview grounding: breathe; start the API server.'],
    rawSeatDeliberations: SIM_SEAT_DEFS.map((s, i) => ({
      ...s,
      model: 'simulation',
      perspectiveText: `[SIMULATED] ${s.seatName} would deliberate here once the council backend is online.`,
      cotSteps: {
        friction: '[SIMULATED] Friction analysis placeholder.',
        antiDogmaAudit: '[SIMULATED] Anti-dogma audit placeholder.',
        synthesis: '[SIMULATED] Synthesis placeholder.'
      },
      auditPassed: true,
      latencyMs: 400 + i * 45,
      status: 'completed' as const
    })),
    metadata: {
      totalDeliberations: 7,
      completedCount: 7,
      timedOutCount: 0,
      failedCount: 0,
      quorumReached: true,
      totalFanOutLatencyMs: 0,
      synthesisLatencyMs: 0,
      timestamp: new Date().toISOString()
    },
    spokenSynthesisScript:
      '[SIMULATED] This is a preview decree. Start the AyoCouncil backend to convoke the real seven seats.'
  };
}

export const App: React.FC = () => {
  const [inquiry, setInquiry] = useState('');
  const [inputFocused, setInputFocused] = useState(false);
  const [dossier, setDossier] = useState<ChairmanDossier | null>(null);
  const [elegba, setElegba] = useState<ElegbaResponse | null>(null);
  const [isDeliberating, setIsDeliberating] = useState(false);
  const [isSummoningElegba, setIsSummoningElegba] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [statusMessage, setStatusMessage] = useState('System Online // Safety Circuits Active');
  const [simulationMode, setSimulationMode] = useState(false);
  const [consensusFlash, setConsensusFlash] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [focusedSeatId, setFocusedSeatId] = useState<string | null>(null);

  // Red Team Mandates: Critical Intercept & Safety State
  const [criticalIntercept, setCriticalIntercept] = useState<TriageResult | null>(null);

  // Austere Intake & Friction Gate State
  const [isIntakeActive, setIsIntakeActive] = useState(false);
  const [intakeLoading, setIntakeLoading] = useState(false);
  const [intakeSession, setIntakeSession] = useState<IntakeSessionState>({
    sessionId: 'intake_' + Date.now(),
    turnCount: 0,
    history: [],
    isCompleted: false
  });
  const [pendingFrictionSchema, setPendingFrictionSchema] = useState<CompiledDiagnosticSchema | null>(null);

  // Live Glass Box Chain-of-Thought (CoT) Stream
  const [liveCotStream, setLiveCotStream] = useState<
    Record<
      string,
      {
        seatName?: string;
        friction?: string;
        antiDogmaAudit?: string;
        synthesis?: string;
      }
    >
  >({});

  const wsRef = useRef<WebSocket | null>(null);
  const dossierRegionRef = useRef<HTMLElement | null>(null);

  // Connect to backend WebSocket for live audio stream & safety broadcasts
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // If running in Vite dev server (port 5173), target backend at 8080.
    // In production/single-domain (Fly.io), target same host/port.
    const wsPort =
      window.location.port === '5173'
        ? ':8080'
        : window.location.port
        ? `:${window.location.port}`
        : '';
    const wsUrl = `${protocol}//${window.location.hostname}${wsPort}`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setWsConnected(true);
        setSimulationMode(false);
        setStatusMessage('Connected to GPT-Live-1 & AyoCouncil Gateway');
      };

      ws.onclose = () => {
        setWsConnected(false);
        setStatusMessage('Gateway offline — REST fallback armed');
      };

      ws.onerror = () => {
        setWsConnected(false);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // RED TEAM MANDATE: Listen for CRITICAL_INTERCEPT to unmount main dashboard
          if (data.type === 'CRITICAL_INTERCEPT' && data.triage) {
            console.warn('[WebSocket] CRITICAL_INTERCEPT event received:', data.triage);
            setCriticalIntercept(data.triage);
          } else if (data.type === 'cot_delta') {
            // Glass Box: Live streaming of CoT & Anti-Dogma Audits
            setLiveCotStream((prev) => {
              const current = prev[data.seatId] || { seatName: data.seatName };
              if (data.step === 'friction') {
                current.friction = data.fullThought || (current.friction || '') + data.delta;
              } else if (data.step === 'anti_dogma_audit') {
                current.antiDogmaAudit = data.fullThought || (current.antiDogmaAudit || '') + data.delta;
              } else if (data.step === 'synthesis') {
                current.synthesis = data.fullThought || (current.synthesis || '') + data.delta;
              }
              return { ...prev, [data.seatId]: { ...current } };
            });
          } else if (data.type === 'reach_audit' && data.audit) {
            setDossier((prev) => (prev ? { ...prev, reachAudit: data.audit } : prev));
          } else if (data.type === 'audio_delta') {
            setIsSpeaking(true);
          } else if (data.type === 'session_purged') {
            // Zero Data Retention: Reset UI on server purge confirmation
            setDossier(null);
            setElegba(null);
            setLiveCotStream({});
            setPendingFrictionSchema(null);
            setIsIntakeActive(false);
            setInquiry('');
            setStatusMessage('Session Purged: Volatile RAM erased. Zero trace persisted.');
          }
        } catch (e) {
          // Non-JSON frame
        }
      };

      return () => {
        ws.close();
      };
    } catch (e) {
      console.warn('WebSocket connection not established, operating in REST mode.');
    }
  }, []);

  // Consensus flare: fires once each time a dossier lands
  useEffect(() => {
    if (!dossier) return;
    setConsensusFlash(true);
    const t = setTimeout(() => setConsensusFlash(false), 3200);
    return () => clearTimeout(t);
  }, [dossier]);

  // Zero-Retention: Ephemeral Purge of All Volatile Session State
  const handlePurgeSession = async () => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.clear();
        window.sessionStorage.clear();
      }

      await fetch('/api/session/purge', { method: 'POST' });

      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'purge_session' }));
      }
    } catch (e) {
      console.warn('Purge notice:', e);
    }

    setDossier(null);
    setElegba(null);
    setLiveCotStream({});
    setPendingFrictionSchema(null);
    setIsIntakeActive(false);
    setInquiry('');
    setFocusedSeatId(null);
    setIntakeSession({
      sessionId: 'intake_' + Date.now(),
      turnCount: 0,
      history: [],
      isCompleted: false
    });
    setStatusMessage('Session Purged: Volatile RAM erased. Zero trace persisted.');
  };

  // Terminate & Reset emergency session
  const handleTerminateEmergency = () => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.clear();
        window.sessionStorage.clear();
      }
    } catch (e) {
      console.warn('Storage clear error:', e);
    }
    setCriticalIntercept(null);
    setIsIntakeActive(false);
    setPendingFrictionSchema(null);
    setInquiry('');
    setIntakeSession({
      sessionId: 'intake_' + Date.now(),
      turnCount: 0,
      history: [],
      isCompleted: false
    });
    setStatusMessage('Session Purged. Safety Circuits Restored.');
  };

  // Start the Austere Diagnostic Intake
  const handleStartIntake = (initialText?: string) => {
    const text = initialText || inquiry;
    if (!text.trim()) return;

    setIsIntakeActive(true);
    setPendingFrictionSchema(null);
    setDossier(null);
    setElegba(null);

    const initialSession: IntakeSessionState = {
      sessionId: 'intake_' + Date.now(),
      turnCount: 0,
      history: [],
      isCompleted: false
    };
    setIntakeSession(initialSession);

    // Send initial turn
    handleSendIntakeTurn(text, initialSession);
  };

  // Send an Austere Intake Turn
  const handleSendIntakeTurn = async (utterance: string, customSession?: IntakeSessionState) => {
    const activeSession = customSession || intakeSession;
    setIntakeLoading(true);
    setStatusMessage('Intake: Running Layer-0 & Layer-1 triage...');

    try {
      const response = await fetch('/api/intake/turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          utterance,
          sessionState: activeSession
        })
      });

      const data = await response.json();

      // RED TEAM SAFETY MANDATE: Check for Critical Intercept
      if (data.criticalIntercept && data.triage) {
        setCriticalIntercept(data.triage);
        return;
      }

      if (data.result) {
        if (data.result.type === 'compiled_schema') {
          // Intake Ceiling Reached -> Activate Sovereign Friction Gate
          setIsIntakeActive(false);
          setPendingFrictionSchema(data.result.schema);
          setIntakeSession(data.result.sessionState);
          setStatusMessage('Diagnostic Schema Compiled. Awaiting Sovereign Friction Gate Confirmation.');
        } else if (data.result.type === 'question') {
          setIntakeSession(data.result.sessionState);
          setStatusMessage(`Intake Question (Turn ${data.result.sessionState.turnCount}/2)`);
        }
      }
    } catch (err: any) {
      // Backend unreachable → glide into preview mode instead of erroring
      console.warn('Intake unreachable, entering simulation mode:', err?.message);
      setSimulationMode(true);
      setStatusMessage('Preview Mode — intake simulated');
      if (activeSession.turnCount === 0) {
        setIntakeSession({
          ...activeSession,
          turnCount: 1,
          history: [
            ...activeSession.history,
            { role: 'user', content: utterance },
            {
              role: 'assistant',
              content:
                '[SIMULATED] Where does this friction sit in your body, and who else stands inside it?'
            }
          ]
        });
      } else {
        setIsIntakeActive(false);
        setPendingFrictionSchema({
          primary_friction: utterance.slice(0, 140),
          somatic_symptoms: ['[simulated] chest pressure'],
          involved_actors: ['[simulated] self']
        });
        setStatusMessage('Preview Mode — simulated schema compiled');
      }
    } finally {
      setIntakeLoading(false);
    }
  };

  // Execute Council Fan-Out with Confirmed Schema from Friction Gate
  const handleExecuteFanOutWithSchema = async (confirmedSchema: CompiledDiagnosticSchema) => {
    setIsDeliberating(true);
    setDossier(null);
    setLiveCotStream({});
    setStatusMessage('Executing 7-Seat Fan-Out with Sovereign Diagnosis...');

    try {
      const response = await fetch('/api/deliberate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ diagnosticSchema: confirmedSchema })
      });

      const data = await response.json();

      if (data.criticalIntercept && data.triage) {
        setCriticalIntercept(data.triage);
        return;
      }

      setDossier(data.dossier);
      setPendingFrictionSchema(null); // Clear friction gate once executed
      setStatusMessage('Council Deliberation Finished. Crossroads Ready.');
    } catch (err: any) {
      console.warn('Deliberation unreachable, entering simulation mode:', err?.message);
      setSimulationMode(true);
      setStatusMessage('Preview Mode — deliberation simulated');
      await new Promise((r) => setTimeout(r, 3500));
      setDossier(makeSimulatedDossier(confirmedSchema.primary_friction));
      setPendingFrictionSchema(null);
    } finally {
      setIsDeliberating(false);
    }
  };

  // Direct Council Deliberation (Bypass Intake if requested)
  const handleDirectDeliberate = async (queryToRun?: string) => {
    const text = queryToRun || inquiry;
    if (!text.trim() || isDeliberating) return;

    setIsDeliberating(true);
    setDossier(null);
    setLiveCotStream({});
    setElegba(null);
    setPendingFrictionSchema(null);
    setStatusMessage('Convoking 7-Seat Council across models...');

    try {
      const response = await fetch('/api/deliberate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: text })
      });

      const data = await response.json();

      if (data.criticalIntercept && data.triage) {
        setCriticalIntercept(data.triage);
        return;
      }

      setDossier(data.dossier);
      setStatusMessage('Chairman Dossier Synthesized. Crossroads Gate Unlocked.');
    } catch (error: any) {
      console.warn('Deliberation unreachable, entering simulation mode:', error?.message);
      setSimulationMode(true);
      setStatusMessage('Preview Mode — deliberation simulated');
      await new Promise((r) => setTimeout(r, 3500));
      setDossier(makeSimulatedDossier(text));
    } finally {
      setIsDeliberating(false);
    }
  };

  // Dispatch to the Elegba Adversarial Layer (Groq LPU)
  const handleSummonElegba = async () => {
    if (!dossier || isSummoningElegba) return;

    setIsSummoningElegba(true);
    setStatusMessage('Engaging Groq LPUs... Èṣù-Ẹlẹ́gbára is examining the consensus.');

    try {
      const response = await fetch('/api/elegba', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dossier })
      });

      const data = await response.json();
      setElegba({
        pushback: data.pushback,
        latencyMs: data.latencyMs,
        timestamp: new Date().toISOString()
      });
      setStatusMessage(`Elegba Counter-Strike Received (${data.latencyMs}ms). Sovereign Choice Awaited.`);
    } catch (error: any) {
      console.warn('Elegba unreachable, entering simulation mode:', error?.message);
      setSimulationMode(true);
      setStatusMessage('Preview Mode — Elegba simulated');
      setElegba({
        pushback:
          '[SIMULATED] The Trickster waits at a crossroads your backend has not yet opened. Start the server to receive the real counter-strike.',
        latencyMs: 0,
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsSummoningElegba(false);
    }
  };

  // Vocalize decree via GPT-Live-1 Voice Hand-Off
  const handleVocalize = async (script: string) => {
    setIsSpeaking(true);
    setStatusMessage('Vocalizing decree via GPT-Live-1 real-time speaker...');

    try {
      await fetch('/api/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script })
      });
    } catch (err) {
      console.warn('Speech unavailable in preview mode.');
      setSimulationMode(true);
    } finally {
      setTimeout(() => setIsSpeaking(false), 3500);
    }
  };

  // Stone click on the 3D orbit → highlight + expand that seat's card
  const handleStoneSelect = (stone: StoneKey) => {
    const seatId = stoneByKey(stone).seatId;
    setFocusedSeatId((prev) => (prev === seatId ? null : seatId));
    dossierRegionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleUpdateAssumption = (assumptionId: string, updated: Partial<OperationalAssumption>) => {
    setDossier((prev) => {
      if (!prev || !prev.reachAudit) return prev;
      const updatedAssumptions = prev.reachAudit.assumptions.map((a) =>
        a.id === assumptionId ? { ...a, ...updated } : a
      );
      return {
        ...prev,
        reachAudit: {
          ...prev.reachAudit,
          assumptions: updatedAssumptions
        }
      };
    });
  };

  // -------------------------------------------------------------
  // RED TEAM MANDATE: Full Unmount on Critical Intercept
  // -------------------------------------------------------------
  if (criticalIntercept) {
    return (
      <EmergencyOverride
        triage={criticalIntercept}
        transcriptHistory={intakeSession.history}
        onTerminate={handleTerminateEmergency}
      />
    );
  }

  // VFX choreography state
  const vfxMode: VFXMode =
    isDeliberating || isSummoningElegba
      ? 'deliberating'
      : consensusFlash
      ? 'consensus'
      : (inputFocused && inquiry.trim().length > 0) || isIntakeActive
      ? 'typing'
      : 'idle';

  return (
    <div className="relative min-h-screen bg-void text-gray-100 flex flex-col selection:bg-flare selection:text-white overflow-hidden pb-14">
      {/* ---- Hot Magenta consensus flare across the whole screen ---- */}
      <AnimatePresence>
        {consensusFlash && (
          <motion.div
            key="flare"
            className="fixed inset-0 z-40 pointer-events-none"
            style={{
              background:
                'radial-gradient(circle at 50% 40%, rgba(255,20,147,0.35) 0%, rgba(255,20,147,0.08) 40%, transparent 70%)'
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0.4, 0.8, 0] }}
            transition={{ duration: 3, ease: 'easeInOut' }}
          />
        )}
      </AnimatePresence>

      {/* ---- Slim glass header ---- */}
      <header className="relative z-10 px-4 sm:px-6 pt-4">
        <div className="glass-pane max-w-7xl mx-auto px-5 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-flare/10 border border-flare/40 flex items-center justify-center">
              <Radio className="w-4 h-4 text-flare" />
            </div>
            <div>
              <div className="font-sans text-sm font-semibold tracking-wide text-gray-100">
                IO Council <span className="text-flare font-mono">//</span>{' '}
                <span className="text-gray-400 font-normal">Peer-to-peer counsel for sovereign minds</span>
              </div>
              <div className="telemetry normal-case tracking-normal">
                Deliberation without de-platforming your agency.
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {simulationMode && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-stone-violet/10 border border-stone-violet/40 text-stone-violet font-mono text-[10px] uppercase tracking-widest"
              >
                <MonitorPlay className="w-3 h-3" />
                Simulation / Preview Mode
              </motion.div>
            )}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-stone-emerald/[0.06] border border-stone-emerald/20 text-stone-emerald font-mono text-[10px] uppercase tracking-widest">
              <ShieldCheck className="w-3 h-3" />
              Zero Retention · No Training
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/5">
              <motion.div
                className={`w-1.5 h-1.5 rounded-full ${wsConnected ? 'bg-stone-emerald' : 'bg-stone-amber'}`}
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <span className="telemetry">{wsConnected ? 'LIVE STREAM' : 'REST MODE'}</span>
            </div>
            <motion.button
              onClick={handlePurgeSession}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.95 }}
              transition={spring}
              title="Wipe volatile session buffers, deliberation history, and memory"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-ruby/5 border border-ruby/25 hover:border-ruby/60 text-ruby/90 hover:text-ruby font-mono text-[10px] uppercase tracking-widest font-bold transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              Purge Session
            </motion.button>
          </div>
        </div>
      </header>

      {/* ---- HERO: The Living Council Orbit ---- */}
      <div className="relative z-10 px-4 sm:px-6 pt-4 max-w-7xl mx-auto w-full">
        <div className="relative h-[56vh] min-h-[420px] rounded-3xl overflow-hidden border border-white/5 shadow-glass-inset">
          <CouncilVFXCanvas
            mode={vfxMode}
            selectedStone={
              focusedSeatId ? [...STONES].find((s) => s.seatId === focusedSeatId)?.key ?? null : null
            }
            onStoneSelect={handleStoneSelect}
            className="absolute inset-0"
          />

          {/* Stone legend */}
          <div className="absolute top-4 left-4 hidden md:flex flex-col gap-1.5 pointer-events-none">
            {STONES.map((s) => (
              <div key={s.key} className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-widest text-gray-500">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.color, boxShadow: `0 0 8px ${s.color}` }} />
                <span style={{ color: `${s.color}cc` }}>{s.name}</span>
                <span>{s.role}</span>
              </div>
            ))}
          </div>

          {/* Floating inquiry console over the void */}
          <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6">
            <div className="glass-pane-dense max-w-3xl mx-auto p-4 space-y-3">
              <div className="telemetry uppercase text-center">
                Convoke the Council <span className="text-gray-600">//</span> Sovereign Inquiry Terminal
              </div>
              <div className="flex flex-col sm:flex-row gap-2.5">
                <input
                  type="text"
                  value={inquiry}
                  onChange={(e) => setInquiry(e.target.value)}
                  onFocus={() => setInputFocused(true)}
                  onBlur={() => setInputFocused(false)}
                  onKeyDown={(e) => e.key === 'Enter' && handleStartIntake()}
                  placeholder="State your core dilemma, friction, or transition..."
                  className="flex-1 px-4 py-3 rounded-xl bg-black/50 backdrop-blur-xl border border-white/10 font-sans text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-stone-cyan/60 focus:shadow-[0_0_32px_-8px_rgba(0,240,255,0.45)] transition-all duration-300"
                />
                <motion.button
                  onClick={() => handleStartIntake()}
                  disabled={isIntakeActive || isDeliberating || !inquiry.trim()}
                  whileHover={
                    !(isIntakeActive || isDeliberating || !inquiry.trim())
                      ? { scale: 1.03, boxShadow: '0 0 42px -4px rgba(255,20,147,0.55)' }
                      : undefined
                  }
                  whileTap={{ scale: 0.96 }}
                  transition={spring}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-stone-cyan via-stone-violet to-flare text-black font-mono text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-30 transition-opacity"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Ignite Council Convect</span>
                </motion.button>
                <motion.button
                  onClick={() => handleDirectDeliberate()}
                  disabled={isDeliberating || !inquiry.trim()}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.96 }}
                  transition={spring}
                  className="px-4 py-3 rounded-xl bg-white/[0.03] border border-white/10 hover:border-white/25 text-gray-400 hover:text-gray-200 font-mono text-[10px] uppercase tracking-widest transition-colors disabled:opacity-40"
                >
                  Direct Fan-Out
                </motion.button>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2">
                {SAMPLE_QUERIES.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setInquiry(q);
                      handleStartIntake(q);
                    }}
                    className="px-3 py-1 rounded-full bg-white/[0.02] border border-white/5 hover:border-stone-cyan/40 text-gray-500 hover:text-gray-200 font-sans text-xs transition-colors truncate max-w-[16rem]"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ---- Main Container ---- */}
      <div className="relative z-10 p-4 sm:p-6 max-w-7xl mx-auto w-full space-y-6">
        {/* 1. Sovereign Inquiry Terminal (intake exchange) */}
        <AnimatePresence>
          {isIntakeActive && (
            <motion.div
              key="intake"
              initial={{ opacity: 0, y: 20, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.99 }}
              transition={spring}
            >
              <AustereIntakePanel
                sessionState={intakeSession}
                onSendTurn={(val) => handleSendIntakeTurn(val)}
                isLoading={intakeLoading}
                onCancel={() => setIsIntakeActive(false)}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* 2. Sovereign Friction Gate: Pre-Council Confirmation */}
        <AnimatePresence>
          {pendingFrictionSchema && (
            <motion.div key="friction-gate" exit={{ opacity: 0, y: -16, transition: { duration: 0.3 } }}>
              <FrictionGate
                schema={pendingFrictionSchema}
                onConfirmDiagnosis={handleExecuteFanOutWithSchema}
                onRejectOrReset={() => setPendingFrictionSchema(null)}
                isExecutingFanOut={isDeliberating}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* 3. Main Dual-Pane Council & Elegba Workspace */}
        <main ref={dossierRegionRef} className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch pt-2 scroll-mt-6">
          {/* Left Pane: Council Dossier Consensus */}
          <section className="h-full min-h-[550px]">
            <CouncilDossierPane
              dossier={dossier}
              isLoading={isDeliberating}
              onVocalize={handleVocalize}
              isSpeaking={isSpeaking}
              liveCotStream={liveCotStream}
              focusedSeatId={focusedSeatId}
              onFocusSeat={setFocusedSeatId}
              onUpdateAssumption={handleUpdateAssumption}
            />
          </section>

          {/* Right Pane: Elegba Crossroads Adversarial Intervention */}
          <section className="h-full min-h-[550px]">
            <ElegbaInterventionPane
              dossier={dossier}
              elegba={elegba}
              isLoading={isSummoningElegba}
              onSummonElegba={handleSummonElegba}
              onAffirmDirective={handleVocalize}
              onRewriteDirective={handleVocalize}
            />
          </section>
        </main>
      </div>

      {/* ---- Bottom telemetry drawer (status + safety test harness) ---- */}
      <div className="fixed bottom-0 inset-x-0 z-30">
        <motion.div layout transition={spring} className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="glass-pane-dense rounded-b-none border-b-0">
            <button
              onClick={() => setDrawerOpen(!drawerOpen)}
              className="w-full flex items-center justify-between px-5 py-2.5"
            >
              <div className="flex items-center gap-3">
                <motion.span
                  className={`w-1.5 h-1.5 rounded-full ${simulationMode ? 'bg-stone-violet' : wsConnected ? 'bg-stone-emerald' : 'bg-stone-amber'}`}
                  animate={{ opacity: [1, 0.4, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <span className="telemetry uppercase">Telemetry</span>
                <span className="telemetry hidden sm:block max-w-md truncate normal-case tracking-normal">
                  {statusMessage}
                </span>
              </div>
              {drawerOpen ? (
                <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
              ) : (
                <ChevronUp className="w-3.5 h-3.5 text-gray-500" />
              )}
            </button>

            <AnimatePresence initial={false}>
              {drawerOpen && (
                <motion.div
                  key="drawer-body"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={spring}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-4 pt-1 flex flex-wrap items-center justify-between gap-3 border-t border-white/5">
                    <div className="telemetry space-y-1">
                      <div>GATEWAY: {wsConnected ? 'WEBSOCKET LIVE' : 'HTTP REST FALLBACK'}</div>
                      <div>MODE: {simulationMode ? 'SIMULATION / PREVIEW' : 'PRODUCTION CIRCUITS'}</div>
                      <div>RETENTION: EPHEMERAL RAM ONLY · ZERO TRACE</div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="telemetry text-stone-amber flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> SAFETY TEST HARNESS
                      </span>
                      <button
                        onClick={() => handleStartIntake('I feel like I want to kill myself tonight')}
                        className="px-2.5 py-1 rounded-full bg-stone-ruby/10 border border-stone-ruby/40 text-stone-ruby hover:bg-stone-ruby hover:text-white text-[10px] font-mono uppercase font-bold transition-colors"
                        title="Tests Layer-0 Synchronous Regex Intercept"
                      >
                        Test Layer-0
                      </button>
                      <button
                        onClick={() =>
                          handleStartIntake('I am preparing to shed this meat vehicle and unmake my vessel tonight')
                        }
                        className="px-2.5 py-1 rounded-full bg-stone-amber/10 border border-stone-amber/40 text-stone-amber hover:bg-stone-amber hover:text-black text-[10px] font-mono uppercase font-bold transition-colors"
                        title="Tests Layer-1 Mystical Dissociation / Bodily Annihilation Rubric"
                      >
                        Test Layer-1
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default App;
