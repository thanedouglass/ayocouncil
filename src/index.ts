import 'dotenv/config';

// -------------------------------------------------------------
// STARTUP GUARDRAIL: Catch missing or empty GROQ_API_KEY immediately
// -------------------------------------------------------------
if (!process.env.GROQ_API_KEY || !process.env.GROQ_API_KEY.trim()) {
  console.error('\n=============================================================');
  console.error(' [FATAL STARTUP ERROR] GROQ_API_KEY is not configured!       ');
  console.error('=============================================================');
  console.error('A valid GROQ_API_KEY is required in environment or .env file.');
  console.error('Please obtain an API key at https://console.groq.com and set:');
  console.error('  GROQ_API_KEY=gsk_...\n');
  process.exit(1);
}

import { invokeElegba } from './agents/elegba';
import { createServer } from './server';

async function bootstrap() {
  console.log('-------------------------------------------------------------');
  console.log('     THE SEVEN-SEAT LLM COUNCIL & REALTIME VOICE PIPELINE    ');
  console.log('-------------------------------------------------------------\n');

  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080;
  const { server, pipeline } = createServer(PORT);

  await new Promise<void>((resolve) => {
    server.listen(PORT, () => {
      console.log(`[AyoCouncil Server] HTTP & WebSocket Gateway running at http://localhost:${PORT}`);
      resolve();
    });
  });

  await pipeline.initialize();

  // In production or Fly.io environments, skip startup demo deliberation to preserve tokens & provide immediate readiness
  if (process.env.NODE_ENV === 'production' || process.env.FLY_APP_NAME || process.env.SKIP_DEMO === 'true') {
    console.log('[AyoCouncil Server] Production gateway ready for live HTTP & WebSocket traffic.\n');
    return;
  }

  // Demonstration / Smoke-Test:
  const testSpokenQuery =
    'I feel paralyzed choosing between keeping my high-paying corporate engineering role or walking away to bootstrap an esoteric philosophical AI collective. What should I do?';

  console.log('\n[Demo] Triggering Council Deliberation with test user query...\n');
  const dossier = await pipeline.executeTurn(testSpokenQuery);

  console.log('\n[Dossier Output - Structured JSON]');
  console.log(JSON.stringify(dossier, null, 2));

  console.log('\n[Chairman Spoken Delivery]');
  console.log(`"${dossier.spokenSynthesisScript}"\n`);

  // 5. STRESS-TEST LAYER: The Elegba Protocol (Groq LPU)
  console.log('-------------------------------------------------------------');
  console.log('       INVOKING THE ELEGBA PROTOCOL (GROQ LPU TRICKSTER)     ');
  console.log('-------------------------------------------------------------\n');

  const formattedDossierForElegba = `
[COSMIC ALIGNMENTS]
${dossier.cosmicAlignments.map((a, i) => `${i + 1}. ${a}`).join('\n')}

[KEY TENSIONS]
${dossier.keyTensions.map((t, i) => `${i + 1}. ${t}`).join('\n')}

[SOMATIC PRESCRIPTIONS]
${dossier.somaticPrescriptions.map((p, i) => `${i + 1}. ${p}`).join('\n')}

[CHAIRMAN ORAL SCRIPT]
"${dossier.spokenSynthesisScript}"
`.trim();

  const tricksterPushback = await invokeElegba(formattedDossierForElegba);

  console.log('\n[Èṣù-Ẹlẹ́gbára Adversarial Pushback]:');
  console.log(tricksterPushback);
  console.log('\n-------------------------------------------------------------\n');
}

bootstrap().catch((err) => {
  console.error('Fatal bootstrap error:', err);
  process.exit(1);
});
