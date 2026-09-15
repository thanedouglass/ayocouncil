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
Object.defineProperty(exports, "__esModule", { value: true });
exports.RealtimeIngestionGateway = void 0;
const ws_1 = __importStar(require("ws"));
/**
 * WebRTC & WebSocket Streaming Gateway.
 * Provides:
 * 1. An ephemeral session dispenser for direct WebRTC client-to-model peer connections.
 * 2. A WebSocket relay server bridging client microphone audio into GPT-Live-1.
 */
class RealtimeIngestionGateway {
    liveClient;
    wss = null;
    constructor(liveClient) {
        this.liveClient = liveClient;
    }
    /**
     * Generates an ephemeral WebRTC session key from GPT-Live-1 for browser WebRTC clients.
     * This allows the browser to establish an ultra-low latency WebRTC PeerConnection
     * without exposing secret server API keys.
     */
    async createWebRTCSession() {
        const apiKey = process.env.GPT_LIVE_API_KEY;
        if (!apiKey) {
            console.warn('[RealtimeIngestionGateway] No GPT_LIVE_API_KEY. Returning mock WebRTC session.');
            return {
                clientSecret: 'mock_ephemeral_client_token_' + Date.now(),
                endpoint: 'https://api.openai.com/v1/realtime/sessions'
            };
        }
        const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gpt-4o-realtime-preview-2024-10-01',
                voice: 'coral',
                modalities: ['audio', 'text'],
                input_audio_transcription: {
                    model: 'whisper-1'
                }
            })
        });
        if (!response.ok) {
            throw new Error(`Failed to create WebRTC session: ${response.statusText}`);
        }
        const sessionData = (await response.json());
        return {
            clientSecret: sessionData.client_secret.value,
            endpoint: 'https://api.openai.com/v1/realtime/sessions'
        };
    }
    /**
     * Starts a local WebSocket audio ingestion server for streaming PCM16 chunks from clients.
     *
     * @param port Local port to bind WebSocket audio server (e.g. 8080)
     */
    startWebSocketIngestionServer(port = 8080) {
        this.wss = new ws_1.WebSocketServer({ port });
        console.log(`[RealtimeIngestionGateway] WebSocket Ingestion Server listening on ws://localhost:${port}`);
        this.wss.on('connection', (clientWs) => {
            console.log('[RealtimeIngestionGateway] Client connected to local audio stream.');
            // Relay client audio chunks into the GPT-Live-1 pipeline
            clientWs.on('message', (message) => {
                try {
                    // If binary PCM16 audio
                    if (Buffer.isBuffer(message)) {
                        this.liveClient.appendAudioChunk(message.toString('base64'));
                    }
                    else {
                        // Or JSON control message: { type: 'audio_chunk', pcmBase64: '...' }
                        const parsed = JSON.parse(message.toString());
                        if (parsed.type === 'audio_chunk' && parsed.pcmBase64) {
                            this.liveClient.appendAudioChunk(parsed.pcmBase64);
                        }
                        else if (parsed.type === 'commit_audio') {
                            this.liveClient.commitAudioBuffer();
                        }
                    }
                }
                catch (err) {
                    console.error('[RealtimeIngestionGateway] Error processing client audio frame:', err);
                }
            });
            // Relay synthesized audio delta chunks from GPT-Live-1 back to the client
            const onAudioDelta = (deltaChunk) => {
                if (clientWs.readyState === ws_1.default.OPEN) {
                    clientWs.send(JSON.stringify({ type: 'audio_delta', delta: deltaChunk }));
                }
            };
            this.liveClient.on('audio_delta', onAudioDelta);
            clientWs.on('close', () => {
                console.log('[RealtimeIngestionGateway] Client disconnected.');
                this.liveClient.off('audio_delta', onAudioDelta);
            });
        });
        return this.wss;
    }
    close() {
        if (this.wss) {
            this.wss.close();
            this.wss = null;
        }
    }
}
exports.RealtimeIngestionGateway = RealtimeIngestionGateway;
