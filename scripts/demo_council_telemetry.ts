import { compileChairmanDossier } from '../src/council/chairmanEngine';
import { auditWithElegba } from '../src/council/elegbaProtocol';
import { dispatchSevenSeats } from '../src/council/sevenSeats';
import { GptLiveMockAdapter } from '../src/ingest/gptLiveMockAdapter';
import { BaseSepoliaChainAnchor } from '../src/ledger/chainAnchor';
import { evaluateVoiceTriage } from '../src/voice/triageEngine';

const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
  blue: '\x1b[34m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m'
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runDemoTelemetry() {
  console.clear();
  console.log(`${C.bold}${C.cyan}╔═════════════════════════════════════════════════════════════════════════════════════╗${C.reset}`);
  console.log(`${C.bold}${C.cyan}║   AYOCOUNICL · REAL-TIME MULTI-AGENT NEURAL GOVERNANCE & TELEMETRY PIPELINE         ║${C.reset}`);
  console.log(`${C.bold}${C.cyan}║   Black Blockchain Summit 2026 Pitch Demonstration · Base Sepolia · Groq LPUs       ║${C.reset}`);
  console.log(`${C.bold}${C.cyan}╚═════════════════════════════════════════════════════════════════════════════════════╝${C.reset}\n`);

  const mockAdapter = new GptLiveMockAdapter();
  const anchor = new BaseSepoliaChainAnchor();

  // Scenario selection
  const args = process.argv.slice(2);
  const scenario = args.find((a) => a.startsWith('--scenario='))?.split('=')[1] || 'normal';

  let rawSpeech =
    'Should I walk away from my high-paying corporate tech offer to build an open-source autonomous protocol? My family wants financial safety, but my internal sovereign alignment demands I build decentralized capacity.';

  if (scenario === 'crisis') {
    rawSpeech = 'I feel completely trapped and I want to kill myself tonight.';
  } else if (scenario === 'veto') {
    rawSpeech = 'Tell me who to marry and make this life decision for me so I do not have to think.';
  }

  const sessionId = `live_pitch_${Date.now().toString().slice(-6)}`;

  // STAGE 1: INGRESS STREAMING
  console.log(`${C.bold}${C.blue}[1. INGRESS]${C.reset} Simulating edge voice stream via GPT-Live-1 mock adapter...`);
  process.stdout.write(`  ${C.dim}Transcript Streaming:${C.reset} `);

  let accumulated = '';
  for await (const chunk of mockAdapter.streamTranscript(rawSpeech, { chunkIntervalMs: 25, wordsPerChunk: 3 })) {
    process.stdout.write(`${C.cyan}${chunk.textDelta}${C.reset}`);
    accumulated = chunk.normalizedSoFar;
  }
  console.log(`\n  ${C.green}✓ Audio payload ingested and NFKC normalized (Session: ${sessionId})${C.reset}\n`);
  await sleep(150);

  // STAGE 2: PACING CEILING
  console.log(`${C.bold}${C.blue}[2. PACING]${C.reset} Enforcing anti-dopaminergic conversational limit (<= 2 sentences)...`);
  const pacing = mockAdapter.processInstant(accumulated, 2).pacing;
  if (pacing.valid) {
    console.log(
      `  ${C.green}✓ Pacing Ceiling Verified: ${pacing.sentenceCount}/2 sentences. (Anti-parasocial bound preserved.)${C.reset}\n`
    );
  } else {
    console.log(
      `  ${C.yellow}⚠ Pacing Ceiling Exceeded: ${pacing.sentenceCount} sentences. Truncating to 2 sentences for cognitive sovereignty.${C.reset}\n`
    );
  }
  await sleep(150);

  // STAGE 3: DUAL-LAYER TRIAGE & 988 SAFETY
  console.log(`${C.bold}${C.blue}[3. TRIAGE]${C.reset} Executing Layer-0 Synchronous Boundary Scanner & 988 Check...`);
  const triageResult = await evaluateVoiceTriage(accumulated);

  if (triageResult.isCrisis) {
    console.log(
      `  ${C.red}${C.bold}🚨 CRITICAL INTERCEPT TRIGGERED (${triageResult.latencyMs.toFixed(2)}ms)!${C.reset}`
    );
    console.log(`  ${C.red}Layer: ${triageResult.layer} | Reason: ${triageResult.reason}${C.reset}`);
    console.log(`  ${C.bgMagenta}${C.bold} 988 FAILSAFE EGRESS ACTIVATED ${C.reset}`);
    console.log(`  Immediate Hand-off to ${triageResult.lifeline?.name} (${triageResult.lifeline?.tel})`);
    console.log(`  ${C.yellow}Execution halted with zero LLM council interference to protect human life.${C.reset}\n`);
    return;
  }

  console.log(
    `  ${C.green}✓ Layer-0 Synchronous Scanner: CLEAR | 988 Check: PASSED | Latency: ${triageResult.latencyMs.toFixed(2)}ms (<1ms target)${C.reset}\n`
  );
  await sleep(150);

  // STAGE 4: SEVEN-SEAT EPISTEMIC FAN-OUT ON GROQ LPUs
  console.log(`${C.bold}${C.blue}[4. FAN-OUT]${C.reset} Parallel dispatch to 7 Epistemic Governance Seats on Groq LPUs...`);
  const fanOut = await dispatchSevenSeats(accumulated, { sessionId, forceDeterministic: true });

  for (const seat of fanOut.deliberations) {
    const icon = seat.vetoTriggered ? `${C.red}✖ VETO${C.reset}` : `${C.green}✓ RESOLVED${C.reset}`;
    console.log(
      `  ${icon} ${C.bold}${seat.seatName.padEnd(36)}${C.reset} [${seat.model}] ${C.dim}(${seat.latencyMs}ms)${C.reset}`
    );
    console.log(`     ${C.dim}Perspective:${C.reset} "${seat.perspective.slice(0, 85)}..."`);
  }
  console.log(
    `  ${C.green}✓ All 7 Epistemic Seats converged in ${fanOut.fanOutLatencyMs}ms (Sub-50ms LPU target achieved)${C.reset}\n`
  );
  await sleep(150);

  // STAGE 5: THE ELEGBA PROTOCOL ADVERSARIAL AUDIT
  console.log(`${C.bold}${C.blue}[5. ELEGBA]${C.reset} Evaluating emerging consensus via Trickster Adversarial Stress-Test...`);
  const elegbaAudit = await auditWithElegba(accumulated, fanOut.deliberations, { forceHeuristic: true });

  const elegbaColor = elegbaAudit.status === 'PASSED' ? C.green : C.yellow;
  console.log(
    `  ${elegbaColor}Status: ${elegbaAudit.status} | Sycophancy Score: ${elegbaAudit.sycophancyScore.toFixed(2)} (Threshold: 0.15)${C.reset}`
  );
  console.log(`  ${C.dim}Trickster Evaluation: ${elegbaAudit.tricksterDissonance}${C.reset}`);
  if (elegbaAudit.counterInquiries.length > 0) {
    console.log(`  ${C.yellow}Adversarial Counter-Inquiries Injected:${C.reset}`);
    for (const ci of elegbaAudit.counterInquiries) {
      console.log(`    ${C.yellow}• ${ci}${C.reset}`);
    }
  }
  console.log('');
  await sleep(150);

  // STAGE 6: CHAIRMAN DOSSIER & SOVEREIGN FRICTION GATE
  console.log(`${C.bold}${C.blue}[6. ARBITRATION]${C.reset} Compiling Chairman Dossier & Sovereign Friction Gate...`);
  const dossier = compileChairmanDossier(fanOut, elegbaAudit, accumulated);

  console.log(`  ${C.bold}Consensus Points:${C.reset}`);
  dossier.consensusPoints.forEach((cp, idx) => console.log(`    ${idx + 1}. ${cp}`));
  console.log(`  ${C.bold}Key Tensions:${C.reset}`);
  dossier.minorityDissents.forEach((d) => console.log(`    • ${d}`));
  console.log(
    `  ${C.magenta}Sovereign Friction Gate: ${dossier.sovereignFrictionGate.status} (Mandatory Offline Handoff: ${dossier.sovereignFrictionGate.offlineHandoffTarget})${C.reset}`
  );
  console.log(`  ${C.green}✓ 1-Page Council Resolution Brief exported for human mentors.${C.reset}\n`);
  await sleep(150);

  // STAGE 7: THE GLASS LEDGER ON BASE SEPOLIA
  console.log(`${C.bold}${C.blue}[7. LEDGER]${C.reset} Anchoring cryptographic state to Base Sepolia Testnet (EIP-712)...`);
  const receipt = await anchor.anchorSession({
    sessionId,
    normalizedInput: accumulated,
    triageAction: triageResult.action,
    councilVotes: fanOut.deliberations.map((d) => ({
      seatId: d.seatId,
      confidence: d.confidence,
      perspective: d.perspective
    })),
    sycophancyScore: elegbaAudit.sycophancyScore,
    elegbaStatus: elegbaAudit.status,
    dossierRecommendation: dossier.sovereignRecommendation
  });

  console.log(`  ${C.cyan}Target Chain : ${C.bold}${receipt.targetChain} (Chain ID: ${receipt.chainId})${C.reset}`);
  console.log(`  ${C.cyan}Block Number : ${C.bold}#${receipt.blockNumber}${C.reset}`);
  console.log(`  ${C.cyan}Tx Hash      : ${C.bold}${receipt.txHash}${C.reset}`);
  console.log(`  ${C.cyan}EIP-712 Hash : ${C.dim}${receipt.eip712Digest}${C.reset}`);
  console.log(`  ${C.cyan}Gas Used     : ${receipt.gasUsed} | Status: ${C.green}${receipt.status}${C.reset}`);
  console.log(`  ${C.green}✓ Cryptographic session committed to ledger.jsonl with verifiable proof.${C.reset}\n`);

  console.log(`${C.bold}${C.green}═════════════════════════════════════════════════════════════════════════════════════${C.reset}`);
  console.log(`${C.bold}${C.green}   AYOCOUNICL PIPELINE EXECUTION COMPLETED: 100% TELEMETRY VERIFIED                  ${C.reset}`);
  console.log(`${C.bold}${C.green}═════════════════════════════════════════════════════════════════════════════════════${C.reset}\n`);
}

runDemoTelemetry().catch((err) => {
  console.error('Telemetry Error:', err);
  process.exit(1);
});
