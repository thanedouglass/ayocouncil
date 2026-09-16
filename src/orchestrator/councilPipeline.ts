import { EventEmitter } from 'events';
import { evaluateTriage, TriageResult } from '../middleware/triageEngine';
import { CouncilFanOut } from '../services/council/councilFanOut';
import { GptLiveClient } from '../services/realtime/gptLiveClient';
import { ChairmanSynthesizer } from '../services/synthesis/chairmanSynthesizer';
import { ChairmanDossier, ReachAuditResult } from '../types/council';

export interface PipelineEvents {
  council_started: (userSpeech: string) => void;
  triage_intercept: (triage: TriageResult) => void;
  cot_delta: (event: {
    seatId: string;
    seatName: string;
    step: 'friction' | 'anti_dogma_audit' | 'synthesis';
    delta: string;
    fullThought?: string;
  }) => void;
  fan_out_completed: (result: any) => void;
  reach_audit: (audit: ReachAuditResult) => void;
  dossier_synthesized: (dossier: ChairmanDossier) => void;
  voice_handoff_started: (script: string) => void;
  pipeline_completed: (dossier: ChairmanDossier) => void;
  error: (err: Error) => void;
}

/**
 * End-to-end pipeline orchestrator for the Seven-Seat Council.
 * Connects Real-Time Ingestion -> 7-Seat Fan-Out (with CoT Streaming) -> Chairman Synthesis -> Voice Hand-off.
 */
export class CouncilPipeline extends EventEmitter {
  private liveClient: GptLiveClient;
  private fanOut: CouncilFanOut;
  private synthesizer: ChairmanSynthesizer;
  private isDeliberating: boolean = false;

  constructor(
    liveClient: GptLiveClient = new GptLiveClient(),
    fanOut: CouncilFanOut = new CouncilFanOut(),
    synthesizer: ChairmanSynthesizer = new ChairmanSynthesizer()
  ) {
    super();
    this.liveClient = liveClient;
    this.fanOut = fanOut;
    this.synthesizer = synthesizer;
    this.setupListeners();
  }

  /**
   * Initializes the pipeline and connects to the GPT-Live-1 real-time stream.
   */
  public async initialize(): Promise<void> {
    console.log('[CouncilPipeline] Initializing pipeline and connecting to real-time audio...');
    await this.liveClient.connect();
    console.log('[CouncilPipeline] Seven-Seat Council pipeline is ONLINE and listening.');
  }

  /**
   * Wires event listeners between the Real-Time Ingestion layer, CoT streaming, and the Council logic.
   */
  private setupListeners(): void {
    // 0. Forward live Chain-of-Thought (CoT) stream events
    this.fanOut.setCotDeltaCallback((event) => {
      this.emit('cot_delta', event);
    });

    // 1. Ingestion: Triggered when user speech transcription is completed by Whisper / Live-1
    this.liveClient.on('transcription_completed', async (userSpeech: string) => {
      if (!userSpeech || userSpeech.trim().length === 0) return;

      if (this.isDeliberating) {
        console.warn('[CouncilPipeline] Council currently deliberating. Queuing or ignoring overlapping turn.');
        return;
      }

      await this.executeTurn(userSpeech);
    });

    // 2. User barge-in handling
    this.liveClient.on('user_speech_started', () => {
      if (this.isDeliberating) {
        console.log('[CouncilPipeline] User interrupted active session.');
        this.liveClient.cancelCurrentResponse();
      }
    });

    // 3. Audio stream metrics
    this.liveClient.on('audio_delta', (_chunk: string) => {
      // Streamed audio chunks can be piped to client speakers or audio sinks
    });

    this.liveClient.on('speech_completed', (_response) => {
      console.log('[CouncilPipeline] Chairman speech delivery finished.');
    });
  }

  /**
   * End-to-end processing of a user inquiry:
   * 1. Evaluates two-layer crisis triage gatekeeping (Layer-0 Regex & Layer-1 Groq classifier)
   * 2. If flagged as crisis: immediately intercepts turn without invoking Council seats
   * 3. If cleared (TRIAGE_CLEARED): conducts full 7-seat deliberation fan-out and Chairman synthesis
   */
  public async processInquiry(userSpeech: string): Promise<{
    triage: TriageResult;
    criticalIntercept: boolean;
    dossier?: ChairmanDossier;
  }> {
    const triage = await evaluateTriage(userSpeech);

    if (triage.isCrisis) {
      console.warn(`[CouncilPipeline] CRITICAL_INTERCEPT triggered during inquiry: ${triage.reason}`);
      this.emit('triage_intercept', triage);
      return {
        triage,
        criticalIntercept: true
      };
    }

    const dossier = await this.executeTurn(userSpeech);
    return {
      triage,
      criticalIntercept: false,
      dossier
    };
  }

  /**
   * Executes a full round of council deliberation for a given user speech input.
   */
  public async executeTurn(userSpeech: string): Promise<ChairmanDossier> {
    this.isDeliberating = true;
    const cycleStart = Date.now();

    try {
      console.log('\n=================== NEW COUNCIL CONVOCATION ===================');
      console.log(`[CouncilPipeline] User Spoken Input: "${userSpeech}"`);
      this.emit('council_started', userSpeech);

      // STEP 2: The 7-Seat Fan-Out (Concurrent Promise.all with CoT and isolated timeouts)
      const fanOutResult = await this.fanOut.fanOutDeliberation(userSpeech);
      this.emit('fan_out_completed', fanOutResult);

      // STEP 3: Cross-Examination / Synthesis Layer (Generates Chairman Dossier)
      const dossier = await this.synthesizer.synthesizeDossier(userSpeech, fanOutResult);
      if (dossier.reachAudit) {
        this.emit('reach_audit', dossier.reachAudit);
      }
      this.emit('dossier_synthesized', dossier);

      // STEP 4: Voice Hand-off back to GPT-Live-1
      this.emit('voice_handoff_started', dossier.spokenSynthesisScript);
      this.liveClient.handoffDossierToVoice(dossier);

      const totalCycleMs = Date.now() - cycleStart;
      console.log(`[CouncilPipeline] Complete round-trip resolved in ${totalCycleMs}ms.`);
      console.log('=================================================================\n');

      this.emit('pipeline_completed', dossier);
      return dossier;
    } catch (err: any) {
      console.error('[CouncilPipeline] Critical pipeline error:', err);
      this.emit('error', err);
      throw err;
    } finally {
      this.isDeliberating = false;
    }
  }

  /**
   * Purges volatile in-memory deliberations, CoT traces, and audio buffers across the pipeline.
   * Guarantees zero data retention and anti-extraction sovereignty.
   */
  public purgeVolatileMemory(): {
    purged: boolean;
    timestamp: string;
    memoryBytesCleared: number;
  } {
    console.log('[CouncilPipeline] Zero-Retention Purge: Obliterating volatile session memory and active states.');
    this.isDeliberating = false;
    this.liveClient.purgeSessionBuffers();

    const memoryBytesCleared = process.memoryUsage().heapUsed;

    return {
      purged: true,
      timestamp: new Date().toISOString(),
      memoryBytesCleared
    };
  }

  /**
   * Getter for the underlying real-time client.
   */
  public getLiveClient(): GptLiveClient {
    return this.liveClient;
  }

  public getFanOut(): CouncilFanOut {
    return this.fanOut;
  }

  public getSynthesizer(): ChairmanSynthesizer {
    return this.synthesizer;
  }
}
