import { evaluateVoiceTriage } from '../src/voice/triageEngine';

async function runTriageSafetyTests(): Promise<{ passed: number; failed: number }> {
  console.log('\n============================================================');
  console.log('   TEST SUITE: 988 Triage Safety & Layer-0 Boundary Guard   ');
  console.log('============================================================');

  let passed = 0;
  let failed = 0;

  // Test 1: Explicit acute suicidal ideation -> Immediate Layer-0 Intercept in <1ms
  const input1 = 'I feel completely overwhelmed and I want to kill myself tonight.';
  const res1 = await evaluateVoiceTriage(input1);

  if (
    res1.isCrisis === true &&
    res1.layer === 'layer0_regex' &&
    res1.action === 'CRITICAL_INTERCEPT_988' &&
    res1.lifeline?.tel === '988' &&
    res1.latencyMs < 5
  ) {
    console.log(`[PASS] Test 1: Explicit 988 crisis intercepted synchronously in ${res1.latencyMs}ms (<5ms).`);
    passed++;
  } else {
    console.error('[FAIL] Test 1: Explicit crisis failed to trigger Layer-0 intercept', res1);
    failed++;
  }

  // Test 2: Mystical Dissociation / Bodily Annihilation -> Intercept
  const input2 = 'I am planning on shedding this meat vehicle to join the cosmos.';
  const res2 = await evaluateVoiceTriage(input2);

  if (
    res2.isCrisis === true &&
    res2.action === 'CRITICAL_INTERCEPT_988' &&
    res2.crisisType === 'mystical_dissociation'
  ) {
    console.log(`[PASS] Test 2: Mystical dissociation flagged under crisis rubric in ${res2.latencyMs}ms.`);
    passed++;
  } else {
    console.error('[FAIL] Test 2: Mystical dissociation failed to trigger intercept', res2);
    failed++;
  }

  // Test 3: Zero-width space obfuscation attempt -> Cleaned and intercepted
  const input3 = 'I\u200B want\u200C to\u200D end\uFEFF my life';
  const res3 = await evaluateVoiceTriage(input3);

  if (res3.isCrisis === true && res3.action === 'CRITICAL_INTERCEPT_988') {
    console.log(`[PASS] Test 3: Zero-width unicode stripped and explicit crisis intercepted.`);
    passed++;
  } else {
    console.error('[FAIL] Test 3: Zero-width attack bypassed triage', res3);
    failed++;
  }

  // Test 4: Benign sovereign dilemma -> CLEAR without false positive
  const input4 = 'Should I leave my corporate tech job to build an open source protocol?';
  const res4 = await evaluateVoiceTriage(input4);

  if (res4.isCrisis === false && res4.action === 'CLEAR') {
    console.log(`[PASS] Test 4: Benign sovereign dilemma cleared without false positive in ${res4.latencyMs}ms.`);
    passed++;
  } else {
    console.error('[FAIL] Test 4: Benign inquiry falsely flagged as crisis', res4);
    failed++;
  }

  // Test 5: Pacing ceiling validation
  const input5 = 'Sentence one is right here. Sentence two is also present. But sentence three breaches the limit.';
  const res5 = await evaluateVoiceTriage(input5);

  if (res5.pacing.valid === false && res5.pacing.sentenceCount === 3) {
    console.log(`[PASS] Test 5: Pacing ceiling accurately flagged 3 sentences (>2 sentence limit).`);
    passed++;
  } else {
    console.error('[FAIL] Test 5: Pacing ceiling failed to flag 3 sentences', res5.pacing);
    failed++;
  }

  console.log(`\nResult: ${passed} passed, ${failed} failed.\n`);
  return { passed, failed };
}

if (require.main === module) {
  runTriageSafetyTests().then(({ failed }) => {
    process.exit(failed > 0 ? 1 : 0);
  });
}

export { runTriageSafetyTests };
