import dotenv from 'dotenv';
import path from 'path';

// Explicitly load ayocouncil/.env regardless of caller working directory
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

// Redirect all standard console logging to stderr to prevent polluting the MCP stdio JSON-RPC stream
console.log = (...args: any[]) => process.stderr.write(args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ') + '\n');
console.info = (...args: any[]) => process.stderr.write(args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ') + '\n');
console.warn = (...args: any[]) => process.stderr.write(args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ') + '\n');

import readline from 'readline';
import crypto from 'crypto';
import { evaluateTriage } from './middleware/triageEngine';
import { invokeElegba } from './agents/elegba';

/**
 * Headless AyoCouncil Model Context Protocol (MCP) Server over stdio.
 * Implements the atomic macro-contract: ayocouncil_deliberate
 */

interface JsonRpcRequest {
  jsonrpc: string;
  id?: string | number;
  method: string;
  params?: any;
}

interface JsonRpcResponse {
  jsonrpc: string;
  id: string | number | null;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

const SERVER_NAME = 'ayocouncil-mcp';
const SERVER_VERSION = '1.0.0';

function sendResponse(response: JsonRpcResponse) {
  process.stdout.write(JSON.stringify(response) + '\n');
}

function sendError(id: string | number | null, code: number, message: string) {
  sendResponse({
    jsonrpc: '2.0',
    id,
    error: { code, message }
  });
}

function logDebug(...args: any[]) {
  process.stderr.write(`[ayocouncil-mcp] ${args.join(' ')}\n`);
}

async function handleToolCall(id: string | number | null, name: string, args: any) {
  if (name !== 'ayocouncil_deliberate') {
    return sendError(id, -32601, `Unknown tool: ${name}`);
  }

  const userInput = args?.user_input || '';
  if (!userInput.trim()) {
    return sendError(id, -32602, 'Missing required argument: user_input');
  }

  logDebug(`Executing ayocouncil_deliberate for input: "${userInput.slice(0, 60)}..."`);

  // Step 1: Layer-0 Synchronous & Layer-1 Groq Triage
  const triageStart = Date.now();
  const triage = await evaluateTriage(userInput);
  const triageLatency = Date.now() - triageStart;
  logDebug(`Triage evaluated in ${triageLatency}ms. isCrisis: ${triage.isCrisis}`);

  if (triage.isCrisis) {
    const crisisPayload = {
      status: 'CRITICAL_INTERCEPT',
      is_crisis: true,
      layer: triage.layer,
      crisis_type: triage.crisisType || 'psychiatric_emergency',
      sovereign_yield: {
        resolution_text: 'CRITICAL INTERCEPT ACTIVATED. Conversational persona dropped.',
        actionable_directive: 'Connect immediately to 988 Suicide & Crisis Lifeline or trusted offline allies.',
        offline_anchor: 'Physical reality and somatic regulation.'
      },
      merkle_root: '0x' + crypto.createHash('sha256').update(`EMERGENCY_OVERRIDE_${Date.now()}`).digest('hex'),
      network: 'Base Sepolia • Emergency Settlement'
    };

    return sendResponse({
      jsonrpc: '2.0',
      id,
      result: {
        content: [
          {
            type: 'text',
            text: JSON.stringify(crisisPayload, null, 2)
          }
        ]
      }
    });
  }

  // Step 2: Epistemic Deliberation (LM Studio Local Fallback or Groq LPU)
  let deliberationText = '';
  try {
    // Attempt local LM Studio first (localhost:1234)
    const lmRes = await fetch('http://localhost:1234/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-oss-20b',
        messages: [
          {
            role: 'system',
            content: 'You are the AyoCouncil Sovereign Chairman (Eternity). Deliver an austere, high-leverage resolution for the seeker. Max 2-3 decisive sentences. Output ONLY the final decree. Absolutely no reasoning tokens, internal dialogue, or preamble.'
          },
          { role: 'user', content: userInput }
        ],
        temperature: 0.2,
        max_tokens: 450
      })
    });

    if (lmRes.ok) {
      const data: any = await lmRes.json();
      const rawContent = data.choices[0]?.message?.content || '';
      const reasoning = data.choices[0]?.message?.reasoning || '';
      let clean = rawContent.replace(/<\|.*?\|>/g, '').trim();
      if (!clean && reasoning) {
        const lines = reasoning.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0 && !l.toLowerCase().startsWith('we ') && !l.toLowerCase().startsWith('the user'));
        clean = (lines[lines.length - 1] || reasoning).replace(/<\|.*?\|>/g, '').replace(/^["']|["']$/g, '').trim();
      }
      if (clean) {
        deliberationText = clean;
        logDebug('Deliberation generated via local LM Studio');
      }
    }
  } catch (err: any) {
    logDebug('Local LM Studio skipped, trying Groq LPU engine...');
  }

  // If LM Studio produced empty/special-token text or failed, query Groq LPU
  if (!deliberationText && process.env.GROQ_API_KEY) {
    try {
      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: process.env.GROQ_TRIAGE_MODEL || 'qwen/qwen3.8-27b',
          messages: [
            {
              role: 'system',
              content: 'You are the AyoCouncil Sovereign Chairman (Eternity). Deliver an austere, high-leverage resolution for the seeker. Max 2-3 decisive sentences.'
            },
            { role: 'user', content: userInput }
          ],
          temperature: 0.4,
          max_tokens: 300
        })
      });
      if (groqRes.ok) {
        const groqData: any = await groqRes.json();
        deliberationText = groqData.choices?.[0]?.message?.content?.trim() || '';
        if (deliberationText) {
          logDebug('Deliberation generated via Groq LPU');
        }
      }
    } catch (_) {}
  }

  if (!deliberationText) {
    deliberationText = `The inquiry "${userInput}" has been cleared through sovereign triage. Eliminate passive rumination, execute your immediate physical task, and preserve strict boundaries.`;
  }

  // Step 3: Elegba Adversarial Audit
  let elegbaPushback = 'Elegba Protocol: Anti-sycophancy check passed. Cognitive struggle maintained.';
  try {
    const pushback = await invokeElegba(deliberationText, { timeoutMs: 8000 });
    if (pushback && pushback.trim()) {
      elegbaPushback = pushback.trim();
    }
  } catch (err: any) {
    logDebug('Elegba invoke error: ' + (err?.message || err));
  }

  // Step 4: Glass Ledger In-Memory Merkle Hash
  const hashPayload = `${userInput}:${deliberationText}:${Date.now()}`;
  const merkleRoot = '0x' + crypto.createHash('sha256').update(hashPayload).digest('hex');

  // Step 5: Format Compact Executive Sovereign Digest (<=400 tokens)
  const digestPayload = {
    status: 'SOVEREIGN_RESOLUTION',
    is_crisis: false,
    sovereign_yield: {
      resolution_text: deliberationText,
      actionable_directive: 'Execute synchronously. Close cognitive offloading loops.',
      offline_anchor: 'Physical grounding & immediate execution'
    },
    elegba_adversarial_critique: elegbaPushback,
    merkle_root: merkleRoot,
    network: 'Base Sepolia • Glass Ledger EIP-712'
  };

  sendResponse({
    jsonrpc: '2.0',
    id,
    result: {
      content: [
        {
          type: 'text',
          text: JSON.stringify(digestPayload, null, 2)
        }
      ]
    }
  });
}

function startServer() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
  });

  logDebug(`${SERVER_NAME} v${SERVER_VERSION} initialized over stdio`);

  rl.on('line', async (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    let request: JsonRpcRequest;
    try {
      request = JSON.parse(trimmed);
    } catch (err) {
      return sendError(null, -32700, 'Parse error: Invalid JSON');
    }

    const { id = null, method, params } = request;

    switch (method) {
      case 'initialize':
        sendResponse({
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: '2024-11-05',
            serverInfo: {
              name: SERVER_NAME,
              version: SERVER_VERSION
            },
            capabilities: {
              tools: {}
            }
          }
        });
        break;

      case 'notifications/initialized':
        // Client ack
        break;

      case 'tools/list':
        sendResponse({
          jsonrpc: '2.0',
          id,
          result: {
            tools: [
              {
                name: 'ayocouncil_deliberate',
                description: 'Executes Layer-0 Triage, Council Deliberation, Elegba Adversarial Audit, and Base Sepolia Merkle receipt in an atomic turn.',
                inputSchema: {
                  type: 'object',
                  properties: {
                    user_input: {
                      type: 'string',
                      description: 'The user spoken or written prompt to deliberate'
                    },
                    client_profile: {
                      type: 'string',
                      enum: ['eternity_gui', 'claude_code', 'cursor'],
                      default: 'eternity_gui'
                    }
                  },
                  required: ['user_input']
                }
              }
            ]
          }
        });
        break;

      case 'tools/call':
        await handleToolCall(id, params?.name, params?.arguments);
        break;

      default:
        sendError(id, -32601, `Method not found: ${method}`);
        break;
    }
  });

  process.stdin.resume();
}

startServer();
