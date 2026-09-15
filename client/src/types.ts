export interface CotReasoningSteps {
  friction: string;
  antiDogmaAudit: string;
  synthesis: string;
}

export interface SeatDeliberation {
  seatId: string;
  seatName: string;
  archetype: string;
  model: string;
  perspectiveText: string;
  rawOutput?: string;
  cotSteps?: CotReasoningSteps;
  auditPassed?: boolean;
  auditWarning?: string;
  latencyMs: number;
  status: 'completed' | 'timed_out' | 'failed';
}

export interface ChairmanDossier {
  cosmicAlignments: string[];
  keyTensions: string[];
  somaticPrescriptions: string[];
  rawSeatDeliberations: SeatDeliberation[];
  metadata: {
    totalDeliberations: number;
    completedCount: number;
    timedOutCount: number;
    failedCount: number;
    quorumReached: boolean;
    totalFanOutLatencyMs: number;
    synthesisLatencyMs: number;
    timestamp: string;
  };
  spokenSynthesisScript: string;
}

export interface ElegbaResponse {
  pushback: string;
  latencyMs: number;
  model?: string;
  timestamp: string;
}

export type SovereignResolutionState = 'unresolved' | 'editing' | 'affirmed' | 'rewritten';

export interface SovereignDecree {
  state: SovereignResolutionState;
  text: string;
  modifiedAt?: string;
}

export interface CompiledDiagnosticSchema {
  primary_friction: string;
  somatic_symptoms: string[];
  involved_actors: string[];
}

export interface TriageResult {
  isCrisis: boolean;
  layer: 'layer0_regex' | 'layer1_groq' | 'layer1_timeout' | 'layer1_error' | 'clear';
  reason?: string;
  latencyMs: number;
  crisisType?: 'explicit_self_harm' | 'mystical_dissociation' | 'bodily_annihilation' | 'psychiatric_emergency' | 'fail_closed_guard';
}

export interface IntakeMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface IntakeSessionState {
  sessionId: string;
  turnCount: number;
  history: IntakeMessage[];
  isCompleted: boolean;
  compiledSchema?: CompiledDiagnosticSchema;
}

export type WebSocketIncomingEvent =
  | { type: 'audio_delta'; delta: string }
  | { type: 'transcript_delta'; delta: string }
  | {
      type: 'cot_delta';
      seatId: string;
      seatName: string;
      step: 'friction' | 'anti_dogma_audit' | 'synthesis';
      delta: string;
      fullThought?: string;
    }
  | { type: 'status'; message: string }
  | { type: 'speech_completed'; response: any }
  | { type: 'CRITICAL_INTERCEPT'; triage: TriageResult }
  | { type: 'error'; error: string };

export type WebSocketOutgoingEvent =
  | { type: 'audio_chunk'; pcmBase64: string }
  | { type: 'commit_audio' }
  | { type: 'cancel_speech' }
  | { type: 'triage_check'; text: string };
