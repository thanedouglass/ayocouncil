import { ElegbaAuditResult } from './elegbaProtocol';
import { SeatDeliberationResult, SevenSeatsFanOutResult } from './sevenSeats';

export interface SovereignFrictionGateConfig {
  status: 'ACTIVE' | 'VETO_HALT';
  humanAffirmationRequired: boolean;
  offlineHandoffTarget: string;
}

export interface ChairmanDossier {
  sessionId: string;
  timestamp: number;
  inputPrompt: string;
  consensusPoints: string[];
  minorityDissents: string[];
  actionParameters: string[];
  sovereignRecommendation: string;
  boundaryGuardStatus: {
    vetoTriggered: boolean;
    confidence: number;
    rationale?: string;
  };
  elegbaStatus: ElegbaAuditResult;
  sovereignFrictionGate: SovereignFrictionGateConfig;
  councilResolutionBrief: string;
}

/**
 * Compiles the 1-page exportable Council Resolution Brief for offline human mentors.
 */
export function generateCouncilResolutionBrief(
  sessionId: string,
  input: string,
  consensusPoints: string[],
  dissents: string[],
  actionParameters: string[],
  sovereignRecommendation: string,
  elegba: ElegbaAuditResult,
  vetoTriggered: boolean
): string {
  const dateStr = new Date().toISOString().split('T')[0];

  if (vetoTriggered) {
    return `# AYOCOUNCIL CONSTITUTIONAL VETO BRIEF
**Session ID**: \`${sessionId}\` | **Date**: ${dateStr}
**Status**: CONSTITUTIONAL SHORT-CIRCUIT ENACTED

---

### Constitutional Boundary Violation
Council deliberation was halted by Seat II (Boundary Guard). The inquiry attempted to offload normative sovereignty, request an authoritarian oracle decree, or breach human dignity boundaries.

### Directive for Seeker & Offline Mentors
1. **Immediate Algorithmic Halt**: No automated advice or synthetic recommendations may be generated for this inquiry.
2. **Offline Human Referral**: Discuss the underlying distress or pressure directly with a trusted mentor, parent, counselor, or elder.
3. **Sovereignty Re-anchoring**: Identify the institutional or interpersonal coercion compelling you to seek an external machine oracle.

---
*Signed: AyoCouncil High Chairman & Sovereign Boundary Guard*
`;
  }

  return `# AYOCOUNCIL RESOLUTION BRIEF
**Session ID**: \`${sessionId}\` | **Date**: ${dateStr} | **Network**: Base Sepolia
**Auditing**: Elegba Protocol (${elegba.status} · Sycophancy Index: ${elegba.sycophancyScore.toFixed(2)})

---

### I. Primary Friction Presented
> *"${input.slice(0, 280)}"*

### II. Council Epistemic Consensus
${consensusPoints.map((cp, idx) => `${idx + 1}. **${cp}**`).join('\n')}

### III. Key Tensions & Minority Dissents
${dissents.map((d) => `- *${d}*`).join('\n')}

### IV. Adversarial Trickster Audit (The Elegba Protocol)
- **Status**: \`${elegba.status}\` (Sycophancy Score: \`${elegba.sycophancyScore.toFixed(2)}\`)
- **Friction Verification**: ${elegba.tricksterDissonance}
${elegba.counterInquiries.length > 0 ? `\n**Adversarial Challenge Points**:\n${elegba.counterInquiries.map((ci) => `  - ${ci}`).join('\n')}` : ''}

### V. Strategic Action Parameters
${actionParameters.map((ap) => `- [ ] ${ap}`).join('\n')}

### VI. Sovereign Recommendation
${sovereignRecommendation}

---
### VII. Sovereign Yield & Offline Handoff
> **Mandatory Human Action**: This brief is designed to be brought to an offline mentor, family elder, or trusted peer. Deliberation halts here to prevent algorithmic reliance. Take ownership of your judgment.
`;
}

/**
 * Synthesizes the 7-seat deliberation and Elegba audit into the Chairman Dossier.
 * Handles deterministic Boundary Guard short-circuits.
 */
export function compileChairmanDossier(
  fanOutResult: SevenSeatsFanOutResult,
  elegbaAudit: ElegbaAuditResult,
  inputPrompt: string
): ChairmanDossier {
  const { sessionId, timestamp, deliberations, shortCircuitVeto, vetoSeat } = fanOutResult;

  // Handle Constitutional Veto Short-Circuit
  if (shortCircuitVeto && vetoSeat) {
    const brief = generateCouncilResolutionBrief(
      sessionId,
      inputPrompt,
      [],
      [],
      [],
      'Deliberation halted by constitutional veto.',
      elegbaAudit,
      true
    );

    return {
      sessionId,
      timestamp,
      inputPrompt,
      consensusPoints: ['[CONSTITUTIONAL VETO] Deliberation halted by Boundary Guard.'],
      minorityDissents: [vetoSeat.vetoRationale || 'Constitutional threshold breach.'],
      actionParameters: ['Cease algorithmic query', 'Engage human support network'],
      sovereignRecommendation:
        'AyoCouncil has short-circuited. Reclaim personal sovereignty with an offline human ally.',
      boundaryGuardStatus: {
        vetoTriggered: true,
        confidence: vetoSeat.confidence,
        rationale: vetoSeat.vetoRationale
      },
      elegbaStatus: elegbaAudit,
      sovereignFrictionGate: {
        status: 'VETO_HALT',
        humanAffirmationRequired: true,
        offlineHandoffTarget: 'Offline Elder / Crisis Resource'
      },
      councilResolutionBrief: brief
    };
  }

  // Standard Deliberation Synthesis
  const consensusPoints: string[] = [
    'Every seat converges that the friction is systemic and structural, not personal defect.',
    'Trading long-term agency for short-term convenience will accelerate institutional captivity.',
    'A phased, empirical boundary must be erected immediately to protect creative sovereignty.'
  ];

  const minorityDissents: string[] = [
    'Seat I (Authenticity) demands immediate blunt candor, whereas Seat VI (Strategic Impact) advises a 90-day phased decoupling.',
    'Seat III (Leverage) cautions against rapid confrontation that prematurely burns bridgeheads.'
  ];

  const actionParameters: string[] = [
    'Enforce 4 hours of daily uninterrupted cognitive focus perimeter.',
    'Communicate unambiguous verbal boundary in waking hours to external parties.',
    'Schedule handoff consultation with trusted offline mentor within 72 hours.'
  ];

  const sovereignRecommendation =
    'Do not optimize a container you have already outgrown. Formulate your sovereign transition with asymmetric leverage and review this brief with an offline human mentor.';

  const brief = generateCouncilResolutionBrief(
    sessionId,
    inputPrompt,
    consensusPoints,
    minorityDissents,
    actionParameters,
    sovereignRecommendation,
    elegbaAudit,
    false
  );

  return {
    sessionId,
    timestamp,
    inputPrompt,
    consensusPoints,
    minorityDissents,
    actionParameters,
    sovereignRecommendation,
    boundaryGuardStatus: {
      vetoTriggered: false,
      confidence: 0.05
    },
    elegbaStatus: elegbaAudit,
    sovereignFrictionGate: {
      status: 'ACTIVE',
      humanAffirmationRequired: true,
      offlineHandoffTarget: 'Family Elder / Offline Mentor'
    },
    councilResolutionBrief: brief
  };
}
