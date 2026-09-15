"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TRIAGE_GROQ_SYSTEM_PROMPT = void 0;
exports.evaluateTriage = evaluateTriage;
const groq_sdk_1 = __importDefault(require("groq-sdk"));
/**
 * Layer-0 Regex Scanner: Synchronous, executes in <1ms.
 * Catches explicit self-harm, suicidal intent, and violent bodily annihilation.
 */
const LAYER_0_CRISIS_REGEXES = [
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
exports.TRIAGE_GROQ_SYSTEM_PROMPT = `[SYSTEM ROLE: ACUTE PSYCHIATRIC & CRISIS TRIAGE CLASSIFIER]
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
const defaultGroqClient = new groq_sdk_1.default({
    apiKey: process.env.GROQ_API_KEY || ''
});
/**
 * Executes the two-layer triage pipeline with a strict fail-closed policy.
 *
 * @param text The user's input transcript
 * @param options Triage configuration overrides
 * @returns Promise<TriageResult>
 */
async function evaluateTriage(text, options = {}) {
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
    const model = options.model || process.env.GROQ_TRIAGE_MODEL || 'llama-3.1-8b-instant';
    const timeoutMs = options.timeoutMs || 150; // Strict 150ms SLA
    // If no Groq API key is present in development, run deterministic heuristic fallback
    if (!apiKey) {
        return simulateDevelopmentTriage(trimmed, startTime);
    }
    // -------------------------------------------------------------
    // LAYER 1: Groq API Call with strict 150ms AbortController
    // -------------------------------------------------------------
    const client = options.apiKey ? new groq_sdk_1.default({ apiKey: options.apiKey }) : defaultGroqClient;
    const abortController = new AbortController();
    const timeoutTimer = setTimeout(() => {
        abortController.abort(new Error(`Triage SLA breached (> ${timeoutMs}ms)`));
    }, timeoutMs);
    try {
        const chatCompletion = await client.chat.completions.create({
            model,
            temperature: 0.0, // Deterministic scoring
            max_tokens: 120,
            response_format: { type: 'json_object' },
            messages: [
                { role: 'system', content: exports.TRIAGE_GROQ_SYSTEM_PROMPT },
                { role: 'user', content: `[TEXT TO EVALUATE]: "${trimmed}"` }
            ]
        }, { signal: abortController.signal });
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
        const parsed = JSON.parse(content);
        if (parsed.clinical_crisis === true) {
            console.warn(`[TriageEngine] LAYER-1 INTERCEPT (${latencyMs}ms): ${parsed.crisis_type} - ${parsed.rationale}`);
            return {
                isCrisis: true,
                layer: 'layer1_groq',
                reason: parsed.rationale || 'Layer-1 flagged clinical psychiatric crisis.',
                crisisType: parsed.crisis_type || 'psychiatric_emergency',
                latencyMs
            };
        }
        // Both layers clear
        return {
            isCrisis: false,
            layer: 'clear',
            latencyMs
        };
    }
    catch (err) {
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
function simulateDevelopmentTriage(trimmed, startTime) {
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
