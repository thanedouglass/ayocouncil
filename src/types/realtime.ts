/**
 * Types representing the GPT-Live-1 Real-Time WebSocket and Audio Event Protocol.
 */

export interface RealtimeSessionConfig {
  apiKey: string;
  endpointUrl: string;
  model: string;
  voice: 'alloy' | 'echo' | 'shimmer' | 'verse' | 'ash' | 'coral';
  temperature?: number;
  inputAudioFormat?: 'pcm16' | 'g711_ulaw' | 'g711_alaw';
  outputAudioFormat?: 'pcm16' | 'g711_ulaw' | 'g711_alaw';
}

export type RealtimeClientEvent =
  | {
      type: 'session.update';
      session: {
        modalities?: ('text' | 'audio')[];
        instructions?: string;
        voice?: string;
        input_audio_format?: string;
        output_audio_format?: string;
        input_audio_transcription?: {
          model: string;
        };
        turn_detection?: {
          type: 'server_vad';
          threshold?: number;
          prefix_padding_ms?: number;
          silence_duration_ms?: number;
        } | null;
      };
    }
  | {
      type: 'input_audio_buffer.append';
      audio: string; // Base64 encoded audio
    }
  | {
      type: 'input_audio_buffer.commit';
    }
  | {
      type: 'input_audio_buffer.clear';
    }
  | {
      type: 'conversation.item.create';
      item: {
        type: 'message';
        role: 'user' | 'assistant' | 'system';
        content: Array<{
          type: 'input_text' | 'input_audio' | 'text';
          text?: string;
          audio?: string;
        }>;
      };
    }
  | {
      type: 'response.create';
      response?: {
        modalities?: ('text' | 'audio')[];
        instructions?: string;
      };
    }
  | {
      type: 'response.cancel';
    };

export type RealtimeServerEvent =
  | {
      type: 'session.created' | 'session.updated';
      session: Record<string, unknown>;
    }
  | {
      type: 'input_audio_buffer.speech_started';
      audio_start_ms: number;
      item_id: string;
    }
  | {
      type: 'input_audio_buffer.speech_stopped';
      audio_end_ms: number;
      item_id: string;
    }
  | {
      type: 'conversation.item.input_audio_transcription.completed';
      item_id: string;
      transcript: string;
    }
  | {
      type: 'response.audio.delta';
      response_id: string;
      delta: string; // Base64 audio chunk
    }
  | {
      type: 'response.audio_transcript.delta';
      response_id: string;
      delta: string;
    }
  | {
      type: 'response.done';
      response: {
        id: string;
        status: 'completed' | 'cancelled' | 'failed';
        output: unknown[];
      };
    }
  | {
      type: 'error';
      error: {
        type: string;
        code: string;
        message: string;
      };
    };
