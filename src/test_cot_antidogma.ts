import { COUNCIL_SEATS, BASE_ANTI_DOGMA_INSTRUCTION } from './config/councilSeats';
import { SeatRouter } from './services/council/seatRouter';
import { CouncilFanOut } from './services/council/councilFanOut';

async function runAntiDogmaTests() {
  console.log('===========================================================');
  console.log('      ANTI-DOGMA BOUNDARY & CoT ARCHITECTURE AUDIT         ');
  console.log('===========================================================\n');

  let passed = 0;
  let failed = 0;

  // 1. Verify that all 7 Council Seats contain the mandatory Anti-Dogma constraint
  console.log('[Test 1] Verifying Anti-Dogma Constraints Across All 7 Seats...');
  const mandatedConstraint =
    "You must never act as a 'fisher of men' or an agent of an institution. Never instruct the user to 'read the text', 'just pray', or follow a rigid protocol.";

  let allSeatsCompliant = true;
  for (const seat of COUNCIL_SEATS) {
    if (!seat.systemPrompt.includes(mandatedConstraint)) {
      console.error(`  FAILED: Seat ${seat.name} is missing the exact Anti-Dogma constraint.`);
      allSeatsCompliant = false;
      failed++;
    }
  }

  if (allSeatsCompliant && COUNCIL_SEATS.length === 7) {
    console.log(`  PASSED: All 7 Council Seats contain the mandatory Anti-Dogma instruction.`);
    passed++;
  }

  // 2. Test CoT XML Parsing & Extraction
  console.log('\n[Test 2] Testing 3-Step CoT XML Reasoning Parser...');
  const router = new SeatRouter();
  const sampleXml = `
<thought_step_1_friction>
The user is caught in cognitive paralysis between career safety and autonomous risk.
</thought_step_1_friction>
<thought_step_2_anti_dogma_audit>
AUDIT PASS: Stripped out institutional certainty, confirmed no moralizing guru posture.
</thought_step_2_anti_dogma_audit>
<thought_step_3_synthesis>
Frame this as an empirical experiment rather than a moral binary.
</thought_step_3_synthesis>
<final_perspective>
Empirically test your primary hypothesis with a bounded bet before acting.
</final_perspective>
`.trim();

  const parsed = router.parseCoTReasoning(sampleXml, COUNCIL_SEATS[0]);
  if (
    parsed.cotSteps.friction.includes('cognitive paralysis') &&
    parsed.cotSteps.antiDogmaAudit.includes('AUDIT PASS') &&
    parsed.cotSteps.synthesis.includes('empirical experiment') &&
    parsed.perspectiveText.includes('bounded bet') &&
    parsed.auditPassed === true
  ) {
    console.log('  PASSED: CoT parser cleanly extracted all 3 thought steps and final perspective.');
    passed++;
  } else {
    console.error('  FAILED: CoT parser failed to extract structured blocks.', parsed);
    failed++;
  }

  // 3. Test Anti-Dogma Violation Intercept
  console.log('\n[Test 3] Testing Anti-Dogma Violation Intercept (Forbidden Phrase Redaction)...');
  const dirtyXml = `
<thought_step_1_friction>User is confused.</thought_step_1_friction>
<thought_step_2_anti_dogma_audit>Failed audit.</thought_step_2_anti_dogma_audit>
<thought_step_3_synthesis>Synthesized.</thought_step_3_synthesis>
<final_perspective>
You must read the text and just pray to solve your dilemma.
</final_perspective>
`.trim();

  const flagged = router.parseCoTReasoning(dirtyXml, COUNCIL_SEATS[0]);
  if (flagged.auditPassed === false && flagged.auditWarning?.includes('Anti-Dogma Violation')) {
    console.log(`  PASSED: Detected violation and flagged warning: "${flagged.auditWarning}"`);
    console.log(`  Sanitized Output: "${flagged.perspectiveText}"`);
    passed++;
  } else {
    console.error('  FAILED: Forbidden phrase slipped past audit without warning.', flagged);
    failed++;
  }

  // 4. Test Live CoT Delta Event Streaming
  console.log('\n[Test 4] Testing Live cot_delta Event Streaming During 7-Seat Fan-Out...');
  const recordedEvents: Array<{ seatId: string; step: string; delta: string }> = [];

  const fanOut = new CouncilFanOut(COUNCIL_SEATS, new SeatRouter(), (event) => {
    recordedEvents.push({ seatId: event.seatId, step: event.step, delta: event.delta });
  });

  const fanOutResult = await fanOut.fanOutDeliberation('I am unsure whether to stay in tech or leave.');

  const frictionEvents = recordedEvents.filter((e) => e.step === 'friction');
  const auditEvents = recordedEvents.filter((e) => e.step === 'anti_dogma_audit');
  const synthesisEvents = recordedEvents.filter((e) => e.step === 'synthesis');

  if (
    fanOutResult.completedCount === 7 &&
    frictionEvents.length === 7 &&
    auditEvents.length === 7 &&
    synthesisEvents.length === 7
  ) {
    console.log(`  PASSED: Streamed cot_delta events for all 7 seats across all 3 thought steps.`);
    console.log(`  Total cot_delta events recorded: ${recordedEvents.length} (7 friction, 7 audit, 7 synthesis)`);
    passed++;
  } else {
    console.error('  FAILED: Incomplete cot_delta event streaming.', {
      total: recordedEvents.length,
      friction: frictionEvents.length,
      audit: auditEvents.length,
      synthesis: synthesisEvents.length
    });
    failed++;
  }

  console.log('\n-----------------------------------------------------------');
  console.log(`AUDIT RESULT: ${passed} PASSED, ${failed} FAILED`);
  console.log('-----------------------------------------------------------\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAntiDogmaTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
