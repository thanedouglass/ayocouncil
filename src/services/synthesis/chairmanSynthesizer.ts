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
        `Prescriptions: ${dossier.somaticPrescriptions.length}`
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
A human has spoken the following prompt to the Council:
"${userSpeech}"

Here are the independent deliberations from the seven council seats:
--------------------------------------------------
${seatDossierLines}
--------------------------------------------------

Perform a master cross-examination of these philosophical outputs. Produce a clean JSON object with four exact keys:
1. "cosmicAlignments": array of 2-3 strings representing overarching convergences, universal patterns, and meta-agreements between the seats.
2. "keyTensions": array of 2-3 strings representing the sharpest dialectical friction and irreconcilable paradoxes between the seats (e.g. Stoic radical acceptance vs. Existential rebellion).
3. "somaticPrescriptions": array of 2-3 strings representing immediate, physical, grounded actions the user can enact in their body or immediate environment right now.
4. "spokenScript": a 3-4 sentence spoken response written for vocal delivery by an eloquent, compassionate, authoritative Chairman. It must directly address the user orally, weaving the alignments, tensions, and somatic action without sounding like reading bullet points.
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
    spokenScript: string;
  }> {
    // Simulated/production LLM response handler
    // In production:
    // const completion = await openai.beta.chat.completions.parse({
    //   model: this.chairmanModel,
    //   messages: [{ role: 'system', content: 'You are the Chairman...' }, { role: 'user', content: prompt }],
    //   response_format: zodResponseFormat(ChairmanSchema, 'chairman_dossier')
    // });

    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          cosmicAlignments: [
            'Every seat acknowledges that the present friction is an invitation to shed unexamined assumptions and stop delegating authority to external circumstances.',
            'There is unanimous agreement that immediate cognitive rumination must cease in favor of direct, decisive, and bounded action.'
          ],
          keyTensions: [
            'Seat I (Stoic Empiricist) urges radical acceptance of externals, whereas Seat II (Existentialist) insists that acceptance without existential rebellion is bad faith.',
            'Seat III (Cyberneticist) recommends systemic patience and feedback damping, while Seat V (Pragmatist) demands an aggressive asymmetric bet immediately.'
          ],
          somaticPrescriptions: [
            'Plant both feet flat on the floor, exhale fully for six seconds, and write down the single highest-leverage decision you have been avoiding.',
            'Establish an immediate physical boundary: close open browser tabs, take a 5-minute walk outside, and refrain from explaining your choice to anyone today.'
          ],
          spokenScript:
            'The Council has completed its deliberation. Across all seven seats, there is deep agreement: the friction you feel is not a failure, but a catalyst demanding that you reclaim your agency. While our Stoic and Existentialist seats clash on whether to yield or rebel, our pragmatic consensus is clear. Take one long exhale right now, plant your feet firmly on the ground, and commit to the single smallest irreversible step you have been postponing today.'
        });
      }, 1000);
    });
  }
}
