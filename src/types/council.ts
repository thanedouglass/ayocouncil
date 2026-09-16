/**
 * Types defining the Seven-Seat Council, Chain of Thought (CoT), and Chairman Dossier.
 */

export type ModelProvider = 'anthropic' | 'gemini' | 'meta-llama' | 'openai' | 'mistral';

export type CouncilSeatId =
  | 'seat_1_stoic_empiricist'
  | 'seat_2_existentialist'
  | 'seat_3_cyberneticist'
  | 'seat_4_mystic_cosmologist'
  | 'seat_5_pragmatist'
  | 'seat_6_psychoanalytic'
  | 'seat_7_dialectical';

export interface CouncilSeatConfig {
  id: CouncilSeatId;
  name: string;
  archetype: string;
  modelProvider: ModelProvider;
  modelName: string;
  timeoutMs: number;
  systemPrompt: string;
  userPromptTemplate: (userSpeech: string) => string;
}

export type DeliberationStatus = 'completed' | 'timed_out' | 'failed';

export interface CotReasoningSteps {
  friction: string;
  antiDogmaAudit: string;
  synthesis: string;
}

export interface SeatDeliberation {
  seatId: CouncilSeatId;
  seatName: string;
  archetype: string;
  model: string;
  perspectiveText: string;
  rawOutput?: string;
  cotSteps?: CotReasoningSteps;
  auditPassed: boolean;
  auditWarning?: string;
  latencyMs: number;
  status: DeliberationStatus;
  errorMessage?: string;
}

export interface ChairmanDossier {
  cosmicAlignments: string[];
  keyTensions: string[];
  somaticPrescriptions: string[];
  strategicExpansionVector?: string;
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
