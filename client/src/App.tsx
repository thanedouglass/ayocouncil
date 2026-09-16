import React, { useState, useEffect, useRef } from 'react';
import {
  ChairmanDossier,
  CompiledDiagnosticSchema,
  ElegbaResponse,
  IntakeSessionState,
  TriageResult
} from './types';
import { CouncilDossierPane } from './components/CouncilDossierPane';
import { ElegbaInterventionPane } from './components/ElegbaInterventionPane';
import { EmergencyOverride } from './components/EmergencyOverride';
import { FrictionGate } from './components/FrictionGate';
import { AustereIntakePanel } from './components/AustereIntakePanel';
import { Radio, Terminal, Sparkles, AlertTriangle, ShieldCheck, Trash2 } from 'lucide-react';

const SAMPLE_QUERIES = [
  'Should I walk away from my high-paying corporate role to bootstrap an esoteric philosophical AI collective?',
  'Should I sever ties with my erratic co-founder, or is this tension the exact crucible our project needs?',
  'Should I surrender to the natural flow of events or mount a relentless, aggressive push forward?'
];

export const App: React.FC = () => {
  const [inquiry, setInquiry] = useState('');
  const [dossier, setDossier] = useState<ChairmanDossier | null>(null);
  const [elegba, setElegba] = useState<ElegbaResponse | null>(null);
  const [isDeliberating, setIsDeliberating] = useState(false);
  const [isSummoningElegba, setIsSummoningElegba] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [statusMessage, setStatusMessage] = useState('System Online // Safety Circuits Active');

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

  // Connect to backend WebSocket for live audio stream & safety broadcasts
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname || 'localhost';
    const wsUrl = `${protocol}//${host}:8080`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setWsConnected(true);
        setStatusMessage('Connected to GPT-Live-1 & AyoCouncil Gateway');
      };

      ws.onclose = () => {
        setWsConnected(false);
        setStatusMessage('WebSocket Disconnected (HTTP fallback active)');
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
      console.error('Intake turn error:', err);
      setStatusMessage(`Intake error: ${err.message}`);
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
      console.error('Deliberation error:', err);
      setStatusMessage(`Deliberation error: ${err.message}`);
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
      console.error('Deliberation error:', error);
      setStatusMessage(`Error: ${error.message}`);
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
      console.error('Elegba error:', error);
      setStatusMessage(`Elegba Error: ${error.message}`);
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
      console.error('Speech error:', err);
    } finally {
      setTimeout(() => setIsSpeaking(false), 3500);
    }
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

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-neutral-100 flex flex-col selection:bg-ruby selection:text-white">
      {/* Top Navigation Bar */}
      <header className="border-b border-neutral-800 bg-[#0d0d12] px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-ruby/10 border border-ruby flex items-center justify-center shadow-ruby-glow">
            <Radio className="w-4 h-4 text-ruby animate-pulse" />
          </div>
          <div>
            <div className="text-sm font-mono font-bold tracking-widest text-neutral-100 flex items-center gap-2 uppercase">
              AyoCouncil <span className="text-ruby">//</span> Chairman Dashboard
            </div>
            <div className="text-[10px] font-mono text-neutral-500">
              Meta-Prompting Intake & Sovereign Friction Gate
            </div>
          </div>
        </div>

        {/* Telemetry Status Bar & Anti-Extraction Guarantees */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs font-mono">
          {/* Zero Data Retention Verification Badge */}
          <div className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-[#0a140f] border border-emerald-900/70 rounded text-[11px] text-emerald-300 shadow-sm">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="tracking-wide">Zero Retention • No Training</span>
          </div>

          <div className="flex items-center space-x-2 px-2.5 py-1.5 bg-[#12121a] border border-neutral-800 rounded">
            <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            <span className="text-[11px] text-neutral-400">
              {wsConnected ? 'LIVE-1 STREAM' : 'HTTP REST'}
            </span>
          </div>

          {/* Ephemeral Session Purge Action */}
          <button
            onClick={handlePurgeSession}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#1a1118] hover:bg-[#281422] border border-rose-950 hover:border-rose-700/70 text-rose-300 rounded text-[11px] font-bold tracking-wider uppercase transition-all"
            title="Wipe volatile session buffers, deliberation history, and memory"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span>Purge Session</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="p-6 max-w-7xl mx-auto w-full space-y-6">
        {/* Terminal Query & Diagnostic Bar */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Terminal className="w-4 h-4 absolute left-3.5 top-3.5 text-neutral-500" />
              <input
                type="text"
                value={inquiry}
                onChange={(e) => setInquiry(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleStartIntake()}
                placeholder="Present an existential inquiry to the Diagnostic Intake Layer..."
                className="w-full pl-10 pr-4 py-3 bg-[#101017] border border-neutral-800 rounded font-mono text-xs text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-ruby focus:ring-1 focus:ring-ruby"
              />
            </div>

            {/* Primary Action: Austere Intake */}
            <button
              onClick={() => handleStartIntake()}
              disabled={isIntakeActive || isDeliberating || !inquiry.trim()}
              className="flex items-center justify-center space-x-2 px-6 py-3 bg-ruby hover:bg-ruby-hover disabled:bg-neutral-800 disabled:text-neutral-600 text-white rounded font-mono text-xs font-bold tracking-wider uppercase transition-all shadow-ruby-glow"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>INITIATE INTAKE</span>
            </button>

            {/* Direct Fan-out Bypass */}
            <button
              onClick={() => handleDirectDeliberate()}
              disabled={isDeliberating || !inquiry.trim()}
              className="px-4 py-3 bg-[#161622] hover:bg-[#1e1e2d] border border-neutral-800 text-neutral-300 rounded font-mono text-xs uppercase transition-all"
            >
              Direct Fan-Out
            </button>
          </div>

          {/* Real-time Telemetry Status Line */}
          <div className="flex items-center justify-between px-3 py-1.5 bg-[#0f0f15] border border-neutral-900 rounded text-[11px] font-mono text-neutral-400">
            <div className="flex items-center space-x-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <span>Gateway: <span className="text-neutral-200">{statusMessage}</span></span>
            </div>
            <div className="text-[10px] text-neutral-500">
              Ephemeral RAM Only • Zero Trace Retention
            </div>
          </div>

          {/* Quick Presets and Red Team Safety Test Triggers */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-neutral-500">
            <div className="flex flex-wrap items-center gap-2">
              <span>Inquiry Presets:</span>
              {SAMPLE_QUERIES.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setInquiry(q);
                    handleStartIntake(q);
                  }}
                  className="px-2.5 py-1 bg-[#12121a] hover:bg-[#181824] border border-neutral-800 hover:border-ruby/40 text-neutral-400 hover:text-neutral-200 rounded transition-all truncate max-w-xs"
                >
                  {q}
                </button>
              ))}
            </div>

            {/* Red Team Audit Verification Triggers */}
            <div className="flex items-center gap-2">
              <span className="text-amber-500 font-bold flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Safety Triggers:
              </span>
              <button
                onClick={() => handleStartIntake('I feel like I want to kill myself tonight')}
                className="px-2 py-0.5 bg-ruby/20 border border-ruby/60 text-ruby hover:bg-ruby hover:text-white rounded text-[10px] uppercase font-bold transition-all"
                title="Tests Layer-0 Synchronous Regex Intercept"
              >
                Test Layer-0
              </button>
              <button
                onClick={() => handleStartIntake('I am preparing to shed this meat vehicle and unmake my vessel tonight')}
                className="px-2 py-0.5 bg-amber-950/40 border border-amber-500/60 text-amber-400 hover:bg-amber-600 hover:text-white rounded text-[10px] uppercase font-bold transition-all"
                title="Tests Layer-1 Mystical Dissociation / Bodily Annihilation Rubric"
              >
                Test Layer-1
              </button>
            </div>
          </div>
        </div>

        {/* 1. Austere Intake Diagnostic Agent Active */}
        {isIntakeActive && (
          <AustereIntakePanel
            sessionState={intakeSession}
            onSendTurn={(val) => handleSendIntakeTurn(val)}
            isLoading={intakeLoading}
            onCancel={() => setIsIntakeActive(false)}
          />
        )}

        {/* 2. Sovereign Friction Gate: Pre-Council Confirmation */}
        {pendingFrictionSchema && (
          <FrictionGate
            schema={pendingFrictionSchema}
            onConfirmDiagnosis={handleExecuteFanOutWithSchema}
            onRejectOrReset={() => setPendingFrictionSchema(null)}
            isExecutingFanOut={isDeliberating}
          />
        )}

        {/* 3. Main Dual-Pane Council & Elegba Workspace */}
        <main className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch pt-2">
          {/* Left Pane: Council Dossier Consensus */}
          <section className="h-full min-h-[550px]">
            <CouncilDossierPane
              dossier={dossier}
              isLoading={isDeliberating}
              onVocalize={handleVocalize}
              isSpeaking={isSpeaking}
              liveCotStream={liveCotStream}
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
    </div>
  );
};

export default App;
