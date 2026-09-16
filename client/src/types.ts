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

export type ReachDimensionKey =
  | 'relevance'
  | 'epistemic_humility'
  | 'agency_preservation'
  | 'context_sensitivity'
  | 'harmonization';

export interface ReachDimensionScore {
  name: string;
  dimension: ReachDimensionKey;
  score: number; // 1.0 - 5.0 scale, centered around 2.0 - 4.0
  rationale: string;
}

export interface OperationalAssumption {
  id: string;
  category: string;
  statement: string;
  status: 'unreviewed' | 'affirmed' | 'modified';
  userNotes?: string;
}

export interface ReachAuditResult {
  overallScore: number;
  dimensions: Record<ReachDimensionKey, ReachDimensionScore>;
  assumptions: OperationalAssumption[];
  evaluator: 'latimer_api' | 'local_heuristic_engine';
  evaluatedAt: string;
  antiPatronizationPassed: boolean;
}

export interface ChairmanDossier {
  cosmicAlignments: string[];
  keyTensions: string[];
  somaticPrescriptions: string[];
  strategicExpansionVector?: string;
  reachAudit?: ReachAuditResult;
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
  | { type: 'reach_audit'; audit: ReachAuditResult }
  | { type: 'status'; message: string }
  | { type: 'speech_completed'; response: any }
  | { type: 'session_purged'; timestamp: string; memoryBytesCleared: number }
  | { type: 'CRITICAL_INTERCEPT'; triage: TriageResult }
  | { type: 'error'; error: string };

export type WebSocketOutgoingEvent =
  | { type: 'audio_chunk'; pcmBase64: string }
  | { type: 'commit_audio' }
  | { type: 'cancel_speech' }
  | { type: 'purge_session' }
  | { type: 'triage_check'; text: string };
