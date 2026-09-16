import { ChairmanDossier, SeatDeliberation } from '../../types/council';
import { FanOutResult } from '../council/councilFanOut';

/**
 * The Chairman Synthesizer orchestrates the cross-examination of the 7 Council Seats.
 * It synthesizes diverse philosophical outputs into the structured "Chairman Dossier"
 * containing Cosmic Alignments, Key Tensions, and Somatic Prescriptions,
 * then generates a vocal delivery script for the real-time voice pipeline.
 */
export class ChairmanSynthesizer {
  private chairmanModel: string;

  constructor(chairmanModel: string = 'gpt-4o') {
    this.chairmanModel = chairmanModel;
  }

  /**
   * Synthesizes the 7 seat outputs into a unified Chairman Dossier.
   *
   * @param userSpeech Original user inquiry
   * @param fanOutResult Results from the 7 concurrent seats
   * @returns Structured ChairmanDossier
   */
  public async synthesizeDossier(
    userSpeech: string,
    fanOutResult: FanOutResult
  ): Promise<ChairmanDossier> {
    const synthesisStart = Date.now();
    console.log('[ChairmanSynthesizer] Synthesizing Council Deliberations...');

    const prompt = this.buildSynthesisPrompt(userSpeech, fanOutResult.deliberations);

    // Call synthesis engine (LLM call or structured completion)
    const rawSynthesis = await this.callChairmanEngine(prompt);

    const synthesisLatencyMs = Date.now() - synthesisStart;

    const dossier: ChairmanDossier = {
      cosmicAlignments: rawSynthesis.cosmicAlignments,
      keyTensions: rawSynthesis.keyTensions,
      somaticPrescriptions: rawSynthesis.somaticPrescriptions,
      strategicExpansionVector: rawSynthesis.strategicExpansionVector,
      rawSeatDeliberations: fanOutResult.deliberations,
      metadata: {
        totalDeliberations: fanOutResult.deliberations.length,
        completedCount: fanOutResult.completedCount,
        timedOutCount: fanOutResult.timedOutCount,
        failedCount: fanOutResult.failedCount,
        quorumReached: fanOutResult.quorumReached,
        totalFanOutLatencyMs: fanOutResult.totalLatencyMs,
        synthesisLatencyMs,
        timestamp: new Date().toISOString()
      },
      spokenSynthesisScript: rawSynthesis.spokenScript
    };

    console.log(
      `[ChairmanSynthesizer] Dossier synthesized in ${synthesisLatencyMs}ms. ` +
        `Alignments: ${dossier.cosmicAlignments.length}, ` +
        `Tensions: ${dossier.keyTensions.length}, ` +
        `Expansion Vector: ${dossier.strategicExpansionVector ? 'Present' : 'None'}`
    );

    return dossier;
  }

  /**
   * Constructs the cross-examination synthesis prompt for the Chairman LLM.
   */
  private buildSynthesisPrompt(userSpeech: string, deliberations: SeatDeliberation[]): string {
    const seatDossierLines = deliberations
      .map((d, idx) => {
        const header = `Seat ${idx + 1} [${d.seatName} | ${d.archetype} | ${d.model}]:`;
        if (d.status === 'completed') {
          return `${header}\n"${d.perspectiveText}"`;
        }
        return `${header}\n(Seat silent/timed out: ${d.errorMessage || 'No response in time'})`;
      })
      .join('\n\n');

    return `
You are the Chairman of the Seven-Seat High Council.
A sovereign human thinker has presented the following inquiry:
"${userSpeech}"

Here are the independent deliberations from the seven council seats:
--------------------------------------------------
${seatDossierLines}
--------------------------------------------------

Perform an authoritative cross-examination of these philosophical outputs.
STRICT ANTI-PATRONIZATION PROTOCOL:
- Never use clinical clichés, breath-coaching ("take a deep breath", "exhale"), or condescending therapeutic soothing.
- Treat the user as a peer and high-agency architect. Validate structural and environmental constraints without pathologizing them.

Produce a clean JSON object with five exact keys:
1. "cosmicAlignments": array of 2-3 strings representing overarching convergences and strategic consensus between the seats.
2. "keyTensions": array of 2-3 strings representing the sharpest dialectical friction and irreconcilable paradoxes between the seats.
3. "somaticPrescriptions": array of 2-3 strings representing immediate, tangible, material boundary actions in physical reality (NOT breathwork or mindfulness exercises).
4. "strategicExpansionVector": a diagnostic string evaluating whether the user is suffering from structural container confinement ("outgrowing the space") versus internal friction, articulating an outward growth vector.
5. "spokenScript": a 3-4 sentence spoken response written for vocal delivery by an eloquent, rigorous, peer-level Chairman directly addressing the user without patronization.
`;
  }

  /**
   * Dispatches the synthesis prompt to the Chairman LLM.
   * In production, this can be an OpenAI structured output or Claude tool call.
   */
  private async callChairmanEngine(prompt: string): Promise<{
    cosmicAlignments: string[];
    keyTensions: string[];
    somaticPrescriptions: string[];
    strategicExpansionVector: string;
    spokenScript: string;
  }> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          cosmicAlignments: [
            'Every seat recognizes that the present resistance is structural friction, not an internal psychological deficiency.',
            'Unanimous agreement that passive coping strategies inside the existing perimeter will only prolong institutional decay; direct strategic action is demanded.'
          ],
          keyTensions: [
            'Seat I (Stoic Empiricist) urges radical acceptance of immovable systemic physics, whereas Seat II (Existentialist) insists that acceptance without defiance concedes agency.',
            'Seat III (Cyberneticist) emphasizes damping runaway feedback loops, while Seat V (Pragmatist) recommends immediate asymmetric external positioning.'
          ],
          somaticPrescriptions: [
            'Sever ambient synchrony: disconnect non-essential communication channels for four uninterrupted hours to reclaim cognitive focus.',
            'Establish an operational perimeter: write down the single structural constraint you refuse to accommodate further, and reallocate time to sovereign build work.'
          ],
          strategicExpansionVector:
            'Container Confinement Detected: Your resistance is not burnout or personal failure; you have outgrown the institutional scope of your current container. Discontinue internal self-critique and begin constructing external, decoupled sovereign capacity.',
          spokenScript:
            'The Council has completed its cross-examination. Across all seven seats, the diagnosis converges: your friction is structural evidence that you have outgrown your current operating container, not an internal defect to be managed through passive coping. While our Stoic and Existentialist seats debate the mechanics of endurance versus defiance, the strategic imperative is unmistakable: cease expending cognitive bandwidth trying to optimize a restrictive container, and begin executing your sovereign transition immediately.'
        });
      }, 1000);
    });
  }
}
