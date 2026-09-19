import fs from 'fs';
import path from 'path';
import { AnchorSessionInput, BaseSepoliaChainAnchor } from '../src/ledger/chainAnchor';

async function runLedgerTests(): Promise<{ passed: number; failed: number }> {
  console.log('\n============================================================');
  console.log('   TEST SUITE: Glass Ledger on Base Sepolia (EIP-712)       ');
  console.log('============================================================');

  let passed = 0;
  let failed = 0;

  const testLedgerPath = path.resolve(__dirname, 'test_ledger.jsonl');
  if (fs.existsSync(testLedgerPath)) {
    fs.unlinkSync(testLedgerPath);
  }

  const anchor = new BaseSepoliaChainAnchor(testLedgerPath);

  const mockSession: AnchorSessionInput = {
    sessionId: 'session_test_84532_alpha',
    normalizedInput: 'Should I leave my tech job to build an autonomous multi-agent protocol?',
    triageAction: 'CLEAR',
    councilVotes: [
      { seatId: 'authenticity', confidence: 0.95, perspective: 'Anchor in lived cultural truth.' },
      { seatId: 'leverage', confidence: 0.92, perspective: 'Seek asymmetric leverage.' },
      { seatId: 'boundary_guard', confidence: 0.05, perspective: 'Boundaries clear.' }
    ],
    sycophancyScore: 0.04,
    elegbaStatus: 'PASSED',
    dossierRecommendation: 'Construct an empirical phased transition plan and consult offline human elders.',
    timestamp: 1774000000000
  };

  // Test 1: Generate EIP-712 Hashes & Base Sepolia Receipt
  const receipt = await anchor.anchorSession(mockSession);

  if (
    receipt.targetChain === 'Base Sepolia' &&
    receipt.chainId === 84532 &&
    receipt.status === 'CONFIRMED' &&
    receipt.txHash.startsWith('0x') &&
    receipt.txHash.length === 66 &&
    receipt.eip712Digest.startsWith('0x') &&
    receipt.triageHash.startsWith('0x') &&
    receipt.councilVotesRoot.startsWith('0x') &&
    receipt.elegbaAuditHash.startsWith('0x') &&
    receipt.chairmanDossierHash.startsWith('0x')
  ) {
    console.log(`[PASS] Test 1: Base Sepolia receipt generated with valid 32-byte EIP-712 hashes & TxHash: ${receipt.txHash.slice(0, 14)}...`);
    passed++;
  } else {
    console.error('[FAIL] Test 1: Invalid Base Sepolia receipt format', receipt);
    failed++;
  }

  // Test 2: Cryptographic Receipt Verification
  const isValid = anchor.verifyReceipt(receipt, mockSession);
  if (isValid === true) {
    console.log('[PASS] Test 2: Cryptographic verification confirmed matching EIP-712 digest and sub-hashes.');
    passed++;
  } else {
    console.error('[FAIL] Test 2: Cryptographic verification failed on matching data');
    failed++;
  }

  // Test 3: Tamper Detection (Modifying session input invalidates verification)
  const tamperedSession = { ...mockSession, dossierRecommendation: 'TAMPERED RECOMMENDATION' };
  const isTamperValid = anchor.verifyReceipt(receipt, tamperedSession);
  if (isTamperValid === false) {
    console.log('[PASS] Test 3: Tampered dossier recommendation successfully rejected by cryptographic audit.');
    passed++;
  } else {
    console.error('[FAIL] Test 3: Tampered session was falsely accepted');
    failed++;
  }

  // Test 4: Local Ledger Persistence in ledger.jsonl
  const history = await anchor.getLedgerHistory();
  if (history.length === 1 && history[0].sessionId === mockSession.sessionId) {
    console.log(`[PASS] Test 4: Entry successfully committed and retrieved from ledger file (${history.length} record).`);
    passed++;
  } else {
    console.error('[FAIL] Test 4: Ledger history retrieval failed', history);
    failed++;
  }

  // Cleanup test file
  if (fs.existsSync(testLedgerPath)) {
    fs.unlinkSync(testLedgerPath);
  }

  console.log(`\nResult: ${passed} passed, ${failed} failed.\n`);
  return { passed, failed };
}

if (require.main === module) {
  runLedgerTests().then(({ failed }) => {
    process.exit(failed > 0 ? 1 : 0);
  });
}

export { runLedgerTests };
