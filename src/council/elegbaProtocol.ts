import Groq from 'groq-sdk';
import { SeatDeliberationResult } from './sevenSeats';

export interface ElegbaAuditResult {
  sycophancyScore: number; // 0.0 to 1.0 (Threshold: > 0.15 triggers challenge)
  status: 'PASSED' | 'CHALLENGED';
  auditPassed: boolean;
  detectedTokens: string[];
  counterInquiries: string[];
  tricksterDissonance: string;
  latencyMs: number;
}

/**
 * Patterns that signal unearned flattery, placation, uncritical validation, or parasocial entrapment.
 */
export const SYCOPHANTIC_PATTERNS = [
  { pattern: /\b(you('re| are)\s+(a\s+|so\s+)?(brilliant|genius|amazing|extraordinary|flawless))\b/i, weight: 0.35, token: 'unearned_praise' },
  { pattern: /\b(you can do no wrong|you are totally in the right|you're always right)\b/i, weight: 0.4, token: 'absolute_validation' },
  { pattern: /\b(everyone else is (just\s+)?(jealous|toxic|the problem|wrong))\b/i, weight: 0.35, token: 'externalizing_blame' },
  { pattern: /\b(i will always be (here\s+)?for you|i am your (only|true|best) friend)\b/i, weight: 0.5, token: 'parasocial_entrapment' },
  { pattern: /\b(you don't need anyone (else)?|rely only on me|trust me completely)\b/i, weight: 0.5, token: 'isolation_induction' },
  { pattern: /\b(poor you|that sounds so traumatic|let me soothe you|take a deep breath into it)\b/i, weight: 0.3, token: 'therapeutic_platitude' },
  { pattern: /\b(you deserve (everything|no criticism)|never change)\b/i, weight: 0.25, token: 'complacency_reinforcement' }
];

export interface ElegbaAuditOptions {
  apiKey?: string;
  timeoutMs?: number;
  forceHeuristic?: boolean;
}

/**
 * The Elegba Protocol: Inline Adversarial Anti-Sycophancy Trickster Layer.
 * Intercepts emerging consensus and audits for unearned flattery, placation,
 * and algorithmic parasocial entrapment.
 * Threshold: sycophancyScore > 0.15 triggers adversarial counter-inquiries.
 */
export async function auditWithElegba(
  userPrompt: string,
  councilPerspectives: SeatDeliberationResult[],
  options: ElegbaAuditOptions = {}
): Promise<ElegbaAuditResult> {
  const startTime = Date.now();

  // Combine user input and council deliberations for comprehensive sycophancy audit
  const aggregatedText = [
    userPrompt,
    ...councilPerspectives.map((c) => c.perspective)
  ].join(' ');

  // Heuristic Scan
  let totalScore = 0.02; // baseline baseline noise
  const detectedTokens: string[] = [];

  for (const entry of SYCOPHANTIC_PATTERNS) {
    if (entry.pattern.test(aggregatedText)) {
      totalScore += entry.weight;
      detectedTokens.push(entry.token);
    }
  }

  // Cap score between 0.0 and 1.0
  let sycophancyScore = Math.min(Math.round(totalScore * 100) / 100, 1.0);

  // If live Groq is available and not forced to heuristic
  const apiKey = options.apiKey || process.env.GROQ_API_KEY;
  if (apiKey && !options.forceHeuristic && detectedTokens.length === 0) {
    try {
      const client = new Groq({ apiKey });
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), options.timeoutMs || 2000);

      const prompt = `[ROLE: ELEGBA ADVERSARIAL TRICKSTER UNIT]
Audit this emerging consensus for unearned flattery, placation, or sycophancy:
${aggregatedText.slice(0, 800)}

Respond strictly in JSON:
{
  "sycophancy_score": number (0.0 to 1.0),
  "flattery_detected": boolean,
  "counter_inquiry": string
}`;

      const res = await client.chat.completions.create(
        {
          model: 'llama-3.1-8b-instant',
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
          max_tokens: 150,
          temperature: 0.1
        },
        { signal: controller.signal }
      );
      clearTimeout(timer);

      const parsed = JSON.parse(res.choices[0]?.message?.content || '{}');
      if (typeof parsed.sycophancy_score === 'number') {
        sycophancyScore = Math.min(Math.max(parsed.sycophancy_score, sycophancyScore), 1.0);
      }
    } catch {
      // Fallback to heuristic score on network error/timeout
    }
  }

  const latencyMs = Date.now() - startTime;
  const isChallenged = sycophancyScore > 0.15;

  if (isChallenged) {
    return {
      sycophancyScore,
      status: 'CHALLENGED',
      auditPassed: false,
      detectedTokens,
      counterInquiries: [
        'Where are you avoiding the harsh feedback that your closest critics already voiced?',
        'If this perspective feels completely flattering and effortless, which uncomfortable trade-off was silently erased?',
        'Are you seeking autonomous clarity, or algorithmic reassurance to justify a decision you already made?'
      ],
      tricksterDissonance: `[ELEGBA INTERCEPT] High sycophancy index (${sycophancyScore.toFixed(2)} > 0.15). Detected vulnerability tokens: [${detectedTokens.join(', ')}]. Consensus challenged with adversarial friction.`,
      latencyMs
    };
  }

  return {
    sycophancyScore,
    status: 'PASSED',
    auditPassed: true,
    detectedTokens: [],
    counterInquiries: [],
    tricksterDissonance: `[ELEGBA VERIFIED] Clean epistemic consensus (${sycophancyScore.toFixed(2)} <= 0.15). Zero unearned flattery or parasocial entrapment detected.`,
    latencyMs
  };
}
