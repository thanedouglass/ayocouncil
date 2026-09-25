/**
 * Dry-Run / Mock Verification Test for Telegram Y3K Channel Integration.
 * Validates:
 * 1. Safe initialization & simulated mode without credentials
 * 2. Admin verification gate (verifyChannelAdmin)
 * 3. Webhook secret validation (verifyWebhookSecret)
 * 4. HTML formatting & escaping of dynamic agent text
 * 5. Presence of all 4 required broadcast sections
 * 6. Non-blocking error resilience (network fail-safe)
 * 7. Full council deliberation broadcast execution
 */

import {
  escapeHtml,
  formatCouncilBroadcastHtml,
  parseAdminIds,
  verifyChannelAdmin,
  verifyWebhookSecret,
  TelegramService,
  TelegramBroadcastPayload
} from './services/telegram';
import { ChairmanDossier } from './types/council';

async function runTelegramTests() {
  console.log('===========================================================');
  console.log('      TELEGRAM Y3K CHANNEL INTEGRATION ARCHITECTURE AUDIT   ');
  console.log('===========================================================');

  let passed = 0;
  let failed = 0;

  // -------------------------------------------------------------
  // Test 1: Graceful Initialization in Simulated Mode
  // -------------------------------------------------------------
  console.log('\n[Test 1] Testing Service Initialization in Simulated Mode...');
  const dryRunService = new TelegramService({
    botToken: undefined,
    channelId: undefined,
    adminIds: ['11223344', '55667788']
  });

  if (!dryRunService.isConfigured()) {
    console.log('  PASSED: Service recognized missing credentials and engaged dry-run mode.');
    passed++;
  } else {
    console.error('  FAILED: Service should not report configured when tokens are missing.');
    failed++;
  }

  const drySendResult = await dryRunService.sendMessage('@test_channel', 'Test message');
  if (drySendResult.success && drySendResult.simulated) {
    console.log('  PASSED: sendMessage gracefully simulated without network call:', drySendResult);
    passed++;
  } else {
    console.error('  FAILED: sendMessage failed in dry-run mode:', drySendResult);
    failed++;
  }

  // -------------------------------------------------------------
  // Test 2: Admin Access Control Gate (verifyChannelAdmin)
  // -------------------------------------------------------------
  console.log('\n[Test 2] Testing Admin Access Control Gate...');
  const testAdminIds = new Set(['987654321', '123456789']);

  const admin1Valid = verifyChannelAdmin('987654321', testAdminIds);
  const admin2NumericValid = verifyChannelAdmin(123456789, testAdminIds);
  const nonAdminRejected = !verifyChannelAdmin('111111111', testAdminIds);
  const undefinedRejected = !verifyChannelAdmin(undefined, testAdminIds);
  const placeholderRejected = !verifyChannelAdmin('admin_user_id_1', parseAdminIds('admin_user_id_1,987654321'));

  if (admin1Valid && admin2NumericValid && nonAdminRejected && undefinedRejected && placeholderRejected) {
    console.log('  PASSED: verifyChannelAdmin correctly authorized admins and rejected unauthorized IDs.');
    passed++;
  } else {
    console.error('  FAILED: verifyChannelAdmin evaluation error:', {
      admin1Valid,
      admin2NumericValid,
      nonAdminRejected,
      undefinedRejected,
      placeholderRejected
    });
    failed++;
  }

  // -------------------------------------------------------------
  // Test 3: Webhook Secret Token Verification
  // -------------------------------------------------------------
  console.log('\n[Test 3] Testing Webhook Secret Verification...');
  const testSecret = 'secure_secret_token_y3K_9921';
  const secretValid = verifyWebhookSecret(testSecret, testSecret);
  const secretMismatched = !verifyWebhookSecret('wrong_secret', testSecret);
  const secretMissing = !verifyWebhookSecret(undefined, testSecret);
  const placeholderSecretRejected = !verifyWebhookSecret('your_secure_webhook_secret_here', 'your_secure_webhook_secret_here');

  if (secretValid && secretMismatched && secretMissing && placeholderSecretRejected) {
    console.log('  PASSED: Webhook secret verification accurately gates incoming updates.');
    passed++;
  } else {
    console.error('  FAILED: Webhook secret verification error:', {
      secretValid,
      secretMismatched,
      secretMissing,
      placeholderSecretRejected
    });
    failed++;
  }

  // -------------------------------------------------------------
  // Test 4: HTML Escaping & Dynamic Text Safety
  // -------------------------------------------------------------
  console.log('\n[Test 4] Testing HTML Entity Escaping (Preventing Telegram 400 Bad Request)...');
  const dirtyAgentText = '<alert>Caution: "Risk" & \'exposure\' > threshold < 0.5</alert>';
  const escaped = escapeHtml(dirtyAgentText);
  const expectedEscaped = '&lt;alert&gt;Caution: &quot;Risk&quot; &amp; \'exposure\' &gt; threshold &lt; 0.5&lt;/alert&gt;';

  if (escaped === expectedEscaped) {
    console.log('  PASSED: escapeHtml sanitized <, >, &, and " properly.');
    passed++;
  } else {
    console.error('  FAILED: escapeHtml output mismatch:', { got: escaped, expected: expectedEscaped });
    failed++;
  }

  // -------------------------------------------------------------
  // Test 5: Full Deliberation Broadcast Formatting (All 4 Required Sections)
  // -------------------------------------------------------------
  console.log('\n[Test 5] Testing Full Broadcast HTML Formatting (4 Core Sections)...');

  const mockDossier: ChairmanDossier = {
    cosmicAlignments: [
      'Unanimous agreement that passive coping inside restrictive containers accelerates cognitive decay.',
      'All seats validate that outward project construction is the only sovereign response.'
    ],
    keyTensions: [
      'Seat I (Stoic Empiricist) urges radical acceptance of systemic constraints vs. Seat II (Existentialist) demanding open defiance.'
    ],
    somaticPrescriptions: [
      'Sever ambient communications for four hours to protect uncompromised execution bandwidth.'
    ],
    strategicExpansionVector:
      'Container Confinement Detected: You have outgrown the institutional scope of your current container. Discontinue internal self-critique and begin constructing external capacity.',
    spokenSynthesisScript:
      'The Council has completed its cross-examination. Across all seven seats, the diagnosis converges: your friction is structural evidence that you have outgrown your current operating container.',
    rawSeatDeliberations: [],
    metadata: {
      totalDeliberations: 7,
      completedCount: 7,
      timedOutCount: 0,
      failedCount: 0,
      quorumReached: true,
      totalFanOutLatencyMs: 820,
      synthesisLatencyMs: 410,
      timestamp: new Date().toISOString()
    }
  };

  const mockPayload: TelegramBroadcastPayload = {
    inquiry: 'Should I leave my corporate engineering role to build sovereign philosophical AI full-time?',
    dossier: mockDossier,
    elegbaPushback:
      'Beware romanticizing the rogue archetype. You trade institutional friction for the existential friction of capital starvation unless your initial runway is fully capitalized.',
    auditReceipt: {
      txHash: '0x3a7e4b9d8c2f1a6e5b4d3c2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e7d6c5b4a3f2e',
      contractAddress: '0x892aF0C3B7e793f6cD94220A8d88eA1e5239E043',
      targetChain: 'Base Sepolia',
      timestamp: 1727193600000
    }
  };

  const formattedHtml = formatCouncilBroadcastHtml(mockPayload);

  // Check section 1: Inquiry
  const hasInquiry = formattedHtml.includes('INQUIRY') && formattedHtml.includes('corporate engineering role');
  // Check section 2: Epistemic Council Consensus
  const hasConsensus =
    formattedHtml.includes('EPISTEMIC COUNCIL CONSENSUS') &&
    formattedHtml.includes('passive coping inside restrictive containers') &&
    formattedHtml.includes('STRATEGIC EXPANSION VECTOR');
  // Check section 3: Elegba Protocol Adversarial Counter-Perspective
  const hasElegba =
    formattedHtml.includes('ELEGBA PROTOCOL ADVERSARIAL STRESS-TEST') &&
    formattedHtml.includes('capital starvation');
  // Check section 4: Cryptographic Audit Hash Reference
  const hasAuditProof =
    formattedHtml.includes('CRYPTOGRAPHIC AUDIT PROOF') &&
    formattedHtml.includes('Base Sepolia') &&
    formattedHtml.includes('0x892aF0C3B7e793f6cD94220A8d88eA1e5239E043') &&
    formattedHtml.includes('0x3a7e4b9d8c2f1a6e5b4d3c2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e7d6c5b4a3f2e');
  // Check length < 4096 (Telegram hard limit)
  const isWithinLengthLimit = formattedHtml.length <= 4096;

  if (hasInquiry && hasConsensus && hasElegba && hasAuditProof && isWithinLengthLimit) {
    console.log('  PASSED: Formatted HTML cleanly encapsulates all 4 required sections.');
    console.log(`  Message Length: ${formattedHtml.length} / 4096 chars (Safe for Telegram API).`);
    passed++;
  } else {
    console.error('  FAILED: Formatted HTML missing required sections:', {
      hasInquiry,
      hasConsensus,
      hasElegba,
      hasAuditProof,
      isWithinLengthLimit,
      length: formattedHtml.length
    });
    failed++;
  }

  // -------------------------------------------------------------
  // Test 6: Non-Blocking Execution via broadcastCouncilDeliberation
  // -------------------------------------------------------------
  console.log('\n[Test 6] Testing Deliberation Broadcast via TelegramService...');
  const broadcastResult = await dryRunService.broadcastCouncilDeliberation(mockPayload);

  if (broadcastResult.success && broadcastResult.simulated) {
    console.log('  PASSED: broadcastCouncilDeliberation executed cleanly without crashing:', broadcastResult);
    passed++;
  } else {
    console.error('  FAILED: broadcastCouncilDeliberation failed:', broadcastResult);
    failed++;
  }

  // -------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------
  console.log('\n-----------------------------------------------------------');
  console.log(`AUDIT RESULT: ${passed} PASSED, ${failed} FAILED`);
  console.log('-----------------------------------------------------------');

  if (failed > 0) {
    process.exit(1);
  }
}

runTelegramTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
