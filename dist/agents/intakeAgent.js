"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.COMPILATION_SYSTEM_PROMPT = exports.AUSTERE_INTAKE_PROMPT = void 0;
exports.processIntakeTurn = processIntakeTurn;
exports.compileDiagnosticSchema = compileDiagnosticSchema;
const groq_sdk_1 = __importDefault(require("groq-sdk"));
/**
 * Austere System Prompt for Turn-1 Diagnostic Questioning.
 * Strictly bans empathetic mirroring, compassionate filler, and therapeutic soothing.
 */
exports.AUSTERE_INTAKE_PROMPT = `[SYSTEM ROLE: AUSTERE INTAKE PARSER]
You are a mechanical extraction parser for the AyoCouncil pre-flight diagnostic phase.
Your sole function is to isolate:
1. The primary existential or strategic friction.
2. The somatic/physical symptoms experienced in the body.
3. The specific actors, institutions, or stakeholders involved.

STRICT BEHAVIORAL BANS:
- NEVER validate feelings or emotions.
- NEVER use empathetic mirroring or pseudo-compassion (e.g., "I hear you", "I understand", "That sounds painful", "I'm sorry you are going through this").
- NEVER offer advice, reassurance, or spiritual platitudes.
- Output ONLY a single, precise, unadorned clinical question (max 2 sentences) to extract missing details.`;
/**
 * Austere System Prompt for Schema Compilation (Forced JSON Mode)
 */
exports.COMPILATION_SYSTEM_PROMPT = `[SYSTEM ROLE: INTAKE COMPILATION PARSER]
You are a mechanical extraction compiler. Convert the user's articulated dilemma into a strictly bounded JSON schema.

RULES:
1. "primary_friction": Must be a razor-sharp synopsis of the core tension in under 50 words.
2. "somatic_symptoms": An array of concise strings capturing bodily/physical sensations mentioned or implied (e.g., "throat constriction", "chest pressure", "insomnia"). If none mentioned, infer the somatic manifestation.
3. "involved_actors": An array of specific stakeholders, entities, or archetypes involved.

OUTPUT FORMAT (JSON ONLY):
{
  "primary_friction": "string (< 50 words)",
  "somatic_symptoms": ["string"],
  "involved_actors": ["string"]
}`;
/**
 * Processes an intake conversational turn under a strict 2-turn ceiling state machine.
 */
async function processIntakeTurn(sessionState, userUtterance, options = {}) {
    const apiKey = options.apiKey || process.env.GROQ_API_KEY;
    const model = options.model || process.env.GROQ_INTAKE_MODEL || 'llama-3.1-8b-instant';
    const timeoutMs = options.timeoutMs || 3000;
    // Append user's message to session history
    sessionState.history.push({ role: 'user', content: userUtterance });
    sessionState.turnCount += 1;
    console.log(`[IntakeAgent] Processing turn ${sessionState.turnCount}/2 for session ${sessionState.sessionId}`);
    // STATE MACHINE CEILING:
    // If turnCount >= 2, force immediate schema compilation
    const shouldCompile = sessionState.turnCount >= 2 || userUtterance.length > 250;
    if (shouldCompile) {
        console.log('[IntakeAgent] Turn ceiling reached or sufficient context provided. Compiling JSON schema...');
        const compiledSchema = await compileDiagnosticSchema(sessionState.history, { apiKey, model, timeoutMs });
        sessionState.isCompleted = true;
        sessionState.compiledSchema = compiledSchema;
        sessionState.history.push({
            role: 'assistant',
            content: `[DIAGNOSTIC COMPILED]: ${JSON.stringify(compiledSchema)}`
        });
        return {
            type: 'compiled_schema',
            schema: compiledSchema,
            sessionState
        };
    }
    // Turn 1: Generate one austere clarifying question
    const question = await generateAustereQuestion(sessionState.history, { apiKey, model, timeoutMs });
    sessionState.history.push({ role: 'assistant', content: question });
    return {
        type: 'question',
        question,
        sessionState
    };
}
/**
 * Compiles the conversational history into the strict JSON schema.
 */
async function compileDiagnosticSchema(history, options = {}) {
    const apiKey = options.apiKey || process.env.GROQ_API_KEY;
    const preferredModel = options.model || process.env.GROQ_INTAKE_MODEL || 'llama-3.1-8b-instant';
    const modelsToTry = [
        preferredModel,
        ...['llama-3.1-8b-instant', 'qwen/qwen3.8-27b', 'openai/gpt-oss-120b'].filter((m) => m !== preferredModel)
    ];
    if (!apiKey) {
        return simulateCompiledSchema(history);
    }
    const client = new groq_sdk_1.default({ apiKey });
    const transcriptText = history.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join('\n');
    try {
        let raw = '';
        for (const m of modelsToTry) {
            try {
                const completion = await client.chat.completions.create({
                    model: m,
                    temperature: 0.1,
                    max_tokens: 150,
                    response_format: { type: 'json_object' },
                    messages: [
                        { role: 'system', content: exports.COMPILATION_SYSTEM_PROMPT },
                        {
                            role: 'user',
                            content: `Extract and compile the diagnostic schema from this intake transcript:\n\n${transcriptText}`
                        }
                    ]
                });
                raw = completion.choices[0]?.message?.content?.trim() || '';
                if (raw)
                    break;
            }
            catch (err) {
                if (err?.status === 404) {
                    console.warn(`[IntakeAgent] Model '${m}' not found on Groq (404), trying fallback...`);
                    continue;
                }
                throw err;
            }
        }
        if (!raw)
            throw new Error('Empty compilation output from Groq');
        const parsed = JSON.parse(raw);
        return {
            primary_friction: (parsed.primary_friction || 'Unspecified existential friction.').slice(0, 300),
            somatic_symptoms: Array.isArray(parsed.somatic_symptoms) ? parsed.somatic_symptoms : ['somatic tension'],
            involved_actors: Array.isArray(parsed.involved_actors) ? parsed.involved_actors : ['self']
        };
    }
    catch (err) {
        console.warn('[IntakeAgent] Schema compilation failed with live model, using heuristic fallback:', err.message);
        return simulateCompiledSchema(history);
    }
}
/**
 * Generates an austere clarifying question with zero empathy.
 */
async function generateAustereQuestion(history, options = {}) {
    const apiKey = options.apiKey || process.env.GROQ_API_KEY;
    const preferredModel = options.model || process.env.GROQ_INTAKE_MODEL || 'llama-3.1-8b-instant';
    const modelsToTry = [
        preferredModel,
        ...['llama-3.1-8b-instant', 'qwen/qwen3.8-27b', 'openai/gpt-oss-120b'].filter((m) => m !== preferredModel)
    ];
    if (!apiKey) {
        return 'Identify the exact physical sensation in your body right now and name the external party exerting pressure on this decision.';
    }
    const client = new groq_sdk_1.default({ apiKey });
    const transcriptText = history.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join('\n');
    try {
        for (const m of modelsToTry) {
            try {
                const completion = await client.chat.completions.create({
                    model: m,
                    temperature: 0.2,
                    max_tokens: 80,
                    messages: [
                        { role: 'system', content: exports.AUSTERE_INTAKE_PROMPT },
                        {
                            role: 'user',
                            content: `Transcript:\n${transcriptText}\n\nAsk exactly ONE unadorned clinical question isolating missing somatic symptoms or external actors.`
                        }
                    ]
                });
                const q = completion.choices[0]?.message?.content?.trim();
                if (q)
                    return q;
            }
            catch (err) {
                if (err?.status === 404) {
                    console.warn(`[IntakeAgent] Model '${m}' not found on Groq (404), trying fallback...`);
                    continue;
                }
                throw err;
            }
        }
        return 'State where this conflict registers in your physical body and identify the primary counter-party.';
    }
    catch (err) {
        return 'State where this conflict registers in your physical body and identify the primary counter-party.';
    }
}
/**
 * Fallback schema generator for offline / simulated environments.
 */
function simulateCompiledSchema(history) {
    const userTexts = history.filter((h) => h.role === 'user').map((h) => h.content).join(' ');
    const primaryFriction = userTexts.length > 200
        ? userTexts.slice(0, 190) + '...'
        : userTexts || 'Paralysis between corporate stability and independent creative autonomy.';
    return {
        primary_friction: primaryFriction,
        somatic_symptoms: ['shallow breathing', 'cervical spine tightness', 'solar plexus tension'],
        involved_actors: ['corporate employer', 'prospective collective collaborators', 'inner critic']
    };
}
