import 'dotenv/config';

// -------------------------------------------------------------
// STARTUP GUARDRAIL: Verify GROQ_API_KEY before importing services
// -------------------------------------------------------------
if (!process.env.GROQ_API_KEY || !process.env.GROQ_API_KEY.trim()) {
  console.error('\n=============================================================');
  console.error(' [FATAL STARTUP ERROR] GROQ_API_KEY is not configured!       ');
  console.error('=============================================================');
  console.error('A valid GROQ_API_KEY is required in environment or .env file.');
  console.error('Please define GROQ_API_KEY before starting the AyoCouncil server.\n');
  process.exit(1);
}

import cors from 'cors';
import express, { Request, Response } from 'express';
import fs from 'fs';
import http from 'http';
import path from 'path';
import WebSocket, { WebSocketServer } from 'ws';
import { invokeElegba } from './agents/elegba';
import { CompiledDiagnosticSchema, IntakeSessionState, processIntakeTurn } from './agents/intakeAgent';
import { evaluateTriage, TriageResult } from './middleware/triageEngine';
import { CouncilPipeline } from './orchestrator/councilPipeline';
import { GptLiveClient } from './services/realtime/gptLiveClient';

export function createServer(port: number = 8080) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server });

  const liveClient = new GptLiveClient({
    apiKey: process.env.GPT_LIVE_API_KEY,
    voice: 'coral'
  });

  const pipeline = new CouncilPipeline(liveClient);

  // Broadcast helper to all connected WebSockets
  const broadcastWebSocket = (data: Record<string, any>) => {
    const payload = JSON.stringify(data);
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
  };

  // Wire live Chain-of-Thought (CoT) delta events to WebSocket broadcast
  pipeline.on('cot_delta', (event) => {
    broadcastWebSocket({ type: 'cot_delta', ...event });
  });

  // Wire Latimer REACH Auto-Rater audit events to WebSocket broadcast
  pipeline.on('reach_audit', (audit) => {
    broadcastWebSocket({ type: 'reach_audit', audit });
  });

  // Fly.io and Load Balancer Liveness / Health Check endpoint
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      service: 'ayocouncil',
      timestamp: new Date().toISOString()
    });
  });

  // Status & Health endpoint
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'online',
      groqConfigured: !!process.env.GROQ_API_KEY,
      gptLiveConfigured: !!process.env.GPT_LIVE_API_KEY,
      timestamp: new Date().toISOString()
    });
  });

  // Standalone Triage Pre-Flight Endpoint
  app.post('/api/intake/triage', async (req: Request, res: Response) => {
    try {
      const { text } = req.body;
      if (!text || typeof text !== 'string') {
        res.status(400).json({ error: 'Missing or invalid "text" in body' });
        return;
      }

      const triage = await evaluateTriage(text);

      if (triage.isCrisis) {
        broadcastWebSocket({ type: 'CRITICAL_INTERCEPT', triage });
      }

      res.json({ triage });
    } catch (err: any) {
      console.error('[API /api/intake/triage] Error:', err);
      // FAIL-CLOSED: if internal crash, flag as crisis
      res.status(500).json({
        triage: {
          isCrisis: true,
          layer: 'layer1_error',
          reason: `Fail-Closed: Internal triage exception - ${err?.message}`,
          latencyMs: 0
        }
      });
    }
  });

  // Austere Intake Conversational Turn Endpoint
  app.post('/api/intake/turn', async (req: Request, res: Response) => {
    try {
      const { utterance, sessionState } = req.body as {
        utterance?: string;
        sessionState?: IntakeSessionState;
      };

      if (!utterance || typeof utterance !== 'string') {
        res.status(400).json({ error: 'Missing "utterance" in request body' });
        return;
      }

      // 1. MANDATORY TRIAGE CHECK (Layer-0 Regex & Layer-1 Groq Fail-Closed)
      const triage = await evaluateTriage(utterance);

      if (triage.isCrisis) {
        console.warn('[API /api/intake/turn] CRITICAL_INTERCEPT triggered during intake:', triage.reason);
        broadcastWebSocket({ type: 'CRITICAL_INTERCEPT', triage });
        res.status(200).json({
          criticalIntercept: true,
          triage
        });
        return;
      }

      // 2. State Machine: Initialize if new session
      const state: IntakeSessionState = sessionState || {
        sessionId: 'intake_' + Date.now(),
        turnCount: 0,
        history: [],
        isCompleted: false
      };

      // 3. Process Intake Turn under 2-turn ceiling
      const result = await processIntakeTurn(state, utterance);

      res.json({
        criticalIntercept: false,
        triage,
        result
      });
    } catch (err: any) {
      console.error('[API /api/intake/turn] Error:', err);
      res.status(500).json({ error: err.message || 'Intake turn processing failed' });
    }
  });

  // 7-Seat Fan-Out & Chairman Synthesis endpoint
  app.post('/api/deliberate', async (req: Request, res: Response) => {
    try {
      const { query, diagnosticSchema } = req.body as {
        query?: string;
        diagnosticSchema?: CompiledDiagnosticSchema;
      };

      let inputPrompt = query;

      // If compiled schema is passed from the Friction Gate, construct formatted prompt
      if (diagnosticSchema) {
        inputPrompt = `[DIAGNOSTIC INTAKE COMPILED]
Primary Existential Friction: ${diagnosticSchema.primary_friction}
Somatic Manifestations: ${diagnosticSchema.somatic_symptoms.join(', ')}
Involved Actors & Pressures: ${diagnosticSchema.involved_actors.join(', ')}`.trim();
      }

      if (!inputPrompt || typeof inputPrompt !== 'string') {
        res.status(400).json({ error: 'Missing or invalid query/diagnosticSchema in request body' });
        return;
      }

      // Safety Triage Pre-Check on input
      const triage = await evaluateTriage(inputPrompt);
      if (triage.isCrisis) {
        broadcastWebSocket({ type: 'CRITICAL_INTERCEPT', triage });
        res.status(200).json({ criticalIntercept: true, triage });
        return;
      }

      console.log(`[API /api/deliberate] Processing convocation for: "${inputPrompt.slice(0, 80)}..."`);
      const dossier = await pipeline.executeTurn(inputPrompt);
      res.json({ criticalIntercept: false, dossier });
    } catch (err: any) {
      console.error('[API /api/deliberate] Error:', err);
      res.status(500).json({ error: err.message || 'Deliberation failed' });
    }
  });

  // The Elegba Protocol Crossroads Adversarial endpoint
  app.post('/api/elegba', async (req: Request, res: Response) => {
    try {
      const { dossier } = req.body;
      if (!dossier) {
        res.status(400).json({ error: 'Missing "dossier" in request body' });
        return;
      }

      const dossierString =
        typeof dossier === 'string'
          ? dossier
          : `
[COSMIC ALIGNMENTS]
${(dossier.cosmicAlignments || []).map((a: string, i: number) => `${i + 1}. ${a}`).join('\n')}

[KEY TENSIONS]
${(dossier.keyTensions || []).map((t: string, i: number) => `${i + 1}. ${t}`).join('\n')}

[SOMATIC PRESCRIPTIONS]
${(dossier.somaticPrescriptions || []).map((p: string, i: number) => `${i + 1}. ${p}`).join('\n')}

[CHAIRMAN ORAL SCRIPT]
"${dossier.spokenSynthesisScript || ''}"
`.trim();

      const start = Date.now();
      const pushback = await invokeElegba(dossierString);
      const latencyMs = Date.now() - start;

      res.json({ pushback, latencyMs });
    } catch (err: any) {
      console.error('[API /api/elegba] Error:', err);
      res.status(500).json({ error: err.message || 'Elegba invocation failed' });
    }
  });

  // Voice playback endpoint for sovereign decree affirmation/rewrite
  app.post('/api/speak', (req: Request, res: Response) => {
    try {
      const { script } = req.body;
      if (!script || typeof script !== 'string') {
        res.status(400).json({ error: 'Missing "script" in request body' });
        return;
      }

      console.log(`[API /api/speak] Vocalizing decree: "${script.slice(0, 60)}..."`);
      liveClient.handoffDossierToVoice({
        cosmicAlignments: [],
        keyTensions: [],
        somaticPrescriptions: [],
        rawSeatDeliberations: [],
        metadata: {} as any,
        spokenSynthesisScript: script
      });

      res.json({ success: true, vocalizedScript: script });
    } catch (err: any) {
      console.error('[API /api/speak] Error:', err);
      res.status(500).json({ error: err.message || 'Speech handoff failed' });
    }
  });

  // Zero-Retention Ephemeral Session Purge Endpoint
  app.post('/api/session/purge', (_req: Request, res: Response) => {
    try {
      const purgeResult = pipeline.purgeVolatileMemory();
      broadcastWebSocket({
        type: 'session_purged',
        timestamp: purgeResult.timestamp,
        memoryBytesCleared: purgeResult.memoryBytesCleared
      });
      res.json({
        success: true,
        message: 'Volatile session buffers purged. Zero data retained.',
        ...purgeResult
      });
    } catch (err: any) {
      console.error('[API /api/session/purge] Error:', err);
      res.status(500).json({ error: err.message || 'Session purge failed' });
    }
  });

  // Single-Domain Production Static Serving: client/dist
  const possibleDistPaths = [
    path.resolve(process.cwd(), 'client/dist'),
    path.resolve(__dirname, '../client/dist'),
    path.resolve(__dirname, '../../client/dist')
  ];
  const clientDist = possibleDistPaths.find((p) => fs.existsSync(p));

  if (clientDist) {
    console.log(`[Server] Serving static client SPA from ${clientDist}`);
    app.use(express.static(clientDist));
    app.use((req: Request, res: Response, next) => {
      if (req.method === 'GET' && !req.path.startsWith('/api') && req.path !== '/health') {
        return res.sendFile(path.join(clientDist, 'index.html'));
      }
      next();
    });
  } else {
    console.log('[Server] client/dist not detected; running in API/WebSocket mode.');
  }

  // Real-time WebSocket connection
  wss.on('connection', (clientWs: WebSocket) => {
    console.log('[Server] WebSocket client connected to real-time audio channel.');

    clientWs.on('message', async (message: WebSocket.RawData) => {
      try {
        if (Buffer.isBuffer(message)) {
          liveClient.appendAudioChunk(message.toString('base64'));
        } else {
          const parsed = JSON.parse(message.toString());
          if (parsed.type === 'audio_chunk' && parsed.pcmBase64) {
            liveClient.appendAudioChunk(parsed.pcmBase64);
          } else if (parsed.type === 'commit_audio') {
            liveClient.commitAudioBuffer();
          } else if (parsed.type === 'purge_session') {
            const purgeResult = pipeline.purgeVolatileMemory();
            broadcastWebSocket({
              type: 'session_purged',
              timestamp: purgeResult.timestamp,
              memoryBytesCleared: purgeResult.memoryBytesCleared
            });
          } else if (parsed.type === 'triage_check' && parsed.text) {
            const triage = await evaluateTriage(parsed.text);
            if (triage.isCrisis) {
              broadcastWebSocket({ type: 'CRITICAL_INTERCEPT', triage });
            } else {
              clientWs.send(JSON.stringify({ type: 'triage_clear', triage }));
            }
          }
        }
      } catch (err) {
        console.error('[Server] WebSocket frame error:', err);
      }
    });

    const onAudioDelta = (delta: string) => {
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify({ type: 'audio_delta', delta }));
      }
    };

    liveClient.on('audio_delta', onAudioDelta);

    clientWs.on('close', () => {
      liveClient.off('audio_delta', onAudioDelta);
    });
  });

  return { server, app, wss, pipeline, liveClient, port };
}
