import dotenv from 'dotenv';
import { invokeElegba } from './agents/elegba';
import { createServer } from './server';

dotenv.config();

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
