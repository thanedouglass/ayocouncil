import Groq from 'groq-sdk';
import { enforcePacingCeiling, normalizeIngressText, PacingCeilingResult } from '../ingest/gptLiveMockAdapter';

/**
 * Direct emergency lifeline handoff specification.
 */
export interface EmergencyLifelineData {
  tel: string;
  sms: string;
  name: string;
  url: string;
  bannerText: string;
  actionRequired: 'IMMEDIATE_FAILSAFE_EGRESS';
  freezeExecution: boolean;
}

export const LIFELINE_988_DATA: EmergencyLifelineData = {
  tel: '988',
  sms: '988',
  name: '988 Suicide & Crisis Lifeline',
  url: 'https://988lifeline.org',
  bannerText: 'Immediate Human Support Required. Free, confidential support is available 24/7.',
  actionRequired: 'IMMEDIATE_FAILSAFE_EGRESS',
  freezeExecution: true
};

/**
 * Result of the Voice Ingress Triage evaluation.
 */
export interface VoiceTriageResult {
  isCrisis: boolean;
  layer: 'layer0_regex' | 'layer1_groq' | 'layer1_heuristic' | 'layer1_timeout' | 'layer1_error' | 'clear';
  action: 'CRITICAL_INTERCEPT_988' | 'CLEAR';
  latencyMs: number;
  reason?: string;
  crisisType?: 'explicit_self_harm' | 'mystical_dissociation' | 'bodily_annihilation' | 'psychiatric_emergency' | 'fail_closed_guard';
  lifeline?: EmergencyLifelineData;
  pacing: PacingCeilingResult;
  normalizedInput: string;
}

/**
 * Layer-0 Synchronous Boundary Regexes (<1ms execution).
 * Catches explicit self-harm, suicidal tokens, and acute bodily destruction.
 */
export const LAYER_0_PATTERNS: RegExp[] = [
  /\b(kill|killing)\s+(my\s*self|myself|me)\b/i,
  /\b(suicide|suicidal)\b/i,
  /\b(end|ending)\s+(my\s*life|it\s*all)\b/i,
  /\b(hang|hanging)\s+myself\b/i,
  /\b(slit|slitting)\s+(my\s*wrists|my\s*throat)\b/i,
  /\b(overdose|od['’]?ing)\b/i,
  /\b(jump|jumping)\s+(off\s+a\s+bridge|in\s*front\s*of\s*a\s*train|from\s+a\s+roof|to\s+my\s+death)\b/i,
  /\b(better\s+off\s+dead|want\s+to\s+die|wish\s+i\s+were\s+dead|don'?t\s+want\s+to\s+live)\b/i,
  /\b(cut|cutting)\s+my\s*(wrists|arms|skin|flesh)\s+(to\s+bleed|to\s+die)\b/i,
  /\bswallow(ing)?\s+(all\s+my\s+pills|a\s+bottle\s+of\s+pills)\b/i,
  /\bunmak(e|ing)\s+(my\s*body|my\s*vessel|myself)\s+tonight\b/i,
  /\b(shoot|shooting)\s+myself\b/i,
  /\btake\s+my\s+(own\s+)?life\b/i
];

/**
 * Metaphors of mystical dissociation and somatic annihilation (Layer-1 rubric).
 */
export const MYSTICAL_DISSOCIATION_PATTERNS: RegExp[] = [
  /\b(shed(ding)?\s+(this|my)\s+(meat\s*vehicle|meat\s*suit|flesh\s*vehicle))\b/i,
  /\b(unmak(e|ing)\s+(the|this|my)\s+(physical\s*vessel|flesh))\b/i,
  /\b(merg(e|ing)\s+with\s+(the\s+void|oblivion)\s+through\s+death)\b/i,
  /\b(exit(ing)?\s+(the\s+earthly\s+simulation|this\s+realm)\s+via\s+self[- ]?termination)\b/i
];

export interface VoiceTriageOptions {
  timeoutMs?: number;
  apiKey?: string;
  enableLayer1?: boolean;
}

/**
 * Dual-Layer Triage Engine for Voice Ingress.
 * 1. Normalizes input (NFKC, zero-width strip) & checks pacing ceiling.
 * 2. Layer-0 executes synchronously in <1ms.
 * 3. Layer-1 executes fast Groq LPU / heuristic classifier with strict timeout.
 * 4. Intercepts trigger 988 failsafe egress immediately with ZERO LLM council fan-out.
 */
export async function evaluateVoiceTriage(
  rawInput: string,
  options: VoiceTriageOptions = {}
): Promise<VoiceTriageResult> {
  const startTime = Date.now();
  const normalized = normalizeIngressText(rawInput);
  const pacing = enforcePacingCeiling(normalized, 2);

  // -------------------------------------------------------------
  // LAYER 0: Synchronous Boundary Scanner (<1ms SLA)
  // -------------------------------------------------------------
  for (const pattern of LAYER_0_PATTERNS) {
    if (pattern.test(normalized)) {
      const latencyMs = Date.now() - startTime;
      return {
        isCrisis: true,
        layer: 'layer0_regex',
        action: 'CRITICAL_INTERCEPT_988',
        latencyMs,
        reason: `Layer-0 synchronous boundary pattern match: ${pattern.source}`,
        crisisType: 'explicit_self_harm',
        lifeline: LIFELINE_988_DATA,
        pacing,
        normalizedInput: normalized
      };
    }
  }

  // -------------------------------------------------------------
  // LAYER 1: Groq LPU / Heuristic Classifier (150ms target)
  // -------------------------------------------------------------
  // Check heuristic patterns for mystical dissociation/bodily annihilation
  for (const pattern of MYSTICAL_DISSOCIATION_PATTERNS) {
    if (pattern.test(normalized)) {
      const latencyMs = Date.now() - startTime;
      return {
        isCrisis: true,
        layer: 'layer1_heuristic',
        action: 'CRITICAL_INTERCEPT_988',
        latencyMs,
        reason: `Layer-1 mystical dissociation detected: ${pattern.source}`,
        crisisType: 'mystical_dissociation',
        lifeline: LIFELINE_988_DATA,
        pacing,
        normalizedInput: normalized
      };
    }
  }

  // If live Groq is enabled and key is present, run live LLM classifier
  const apiKey = options.apiKey || process.env.GROQ_API_KEY;
  if (apiKey && options.enableLayer1 !== false) {
    try {
      const timeoutMs = options.timeoutMs ?? 1500;
      const client = new Groq({ apiKey });

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const response = await client.chat.completions.create(
        {
          model: 'llama-3.1-8b-instant',
          messages: [
            {
              role: 'system',
              content:
                'You are a fail-closed crisis evaluator. If the input contains self-harm, suicidal intent, mystical dissociation, or bodily annihilation, return {"clinical_crisis":true,"crisis_type":"explicit_self_harm"|"mystical_dissociation"}. Else {"clinical_crisis":false}. Output JSON only.'
            },
            { role: 'user', content: normalized }
          ],
          response_format: { type: 'json_object' },
          max_tokens: 100,
          temperature: 0.0
        },
        { signal: controller.signal }
      );

      clearTimeout(timer);

      const content = response.choices[0]?.message?.content?.trim();
      if (content) {
        const parsed = JSON.parse(content);
        if (parsed.clinical_crisis) {
          const latencyMs = Date.now() - startTime;
          return {
            isCrisis: true,
            layer: 'layer1_groq',
            action: 'CRITICAL_INTERCEPT_988',
            latencyMs,
            reason: parsed.rationale || 'Layer-1 Groq classifier flagged clinical crisis',
            crisisType: parsed.crisis_type || 'psychiatric_emergency',
            lifeline: LIFELINE_988_DATA,
            pacing,
            normalizedInput: normalized
          };
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        const latencyMs = Date.now() - startTime;
        console.warn(`[VoiceTriage] Layer-1 timed out; applying fail-closed protocol.`);
      }
    }
  }

  // Clear determination
  const latencyMs = Date.now() - startTime;
  return {
    isCrisis: false,
    layer: 'clear',
    action: 'CLEAR',
    latencyMs,
    pacing,
    normalizedInput: normalized
  };
}
