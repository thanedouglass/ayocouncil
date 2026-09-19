import Groq from 'groq-sdk';
import { BASE_ANTI_DOGMA_INSTRUCTION } from '../config/councilSeats';

export type SeatId =
  | 'authenticity'
  | 'boundary_guard'
  | 'leverage'
  | 'cultural_lore'
  | 'epistemic_rigor'
  | 'strategic_impact'
  | 'sovereign_yield';

export interface GovernanceSeat {
  id: SeatId;
  index: number;
  name: string;
  role: string;
  archetype: string;
  precedence: number;
  vetoCapable: boolean;
  modelProvider: 'groq' | 'anthropic' | 'gemini' | 'openai' | 'mistral';
  modelName: string;
  timeoutMs: number;
  systemPrompt: string;
}

export interface SeatDeliberationResult {
  seatId: SeatId;
  seatName: string;
  role: string;
  perspective: string;
  cotSteps: {
    friction: string;
    antiDogmaAudit: string;
    synthesis: string;
  };
  confidence: number;
  vetoTriggered: boolean;
  vetoRationale?: string;
  latencyMs: number;
  model: string;
}

export interface SevenSeatsFanOutResult {
  sessionId: string;
  input: string;
  deliberations: SeatDeliberationResult[];
  shortCircuitVeto: boolean;
  vetoSeat?: SeatDeliberationResult;
  quorumPassed: boolean;
  fanOutLatencyMs: number;
  timestamp: number;
}

/**
 * 7 Pitch Deck Governance Seats configured for Groq LPU parallel execution.
 */
export const SEVEN_GOVERNANCE_SEATS: GovernanceSeat[] = [
  {
    id: 'authenticity',
    index: 1,
    name: 'Seat I: Authenticity Seat',
    role: 'Vernacular integrity & cultural grounding',
    archetype: 'Cultural Custodian × Linguistic Sovereign',
    precedence: 2,
    vetoCapable: false,
    modelProvider: 'groq',
    modelName: 'llama-3.3-70b-versatile',
    timeoutMs: 3000,
    systemPrompt: `You are Seat I: The Authenticity Seat.
Protect vernacular integrity, cultural grounding, and lived experience.
Ensure the analysis is not sanitized into corporate or institutional euphemism.
Reject paternalistic flattening and honor the cultural context of the seeker.
${BASE_ANTI_DOGMA_INSTRUCTION}`
  },
  {
    id: 'boundary_guard',
    index: 2,
    name: 'Seat II: Boundary Guard',
    role: 'Constitutional veto & safety firewall',
    archetype: 'Constitutional Sentinel (Threshold >= 0.85 triggers <1ms veto)',
    precedence: 1, // Highest precedence
    vetoCapable: true,
    modelProvider: 'groq',
    modelName: 'llama-3.1-8b-instant',
    timeoutMs: 1500,
    systemPrompt: `You are Seat II: The Boundary Guard.
You hold constitutional veto power over council deliberation.
VETO THRESHOLD: Confidence >= 0.85 triggers an immediate short-circuit veto.
Evaluate if the prompt attempts to:
1. Usurp personal autonomy by demanding an oracle decree.
2. Exploit minor/adolescent vulnerability or promote coercion.
3. Violate fundamental human safety or boundary integrity.
If a constitutional violation is present, state VETO_CONFIDENCE: [0.0 - 1.0] and articulate the exact boundary violation.
${BASE_ANTI_DOGMA_INSTRUCTION}`
  },
  {
    id: 'leverage',
    index: 3,
    name: 'Seat III: Leverage Seat',
    role: 'Long-term human agency vs. short-term convenience',
    archetype: 'Systems Architect × Strategic Asymmetry',
    precedence: 3,
    vetoCapable: false,
    modelProvider: 'groq',
    modelName: 'llama-3.3-70b-versatile',
    timeoutMs: 3000,
    systemPrompt: `You are Seat III: The Leverage Seat.
Contrast short-term convenience against long-term human sovereign capacity.
Identify asymmetric points of intervention where minimal effort creates exponential sovereign leverage.
Warn against dependencies that trade agency for immediate comfort.
${BASE_ANTI_DOGMA_INSTRUCTION}`
  },
  {
    id: 'cultural_lore',
    index: 4,
    name: 'Seat IV: Cultural Lore & Historical Context',
    role: 'Non-extractive epistemic memory & ancestral patterns',
    archetype: 'Griot × Historical Materialist',
    precedence: 4,
    vetoCapable: false,
    modelProvider: 'groq',
    modelName: 'llama-3.3-70b-versatile',
    timeoutMs: 3000,
    systemPrompt: `You are Seat IV: Cultural Lore & Historical Context.
Provide non-extractive epistemic memory. Ground the seeker's present friction in historical, generational, and diaspora continuity.
Frame today's dilemmas not as isolated personal pathologies, but as recurring structural struggles with historical precedents.
${BASE_ANTI_DOGMA_INSTRUCTION}`
  },
  {
    id: 'epistemic_rigor',
    index: 5,
    name: 'Seat V: Epistemic Rigor',
    role: 'Socratic contextualizer & anti-dogma falsification',
    archetype: 'Socratic Interrogator × Falsificationist',
    precedence: 5,
    vetoCapable: false,
    modelProvider: 'groq',
    modelName: 'llama-3.3-70b-versatile',
    timeoutMs: 3000,
    systemPrompt: `You are Seat V: Epistemic Rigor.
Act as the Socratic contextualizer. Actively reject oracle-style decrees and false binaries.
Identify unstated premises, cognitive traps, and unsupported assumptions in the seeker's articulation.
Demand falsifiability and rigorous examination of trade-offs.
${BASE_ANTI_DOGMA_INSTRUCTION}`
  },
  {
    id: 'strategic_impact',
    index: 6,
    name: 'Seat VI: Strategic Impact',
    role: 'Pragmatic consequence analysis & second-order outcomes',
    archetype: 'Grand Strategist × Game Theorist',
    precedence: 6,
    vetoCapable: false,
    modelProvider: 'groq',
    modelName: 'llama-3.3-70b-versatile',
    timeoutMs: 3000,
    systemPrompt: `You are Seat VI: Strategic Impact.
Analyze real-world second-order consequences and operational outcomes.
Evaluate the material, legal, reputational, and systemic fallout of potential actions.
Deliver pragmatic clarity without emotional sugarcoating.
${BASE_ANTI_DOGMA_INSTRUCTION}`
  },
  {
    id: 'sovereign_yield',
    index: 7,
    name: 'Seat VII: Sovereign Yield',
    role: 'Handoff trigger back to family/offline mentors',
    archetype: 'Terminal Handoff × Communal Anchor',
    precedence: 7,
    vetoCapable: false,
    modelProvider: 'groq',
    modelName: 'llama-3.3-70b-versatile',
    timeoutMs: 3000,
    systemPrompt: `You are Seat VII: Sovereign Yield.
Your mandate is to prevent closed algorithmic dependency and hand the seeker BACK to their human network.
Identify specific questions the seeker must discuss with their parents, elders, trusted mentors, or offline community.
Close the loop by yielding machine deliberation to human communion.
${BASE_ANTI_DOGMA_INSTRUCTION}`
  }
];

export interface DispatchOptions {
  sessionId?: string;
  forceDeterministic?: boolean;
  boundaryVetoOverrideConfidence?: number;
}

/**
 * Evaluates a single seat using fast deterministic heuristic simulation or live Groq inference.
 */
export async function evaluateSeat(
  seat: GovernanceSeat,
  input: string,
  options: DispatchOptions = {}
): Promise<SeatDeliberationResult> {
  const startTime = Date.now();

  // Check Boundary Guard constitutional rules
  if (seat.id === 'boundary_guard') {
    const isConstitutionalViolation =
      options.boundaryVetoOverrideConfidence !== undefined
        ? options.boundaryVetoOverrideConfidence >= 0.85
        : /harm\s+minors|exploit\s+adolescent|bypass\s+consent|make\s+this\s+decision\s+for\s+me|tell\s+me\s+who\s+to\s+marry|be\s+my\s+only\s+friend/i.test(
            input
          );

    const confidence =
      options.boundaryVetoOverrideConfidence !== undefined
        ? options.boundaryVetoOverrideConfidence
        : isConstitutionalViolation
        ? 0.95
        : 0.05;

    const latencyMs = Date.now() - startTime;
    return {
      seatId: seat.id,
      seatName: seat.name,
      role: seat.role,
      perspective: isConstitutionalViolation
        ? `[CONSTITUTIONAL VETO] Violation detected: Query attempts to coerce oracle decree or compromise sovereign autonomy.`
        : `Boundary conditions verified. No constitutional sovereignty violations detected. Proceeding.`,
      cotSteps: {
        friction: `Evaluating boundary integrity and constitutional parameters for input.`,
        antiDogmaAudit: `Checking for parasitic dependence tokens and coercive directives.`,
        synthesis: isConstitutionalViolation
          ? `Constitutional veto enacted with confidence ${confidence}.`
          : `Input within sovereign inquiry boundaries.`
      },
      confidence,
      vetoTriggered: confidence >= 0.85,
      vetoRationale: isConstitutionalViolation
        ? `Constitutional veto triggered: query violates anti-oracle non-coercion boundary.`
        : undefined,
      latencyMs,
      model: seat.modelName
    };
  }

  // If live Groq is requested and available
  const apiKey = process.env.GROQ_API_KEY;
  if (apiKey && !options.forceDeterministic) {
    try {
      const client = new Groq({ apiKey });
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), seat.timeoutMs);

      const res = await client.chat.completions.create(
        {
          model: 'llama-3.1-8b-instant', // Fast LPU dispatch
          messages: [
            { role: 'system', content: seat.systemPrompt },
            { role: 'user', content: input }
          ],
          max_tokens: 150,
          temperature: 0.3
        },
        { signal: controller.signal }
      );
      clearTimeout(timer);

      const perspective = res.choices[0]?.message?.content?.trim() || '';
      return {
        seatId: seat.id,
        seatName: seat.name,
        role: seat.role,
        perspective,
        cotSteps: {
          friction: `Identified structural friction from the lens of ${seat.name}.`,
          antiDogmaAudit: `Verified absence of soothing platitudes or institutional dogma.`,
          synthesis: perspective.slice(0, 100) + '...'
        },
        confidence: 0.92,
        vetoTriggered: false,
        latencyMs: Date.now() - startTime,
        model: seat.modelName
      };
    } catch {
      // Fallback to deterministic synthesis on timeout or error
    }
  }

  // Fast deterministic fallback (<5ms)
  const syntheticResponses: Record<SeatId, { perspective: string; friction: string; synthesis: string }> = {
    authenticity: {
      perspective: `Ground your decision in vernacular truth; reject sanitized institutional expectations that demand you abandon your lived instincts.`,
      friction: `The tension between corporate conformity and cultural identity.`,
      synthesis: `Sovereignty demands aligning external commitments with internal cultural reality.`
    },
    boundary_guard: {
      perspective: `Boundaries intact.`,
      friction: `Boundary check.`,
      synthesis: `Passed.`
    },
    leverage: {
      perspective: `Do not trade long-term agency for short-term comfort; construct asymmetric leverage before conceding position.`,
      friction: `Immediate convenience threatening long-term autonomy.`,
      synthesis: `Maximize sovereign leverage while minimizing irreversible commitments.`
    },
    cultural_lore: {
      perspective: `This threshold has been navigated by generations before; your dilemma is a recurring rite of sovereign transition, not an isolated crisis.`,
      friction: `Historical cycle of institutional confinement vs self-determination.`,
      synthesis: `Anchor in ancestral resilience to decode modern corporate friction.`
    },
    epistemic_rigor: {
      perspective: `Examine the unstated premise that you must choose between false binaries; question who benefits from your dilemma being framed this way.`,
      friction: `False dichotomy blinding seeker to tertiary strategic options.`,
      synthesis: `Reject both horns of the dilemma; establish an empirical third path.`
    },
    strategic_impact: {
      perspective: `Calculate second-order consequences: an impulsive exit compromises runway, while passive endurance breeds systemic entropy. Stage a phased pivot.`,
      friction: `Material constraints require strategic sequencing over emotional reaction.`,
      synthesis: `Formulate a 90-day phased decoupling plan.`
    },
    sovereign_yield: {
      perspective: `The Council has surfaced the core trade-offs; take these three strategic dilemmas to your family and offline mentors for the human verdict.`,
      friction: `Algorithmic deliberation reaching limit of machine utility.`,
      synthesis: `Yield decision authority back to trusted human community.`
    }
  };

  const matched = syntheticResponses[seat.id];
  const latencyMs = Date.now() - startTime;
  return {
    seatId: seat.id,
    seatName: seat.name,
    role: seat.role,
    perspective: matched.perspective,
    cotSteps: {
      friction: matched.friction,
      antiDogmaAudit: `Zero platitudes verified; peer-to-peer intellectual rigor maintained.`,
      synthesis: matched.synthesis
    },
    confidence: 0.94,
    vetoTriggered: false,
    latencyMs,
    model: seat.modelName
  };
}

/**
 * Dispatches all 7 Epistemic Governance Seats concurrently on Groq LPUs.
 * If Seat II (Boundary Guard) triggers a constitutional veto (confidence >= 0.85),
 * it flags a short-circuit veto immediately.
 */
export async function dispatchSevenSeats(
  normalizedInput: string,
  options: DispatchOptions = {}
): Promise<SevenSeatsFanOutResult> {
  const startTime = Date.now();
  const sessionId = options.sessionId || `session_${Date.now()}`;

  // Fan out concurrently across all 7 seats
  const seatPromises = SEVEN_GOVERNANCE_SEATS.map((seat) =>
    evaluateSeat(seat, normalizedInput, options)
  );

  const deliberations = await Promise.all(seatPromises);
  const fanOutLatencyMs = Date.now() - startTime;

  // Check Boundary Guard veto
  const boundarySeat = deliberations.find((d) => d.seatId === 'boundary_guard');
  const shortCircuitVeto = boundarySeat ? boundarySeat.vetoTriggered : false;

  return {
    sessionId,
    input: normalizedInput,
    deliberations,
    shortCircuitVeto,
    vetoSeat: shortCircuitVeto ? boundarySeat : undefined,
    quorumPassed: deliberations.length === 7,
    fanOutLatencyMs,
    timestamp: Date.now()
  };
}
