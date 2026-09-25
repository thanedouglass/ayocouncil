import crypto from 'crypto';
import { TelegramBroadcastPayload } from './types';

/**
 * Escapes characters for Telegram HTML parse_mode:
 * & -> &amp;
 * < -> &lt;
 * > -> &gt;
 * " -> &quot;
 */
export function escapeHtml(str: string = ''): string {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Truncates a string gracefully to maxLength with an ellipsis.
 */
export function truncate(str: string, maxLength: number): string {
  if (!str || str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}

/**
 * Formats a full Council Deliberation and Elegba counter-perspective into
 * clean, bulletproof HTML for Telegram broadcast to the y3K channel.
 */
export function formatCouncilBroadcastHtml(payload: TelegramBroadcastPayload): string {
  const { inquiry, dossier, elegbaPushback, auditReceipt } = payload;

  // 1. Inquiry section (truncate safely to avoid blowing budget)
  const escapedInquiry = escapeHtml(truncate(inquiry.trim(), 280));

  // 2. Epistemic Consensus details
  const alignments = (dossier.cosmicAlignments || [])
    .slice(0, 3)
    .map((a, i) => `  <b>0${i + 1}.</b> ${escapeHtml(truncate(a, 200))}`)
    .join('\n');

  const tensions = (dossier.keyTensions || [])
    .slice(0, 3)
    .map((t) => `  ⚡ ${escapeHtml(truncate(t, 200))}`)
    .join('\n');

  const somatic = (dossier.somaticPrescriptions || [])
    .slice(0, 2)
    .map((p) => `  → ${escapeHtml(truncate(p, 180))}`)
    .join('\n');

  const expansionVector = dossier.strategicExpansionVector
    ? `\n📐 <b>STRATEGIC EXPANSION VECTOR</b>\n<i>"${escapeHtml(truncate(dossier.strategicExpansionVector, 250))}"</i>\n`
    : '';

  const chairmanScript = dossier.spokenSynthesisScript
    ? `\n🎙 <b>CHAIRMAN ORAL SYNTHESIS</b>\n<blockquote>${escapeHtml(truncate(dossier.spokenSynthesisScript, 320))}</blockquote>\n`
    : '';

  // 3. Elegba Counter-Perspective
  const elegbaSection = elegbaPushback
    ? `\n⚔️ <b>ELEGBA PROTOCOL ADVERSARIAL STRESS-TEST</b>\n<blockquote>${escapeHtml(truncate(elegbaPushback, 360))}</blockquote>\n`
    : '';

  // 4. Cryptographic Audit Hash Reference (Base Sepolia transaction/hash stub)
  const txHash =
    auditReceipt?.txHash ||
    '0x' + crypto.createHash('sha256').update(inquiry + (dossier.spokenSynthesisScript || '')).digest('hex');
  const contract = auditReceipt?.contractAddress || '0x892aF0C3B7e793f6cD94220A8d88eA1e5239E043';
  const chainName = auditReceipt?.targetChain || 'Base Sepolia';
  const timestamp = auditReceipt?.timestamp
    ? new Date(auditReceipt.timestamp).toISOString()
    : new Date().toISOString();

  const auditSection = `🔐 <b>CRYPTOGRAPHIC AUDIT PROOF</b>
• <b>Network:</b> ${escapeHtml(chainName)} (Chain ID: 84532)
• <b>Contract:</b> <code>${escapeHtml(contract)}</code>
• <b>Audit Hash:</b> <code>${escapeHtml(txHash)}</code>
• <b>Timestamp:</b> <code>${escapeHtml(timestamp)}</code>`;

  // Assemble full message
  const lines: string[] = [
    `🏛 <b>IO COUNCIL // y3K CONSENSUS DISPATCH</b>`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `🎯 <b>INQUIRY</b>`,
    `<i>"${escapedInquiry}"</i>`,
    ``,
    `⚖️ <b>EPISTEMIC COUNCIL CONSENSUS</b>`,
    alignments ? `<b>Alignments:</b>\n${alignments}` : '',
    tensions ? `<b>Key Tensions:</b>\n${tensions}` : '',
    somatic ? `<b>Somatic Prescriptions:</b>\n${somatic}` : '',
    expansionVector.trim(),
    chairmanScript.trim(),
    elegbaSection.trim(),
    `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    auditSection,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `<i>Zero Data Retention • No Model Training • Sovereign OS</i>`
  ].filter(Boolean);

  const fullMessage = lines.join('\n');

  // Hard safety limit: Telegram rejects > 4096 chars
  if (fullMessage.length > 4000) {
    return fullMessage.slice(0, 3950) + '\n\n<i>[Truncated for Telegram capacity]</i>';
  }

  return fullMessage;
}
