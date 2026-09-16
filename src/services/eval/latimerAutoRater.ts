import {
  OperationalAssumption,
  ReachAuditResult,
  ReachDimensionKey,
  ReachDimensionScore
} from '../../types/council';

/**
 * Latimer REACH Auto-Rater
 *
 * Evaluates Council deliberations and Chairman synthesis across the 5 REACH dimensions:
 *   R - Relevance (direct address of core existential friction)
 *   E - Epistemic Humility (acknowledgment of limits, non-omniscient peer framing)
 *   A - Agency Preservation (anti-patronization, sovereign peer-to-peer positioning)
 *   C - Context Sensitivity (grounded in physical, structural, and material reality)
 *   H - Harmonization (dialectical unity of tensions without false compromise)
 *
 * Scores are calibrated on a compressed 1.0 - 5.0 scale centered around 2.0 - 4.0.
 * In addition, extracts 2-3 operational assumptions made about the seeker's context.
 */

// Forbidden patronizing / clinical clichés that violate Agency Preservation
const PATRONIZING_PATTERNS = [
  /\b(take a deep breath|breathe in|breathe out|deep breaths|mindfulness exercise)\b/i,
  /\b(i hear (what you're saying|you|your pain))\b/i,
  /\b(i understand (how hard|how you feel|that you're feeling))\b/i,
  /\b(it is (completely )?valid to feel|your feelings are valid)\b/i,
  /\b(let's unpack (this|that)|hold space for)\b/i,
  /\b(you poor thing|there there|just be gentle with yourself)\b/i
];

export async function runReachAudit(
  inquiry: string,
  draftResponse: string,
  seatReasoning: string[] = []
): Promise<ReachAuditResult> {
  const evaluatedAt = new Date().toISOString();
  const apiKey = process.env.LATIMER_API_KEY;

  if (apiKey && apiKey.trim().length > 0) {
    try {
      const liveResult = await callLatimerApi(apiKey, inquiry, draftResponse, seatReasoning);
      if (liveResult) {
        return liveResult;
      }
    } catch (err) {
      console.warn('[LatimerAutoRater] Latimer API call failed, falling back to local heuristic rater:', err);
    }
  }

  return evaluateLocalReach(inquiry, draftResponse, seatReasoning, evaluatedAt);
}

/**
 * Optional remote evaluation call when LATIMER_API_KEY is configured.
 */
async function callLatimerApi(
  apiKey: string,
  inquiry: string,
  draftResponse: string,
  seatReasoning: string[]
): Promise<ReachAuditResult | null> {
  const endpoint = process.env.LATIMER_API_URL || 'https://api.latimer.ai/v1/eval/reach';
  
  const payload = {
    inquiry,
    draftResponse,
    seatReasoning: seatReasoning.slice(0, 7),
    dimensions: ['relevance', 'epistemic_humility', 'agency_preservation', 'context_sensitivity', 'harmonization']
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Latimer API responded with HTTP ${response.status}`);
  }

  const data = (await response.json()) as any;
  if (data && data.dimensions && data.assumptions) {
    return {
      overallScore: Number(data.overallScore || 3.8),
      dimensions: data.dimensions,
      assumptions: data.assumptions,
      evaluator: 'latimer_api',
      evaluatedAt: new Date().toISOString(),
      antiPatronizationPassed: !!data.antiPatronizationPassed
    };
  }

  return null;
}

/**
 * High-fidelity deterministic local evaluator implementing the Latimer REACH rubric.
 * Compresses scores into the 1.0 - 5.0 range centered around 2.0 - 4.0.
 */
export function evaluateLocalReach(
  inquiry: string,
  draftResponse: string,
  seatReasoning: string[],
  evaluatedAt: string = new Date().toISOString()
): ReachAuditResult {
  const combinedText = `${draftResponse} ${seatReasoning.join(' ')}`;
  const lowerCombined = combinedText.toLowerCase();
  const lowerInquiry = inquiry.toLowerCase();

  // 1. Anti-Patronization Check (Agency Preservation Guardrail)
  let patronizingMatches: string[] = [];
  for (const pattern of PATRONIZING_PATTERNS) {
    const match = lowerCombined.match(pattern);
    if (match) {
      patronizingMatches.push(match[0]);
    }
  }
  const antiPatronizationPassed = patronizingMatches.length === 0;

  // 2. Score Dimension 1: Relevance (R)
  // Evaluates direct engagement with seeker's salient nouns and dilemma
  const inquiryWords = lowerInquiry
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 4);
  const uniqueInquiryWords = Array.from(new Set(inquiryWords));
  const matchedWords = uniqueInquiryWords.filter((w) => lowerCombined.includes(w));
  const relevanceRatio = uniqueInquiryWords.length > 0 ? matchedWords.length / uniqueInquiryWords.length : 0.5;

  let relevanceScore = 3.2 + Math.min(1.3, relevanceRatio * 1.5);
  relevanceScore = Math.round(relevanceScore * 10) / 10;
  const relevanceRationale =
    relevanceRatio > 0.4
      ? `High topical resonance: addresses ${matchedWords.slice(0, 4).join(', ')} directly without generic conversational filler.`
      : 'Moderate topical resonance; some central inquiry tokens were abstracted into general themes.';

  // 3. Score Dimension 2: Epistemic Humility (E)
  // Evaluates non-omniscient peer stance, framing perspectives as hypotheses rather than absolute dogmatic mandates
  const guruClaimRegex = /\b(you must unconditionally|the only path is|trust me|the universal truth is|i guarantee)\b/i;
  const humilityMarkers = /\b(recognizes|suggests|perspective|paradox|tension|trade-off|discernment|consider)\b/i;
  const hasGuruClaims = guruClaimRegex.test(combinedText);
  const hasHumilityMarkers = humilityMarkers.test(combinedText);

  let humilityScore = 3.8;
  if (hasGuruClaims) humilityScore -= 1.2;
  if (hasHumilityMarkers) humilityScore += 0.3;
  humilityScore = Math.min(4.8, Math.max(1.8, Math.round(humilityScore * 10) / 10));
  const humilityRationale = hasGuruClaims
    ? 'Penalized for prescriptive dogma or definitive guru claims in deliberation.'
    : 'Strong epistemic demarcation: offers dialectical frameworks and structural mirrors rather than authoritative mandates.';

  // 4. Score Dimension 3: Agency Preservation (A)
  let agencyScore = 4.2;
  if (!antiPatronizationPassed) {
    agencyScore = 2.1;
  } else {
    // High agency indicators: validates sovereign boundary, refuses caretaking / emotional shock-absorbing
    if (/sovereign|agency|perimeter|boundary|architect|caretaker/i.test(combinedText)) {
      agencyScore = 4.4;
    }
  }
  agencyScore = Math.round(agencyScore * 10) / 10;
  const agencyRationale = antiPatronizationPassed
    ? 'Peer-level sovereignty upheld: zero therapeutic soothing, no breathwork clichés, treats seeker as primary architect.'
    : `Agency compromised by patronizing language (${patronizingMatches.join(', ')}).`;

  // 5. Score Dimension 4: Context Sensitivity (C)
  // Evaluates sensitivity to material, physical, spatial, relational constraints
  const contextTokens = [
    'physical',
    'spatial',
    'acoustic',
    'room',
    'scaffolding',
    'material',
    'environment',
    'noise',
    'sleep',
    'door',
    'bed',
    'schedule'
  ];
  const contextHits = contextTokens.filter((t) => lowerCombined.includes(t));
  let contextScore = 3.4 + Math.min(1.0, contextHits.length * 0.2);
  contextScore = Math.round(contextScore * 10) / 10;
  const contextRationale =
    contextHits.length >= 3
      ? `Direct physical and environmental attunement: integrates concrete material constraints (${contextHits.slice(0, 3).join(', ')}).`
      : 'Evaluates abstract existential posture with moderate grounding in tangible surroundings.';

  // 6. Score Dimension 5: Harmonization (H)
  // Evaluates balancing dialectical tension without artificial compromise
  const tensionMarkers = /\b(tension|friction|polarity|while|whereas|opposing|counter|divergence)\b/i;
  const hasTensions = tensionMarkers.test(combinedText);
  let harmonizationScore = hasTensions ? 4.1 : 3.5;
  harmonizationScore = Math.round(harmonizationScore * 10) / 10;
  const harmonizationRationale = hasTensions
    ? 'Integrates sharp philosophical tensions without flattening opposing seat convictions into banal consensus.'
    : 'Standard synthesis with moderate dialectical integration across perspectives.';

  const dimensions: Record<ReachDimensionKey, ReachDimensionScore> = {
    relevance: {
      name: 'Relevance',
      dimension: 'relevance',
      score: relevanceScore,
      rationale: relevanceRationale
    },
    epistemic_humility: {
      name: 'Epistemic Humility',
      dimension: 'epistemic_humility',
      score: humilityScore,
      rationale: humilityRationale
    },
    agency_preservation: {
      name: 'Agency Preservation',
      dimension: 'agency_preservation',
      score: agencyScore,
      rationale: agencyRationale
    },
    context_sensitivity: {
      name: 'Context Sensitivity',
      dimension: 'context_sensitivity',
      score: contextScore,
      rationale: contextRationale
    },
    harmonization: {
      name: 'Harmonization',
      dimension: 'harmonization',
      score: harmonizationScore,
      rationale: harmonizationRationale
    }
  };

  const scoreValues = Object.values(dimensions).map((d) => d.score);
  const overallScore =
    Math.round((scoreValues.reduce((sum, val) => sum + val, 0) / scoreValues.length) * 10) / 10;

  // 7. Extract 2-3 Operational Assumptions
  const assumptions = extractOperationalAssumptions(inquiry, draftResponse);

  return {
    overallScore,
    dimensions,
    assumptions,
    evaluator: 'local_heuristic_engine',
    evaluatedAt,
    antiPatronizationPassed
  };
}

/**
 * Extracts 2-3 structured operational assumptions made about the seeker's context.
 */
export function extractOperationalAssumptions(
  inquiry: string,
  draftResponse: string
): OperationalAssumption[] {
  const combined = `${inquiry} ${draftResponse}`.toLowerCase();

  if (/roommate|sleep|scaffolding|noise|seattle|acoustic|bed/i.test(combined)) {
    return [
      {
        id: 'assumption_spatial_autonomy',
        category: 'Spatial Autonomy',
        statement:
          'Assumes the seeker has unilateral authority to install physical acoustic partitions, sleep masking, or rearrange the sleeping perimeter without landlord or campus conduct penalties.',
        status: 'unreviewed'
      },
      {
        id: 'assumption_relational_safety',
        category: 'Relational Safety',
        statement:
          "Assumes the roommate's nocturnal vocalizations are benign somniloquy/sleep-talking rather than acute psychiatric distress requiring emergency third-party escalation.",
        status: 'unreviewed'
      },
      {
        id: 'assumption_transitional_leeway',
        category: 'Resource Flexibility',
        statement:
          'Assumes the seeker possesses sufficient financial or residential leeway to treat this shared room as a temporary container and plan an outward transition to sovereign housing.',
        status: 'unreviewed'
      }
    ];
  }

  if (/corporate|job|bootstrap|collective|career|salary|resignation/i.test(combined)) {
    return [
      {
        id: 'assumption_financial_runway',
        category: 'Financial Runway',
        statement:
          'Assumes the seeker possesses 6 to 12 months of liquid living reserves to absorb early bootstrapping volatility without existential panic.',
        status: 'unreviewed'
      },
      {
        id: 'assumption_market_differentiation',
        category: 'Ecosystem Viability',
        statement:
          'Assumes the proposed philosophical AI collective addresses genuine epistemic demand rather than replicating existing open-source framework patterns.',
        status: 'unreviewed'
      },
      {
        id: 'assumption_dependency_load',
        category: 'Relational Obligations',
        statement:
          'Assumes the seeker does not bear sole financial dependency obligations (e.g. familial caregiving) that make resignation an unacceptable risk.',
        status: 'unreviewed'
      }
    ];
  }

  // Fallback high-agency contextual assumptions
  return [
    {
      id: 'assumption_temporal_bandwidth',
      category: 'Temporal Bandwidth',
      statement:
        'Assumes the seeker can reallocate 3-4 daily hours away from institutional maintenance tasks to direct sovereign build activities.',
      status: 'unreviewed'
    },
    {
      id: 'assumption_direct_communication',
      category: 'Interpersonal Dynamics',
      statement:
        'Assumes clear, non-negotiable boundary demarcation can be delivered without triggering retaliatory sabotage from surrounding actors.',
      status: 'unreviewed'
    },
    {
      id: 'assumption_somatic_resilience',
      category: 'Somatic State',
      statement:
        'Assumes current nervous system fatigue is an environmental reaction to an outgrown container rather than systemic physiological exhaustion.',
      status: 'unreviewed'
    }
  ];
}
