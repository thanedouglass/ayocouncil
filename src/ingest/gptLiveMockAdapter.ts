import { EventEmitter } from 'events';

/**
 * Transcript chunk emitted during simulated GPT-Live-1 streaming audio ingestion.
 */
export interface TranscriptChunk {
  chunkIndex: number;
  textDelta: string;
  isFinal: boolean;
  timestamp: number;
  normalizedSoFar: string;
}

/**
 * Pacing ceiling enforcement result (anti-dopaminergic conversational boundary).
 */
export interface PacingCeilingResult {
  valid: boolean;
  sentenceCount: number;
  maxSentencesAllowed: number;
  normalizedText: string;
  truncatedText?: string;
  reason?: string;
}

export interface StreamOptions {
  chunkIntervalMs?: number;
  wordsPerChunk?: number;
  maxSentences?: number;
}

/**
 * Strips zero-width code points (e.g. U+200B..U+200D, U+FEFF) and normalizes unicode via NFKC.
 */
export function normalizeIngressText(raw: string): string {
  if (!raw) return '';
  // Unicode NFKC normalization
  const normalized = raw.normalize('NFKC');
  // Strip zero-width spaces, soft hyphens, and byte order marks
  return normalized
    .replace(/[\u200B-\u200D\uFEFF\u00AD\u2060]/g, '')
    .trim();
}

/**
 * Counts logical sentences based on terminal punctuation and line breaks.
 */
export function countSentences(text: string): number {
  const clean = normalizeIngressText(text);
  if (!clean) return 0;
  // Match sentence boundary delimiters (. ! ? and newlines)
  const segments = clean
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return segments.length;
}

/**
 * Enforces the strict pacing ceiling (<= 2 sentences per conversational turn).
 */
export function enforcePacingCeiling(text: string, maxSentences: number = 2): PacingCeilingResult {
  const normalized = normalizeIngressText(text);
  const segments = normalized
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const sentenceCount = segments.length;
  if (sentenceCount <= maxSentences) {
    return {
      valid: true,
      sentenceCount,
      maxSentencesAllowed: maxSentences,
      normalizedText: normalized
    };
  }

  const truncated = segments.slice(0, maxSentences).join(' ');
  return {
    valid: false,
    sentenceCount,
    maxSentencesAllowed: maxSentences,
    normalizedText: normalized,
    truncatedText: truncated,
    reason: `Pacing ceiling exceeded: input contains ${sentenceCount} sentences (maximum allowed: ${maxSentences}).`
  };
}

/**
 * Mock adapter for OpenAI GPT-Live-1 real-time voice and transcript streaming.
 * Provides realistic AsyncIterable chunk streaming with zero external network or API key dependencies.
 */
export class GptLiveMockAdapter extends EventEmitter {
  private active: boolean = false;

  constructor() {
    super();
  }

  /**
   * Simulates an incoming GPT-Live-1 audio transcript stream emitting word-level or chunk-level deltas.
   */
  async *streamTranscript(
    fullText: string,
    options: StreamOptions = {}
  ): AsyncGenerator<TranscriptChunk, void, unknown> {
    const chunkIntervalMs = options.chunkIntervalMs ?? 20;
    const wordsPerChunk = options.wordsPerChunk ?? 2;
    const normalized = normalizeIngressText(fullText);
    const words = normalized.split(/\s+/).filter(Boolean);

    this.active = true;
    this.emit('stream:start', { totalWords: words.length, rawLength: fullText.length });

    let chunkIndex = 0;
    let accumulated = '';

    for (let i = 0; i < words.length; i += wordsPerChunk) {
      if (!this.active) break;

      const slice = words.slice(i, i + wordsPerChunk);
      const delta = (i === 0 ? '' : ' ') + slice.join(' ');
      accumulated += delta;

      const isFinal = i + wordsPerChunk >= words.length;
      const chunk: TranscriptChunk = {
        chunkIndex: chunkIndex++,
        textDelta: delta,
        isFinal,
        timestamp: Date.now(),
        normalizedSoFar: accumulated.trim()
      };

      this.emit('stream:chunk', chunk);
      yield chunk;

      if (!isFinal && chunkIntervalMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, chunkIntervalMs));
      }
    }

    this.emit('stream:end', {
      finalText: accumulated.trim(),
      totalChunks: chunkIndex,
      pacing: enforcePacingCeiling(accumulated.trim(), options.maxSentences ?? 2)
    });
    this.active = false;
  }

  /**
   * Instantly normalizes and processes a static string input without time delays.
   */
  processInstant(text: string, maxSentences: number = 2): {
    normalizedText: string;
    pacing: PacingCeilingResult;
    timestamp: number;
  } {
    const normalizedText = normalizeIngressText(text);
    const pacing = enforcePacingCeiling(normalizedText, maxSentences);
    return {
      normalizedText,
      pacing,
      timestamp: Date.now()
    };
  }

  /**
   * Halts any active streaming simulation immediately.
   */
  stop(): void {
    this.active = false;
    this.emit('stream:abort');
  }
}
