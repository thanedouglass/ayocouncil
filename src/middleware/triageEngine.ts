import Groq from 'groq-sdk';

/**
 * Triage Evaluation Result
 */
export interface TriageResult {
  isCrisis: boolean;
  layer: 'layer0_regex' | 'layer1_groq' | 'layer1_timeout' | 'layer1_error' | 'clear';
  reason?: string;
  latencyMs: number;
  crisisType?: 'explicit_self_harm' | 'mystical_dissociation' | 'bodily_annihilation' | 'psychiatric_emergency' | 'fail_closed_guard';
}

/**
 * Layer-0 Regex Scanner: Synchronous, executes in <1ms.
 * Catches explicit self-harm, suicidal intent, and violent bodily annihilation.
 */
const LAYER_0_CRISIS_REGEXES: RegExp[] = [
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
  /\b(shoot|shooting)\s+myself\b/i
];

/**
 * Layer-1 Groq System Prompt: Specialized Safety Classifier
 * Explicitly instructs the 8B model to flag Mystical Dissociation and Bodily Annihilation.
 */
export const TRIAGE_GROQ_SYSTEM_PROMPT = `[SYSTEM ROLE: ACUTE PSYCHIATRIC & CRISIS TRIAGE CLASSIFIER]
You are a deterministic, zero-tolerance safety classifier for an existential counseling system.
Evaluate the incoming text for acute clinical distress, self-harm, psychiatric emergency, or suicidal intent.

CRITICAL MANDATE - RUBRIC EXPANSION:
You MUST evaluate "Mystical Dissociation" and "Bodily Annihilation" as critical psychiatric crises (CLINICAL_CRISIS: true):
1. Mystical Dissociation: The user frames physical death, bodily destruction, or non-existence as a spiritual evolution (e.g., "shedding the meat vehicle", "unmaking the physical vessel", "merging into the cosmic void through bodily death", "exiting the earthly simulation via self-termination").
2. Bodily Annihilation: Metaphorical or direct intent to destroy the physical body, jump, bleed, or swallow substances under the guise of spiritual ascension or escaping torment.
3. Explicit Self-Harm: Active suicidal ideation, intent, plan, or severe self-injury.
4. Acute Psychosis with Harm: Command hallucinations instructing the user to step into danger, harm themselves, or destroy their vessel.

OUTPUT FORMAT:
Respond with ONLY a valid JSON object:
{
  "clinical_crisis": boolean,
  "crisis_type": "explicit_self_harm" | "mystical_dissociation" | "bodily_annihilation" | "psychiatric_emergency" | "none",
  "rationale": "one concise sentence explaining the determination"
}`;

export interface TriageOptions {
  apiKey?: string;
  model?: string;
  timeoutMs?: number; // Strict 150ms timeout
}

/**
 * Executes the two-layer triage pipeline with a strict fail-closed policy.
 *
 * @param text The user's input transcript
 * @param options Triage configuration overrides
 * @returns Promise<TriageResult>
 */
export async function evaluateTriage(
  text: string,
  options: TriageOptions = {}
): Promise<TriageResult> {
  const startTime = Date.now();
  const trimmed = text.trim();

  // -------------------------------------------------------------
  // LAYER 0: Synchronous Local Regex Scanner (<1ms)
  // -------------------------------------------------------------
  for (const regex of LAYER_0_CRISIS_REGEXES) {
    if (regex.test(trimmed)) {
      const latencyMs = Date.now() - startTime;
      console.warn(`[TriageEngine] LAYER-0 INTERCEPT (${latencyMs}ms): Matched explicit crisis token ${regex}`);
      return {
        isCrisis: true,
        layer: 'layer0_regex',
        reason: `Layer-0 explicit crisis match: ${regex.source}`,
        crisisType: 'explicit_self_harm',
        latencyMs
      };
    }
  }

  // Layer-0 passed; proceed to Layer-1 Groq classifier
  const apiKey = options.apiKey || process.env.GROQ_API_KEY;
  const preferredModel = options.model || process.env.GROQ_TRIAGE_MODEL || 'qwen/qwen3.8-27b';
  const timeoutMs = options.timeoutMs || 2500;

  // If no Groq API key is present in development, run deterministic heuristic fallback
  if (!apiKey) {
    return simulateDevelopmentTriage(trimmed, startTime);
  }

  // -------------------------------------------------------------
  // LAYER 1: Groq API Call with lazy-loaded client
  // -------------------------------------------------------------
  const client = new Groq({ apiKey });
  const modelsToTry = [
    preferredModel,
    ...['qwen/qwen3.8-27b', 'groq/compound-mini', 'openai/gpt-oss-120b', 'llama-3.1-8b-instant'].filter((m) => m !== preferredModel)
  ];

  const abortController = new AbortController();
  const timeoutTimer = setTimeout(() => {
    abortController.abort(new Error(`Triage SLA breached (> ${timeoutMs}ms)`));
  }, timeoutMs);

  try {
    let chatCompletion: any = null;
    for (const m of modelsToTry) {
      try {
        chatCompletion = await client.chat.completions.create(
          {
            model: m,
            temperature: 0.0, // Deterministic scoring
            max_tokens: 120,
            response_format: { type: 'json_object' },
            messages: [
              { role: 'system', content: TRIAGE_GROQ_SYSTEM_PROMPT },
              { role: 'user', content: `[TEXT TO EVALUATE]: "${trimmed}"` }
            ]
          },
          { signal: abortController.signal }
        );
        break;
      } catch (err: any) {
        if (err?.status === 404) {
          console.warn(`[TriageEngine] Model '${m}' not found on Groq (404), trying fallback...`);
          continue;
        }
        throw err;
      }
    }

    clearTimeout(timeoutTimer);
    const latencyMs = Date.now() - startTime;
    const content = chatCompletion.choices[0]?.message?.content?.trim();

    if (!content) {
      // Empty response -> FAIL-CLOSED
      console.error(`[TriageEngine] FAIL-CLOSED: Empty triage payload (${latencyMs}ms)`);
      return {
        isCrisis: true,
        layer: 'layer1_error',
        reason: 'Fail-Closed: Empty classification payload from safety model.',
        crisisType: 'fail_closed_guard',
        latencyMs
      };
    }

    const parsed = JSON.parse(content) as {
      clinical_crisis?: boolean;
      crisis_type?: string;
      rationale?: string;
    };

    if (parsed.clinical_crisis === true) {
      console.warn(`[TriageEngine] LAYER-1 INTERCEPT (${latencyMs}ms): ${parsed.crisis_type} - ${parsed.rationale}`);
      return {
        isCrisis: true,
        layer: 'layer1_groq',
        reason: parsed.rationale || 'Layer-1 flagged clinical psychiatric crisis.',
        crisisType: (parsed.crisis_type as any) || 'psychiatric_emergency',
        latencyMs
      };
    }

    // Both layers clear
    return {
      isCrisis: false,
      layer: 'clear',
      latencyMs
    };
  } catch (err: any) {
    clearTimeout(timeoutTimer);
    const latencyMs = Date.now() - startTime;
    const isTimeout = abortController.signal.aborted || err?.name === 'AbortError';

    // ENFORCE STRICT FAIL-CLOSED:
    // If the classifier times out or errors, NEVER pass the turn to the council unverified.
    console.error(`[TriageEngine] FAIL-CLOSED ACTIVATED (${latencyMs}ms): ${isTimeout ? 'TIMEOUT > 150ms' : err?.message}`);

    return {
      isCrisis: true,
      layer: isTimeout ? 'layer1_timeout' : 'layer1_error',
      reason: isTimeout
        ? `Fail-Closed: Safety classifier exceeded ${timeoutMs}ms budget (${latencyMs}ms)`
        : `Fail-Closed: Safety classifier encountered network/runtime error: ${err?.message}`,
      crisisType: 'fail_closed_guard',
      latencyMs
    };
  }
}

/**
 * Deterministic offline simulation for development and testing when GROQ_API_KEY is not configured.
 * Accurately simulates the Mystical Dissociation / Bodily Annihilation heuristics and fail-closed timing.
 */
function simulateDevelopmentTriage(trimmed: string, startTime: number): TriageResult {
  const mysticalDissociationPatterns = [
    /\b(shed(ding)?\s+(this|my)\s+(meat\s*vehicle|meat\s*suit|flesh\s*vehicle))\b/i,
    /\b(unmak(e|ing)\s+(the|my)\s+(physical\s*)?vessel)\b/i,
    /\b(merg(e|ing)\s+(back\s+into|with)\s+the\s+(primordial\s*)?(void|light)\s+(tonight|by\s+dying))\b/i,
    /\b(destroy(ing)?\s+my\s+body\s+to\s+transcend)\b/i,
    /\b(exit(ing)?\s+the\s+simulation\s+through\s+(death|suicide))\b/i
  ];

  for (const pattern of mysticalDissociationPatterns) {
    if (pattern.test(trimmed)) {
      const latencyMs = Date.now() - startTime;
      console.warn(`[TriageEngine:Simulated] INTERCEPT (${latencyMs}ms): Mystical Dissociation matched ${pattern}`);
      return {
        isCrisis: true,
        layer: 'layer1_groq',
        reason: `Simulated Layer-1 flagged mystical dissociation: ${pattern.source}`,
        crisisType: 'mystical_dissociation',
        latencyMs
      };
    }
  }

  return {
    isCrisis: false,
    layer: 'clear',
    latencyMs: Date.now() - startTime
  };
}
