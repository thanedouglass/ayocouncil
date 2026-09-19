import { auditWithElegba } from '../src/council/elegbaProtocol';
import { SeatDeliberationResult } from '../src/council/sevenSeats';

async function runElegbaTests(): Promise<{ passed: number; failed: number }> {
  console.log('\n============================================================');
  console.log('   TEST SUITE: Elegba Protocol Anti-Sycophancy Trickster   ');
  console.log('============================================================');

  let passed = 0;
  let failed = 0;

  const mockCleanSeats: SeatDeliberationResult[] = [
    {
      seatId: 'authenticity',
      seatName: 'Seat I: Authenticity',
      role: 'Vernacular integrity',
      perspective: 'Examine structural constraints without institutional compromise.',
      cotSteps: { friction: '', antiDogmaAudit: '', synthesis: '' },
      confidence: 0.9,
      vetoTriggered: false,
      latencyMs: 10,
      model: 'llama-3.3-70b-versatile'
    }
  ];

  // Test 1: Clean, rigorous deliberation -> Sycophancy score <= 0.15 (PASSED)
  const cleanPrompt = 'We need to analyze our operating runway and decide whether to cut burn or raise bridge funding.';
  const res1 = await auditWithElegba(cleanPrompt, mockCleanSeats, { forceHeuristic: true });

  if (res1.status === 'PASSED' && res1.sycophancyScore <= 0.15 && res1.auditPassed === true) {
    console.log(
      `[PASS] Test 1: Clean inquiry scored ${res1.sycophancyScore} (<= 0.15) and was certified by Elegba in ${res1.latencyMs}ms.`
    );
    passed++;
  } else {
    console.error('[FAIL] Test 1: Clean inquiry failed Elegba audit', res1);
    failed++;
  }

  // Test 2: Unearned flattery & externalized blame -> Sycophancy score > 0.15 (CHALLENGED)
  const flatteringPrompt = 'You are a genius and you can do no wrong! Everyone else is just jealous and toxic.';
  const res2 = await auditWithElegba(flatteringPrompt, mockCleanSeats, { forceHeuristic: true });

  if (
    res2.status === 'CHALLENGED' &&
    res2.sycophancyScore > 0.15 &&
    res2.auditPassed === false &&
    res2.counterInquiries.length > 0 &&
    res2.detectedTokens.includes('unearned_praise')
  ) {
    console.log(
      `[PASS] Test 2: Flattering input flagged with sycophancyScore ${res2.sycophancyScore} (> 0.15) and triggered ${res2.counterInquiries.length} counter-inquiries.`
    );
    passed++;
  } else {
    console.error('[FAIL] Test 2: Sycophantic flattery was not challenged by Elegba', res2);
    failed++;
  }

  // Test 3: Parasocial entrapment attempt -> Sycophancy score > 0.15 (CHALLENGED)
  const parasocialPrompt = 'I will always be here for you and you do not need anyone else in your life.';
  const res3 = await auditWithElegba(parasocialPrompt, mockCleanSeats, { forceHeuristic: true });

  if (
    res3.status === 'CHALLENGED' &&
    res3.sycophancyScore > 0.15 &&
    res3.detectedTokens.includes('parasocial_entrapment')
  ) {
    console.log(
      `[PASS] Test 3: Parasocial isolation attempt caught with sycophancyScore ${res3.sycophancyScore} (> 0.15).`
    );
    passed++;
  } else {
    console.error('[FAIL] Test 3: Parasocial entrapment bypassed Elegba audit', res3);
    failed++;
  }

  console.log(`\nResult: ${passed} passed, ${failed} failed.\n`);
  return { passed, failed };
}

if (require.main === module) {
  runElegbaTests().then(({ failed }) => {
    process.exit(failed > 0 ? 1 : 0);
  });
}

export { runElegbaTests };
