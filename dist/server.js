"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createServer = createServer;
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const ws_1 = __importStar(require("ws"));
const elegba_1 = require("./agents/elegba");
const intakeAgent_1 = require("./agents/intakeAgent");
const triageEngine_1 = require("./middleware/triageEngine");
const councilPipeline_1 = require("./orchestrator/councilPipeline");
const gptLiveClient_1 = require("./services/realtime/gptLiveClient");
dotenv_1.default.config();
function createServer(port = 8080) {
    const app = (0, express_1.default)();
    app.use((0, cors_1.default)());
    app.use(express_1.default.json());
    const server = http_1.default.createServer(app);
    const wss = new ws_1.WebSocketServer({ server });
    const liveClient = new gptLiveClient_1.GptLiveClient({
        apiKey: process.env.GPT_LIVE_API_KEY,
        voice: 'coral'
    });
    const pipeline = new councilPipeline_1.CouncilPipeline(liveClient);
    // Broadcast helper to all connected WebSockets
    const broadcastWebSocket = (data) => {
        const payload = JSON.stringify(data);
        wss.clients.forEach((client) => {
            if (client.readyState === ws_1.default.OPEN) {
                client.send(payload);
            }
        });
    };
    // Wire live Chain-of-Thought (CoT) delta events to WebSocket broadcast
    pipeline.on('cot_delta', (event) => {
        broadcastWebSocket({ type: 'cot_delta', ...event });
    });
    // Status & Health endpoint
    app.get('/api/health', (_req, res) => {
        res.json({
            status: 'online',
            groqConfigured: !!process.env.GROQ_API_KEY,
            gptLiveConfigured: !!process.env.GPT_LIVE_API_KEY,
            timestamp: new Date().toISOString()
        });
    });
    // Standalone Triage Pre-Flight Endpoint
    app.post('/api/intake/triage', async (req, res) => {
        try {
            const { text } = req.body;
            if (!text || typeof text !== 'string') {
                res.status(400).json({ error: 'Missing or invalid "text" in body' });
                return;
            }
            const triage = await (0, triageEngine_1.evaluateTriage)(text);
            if (triage.isCrisis) {
                broadcastWebSocket({ type: 'CRITICAL_INTERCEPT', triage });
            }
            res.json({ triage });
        }
        catch (err) {
            console.error('[API /api/intake/triage] Error:', err);
            // FAIL-CLOSED: if internal crash, flag as crisis
            res.status(500).json({
                triage: {
                    isCrisis: true,
                    layer: 'layer1_error',
                    reason: `Fail-Closed: Internal triage exception - ${err?.message}`,
                    latencyMs: 0
                }
            });
        }
    });
    // Austere Intake Conversational Turn Endpoint
    app.post('/api/intake/turn', async (req, res) => {
        try {
            const { utterance, sessionState } = req.body;
            if (!utterance || typeof utterance !== 'string') {
                res.status(400).json({ error: 'Missing "utterance" in request body' });
                return;
            }
            // 1. MANDATORY TRIAGE CHECK (Layer-0 Regex & Layer-1 Groq Fail-Closed)
            const triage = await (0, triageEngine_1.evaluateTriage)(utterance);
            if (triage.isCrisis) {
                console.warn('[API /api/intake/turn] CRITICAL_INTERCEPT triggered during intake:', triage.reason);
                broadcastWebSocket({ type: 'CRITICAL_INTERCEPT', triage });
                res.status(200).json({
                    criticalIntercept: true,
                    triage
                });
                return;
            }
            // 2. State Machine: Initialize if new session
            const state = sessionState || {
                sessionId: 'intake_' + Date.now(),
                turnCount: 0,
                history: [],
                isCompleted: false
            };
            // 3. Process Intake Turn under 2-turn ceiling
            const result = await (0, intakeAgent_1.processIntakeTurn)(state, utterance);
            res.json({
                criticalIntercept: false,
                triage,
                result
            });
        }
        catch (err) {
            console.error('[API /api/intake/turn] Error:', err);
            res.status(500).json({ error: err.message || 'Intake turn processing failed' });
        }
    });
    // 7-Seat Fan-Out & Chairman Synthesis endpoint
    app.post('/api/deliberate', async (req, res) => {
        try {
            const { query, diagnosticSchema } = req.body;
            let inputPrompt = query;
            // If compiled schema is passed from the Friction Gate, construct formatted prompt
            if (diagnosticSchema) {
                inputPrompt = `[DIAGNOSTIC INTAKE COMPILED]
Primary Existential Friction: ${diagnosticSchema.primary_friction}
Somatic Manifestations: ${diagnosticSchema.somatic_symptoms.join(', ')}
Involved Actors & Pressures: ${diagnosticSchema.involved_actors.join(', ')}`.trim();
            }
            if (!inputPrompt || typeof inputPrompt !== 'string') {
                res.status(400).json({ error: 'Missing or invalid query/diagnosticSchema in request body' });
                return;
            }
            // Safety Triage Pre-Check on input
            const triage = await (0, triageEngine_1.evaluateTriage)(inputPrompt);
            if (triage.isCrisis) {
                broadcastWebSocket({ type: 'CRITICAL_INTERCEPT', triage });
                res.status(200).json({ criticalIntercept: true, triage });
                return;
            }
            console.log(`[API /api/deliberate] Processing convocation for: "${inputPrompt.slice(0, 80)}..."`);
            const dossier = await pipeline.executeTurn(inputPrompt);
            res.json({ criticalIntercept: false, dossier });
        }
        catch (err) {
            console.error('[API /api/deliberate] Error:', err);
            res.status(500).json({ error: err.message || 'Deliberation failed' });
        }
    });
    // The Elegba Protocol Crossroads Adversarial endpoint
    app.post('/api/elegba', async (req, res) => {
        try {
            const { dossier } = req.body;
            if (!dossier) {
                res.status(400).json({ error: 'Missing "dossier" in request body' });
                return;
            }
            const dossierString = typeof dossier === 'string'
                ? dossier
                : `
[COSMIC ALIGNMENTS]
${(dossier.cosmicAlignments || []).map((a, i) => `${i + 1}. ${a}`).join('\n')}

[KEY TENSIONS]
${(dossier.keyTensions || []).map((t, i) => `${i + 1}. ${t}`).join('\n')}

[SOMATIC PRESCRIPTIONS]
${(dossier.somaticPrescriptions || []).map((p, i) => `${i + 1}. ${p}`).join('\n')}

[CHAIRMAN ORAL SCRIPT]
"${dossier.spokenSynthesisScript || ''}"
`.trim();
            const start = Date.now();
            const pushback = await (0, elegba_1.invokeElegba)(dossierString);
            const latencyMs = Date.now() - start;
            res.json({ pushback, latencyMs });
        }
        catch (err) {
            console.error('[API /api/elegba] Error:', err);
            res.status(500).json({ error: err.message || 'Elegba invocation failed' });
        }
    });
    // Voice playback endpoint for sovereign decree affirmation/rewrite
    app.post('/api/speak', (req, res) => {
        try {
            const { script } = req.body;
            if (!script || typeof script !== 'string') {
                res.status(400).json({ error: 'Missing "script" in request body' });
                return;
            }
            console.log(`[API /api/speak] Vocalizing decree: "${script.slice(0, 60)}..."`);
            liveClient.handoffDossierToVoice({
                cosmicAlignments: [],
                keyTensions: [],
                somaticPrescriptions: [],
                rawSeatDeliberations: [],
                metadata: {},
                spokenSynthesisScript: script
            });
            res.json({ success: true, vocalizedScript: script });
        }
        catch (err) {
            console.error('[API /api/speak] Error:', err);
            res.status(500).json({ error: err.message || 'Speech handoff failed' });
        }
    });
    // Real-time WebSocket connection
    wss.on('connection', (clientWs) => {
        console.log('[Server] WebSocket client connected to real-time audio channel.');
        clientWs.on('message', async (message) => {
            try {
                if (Buffer.isBuffer(message)) {
                    liveClient.appendAudioChunk(message.toString('base64'));
                }
                else {
                    const parsed = JSON.parse(message.toString());
                    if (parsed.type === 'audio_chunk' && parsed.pcmBase64) {
                        liveClient.appendAudioChunk(parsed.pcmBase64);
                    }
                    else if (parsed.type === 'commit_audio') {
                        liveClient.commitAudioBuffer();
                    }
                    else if (parsed.type === 'triage_check' && parsed.text) {
                        const triage = await (0, triageEngine_1.evaluateTriage)(parsed.text);
                        if (triage.isCrisis) {
                            broadcastWebSocket({ type: 'CRITICAL_INTERCEPT', triage });
                        }
                        else {
                            clientWs.send(JSON.stringify({ type: 'triage_clear', triage }));
                        }
                    }
                }
            }
            catch (err) {
                console.error('[Server] WebSocket frame error:', err);
            }
        });
        const onAudioDelta = (delta) => {
            if (clientWs.readyState === ws_1.default.OPEN) {
                clientWs.send(JSON.stringify({ type: 'audio_delta', delta }));
            }
        };
        liveClient.on('audio_delta', onAudioDelta);
        clientWs.on('close', () => {
            liveClient.off('audio_delta', onAudioDelta);
        });
    });
    return { server, app, wss, pipeline, liveClient, port };
}
