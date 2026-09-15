import React, { useState, useEffect } from 'react';
import { SovereignResolutionState } from '../types';
import { ShieldAlert, Check, Edit3, Sparkles } from 'lucide-react';

interface Props {
  originalScript: string;
  onAffirm: (finalText: string) => void;
  onRewrite: (newText: string) => void;
  disabled?: boolean;
}

export const SovereignResolutionEditor: React.FC<Props> = ({
  originalScript,
  onAffirm,
  onRewrite,
  disabled = false
}) => {
  const [state, setState] = useState<SovereignResolutionState>('unresolved');
  const [editedText, setEditedText] = useState(originalScript);

  useEffect(() => {
    setEditedText(originalScript);
    setState('unresolved');
  }, [originalScript]);

  const handleStartRewrite = () => {
    setState('editing');
  };

  const handleConfirmRewrite = () => {
    if (!editedText.trim()) return;
    setState('rewritten');
    onRewrite(editedText);
  };

  const handleAffirmOriginal = () => {
    setState('affirmed');
    onAffirm(originalScript);
  };

  return (
    <div className="mt-6 p-4 bg-[#0e0e14] border-2 border-ruby/50 rounded-lg shadow-ruby-glow transition-all">
      {/* Sovereign Gate Header */}
      <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
        <div className="flex items-center space-x-2">
          <ShieldAlert className="w-4 h-4 text-ruby animate-pulse" />
          <span className="text-xs font-mono font-bold tracking-widest text-ruby uppercase">
            Sovereign Closing Gate // Chairman's Ordeal
          </span>
        </div>
        <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">
          {state === 'unresolved' && 'Decision Pending'}
          {state === 'editing' && 'Modifying Decree'}
          {state === 'affirmed' && 'Decree Affirmed'}
          {state === 'rewritten' && 'Decree Rewritten'}
        </span>
      </div>

      <div className="mt-3 text-xs text-neutral-400 font-mono leading-relaxed">
        {state === 'unresolved' && (
          <p>
            The Council has spoken and Èṣù has tested your perimeter. You hold sole executive sovereignty:
            will you submit to the collective consensus, or forge your own amended decree?
          </p>
        )}

        {state === 'editing' && (
          <div className="space-y-3">
            <label className="block text-[11px] uppercase tracking-wider text-neutral-300 font-semibold">
              Amend Council Decree (Voice Synthesis will vocalize your exact text):
            </label>
            <textarea
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              rows={4}
              className="w-full p-3 bg-[#08080b] border border-ruby/40 rounded text-neutral-100 font-mono text-xs focus:outline-none focus:border-ruby focus:ring-1 focus:ring-ruby"
              placeholder="Inscribe your sovereign decree..."
            />
            <div className="flex items-center space-x-3">
              <button
                onClick={handleConfirmRewrite}
                className="flex items-center space-x-1.5 px-4 py-2 bg-ruby hover:bg-ruby-hover text-white font-mono text-xs font-bold uppercase tracking-wider rounded transition-all shadow-md"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Seal Sovereign Decree</span>
              </button>
              <button
                onClick={() => setState('unresolved')}
                className="px-3 py-2 border border-neutral-700 hover:border-neutral-500 text-neutral-400 text-xs uppercase font-mono rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {state === 'affirmed' && (
          <div className="p-3 bg-emerald-950/20 border border-emerald-600/40 rounded flex items-center justify-between text-emerald-400">
            <span className="flex items-center gap-2">
              <Check className="w-4 h-4" />
              Original Council consensus affirmed and sealed for vocal delivery.
            </span>
            <button
              onClick={() => setState('unresolved')}
              className="text-[10px] uppercase underline hover:text-emerald-300"
            >
              Reopen
            </button>
          </div>
        )}

        {state === 'rewritten' && (
          <div className="p-3 bg-ruby/10 border border-ruby/40 rounded space-y-2">
            <div className="flex items-center justify-between text-ruby font-bold">
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Chairman Decree Overwritten & Sealed:
              </span>
              <button
                onClick={() => setState('editing')}
                className="text-[10px] uppercase underline hover:text-white"
              >
                Edit Again
              </button>
            </div>
            <p className="text-neutral-200 italic">"{editedText}"</p>
          </div>
        )}
      </div>

      {/* Sovereign Action Buttons */}
      {state === 'unresolved' && (
        <div className="mt-4 pt-3 border-t border-neutral-800/80 flex flex-wrap items-center gap-3">
          <button
            onClick={handleStartRewrite}
            disabled={disabled}
            className="flex-1 min-w-[200px] flex items-center justify-center space-x-2 px-4 py-2.5 bg-[#181824] hover:bg-[#202030] text-neutral-200 border border-ruby/50 hover:border-ruby rounded font-mono text-xs font-bold tracking-wider uppercase transition-all shadow-sm hover:shadow-ruby-border"
          >
            <Edit3 className="w-3.5 h-3.5 text-ruby" />
            <span>Rewrite Council Decree</span>
          </button>

          <button
            onClick={handleAffirmOriginal}
            disabled={disabled}
            className="flex-1 min-w-[200px] flex items-center justify-center space-x-2 px-4 py-2.5 bg-ruby hover:bg-ruby-hover text-white rounded font-mono text-xs font-bold tracking-wider uppercase transition-all shadow-ruby-glow"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Affirm Original Directive</span>
          </button>
        </div>
      )}
    </div>
  );
};
