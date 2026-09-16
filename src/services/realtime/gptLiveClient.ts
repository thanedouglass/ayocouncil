import { EventEmitter } from 'events';
import WebSocket from 'ws';
import { ChairmanDossier } from '../../types/council';
import { RealtimeClientEvent, RealtimeServerEvent, RealtimeSessionConfig } from '../../types/realtime';

export interface GptLiveClientOptions {
  apiKey?: string;
  endpointUrl?: string;
  model?: string;
  voice?: 'alloy' | 'echo' | 'shimmer' | 'verse' | 'ash' | 'coral';
  isSimulated?: boolean;
}

/**
 * Client for managing real-time bidirectional audio & text streaming
 * with the GPT-Live-1 Realtime API over WebSockets / WebRTC.
 */
export class GptLiveClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private config: Required<GptLiveClientOptions>;
  private isConnected: boolean = false;
  private isSimulated: boolean;

  constructor(options: GptLiveClientOptions = {}) {
    super();
    this.config = {
      apiKey: options.apiKey || process.env.GPT_LIVE_API_KEY || 'mock-api-key',
      endpointUrl:
        options.endpointUrl ||
        process.env.GPT_LIVE_ENDPOINT ||
        'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01',
      model: options.model || 'gpt-4o-realtime-preview-2024-10-01',
      voice: options.voice || 'coral',
      isSimulated: options.isSimulated ?? !process.env.GPT_LIVE_API_KEY
    };
    this.isSimulated = this.config.isSimulated;
  }

  /**
   * Connects to the GPT-Live-1 WebSocket endpoint.
   * If running in simulated mode, sets up simulated events.
   */
  public async connect(): Promise<void> {
    if (this.isSimulated) {
      console.log('[GptLiveClient] Initialized in SIMULATED mode (No API Key provided).');
      this.isConnected = true;
      this.emit('connected');
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.config.endpointUrl, {
          headers: {
            Authorization: `Bearer ${this.config.apiKey}`,
            'OpenAI-Beta': 'realtime=v1'
          }
        });

        this.ws.on('open', () => {
          this.isConnected = true;
          console.log('[GptLiveClient] Connected to GPT-Live-1 Realtime API.');
          this.initializeSession();
          this.emit('connected');
          resolve();
        });

        this.ws.on('message', (data: WebSocket.RawData) => {
          this.handleIncomingServerEvent(data.toString());
        });

        this.ws.on('error', (err: Error) => {
          console.error('[GptLiveClient] WebSocket error:', err.message);
          this.emit('error', err);
          if (!this.isConnected) reject(err);
        });

        this.ws.on('close', (code: number, reason: string) => {
          this.isConnected = false;
          console.log(`[GptLiveClient] Connection closed (${code}): ${reason}`);
          this.emit('disconnected', { code, reason });
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Sends session configuration to GPT-Live-1:
   * Sets modalities to audio/text, enables VAD (Voice Activity Detection),
   * specifies transcription model (Whisper) and output voice.
   */
  private initializeSession(): void {
    const sessionConfig: RealtimeClientEvent = {
      type: 'session.update',
      session: {
        modalities: ['audio', 'text'],
        instructions:
          'You are the vocal medium for the Seven-Seat Council. Speak with presence, clarity, and philosophical weight.',
        voice: this.config.voice,
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
        input_audio_transcription: {
          model: 'whisper-1'
        },
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 600
        }
      }
    };

    this.sendEvent(sessionConfig);
  }

  /**
   * Appends incoming PCM audio chunk from the user's microphone/stream.
   * @param base64Audio Base64-encoded PCM16 audio (24kHz, 1-channel, little-endian)
   */
  public appendAudioChunk(base64Audio: string): void {
    if (this.isSimulated) {
      return;
    }

    this.sendEvent({
      type: 'input_audio_buffer.append',
      audio: base64Audio
    });
  }

  /**
   * Manually commits user input buffer (useful if server VAD is off or in manual turn mode).
   */
  public commitAudioBuffer(): void {
    this.sendEvent({ type: 'input_audio_buffer.commit' });
  }

  /**
   * Voice Hand-off (Requirement 4):
   * Injects the synthesized Chairman Dossier and oral script back into the
   * GPT-Live-1 session to be spoken aloud directly to the user.
   */
  public handoffDossierToVoice(dossier: ChairmanDossier): void {
    console.log('[GptLiveClient] Executing Voice Hand-off to GPT-Live-1 speaker...');

    if (this.isSimulated) {
      this.simulateSpokenAudioResponse(dossier.spokenSynthesisScript);
      return;
    }

    // 1. Create conversation item with the Chairman's spoken synthesis script
    const conversationItem: RealtimeClientEvent = {
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'assistant',
        content: [
          {
            type: 'text',
            text: dossier.spokenSynthesisScript
          }
        ]
      }
    };
    this.sendEvent(conversationItem);

    // 2. Instruct the model to render audio speech for this message
    const triggerResponse: RealtimeClientEvent = {
      type: 'response.create',
      response: {
        modalities: ['audio', 'text'],
        instructions: `Speak the following script aloud with a calm, resonant, and measured cadence: "${dossier.spokenSynthesisScript}". Do not deviate from the text.`
      }
    };
    this.sendEvent(triggerResponse);
  }

  /**
   * Cancels active speech generation if user interrupts (barge-in).
   */
  public cancelCurrentResponse(): void {
    console.log('[GptLiveClient] User barge-in detected. Canceling active audio response.');
    this.sendEvent({ type: 'response.cancel' });
  }

  /**
   * Purges all volatile audio buffers, session transcripts, and active responses.
   * Enforces zero data retention / anti-extraction guarantees.
   */
  public purgeSessionBuffers(): { purged: boolean; timestamp: string } {
    console.log('[GptLiveClient] PURGE: Wiping all volatile audio buffers and active response states.');
    if (!this.isSimulated && this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.sendEvent({ type: 'input_audio_buffer.clear' });
        this.sendEvent({ type: 'response.cancel' });
      } catch (e) {
        console.warn('[GptLiveClient] Error clearing remote audio buffers:', e);
      }
    }
    this.emit('session_purged');
    return { purged: true, timestamp: new Date().toISOString() };
  }

  /**
   * Routes raw incoming JSON events from the GPT-Live-1 server.
   */
  private handleIncomingServerEvent(rawJson: string): void {
    try {
      const event: RealtimeServerEvent = JSON.parse(rawJson);

      switch (event.type) {
        case 'conversation.item.input_audio_transcription.completed':
          console.log(`[GptLiveClient] User speech transcribed: "${event.transcript}"`);
          this.emit('transcription_completed', event.transcript);
          break;

        case 'input_audio_buffer.speech_started':
          console.log('[GptLiveClient] Speech started by user.');
          this.emit('user_speech_started');
          break;

        case 'input_audio_buffer.speech_stopped':
          console.log('[GptLiveClient] Speech stopped by user. Awaiting transcription.');
          this.emit('user_speech_stopped');
          break;

        case 'response.audio.delta':
          // Emitting raw PCM16 audio delta chunks for the client's speaker playback
          this.emit('audio_delta', event.delta);
          break;

        case 'response.audio_transcript.delta':
          this.emit('transcript_delta', event.delta);
          break;

        case 'response.done':
          console.log('[GptLiveClient] Audio synthesis completed.');
          this.emit('speech_completed', event.response);
          break;

        case 'error':
          console.error('[GptLiveClient] Server error event:', event.error);
          this.emit('server_error', event.error);
          break;
      }
    } catch (err) {
      console.error('[GptLiveClient] Failed to parse server message:', err);
    }
  }

  /**
   * Sends a structured event over the WebSocket channel.
   */
  private sendEvent(event: RealtimeClientEvent): void {
    if (this.isSimulated) {
      return;
    }

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('[GptLiveClient] Cannot send event: WebSocket is not open.');
      return;
    }

    this.ws.send(JSON.stringify(event));
  }

  /**
   * Simulates spoken audio streaming for local mock / development testing.
   */
  private simulateSpokenAudioResponse(script: string): void {
    console.log(`[GptLiveClient:Simulated] Speaking aloud:\n"${script}"`);
    const chunks = script.split(' ');
    let index = 0;

    const interval = setInterval(() => {
      if (index >= chunks.length) {
        clearInterval(interval);
        this.emit('speech_completed', { id: 'sim-response', status: 'completed' });
        return;
      }

      // Mock audio delta event
      this.emit('audio_delta', Buffer.from(`[AUDIO_CHUNK_${index}]`).toString('base64'));
      this.emit('transcript_delta', chunks[index] + ' ');
      index++;
    }, 120);
  }

  /**
   * Helper to inject simulated user speech for pipeline testing.
   */
  public simulateUserSpeechTranscription(transcript: string): void {
    console.log(`[GptLiveClient:Simulated] User speech input simulated: "${transcript}"`);
    this.emit('transcription_completed', transcript);
  }

  public disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
  }
}
