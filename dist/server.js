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
require("dotenv/config");
// -------------------------------------------------------------
// STARTUP GUARDRAIL: Verify GROQ_API_KEY before importing services
// -------------------------------------------------------------
if (!process.env.GROQ_API_KEY || !process.env.GROQ_API_KEY.trim()) {
    console.error('\n=============================================================');
    console.error(' [FATAL STARTUP ERROR] GROQ_API_KEY is not configured!       ');
    console.error('=============================================================');
    console.error('A valid GROQ_API_KEY is required in environment or .env file.');
    console.error('Please define GROQ_API_KEY before starting the AyoCouncil server.\n');
    process.exit(1);
}
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const fs_1 = __importDefault(require("fs"));
const http_1 = __importDefault(require("http"));
const path_1 = __importDefault(require("path"));
const ws_1 = __importStar(require("ws"));
const elegba_1 = require("./agents/elegba");
const intakeAgent_1 = require("./agents/intakeAgent");
const triageEngine_1 = require("./middleware/triageEngine");
const councilPipeline_1 = require("./orchestrator/councilPipeline");
const gptLiveClient_1 = require("./services/realtime/gptLiveClient");
const telegram_1 = require("./services/telegram");
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
    // Wire Latimer REACH Auto-Rater audit events to WebSocket broadcast
    pipeline.on('reach_audit', (audit) => {
        broadcastWebSocket({ type: 'reach_audit', audit });
    });
    // Fly.io and Load Balancer Liveness / Health Check endpoint
    app.get('/health', (_req, res) => {
        res.status(200).json({
            status: 'ok',
            service: 'ayocouncil',
            timestamp: new Date().toISOString()
        });
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
    // Zero-Retention Ephemeral Session Purge Endpoint
    app.post('/api/session/purge', (_req, res) => {
        try {
            const purgeResult = pipeline.purgeVolatileMemory();
            broadcastWebSocket({
                type: 'session_purged',
                timestamp: purgeResult.timestamp,
                memoryBytesCleared: purgeResult.memoryBytesCleared
            });
            res.json({
                success: true,
                message: 'Volatile session buffers purged. Zero data retained.',
                ...purgeResult
            });
        }
        catch (err) {
            console.error('[API /api/session/purge] Error:', err);
            res.status(500).json({ error: err.message || 'Session purge failed' });
        }
    });
    // -------------------------------------------------------------
    // TELEGRAM Y3K CHANNEL ENDPOINTS & EVENT HOOKS
    // -------------------------------------------------------------
    // Status endpoint for Telegram integration
    app.get('/api/v1/telegram/status', (_req, res) => {
        res.json({
            status: 'ok',
            telegram: telegram_1.telegramService.getStatus(),
            timestamp: new Date().toISOString()
        });
    });
    // Secure Internal Broadcast Endpoint
    app.post('/api/v1/telegram/broadcast', async (req, res) => {
        try {
            // 1. Authorization check: Webhook secret or Admin User ID
            const authHeader = req.headers.authorization;
            const customSecret = req.headers['x-telegram-secret'];
            const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : customSecret;
            const userId = req.headers['x-admin-user-id'] || req.body?.userId;
            const isSecretValid = telegram_1.telegramService.verifyWebhook(token);
            const isAdminUser = userId ? telegram_1.telegramService.verifyAdmin(userId) : false;
            // Allow if secret matches, admin user matches, or if in local development with no secret set
            const secretConfigured = Boolean(process.env.TELEGRAM_WEBHOOK_SECRET) &&
                !process.env.TELEGRAM_WEBHOOK_SECRET?.includes('your_secure_webhook_secret_here');
            if (secretConfigured && !isSecretValid && !isAdminUser) {
                res.status(403).json({
                    error: 'Unauthorized: Valid system authorization secret or admin user ID required.'
                });
                return;
            }
            const { inquiry, dossier, elegbaPushback, auditReceipt, text } = req.body;
            if (text && typeof text === 'string') {
                const channel = process.env.TELEGRAM_Y3K_CHANNEL_ID || '@y3K_channel';
                const result = await telegram_1.telegramService.sendMessage(channel, text, { parseMode: 'HTML' });
                res.json({ success: result.success, result });
                return;
            }
            if (!inquiry || !dossier) {
                res.status(400).json({ error: 'Missing "inquiry" or "dossier" in request body' });
                return;
            }
            const payload = {
                inquiry,
                dossier,
                elegbaPushback,
                auditReceipt
            };
            const result = await telegram_1.telegramService.broadcastCouncilDeliberation(payload);
            res.json({ success: result.success, result });
        }
        catch (err) {
            console.error('[API /api/v1/telegram/broadcast] Error:', err);
            res.status(500).json({ error: err.message || 'Telegram broadcast failed' });
        }
    });
    // Telegram Incoming Webhook Handler
    app.post('/api/v1/telegram/webhook', async (req, res) => {
        try {
            // 1. Verify Webhook Secret Token header if secret is configured
            const secretHeader = req.headers['x-telegram-bot-api-secret-token'];
            const secretConfigured = Boolean(process.env.TELEGRAM_WEBHOOK_SECRET) &&
                !process.env.TELEGRAM_WEBHOOK_SECRET?.includes('your_secure_webhook_secret_here');
            if (secretConfigured && !telegram_1.telegramService.verifyWebhook(secretHeader)) {
                console.warn('[TelegramWebhook] Rejected update: invalid secret token header.');
                res.status(403).json({ error: 'Forbidden: Invalid secret token' });
                return;
            }
            const update = req.body;
            const message = update?.message;
            if (!message || !message.text) {
                res.status(200).json({ ok: true });
                return;
            }
            const text = message.text.trim();
            const senderId = message.from?.id;
            const chatId = message.chat?.id;
            if (text === '/ping') {
                await telegram_1.telegramService.sendMessage(chatId, '🏓 <b>Pong!</b> AyoCouncil y3K Bot is online.', {
                    parseMode: 'HTML'
                });
                res.status(200).json({ ok: true });
                return;
            }
            if (text === '/status') {
                const status = telegram_1.telegramService.getStatus();
                const reply = `🏛 <b>AyoCouncil // y3K Telegram Status</b>\n• <b>Configured:</b> ${status.configured}\n• <b>Target Channel:</b> <code>${status.channelId || 'None'}</code>\n• <b>Authorized Admins:</b> ${status.adminCount}\n• <b>Zero-Retention:</b> Active (RAM-only)`;
                await telegram_1.telegramService.sendMessage(chatId, reply, { parseMode: 'HTML' });
                res.status(200).json({ ok: true });
                return;
            }
            if (text.startsWith('/broadcast')) {
                // Enforce Admin Verification Gate
                const isAuthorized = telegram_1.telegramService.verifyAdmin(senderId);
                if (!isAuthorized) {
                    await telegram_1.telegramService.sendMessage(chatId, `⛔ <b>ACCESS DENIED</b>\nUser ID <code>${senderId}</code> is not authorized to trigger broadcasts to the y3K channel.`, { parseMode: 'HTML' });
                    res.status(200).json({ ok: true, error: 'Unauthorized user' });
                    return;
                }
                const broadcastContent = text.replace('/broadcast', '').trim();
                if (!broadcastContent) {
                    await telegram_1.telegramService.sendMessage(chatId, '⚠️ <i>Usage:</i> <code>/broadcast &lt;message&gt;</code>', { parseMode: 'HTML' });
                    res.status(200).json({ ok: true });
                    return;
                }
                const channel = process.env.TELEGRAM_Y3K_CHANNEL_ID || '@y3K_channel';
                const result = await telegram_1.telegramService.sendMessage(channel, broadcastContent, {
                    parseMode: 'HTML'
                });
                await telegram_1.telegramService.sendMessage(chatId, result.success
                    ? `✅ Broadcast successfully dispatched to ${channel} (Message ID: ${result.messageId || 'simulated'}).`
                    : `❌ Broadcast failed: ${result.error}`, { parseMode: 'HTML' });
                res.status(200).json({ ok: true, result });
                return;
            }
            res.status(200).json({ ok: true });
        }
        catch (err) {
            console.error('[API /api/v1/telegram/webhook] Error:', err);
            res.status(200).json({ ok: false, error: err.message });
        }
    });
    // Single-Domain Production Static Serving: client/dist
    const possibleDistPaths = [
        path_1.default.resolve(process.cwd(), 'client/dist'),
        path_1.default.resolve(__dirname, '../client/dist'),
        path_1.default.resolve(__dirname, '../../client/dist')
    ];
    const clientDist = possibleDistPaths.find((p) => fs_1.default.existsSync(p));
    if (clientDist) {
        console.log(`[Server] Serving static client SPA from ${clientDist}`);
        app.use(express_1.default.static(clientDist));
        app.use((req, res, next) => {
            if (req.method === 'GET' && !req.path.startsWith('/api') && req.path !== '/health') {
                return res.sendFile(path_1.default.join(clientDist, 'index.html'));
            }
            next();
        });
    }
    else {
        console.log('[Server] client/dist not detected; running in API/WebSocket mode.');
    }
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
                    else if (parsed.type === 'purge_session') {
                        const purgeResult = pipeline.purgeVolatileMemory();
                        broadcastWebSocket({
                            type: 'session_purged',
                            timestamp: purgeResult.timestamp,
                            memoryBytesCleared: purgeResult.memoryBytesCleared
                        });
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
    return { server, app, wss, pipeline, liveClient, telegramService: telegram_1.telegramService, port };
}
