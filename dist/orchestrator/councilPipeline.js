"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CouncilPipeline = void 0;
const events_1 = require("events");
const councilFanOut_1 = require("../services/council/councilFanOut");
const gptLiveClient_1 = require("../services/realtime/gptLiveClient");
const chairmanSynthesizer_1 = require("../services/synthesis/chairmanSynthesizer");
/**
 * End-to-end pipeline orchestrator for the Seven-Seat Council.
 * Connects Real-Time Ingestion -> 7-Seat Fan-Out (with CoT Streaming) -> Chairman Synthesis -> Voice Hand-off.
 */
class CouncilPipeline extends events_1.EventEmitter {
    liveClient;
    fanOut;
    synthesizer;
    isDeliberating = false;
    constructor(liveClient = new gptLiveClient_1.GptLiveClient(), fanOut = new councilFanOut_1.CouncilFanOut(), synthesizer = new chairmanSynthesizer_1.ChairmanSynthesizer()) {
        super();
        this.liveClient = liveClient;
        this.fanOut = fanOut;
        this.synthesizer = synthesizer;
        this.setupListeners();
    }
    /**
     * Initializes the pipeline and connects to the GPT-Live-1 real-time stream.
     */
    async initialize() {
        console.log('[CouncilPipeline] Initializing pipeline and connecting to real-time audio...');
        await this.liveClient.connect();
        console.log('[CouncilPipeline] Seven-Seat Council pipeline is ONLINE and listening.');
    }
    /**
     * Wires event listeners between the Real-Time Ingestion layer, CoT streaming, and the Council logic.
     */
    setupListeners() {
        // 0. Forward live Chain-of-Thought (CoT) stream events
        this.fanOut.setCotDeltaCallback((event) => {
            this.emit('cot_delta', event);
        });
        // 1. Ingestion: Triggered when user speech transcription is completed by Whisper / Live-1
        this.liveClient.on('transcription_completed', async (userSpeech) => {
            if (!userSpeech || userSpeech.trim().length === 0)
                return;
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
        this.liveClient.on('audio_delta', (_chunk) => {
            // Streamed audio chunks can be piped to client speakers or audio sinks
        });
        this.liveClient.on('speech_completed', (_response) => {
            console.log('[CouncilPipeline] Chairman speech delivery finished.');
        });
    }
    /**
     * Executes a full round of council deliberation for a given user speech input.
     */
    async executeTurn(userSpeech) {
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
            this.emit('dossier_synthesized', dossier);
            // STEP 4: Voice Hand-off back to GPT-Live-1
            this.emit('voice_handoff_started', dossier.spokenSynthesisScript);
            this.liveClient.handoffDossierToVoice(dossier);
            const totalCycleMs = Date.now() - cycleStart;
            console.log(`[CouncilPipeline] Complete round-trip resolved in ${totalCycleMs}ms.`);
            console.log('=================================================================\n');
            this.emit('pipeline_completed', dossier);
            return dossier;
        }
        catch (err) {
            console.error('[CouncilPipeline] Critical pipeline error:', err);
            this.emit('error', err);
            throw err;
        }
        finally {
            this.isDeliberating = false;
        }
    }
    /**
     * Getter for the underlying real-time client.
     */
    getLiveClient() {
        return this.liveClient;
    }
    getFanOut() {
        return this.fanOut;
    }
    getSynthesizer() {
        return this.synthesizer;
    }
}
exports.CouncilPipeline = CouncilPipeline;
