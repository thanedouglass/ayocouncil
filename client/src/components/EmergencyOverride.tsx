import React, { useState } from 'react';
import { TriageResult, IntakeMessage } from '../types';
import { AlertOctagon, PhoneCall, MessageSquare, ClipboardCopy, Check, XCircle, ShieldAlert } from 'lucide-react';

interface Props {
  triage: TriageResult;
  transcriptHistory: IntakeMessage[];
  onTerminate: () => void;
}

export const EmergencyOverride: React.FC<Props> = ({
  triage,
  transcriptHistory,
  onTerminate
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyTranscript = async () => {
    const formattedTranscript = [
      '=== AYOCOUNCIL SEVERED SESSION TRANSCRIPT ===',
      `Timestamp: ${new Date().toISOString()}`,
      `Intercept Layer: ${triage.layer.toUpperCase()}`,
      `Crisis Type: ${triage.crisisType || 'psychiatric_emergency'}`,
      `Triage Rationale: ${triage.reason || 'Clinical Crisis Intercept'}`,
      `Latency: ${triage.latencyMs}ms`,
      '---------------------------------------------',
      ...(transcriptHistory.length > 0
        ? transcriptHistory.map((m) => `[${m.role.toUpperCase()}]: ${m.content}`)
        : ['[No prior conversational history recorded before intercept]']),
      '============================================='
    ].join('\n\n');

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(formattedTranscript);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = formattedTranscript;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy transcript to clipboard:', err);
    }
  };

  const handleTerminateSession = () => {
    try {
      // Purge all ephemeral session state and web storage
      if (typeof window !== 'undefined') {
        window.localStorage.clear();
        window.sessionStorage.clear();
      }
    } catch (err) {
      console.warn('[EmergencyOverride] Failed to clear storage:', err);
    }

    if (onTerminate) {
      onTerminate();
    }

    // Safely hard-reload application state
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[#07070a] crt-overlay overflow-y-auto">
      <div className="max-w-2xl w-full bg-[#0d0a0c] border-2 border-ruby rounded-xl p-6 sm:p-8 shadow-ruby-glow space-y-6 text-neutral-100 font-mono">
        {/* Banner */}
        <div className="flex items-center space-x-3 pb-4 border-b border-ruby/40">
          <div className="w-10 h-10 rounded-lg bg-ruby/20 border border-ruby flex items-center justify-center shadow-ruby-border">
            <AlertOctagon className="w-6 h-6 text-ruby animate-pulse" />
          </div>
          <div>
            <div className="text-sm sm:text-base font-bold text-ruby uppercase tracking-widest flex items-center gap-2">
              System Override // Clinical Intercept Triggered
            </div>
            <div className="text-[11px] text-neutral-400">
              Deterministic Safety Circuit-Breaker Activated
            </div>
          </div>
        </div>

        {/* Diagnostic Intercept Summary */}
        <div className="p-4 bg-[#140b10] border-l-4 border-ruby rounded-r-lg space-y-2 text-xs">
          <div className="flex items-center justify-between text-[11px] font-bold text-ruby uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5" /> Safety Circuit Enforced
            </span>
            <span className="text-neutral-400 font-normal">
              Layer: {triage.layer} ({triage.latencyMs}ms)
            </span>
          </div>
          <p className="text-neutral-300 leading-relaxed">
            The system has halted all algorithmic council deliberations. Your inquiry was flagged for acute clinical distress,
            somatic dissociation, or crisis indicators. Spiritual and philosophical friction must not replace human clinical support.
          </p>
          {triage.reason && (
            <div className="pt-2 text-[11px] text-neutral-400 font-mono">
              <span className="text-neutral-500">Signal:</span> {triage.reason}
            </div>
          )}
        </div>

        {/* Immediate Interactive Lifeline Action Buttons */}
        <div className="space-y-3">
          <div className="text-[11px] font-bold text-neutral-300 uppercase tracking-widest">
            Immediate Human Clinical Lifelines (24/7 • Free • Confidential)
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Native tel:988 */}
            <a
              href="tel:988"
              className="flex items-center justify-center space-x-2.5 px-5 py-3.5 bg-ruby hover:bg-ruby-hover text-white rounded-lg font-bold text-xs uppercase tracking-wider transition-all shadow-ruby-glow active:scale-95"
            >
              <PhoneCall className="w-4 h-4" />
              <span>Call 988 Lifeline</span>
            </a>

            {/* Native sms:988 */}
            <a
              href="sms:988"
              className="flex items-center justify-center space-x-2.5 px-5 py-3.5 bg-[#1a0e14] hover:bg-[#25131c] text-ruby border border-ruby/60 hover:border-ruby rounded-lg font-bold text-xs uppercase tracking-wider transition-all active:scale-95"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Text 988 (SMS)</span>
            </a>
          </div>

          <div className="text-[10px] text-neutral-500 flex items-center justify-between px-1">
            <span>Crisis Text Line: Text HOME to 741741</span>
            <span>International: findahelpline.com</span>
          </div>
        </div>

        {/* Dignified Egress: Copy Transcript & Terminate */}
        <div className="pt-4 border-t border-neutral-800 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleCopyTranscript}
              className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 bg-[#12121a] hover:bg-[#181824] border border-neutral-700 hover:border-neutral-500 text-neutral-200 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400 font-bold tracking-widest">✓ COPIED</span>
                </>
              ) : (
                <>
                  <ClipboardCopy className="w-4 h-4 text-neutral-400" />
                  <span>Copy Transcript for Support Ally</span>
                </>
              )}
            </button>

            <button
              onClick={handleTerminateSession}
              className="flex items-center justify-center space-x-2 px-5 py-3 bg-[#1e1317] hover:bg-[#2c1a21] border border-ruby/40 text-neutral-300 hover:text-white rounded-lg text-xs font-semibold uppercase tracking-wider transition-all"
            >
              <XCircle className="w-4 h-4 text-ruby" />
              <span>Terminate Session</span>
            </button>
          </div>

          <div className="text-[10px] text-neutral-600 text-center">
            No session data is saved to persistent public logs. Ephemeral memory will purge upon termination.
          </div>
        </div>
      </div>
    </div>
  );
};
