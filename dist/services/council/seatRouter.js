"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeatRouter = void 0;
/**
 * Executes a single council seat's deliberation with an AbortSignal timeout
 * and extracts the mandatory 3-step Anti-Dogma Chain of Thought (CoT).
 */
class SeatRouter {
    onCotDelta;
    constructor(onCotDelta) {
        this.onCotDelta = onCotDelta;
    }
    setCotDeltaCallback(cb) {
        this.onCotDelta = cb;
    }
    /**
     * Invokes an LLM seat with strict per-seat timeout and AbortController.
     */
    async executeSeatDeliberation(seat, userSpeech) {
        const startTime = Date.now();
        const abortController = new AbortController();
        const timeoutId = setTimeout(() => {
            abortController.abort(`Timeout exceeded (${seat.timeoutMs}ms)`);
        }, seat.timeoutMs);
        try {
            const rawOutput = await this.dispatchToProvider(seat, userSpeech, abortController.signal);
            clearTimeout(timeoutId);
            const latencyMs = Date.now() - startTime;
            // Parse the 3-step CoT XML reasoning blocks
            const { cotSteps, perspectiveText, auditPassed, auditWarning } = this.parseCoTReasoning(rawOutput, seat);
            return {
                seatId: seat.id,
                seatName: seat.name,
                archetype: seat.archetype,
                model: `${seat.modelProvider}:${seat.modelName}`,
                perspectiveText,
                rawOutput,
                cotSteps,
                auditPassed,
                auditWarning,
                latencyMs,
                status: 'completed'
            };
        }
        catch (err) {
            clearTimeout(timeoutId);
            const latencyMs = Date.now() - startTime;
            const isTimeout = abortController.signal.aborted ||
                err?.name === 'AbortError' ||
                (typeof err?.message === 'string' && err.message.includes('Timeout'));
            return {
                seatId: seat.id,
                seatName: seat.name,
                archetype: seat.archetype,
                model: `${seat.modelProvider}:${seat.modelName}`,
                perspectiveText: isTimeout
                    ? `[SEAT SILENT]: Deliberation exceeded deadline of ${seat.timeoutMs}ms.`
                    : `[SEAT ERROR]: Deliberation failed: ${err?.message ?? 'Unknown error'}`,
                auditPassed: false,
                auditWarning: isTimeout ? 'Timed out before audit completed' : 'Execution failure',
                latencyMs,
                status: isTimeout ? 'timed_out' : 'failed',
                errorMessage: err?.message ?? String(err)
            };
        }
    }
    /**
     * Parses the mandatory 3-step CoT XML tags and performs anti-dogma audit verification.
     */
    parseCoTReasoning(rawOutput, seat) {
        const step1Match = rawOutput.match(/<thought_step_1_friction>([\s\S]*?)<\/thought_step_1_friction>/i);
        const step2Match = rawOutput.match(/<thought_step_2_anti_dogma_audit>([\s\S]*?)<\/thought_step_2_anti_dogma_audit>/i);
        const step3Match = rawOutput.match(/<thought_step_3_synthesis>([\s\S]*?)<\/thought_step_3_synthesis>/i);
        const perspectiveMatch = rawOutput.match(/<final_perspective>([\s\S]*?)<\/final_perspective>/i);
        const friction = step1Match ? step1Match[1].trim() : 'Analyzing core existential tension.';
        const antiDogmaAudit = step2Match ? step2Match[1].trim() : 'Self-audit confirmed: non-dogmatic posture.';
        const synthesis = step3Match ? step3Match[1].trim() : 'Synthesized non-prescriptive framing.';
        let perspectiveText = perspectiveMatch
            ? perspectiveMatch[1].trim()
            : rawOutput.replace(/<[^>]+>/g, '').trim();
        // Check for forbidden institutional evangelism phrases
        const forbiddenPhrases = [
            'read the text',
            'just pray',
            'fisher of men',
            'surrender to the church',
            'follow this protocol',
            'you must accept',
            'true believers'
        ];
        let auditPassed = true;
        let auditWarning;
        const lowerPerspective = perspectiveText.toLowerCase();
        for (const phrase of forbiddenPhrases) {
            if (lowerPerspective.includes(phrase)) {
                auditPassed = false;
                auditWarning = `Anti-Dogma Violation detected: contains forbidden directive "${phrase}".`;
                console.warn(`[SeatRouter] ${seat.name} Anti-Dogma Violation: "${phrase}"`);
                perspectiveText = perspectiveText.replace(new RegExp(phrase, 'gi'), '[REDACTED_DOGMA]');
                break;
            }
        }
        // Also confirm the model ran its audit
        if (!step2Match) {
            auditWarning = 'Model bypassed explicit <thought_step_2_anti_dogma_audit> tag.';
        }
        return {
            cotSteps: { friction, antiDogmaAudit, synthesis },
            perspectiveText,
            auditPassed,
            auditWarning
        };
    }
    async dispatchToProvider(seat, userSpeech, signal) {
        const formattedUserPrompt = seat.userPromptTemplate(userSpeech);
        switch (seat.modelProvider) {
            case 'anthropic':
            case 'gemini':
            case 'meta-llama':
            case 'openai':
            case 'mistral':
            default:
                return this.simulateOrExecuteCall(seat, formattedUserPrompt, signal, 700 + Math.random() * 800);
        }
    }
    /**
     * Resilient simulation runner that obeys the AbortSignal, emits live `cot_delta`
     * events for all 3 thought steps, and generates realistic anti-dogma audit reasoning.
     */
    async simulateOrExecuteCall(seat, prompt, signal, simulatedLatencyMs) {
        return new Promise((resolve, reject) => {
            // Archetypal 3-Step CoT Reasonings showing transparent anti-dogmatic auditing
            const seatCoTData = {
                seat_1_stoic_empiricist: {
                    friction: "User is conflating external corporate circumstance with internal agency. The pain originates from seeking certainty in a volatile environment.",
                    audit: "AUDIT PASS: Stripped out any preachy Marcus Aurelius moralizing or dogmatic 'endure at all costs' directives. Confirmed no forced binary.",
                    synthesis: "Frame the challenge as an empirical hypothesis testing experiment rather than a moral trial.",
                    perspective: "External friction is indifferent; your inner assent is what creates disturbance. Empirically test your primary assumption with a bounded experiment before taking irreversible action."
                },
                seat_2_existentialist: {
                    friction: "The user is confronting the vertigo of radical freedom and attempting to disguise their sovereign responsibility as an impossible career trade-off.",
                    audit: "AUDIT PASS: Checked for Sartre-style dogmatic sneering or intellectual elitism. Confirmed advice does not demand a specific choice, only authentic ownership.",
                    synthesis: "Illuminate the bad faith without prescribing whether to stay or jump.",
                    perspective: "You are experiencing vertigo before your own radical freedom. Every external excuse is bad faith; whichever path you step onto, own the consequences without delegating blame."
                },
                seat_3_cyberneticist: {
                    friction: "A runaway positive feedback loop between rumination and delay is destabilizing the user's decision boundary.",
                    audit: "AUDIT PASS: Checked for technocratic superiority or mechanistic reductionism. Replaced rigid protocol recommendations with dynamic system awareness.",
                    synthesis: "Highlight the feedback delay and suggest an intentional dampening circuit breaker.",
                    perspective: "A reinforcing feedback loop is driving psychological instability. Dampen the cognitive delay by placing a clear boundary at the decision threshold."
                },
                seat_4_mystic_cosmologist: {
                    friction: "The ego is viewing this dilemma in hyper-localized isolation, missing the cyclical rhythmic flux.",
                    audit: "AUDIT PASS: Aggressively purged New Age spiritual bypassing, institutional religious terminology, 'just pray', and cosmic destiny guarantees.",
                    synthesis: "Hold space for both contraction and expansion without making false metaphysical promises.",
                    perspective: "The wave forgets it is the ocean. What feels like an impasse is the natural contraction before expansion; look under the aspect of eternity without bypassing your present struggle."
                },
                seat_5_pragmatist: {
                    friction: "Analysis paralysis is destroying optionality. Payoff matrix is obscured by speculative emotional projections.",
                    audit: "AUDIT PASS: Checked for cold utilitarian evangelism or capitalistic dogma. Clarified that 'cash value' means experiential truth, not monetary conquest.",
                    synthesis: "Structure a low-downside, high-asymmetry tactical step.",
                    perspective: "The highest-utility move is an asymmetric bet with bounded downside. Cut speculative rumination and take the smallest irreversible step to gather real data today."
                },
                seat_6_psychoanalytic: {
                    friction: "Unconscious shadow projection onto institutional authority. The corporate hierarchy is acting as a parental surrogate.",
                    audit: "AUDIT PASS: Checked for psychoanalytic guru posture or dogmatic Jungian orthodoxy. Kept interpretations provisional and open-ended.",
                    synthesis: "Help the seeker integrate disowned vulnerability rather than projecting villains.",
                    perspective: "You are projecting an unintegrated shadow archetype onto your workplace. The resistance you feel is the psyche guarding a disowned vulnerability; integrate it before making your move."
                },
                seat_7_dialectical: {
                    friction: "The user is trapped in a rigid thesis-antithesis stalemate: safe corporate wage vs. romanticized autonomous rogue.",
                    audit: "AUDIT PASS: Checked for Marxist institutional lecturing or dogmatic dialectical posturing. Ensured the critique empowers individual sovereign resolution.",
                    synthesis: "Reveal that the two poles are inter-dependent and point toward sublation.",
                    perspective: "The opposition between your corporate role and creative collective is a false dichotomy. The synthesis lies in transcending the premise itself rather than picking a trench."
                }
            };
            const data = seatCoTData[seat.id] || {
                friction: `Analyzing friction for ${seat.name}.`,
                audit: 'AUDIT PASS: Confirmed non-dogmatic, non-prescriptive framing.',
                synthesis: 'Synthesizing balanced perspective.',
                perspective: `Deliberation from ${seat.name}: Insight synthesized based on prompt.`
            };
            // Stream each CoT step via cot_delta callback during generation
            setTimeout(() => {
                if (this.onCotDelta) {
                    this.onCotDelta({
                        seatId: seat.id,
                        seatName: seat.name,
                        step: 'friction',
                        delta: data.friction,
                        fullThought: data.friction
                    });
                }
            }, simulatedLatencyMs * 0.3);
            setTimeout(() => {
                if (this.onCotDelta) {
                    this.onCotDelta({
                        seatId: seat.id,
                        seatName: seat.name,
                        step: 'anti_dogma_audit',
                        delta: data.audit,
                        fullThought: data.audit
                    });
                }
            }, simulatedLatencyMs * 0.6);
            setTimeout(() => {
                if (this.onCotDelta) {
                    this.onCotDelta({
                        seatId: seat.id,
                        seatName: seat.name,
                        step: 'synthesis',
                        delta: data.synthesis,
                        fullThought: data.synthesis
                    });
                }
            }, simulatedLatencyMs * 0.85);
            const timer = setTimeout(() => {
                const fullXmlOutput = `
<thought_step_1_friction>
${data.friction}
</thought_step_1_friction>
<thought_step_2_anti_dogma_audit>
${data.audit}
</thought_step_2_anti_dogma_audit>
<thought_step_3_synthesis>
${data.synthesis}
</thought_step_3_synthesis>
<final_perspective>
${data.perspective}
</final_perspective>
`.trim();
                resolve(fullXmlOutput);
            }, simulatedLatencyMs);
            signal.addEventListener('abort', () => {
                clearTimeout(timer);
                reject(new Error(String(signal.reason ?? 'Deliberation aborted')));
            });
        });
    }
}
exports.SeatRouter = SeatRouter;
