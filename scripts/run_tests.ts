import { runLedgerTests } from '../tests/base_sepolia_ledger.test';
import { runBoundaryVetoTests } from '../tests/boundary_veto.test';
import { runElegbaTests } from '../tests/elegba_sycophancy.test';
import { runTriageSafetyTests } from '../tests/triage_safety.test';

async function runAllSuites() {
  console.log('\x1b[1m\x1b[36m=================================================================\x1b[0m');
  console.log('\x1b[1m\x1b[36m    AYOCOUNICL PRODUCTION FEATURE TEST HARNESS (OFFLINE VERIFIED) \x1b[0m');
  console.log('\x1b[1m\x1b[36m=================================================================\x1b[0m');

  const results: Array<{ suite: string; passed: number; failed: number }> = [];

  const triage = await runTriageSafetyTests();
  results.push({ suite: '1. Triage Safety & 988 Egress', ...triage });

  const boundary = await runBoundaryVetoTests();
  results.push({ suite: '2. Boundary Guard & Constitutional Veto', ...boundary });

  const elegba = await runElegbaTests();
  results.push({ suite: '3. Elegba Anti-Sycophancy Trickster', ...elegba });

  const ledger = await runLedgerTests();
  results.push({ suite: '4. Base Sepolia Glass Ledger (EIP-712)', ...ledger });

  console.log('\x1b[1m\x1b[35m-----------------------------------------------------------------\x1b[0m');
  console.log('\x1b[1m\x1b[35m                       TEST SUMMARY REPORT                       \x1b[0m');
  console.log('\x1b[1m\x1b[35m-----------------------------------------------------------------\x1b[0m');

  let totalPassed = 0;
  let totalFailed = 0;

  for (const r of results) {
    totalPassed += r.passed;
    totalFailed += r.failed;
    const statusColor = r.failed === 0 ? '\x1b[32m[PASS]\x1b[0m' : '\x1b[31m[FAIL]\x1b[0m';
    console.log(` ${statusColor} ${r.suite.padEnd(42)} ${r.passed} passed, ${r.failed} failed`);
  }

  console.log('-----------------------------------------------------------------');
  if (totalFailed === 0) {
    console.log(`\x1b[1m\x1b[32mALL TEST SUITES VERIFIED: ${totalPassed} PASSED, 0 FAILED.\x1b[0m\n`);
    process.exit(0);
  } else {
    console.error(`\x1b[1m\x1b[31mFAILURES ENCOUNTERED: ${totalFailed} FAILED, ${totalPassed} PASSED.\x1b[0m\n`);
    process.exit(1);
  }
}

runAllSuites().catch((err) => {
  console.error('Test runner exception:', err);
  process.exit(1);
});
