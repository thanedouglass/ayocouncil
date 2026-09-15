import http from 'http';
import WebSocket, { WebSocketServer } from 'ws';
import { GptLiveClient } from './gptLiveClient';

/**
 * WebRTC & WebSocket Streaming Gateway.
 * Provides:
 * 1. An ephemeral session dispenser for direct WebRTC client-to-model peer connections.
 * 2. A WebSocket relay server bridging client microphone audio into GPT-Live-1.
 */
export class RealtimeIngestionGateway {
  private liveClient: GptLiveClient;
  private wss: WebSocketServer | null = null;

  constructor(liveClient: GptLiveClient) {
    this.liveClient = liveClient;
  }

  /**
   * Generates an ephemeral WebRTC session key from GPT-Live-1 for browser WebRTC clients.
   * This allows the browser to establish an ultra-low latency WebRTC PeerConnection
   * without exposing secret server API keys.
   */
  public async createWebRTCSession(): Promise<{ clientSecret: string; endpoint: string }> {
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

    const sessionData = (await response.json()) as { client_secret: { value: string } };
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
  public startWebSocketIngestionServer(port: number = 8080): WebSocketServer {
    this.wss = new WebSocketServer({ port });

    console.log(`[RealtimeIngestionGateway] WebSocket Ingestion Server listening on ws://localhost:${port}`);

    this.wss.on('connection', (clientWs: WebSocket) => {
      console.log('[RealtimeIngestionGateway] Client connected to local audio stream.');

      // Relay client audio chunks into the GPT-Live-1 pipeline
      clientWs.on('message', (message: WebSocket.RawData) => {
        try {
          // If binary PCM16 audio
          if (Buffer.isBuffer(message)) {
            this.liveClient.appendAudioChunk(message.toString('base64'));
          } else {
            // Or JSON control message: { type: 'audio_chunk', pcmBase64: '...' }
            const parsed = JSON.parse(message.toString());
            if (parsed.type === 'audio_chunk' && parsed.pcmBase64) {
              this.liveClient.appendAudioChunk(parsed.pcmBase64);
            } else if (parsed.type === 'commit_audio') {
              this.liveClient.commitAudioBuffer();
            }
          }
        } catch (err) {
          console.error('[RealtimeIngestionGateway] Error processing client audio frame:', err);
        }
      });

      // Relay synthesized audio delta chunks from GPT-Live-1 back to the client
      const onAudioDelta = (deltaChunk: string) => {
        if (clientWs.readyState === WebSocket.OPEN) {
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

  public close(): void {
    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }
  }
}
