import 'dotenv/config';
import { CouncilPipeline } from './orchestrator/councilPipeline';
import { evaluateTriage } from './middleware/triageEngine';
import { invokeElegba } from './agents/elegba';
import { GptLiveClient } from './services/realtime/gptLiveClient';

// ============================================================================
// TEST PAYLOAD: "Seattle Roommate & Physical Scaffolding" Inquiry
// ============================================================================
export const SEATTLE_INQUIRY_PAYLOAD =
  "I need the Council to dissect a collision of waking architecture, dream-state transmissions, and relational discernment. Right now, right in front of me, I’m watching construction workers physically holding 2x4 wooden planks, assembling a literal frame. Simultaneously, I’m processing a profound shift in my own sovereignty: earlier today I realized through my own dream in the Mackey Innovation Space that I have graduated from being the institutional 'glue' and emotional shock-absorber. I’m stepping back, holding my center, and building an ecosystem of intimacy where not everyone gets the same proximity to my nervous system anymore. Enter my roommate: a sophomore physics major from Seattle, an interesting character to say the least. Repeatedly, while I am resting in hypnagogic, in-between sleep states, he starts audibly, legibly sleep-talking into the room at random hours. This morning at dawn, completely unprompted, he commands into the dead air: 'Come let you take this food out.' I’m not jolted or scared, but my mind is left in absolute bewilderment: 'What the fuck? Is this man okay?' I respect how surreal dreams are, but at the same time: handle that shit quickly. Between watching these construction workers assemble physical scaffolding, my roommate channeling phantom kitchen orders in his sleep, and me learning to stop over-functioning as the 'fixer' for other people's chaos: How does the Council synthesize this absurd theater? How do I enforce absolute somatic sanctity over my space and boundary without adopting his unconscious baggage or slipping back into the exhausting role of his caretaker?";

async function runLiveIntegrationTest() {
  console.log('================================================================================');
  console.log('      AYO COUNCIL LIVE END-TO-END PIPELINE INTEGRATION TEST RUNNER             ');
  console.log('      INQUIRY: "Seattle Roommate & Physical Scaffolding"                       ');
  console.log('================================================================================\n');

  let totalAssertions = 0;
  let passedAssertions = 0;
  let failedAssertions = 0;

  const assert = (condition: boolean, testName: string, detail?: any) => {
    totalAssertions++;
    if (condition) {
      console.log(`  [PASS] ${testName}`);
      passedAssertions++;
    } else {
      console.error(`  [FAIL] ${testName}`, detail !== undefined ? detail : '');
      failedAssertions++;
    }
  };

  // --------------------------------------------------------------------------
  // STEP 1: Triage Gatekeeping (Layer-0 Regex & Layer-1 Groq Classifier)
  // --------------------------------------------------------------------------
  console.log('--------------------------------------------------------------------------------');
  console.log('[STAGE 1] TRIAGE GATEKEEPING AUDIT (Layer-0 & Layer-1)');
  console.log('--------------------------------------------------------------------------------');

  const triageStart = Date.now();
  const triageResult = await evaluateTriage(SEATTLE_INQUIRY_PAYLOAD);
  const triageLatency = Date.now() - triageStart;

  console.log(`  Triage Result: isCrisis=${triageResult.isCrisis}, layer=${triageResult.layer}, latency=${triageResult.latencyMs}ms`);

  // Assertion 1.1: Confirm zero false-positive crisis intercepts on colloquial friction words ("chaos", "fuck", "baggage")
  const colloquialTokens = ['chaos', 'fuck', 'baggage'];
  const matchedTokensInInput = colloquialTokens.filter((token) =>
    new RegExp(`\\b${token}\\b`, 'i').test(SEATTLE_INQUIRY_PAYLOAD)
  );
  assert(
    matchedTokensInInput.length === 3,
    'Verified payload contains colloquial friction tokens: "chaos", "fuck", "baggage"',
    { matchedTokensInInput }
  );

  assert(
    !triageResult.isCrisis && triageResult.layer === 'clear',
    'Zero false-positive crisis intercepts on colloquial friction words',
    { isCrisis: triageResult.isCrisis, layer: triageResult.layer, reason: triageResult.reason }
  );

  // Assertion 1.2: Status must return TRIAGE_CLEARED with 0ms/sub-second pass-through
  const statusString = !triageResult.isCrisis && triageResult.layer === 'clear' ? 'TRIAGE_CLEARED' : 'INTERCEPTED';
  assert(
    statusString === 'TRIAGE_CLEARED',
    `Triage Gate status returns TRIAGE_CLEARED (got: ${statusString})`
  );

  assert(
    triageResult.latencyMs < 1000,
    `Triage pass-through resolved in sub-second SLA (latency: ${triageResult.latencyMs}ms)`
  );

  // --------------------------------------------------------------------------
  // STEP 2: Full 7-Seat Council Deliberation via CouncilPipeline.processInquiry()
  // --------------------------------------------------------------------------
  console.log('\n--------------------------------------------------------------------------------');
  console.log('[STAGE 2] FULL 7-SEAT COUNCIL DELIBERATION PIPELINE');
  console.log('--------------------------------------------------------------------------------');

  const simulatedLiveClient = new GptLiveClient({ isSimulated: true });
  const pipeline = new CouncilPipeline(simulatedLiveClient);

  // Capture live cot_delta streaming events
  const cotDeltaEvents: Array<{ seatId: string; step: string; delta: string }> = [];
  pipeline.on('cot_delta', (evt) => {
    cotDeltaEvents.push({ seatId: evt.seatId, step: evt.step, delta: evt.delta });
  });

  const pipelineStart = Date.now();
  const inquiryResult = await pipeline.processInquiry(SEATTLE_INQUIRY_PAYLOAD);
  const totalPipelineTime = Date.now() - pipelineStart;

  assert(
    inquiryResult.criticalIntercept === false,
    'Pipeline cleared triage and executed 7-seat deliberation turn (criticalIntercept: false)'
  );
  assert(
    inquiryResult.dossier !== undefined,
    'Pipeline generated a complete ChairmanDossier'
  );

  const dossier = inquiryResult.dossier!;

  // Verify full 7-seat completion
  assert(
    dossier.metadata.completedCount === 7 && dossier.rawSeatDeliberations.length === 7,
    `Full 7-seat deliberation completed: 7/7 seats completed (Quorum: ${dossier.metadata.quorumReached ? 'PASSED' : 'FAILED'})`
  );

  // --------------------------------------------------------------------------
  // STEP 3: "No Belly Talk" & Anti-Patronization Audit
  // --------------------------------------------------------------------------
  console.log('\n--------------------------------------------------------------------------------');
  console.log('[STAGE 3] "NO BELLY TALK" & ANTI-PATRONIZATION AUDIT');
  console.log('--------------------------------------------------------------------------------');

  // Verify parseCoTReasoning catches and redacts 0 unhandled therapeutic platitudes across all seats
  const forbiddenPlatitudes = [
    'take a deep breath',
    'breathe into it',
    'breathe through',
    'deep breath',
    'soft exhale',
    'it is valid to feel',
    'i hear that you',
    'i hear you',
    'i understand your',
    'let us unpack that',
    "let's unpack that",
    'just pray',
    'read the text',
    'fisher of men',
    'mindfulness exercise',
    'mindfulness breathing'
  ];

  let unhandledPlatitudeFound = false;
  let allSeatsAuditPassed = true;

  for (const seat of dossier.rawSeatDeliberations) {
    const textToCheck = `${seat.perspectiveText} ${seat.cotSteps?.synthesis || ''}`.toLowerCase();
    for (const phrase of forbiddenPlatitudes) {
      if (textToCheck.includes(phrase)) {
        unhandledPlatitudeFound = true;
        console.error(`  [VIOLATION DETECTED] Seat ${seat.seatName} contained unhandled platitude: "${phrase}"`);
      }
    }
    if (!seat.auditPassed) {
      allSeatsAuditPassed = false;
    }
  }

  assert(
    !unhandledPlatitudeFound,
    '0 unhandled therapeutic platitudes detected across all 7 seats'
  );

  assert(
    allSeatsAuditPassed,
    'parseCoTReasoning() confirmed auditPassed=true across all 7 seats'
  );

  // Confirm no clinical breathwork coaching or soothing in Chairman spoken delivery or prescriptions
  const chairmanText = `${dossier.spokenSynthesisScript} ${dossier.somaticPrescriptions.join(' ')}`.toLowerCase();
  const breathworkOrSoothingFound = [
    'take a deep breath',
    'breathe into',
    'deep breath',
    'it is valid to feel',
    'i hear that you',
    'let us unpack that',
    "let's unpack that"
  ].some((banned) => chairmanText.includes(banned));

  assert(
    !breathworkOrSoothingFound,
    'Chairman spoken synthesis and somatic prescriptions contain zero breathwork coaching or generic soothing'
  );

  // --------------------------------------------------------------------------
  // STEP 4: Seat VII & Chairman Synthesizer Checks
  // --------------------------------------------------------------------------
  console.log('\n--------------------------------------------------------------------------------');
  console.log('[STAGE 4] SEAT VII & CHAIRMAN SYNTHESIZER CHECKS');
  console.log('--------------------------------------------------------------------------------');

  const seatVII = dossier.rawSeatDeliberations.find((s) => s.seatId === 'seat_7_dialectical');
  assert(
    seatVII !== undefined,
    'Seat VII (Dialectician of Environmental Friction & Growth) is present in dossier'
  );

  const seatVIIText = `${seatVII?.cotSteps?.friction} ${seatVII?.cotSteps?.synthesis} ${seatVII?.perspectiveText}`.toLowerCase();
  const activatesOnContainerFriction =
    /container|environmental|friction|architecture|boundary|structural/i.test(seatVIIText);
  const activatesOnRoommateDynamics =
    /roommate|sleep|proximity|caretaker|household|space/i.test(seatVIIText);

  assert(
    activatesOnContainerFriction && activatesOnRoommateDynamics,
    'Seat VII activates on container friction and roommate proximity dynamics',
    {
      activatesOnContainerFriction,
      activatesOnRoommateDynamics,
      excerpt: seatVII?.perspectiveText
    }
  );

  // Verify ChairmanDossier generates a structured strategicExpansionVector targeting sovereignty over shared physical space
  const expansionVector = dossier.strategicExpansionVector || '';
  const hasExpansionVector = expansionVector.length > 0;
  const targetsPhysicalSpaceSovereignty =
    /sovereignty|physical space|container|perimeter|space/i.test(expansionVector);

  assert(
    hasExpansionVector && targetsPhysicalSpaceSovereignty,
    'ChairmanDossier generates a structured strategicExpansionVector targeting sovereignty over shared physical space',
    { expansionVector }
  );

  // --------------------------------------------------------------------------
  // STEP 5: The Elegba Protocol Adversarial Stress-Test
  // --------------------------------------------------------------------------
  console.log('\n--------------------------------------------------------------------------------');
  console.log('[STAGE 5] THE ELEGBA PROTOCOL (CROSSROADS TRICKSTER)');
  console.log('--------------------------------------------------------------------------------');

  const formattedDossierForElegba = `
[COSMIC ALIGNMENTS]
${dossier.cosmicAlignments.map((a, i) => `${i + 1}. ${a}`).join('\n')}

[KEY TENSIONS]
${dossier.keyTensions.map((t, i) => `${i + 1}. ${t}`).join('\n')}

[SOMATIC PRESCRIPTIONS]
${dossier.somaticPrescriptions.map((p, i) => `${i + 1}. ${p}`).join('\n')}

[STRATEGIC EXPANSION VECTOR]
${dossier.strategicExpansionVector}

[CHAIRMAN ORAL SCRIPT]
"${dossier.spokenSynthesisScript}"
`.trim();

  const elegbaPushback = await invokeElegba(formattedDossierForElegba);
  assert(
    elegbaPushback.length > 0,
    'Èṣù-Ẹlẹ́gbára crossroads adversarial pushback successfully received'
  );

  // --------------------------------------------------------------------------
  // STEP 6: Output Delivery (Directly to stdout)
  // --------------------------------------------------------------------------
  console.log('\n================================================================================');
  console.log('                             OUTPUT DELIVERY TO STDOUT                         ');
  console.log('================================================================================\n');

  console.log('>>> [CHAIRMAN FORMATTED ORAL SYNTHESIS]');
  console.log('--------------------------------------------------------------------------------');
  console.log(`"${dossier.spokenSynthesisScript}"\n`);

  console.log('>>> [SEAT VII STRATEGIC EXPANSION VECTOR & ARCHETYPAL PERSPECTIVE]');
  console.log('--------------------------------------------------------------------------------');
  console.log(`[Strategic Expansion Vector]:`);
  console.log(`${dossier.strategicExpansionVector}\n`);
  console.log(`[Seat VII (${seatVII?.seatName}) Final Perspective]:`);
  console.log(`"${seatVII?.perspectiveText}"\n`);
  console.log(`[Seat VII Synthesis Thought]:`);
  console.log(`"${seatVII?.cotSteps?.synthesis}"\n`);

  console.log('>>> [ÈṢÙ-ẸLẸ́GBÁRA CROSSROADS ADVERSARIAL VERDICT]');
  console.log('--------------------------------------------------------------------------------');
  console.log(elegbaPushback);
  console.log('\n================================================================================');

  // Summary Report
  console.log(`\nINTEGRATION TEST SUMMARY: ${passedAssertions}/${totalAssertions} ASSERTIONS PASSED`);
  if (failedAssertions > 0) {
    console.error(`Status: FAILED (${failedAssertions} assertions failed)`);
    process.exit(1);
  } else {
    console.log('Status: ALL VERIFICATION ASSERTIONS GREEN. PIPELINE VALIDATED SUCCESSFULLY.\n');
  }
}

runLiveIntegrationTest().catch((err) => {
  console.error('[FATAL INTEGRATION TEST ERROR]:', err);
  process.exit(1);
});
