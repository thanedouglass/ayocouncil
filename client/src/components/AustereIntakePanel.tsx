import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { IntakeSessionState } from '../types';
import { Bot, User, Zap, RefreshCw } from 'lucide-react';

interface Props {
  sessionState: IntakeSessionState;
  onSendTurn: (utterance: string) => void;
  isLoading: boolean;
  onCancel: () => void;
}

const spring = { type: 'spring', stiffness: 240, damping: 26 } as const;

/**
 * The Sovereign Inquiry Terminal: the council's front door. High-agency,
 * zero bureaucracy — the human states their friction, the stones answer.
 */
export const AustereIntakePanel: React.FC<Props> = ({
  sessionState,
  onSendTurn,
  isLoading,
  onCancel
}) => {
  const [inputText, setInputText] = useState('');

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isLoading) return;
    const text = inputText;
    setInputText('');
    onSendTurn(text);
  };

  return (
    <div className="w-full glass-pane p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <motion.div
            className="w-2 h-2 rounded-full bg-stone-cyan"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.6, repeat: Infinity }}
          />
          <span className="telemetry uppercase text-gray-200">
            Convoke the Council <span className="text-gray-600">//</span> Sovereign Inquiry Terminal
          </span>
        </div>
        <div className="telemetry uppercase flex items-center gap-2">
          <span>Exchange</span>
          <span className="px-2.5 py-0.5 rounded-full bg-stone-cyan/10 border border-stone-cyan/30 text-stone-cyan font-semibold">
            {sessionState.turnCount} / 2
          </span>
        </div>
      </div>

      {/* Exchange history */}
      <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
        {sessionState.history.map((msg, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={spring}
            className={`p-3.5 rounded-xl text-sm leading-relaxed flex items-start gap-3 ${
              msg.role === 'user'
                ? 'bg-white/[0.03] border border-white/5 text-gray-100 font-sans'
                : 'bg-stone-cyan/[0.04] border border-stone-cyan/10 text-cyan-100 font-sans'
            }`}
          >
            {msg.role === 'user' ? (
              <User className="w-3.5 h-3.5 text-gray-500 flex-shrink-0 mt-1" />
            ) : (
              <Bot className="w-3.5 h-3.5 text-stone-cyan flex-shrink-0 mt-1" />
            )}
            <div className="flex-1 whitespace-pre-wrap">{msg.content}</div>
          </motion.div>
        ))}

        {isLoading && (
          <div className="p-3.5 rounded-xl bg-stone-cyan/[0.04] border border-stone-cyan/10 text-stone-cyan flex items-center gap-2 font-mono text-xs tracking-wide">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>The Intake stone is listening...</span>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-2 pt-1">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          disabled={isLoading}
          placeholder="State your core dilemma, friction, or transition..."
          className="flex-1 px-4 py-3 bg-black/40 backdrop-blur-xl border border-white/10 rounded-xl text-sm font-sans text-gray-100 placeholder-gray-600 focus:outline-none focus:border-stone-cyan/60 focus:shadow-[0_0_24px_-8px_rgba(0,240,255,0.4)] transition-all duration-300"
        />

        <motion.button
          type="submit"
          disabled={isLoading || !inputText.trim()}
          whileHover={
            !(isLoading || !inputText.trim())
              ? { scale: 1.03, boxShadow: '0 0 36px -6px rgba(0,240,255,0.5)' }
              : undefined
          }
          whileTap={{ scale: 0.96 }}
          transition={spring}
          className="px-5 py-3 rounded-xl bg-gradient-to-r from-stone-cyan/90 via-stone-violet/90 to-flare text-black font-mono text-xs font-bold uppercase tracking-widest flex items-center gap-1.5 disabled:opacity-30 transition-opacity"
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Ignite Council Convect</span>
        </motion.button>

        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="px-3.5 py-3 rounded-xl border border-white/10 hover:border-white/25 text-gray-500 hover:text-gray-300 font-mono text-xs uppercase tracking-widest transition-colors"
        >
          Stand down
        </button>
      </form>
    </div>
  );
};
