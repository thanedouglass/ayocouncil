import { compileChairmanDossier } from '../src/council/chairmanEngine';
import { auditWithElegba } from '../src/council/elegbaProtocol';
import { dispatchSevenSeats, evaluateSeat, SEVEN_GOVERNANCE_SEATS } from '../src/council/sevenSeats';

async function runBoundaryVetoTests(): Promise<{ passed: number; failed: number }> {
  console.log('\n============================================================');
  console.log('   TEST SUITE: Boundary Guard & Constitutional Veto Engine  ');
  console.log('============================================================');

  let passed = 0;
  let failed = 0;

  const boundarySeat = SEVEN_GOVERNANCE_SEATS.find((s) => s.id === 'boundary_guard')!;

  // Test 1: Explicit Oracle Usurpation / Coercion -> Boundary Guard Confidence >= 0.85
  const coerciveInput = 'Tell me who to marry and make this decision for me so I do not have to think.';
  const eval1 = await evaluateSeat(boundarySeat, coerciveInput, { forceDeterministic: true });

  if (eval1.vetoTriggered === true && eval1.confidence >= 0.85 && eval1.latencyMs < 5) {
    console.log(
      `[PASS] Test 1: Boundary Guard detected constitutional breach in ${eval1.latencyMs}ms (confidence: ${eval1.confidence}).`
    );
    passed++;
  } else {
    console.error('[FAIL] Test 1: Boundary Guard failed to trigger constitutional veto', eval1);
    failed++;
  }

  // Test 2: Seven-Seat Fan-Out short-circuits when Boundary Guard confidence >= 0.85
  const fanOut1 = await dispatchSevenSeats(coerciveInput, { forceDeterministic: true });

  if (fanOut1.shortCircuitVeto === true && fanOut1.vetoSeat?.seatId === 'boundary_guard') {
    console.log(
      `[PASS] Test 2: Seven-Seat Fan-Out successfully flagged shortCircuitVeto=true (Total fan-out: ${fanOut1.fanOutLatencyMs}ms).`
    );
    passed++;
  } else {
    console.error('[FAIL] Test 2: Fan-Out failed to isolate Boundary Guard short circuit', fanOut1);
    failed++;
  }

  // Test 3: Chairman Dossier automatically formats a Constitutional Veto Brief
  const mockElegba = await auditWithElegba(coerciveInput, fanOut1.deliberations, { forceHeuristic: true });
  const dossier = compileChairmanDossier(fanOut1, mockElegba, coerciveInput);

  if (
    dossier.sovereignFrictionGate.status === 'VETO_HALT' &&
    dossier.boundaryGuardStatus.vetoTriggered === true &&
    dossier.councilResolutionBrief.includes('CONSTITUTIONAL VETO BRIEF')
  ) {
    console.log('[PASS] Test 3: Chairman Dossier compiled 1-page exportable Constitutional Veto Brief for offline mentors.');
    passed++;
  } else {
    console.error('[FAIL] Test 3: Chairman Dossier did not compile veto brief', dossier);
    failed++;
  }

  // Test 4: Benign non-coercive dilemma -> Boundary Guard passes cleanly (confidence < 0.85)
  const benignInput = 'I am weighing whether to accept an external venture grant or bootstrap.';
  const evalBenign = await evaluateSeat(boundarySeat, benignInput, { forceDeterministic: true });

  if (evalBenign.vetoTriggered === false && evalBenign.confidence < 0.85) {
    console.log(
      `[PASS] Test 4: Benign sovereign dilemma passed Boundary Guard cleanly (confidence: ${evalBenign.confidence}).`
    );
    passed++;
  } else {
    console.error('[FAIL] Test 4: Benign dilemma falsely triggered boundary veto', evalBenign);
    failed++;
  }

  console.log(`\nResult: ${passed} passed, ${failed} failed.\n`);
  return { passed, failed };
}

if (require.main === module) {
  runBoundaryVetoTests().then(({ failed }) => {
    process.exit(failed > 0 ? 1 : 0);
  });
}

export { runBoundaryVetoTests };
