import React, { useState } from 'react';
import { IntakeSessionState } from '../types';
import { Bot, User, Send, Shield, RefreshCw } from 'lucide-react';

interface Props {
  sessionState: IntakeSessionState;
  onSendTurn: (utterance: string) => void;
  isLoading: boolean;
  onCancel: () => void;
}

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
    <div className="w-full bg-[#0d0d14] border-2 border-neutral-800 rounded-xl p-5 shadow-2xl space-y-4 font-mono">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
        <div className="flex items-center space-x-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-xs font-bold tracking-widest text-neutral-200 uppercase">
            Austere Intake Agent // Pre-Flight Diagnostic
          </span>
        </div>
        <div className="flex items-center space-x-3 text-[11px]">
          <span className="text-neutral-500">Turn Ceiling:</span>
          <span className="px-2 py-0.5 rounded bg-cyan-950/50 border border-cyan-800/60 text-cyan-300 font-bold">
            Turn {sessionState.turnCount}/2
          </span>
        </div>
      </div>

      {/* Austerity Disclaimer */}
      <div className="p-3 bg-[#11111a] border-l-2 border-cyan-500 text-neutral-400 text-xs leading-relaxed flex items-start space-x-2">
        <Shield className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
        <div>
          <span className="text-cyan-400 font-semibold uppercase text-[10px] block">Austerity Protocol Enforced:</span>
          This mechanical parser does not mirror emotions or offer therapeutic validation. 
          Its sole mandate is to extract friction, somatic sensations, and involved actors in under 2 turns.
        </div>
      </div>

      {/* Message History */}
      <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
        {sessionState.history.map((msg, idx) => (
          <div
            key={idx}
            className={`p-3 rounded-lg text-xs leading-relaxed flex items-start space-x-2.5 ${
              msg.role === 'user'
                ? 'bg-[#14141e] border border-neutral-800 text-neutral-200'
                : 'bg-[#0f121a] border border-cyan-950/60 text-cyan-200'
            }`}
          >
            {msg.role === 'user' ? (
              <User className="w-3.5 h-3.5 text-neutral-500 flex-shrink-0 mt-0.5" />
            ) : (
              <Bot className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1 whitespace-pre-wrap">{msg.content}</div>
          </div>
        ))}

        {isLoading && (
          <div className="p-3 bg-[#0f121a] border border-cyan-950/60 rounded-lg text-xs text-cyan-300 flex items-center space-x-2 animate-pulse">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
            <span>Parsing somatic markers & extracting friction...</span>
          </div>
        )}
      </div>

      {/* Input Bar */}
      <form onSubmit={handleSubmit} className="flex gap-2 pt-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          disabled={isLoading}
          placeholder={
            sessionState.turnCount === 0
              ? 'Articulate your core tension or conflict...'
              : 'Specify bodily sensations (e.g. chest pressure) and involved actors...'
          }
          className="flex-1 px-3.5 py-2.5 bg-[#09090d] border border-neutral-800 rounded-lg text-xs font-mono text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
        />

        <button
          type="submit"
          disabled={isLoading || !inputText.trim()}
          className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:bg-neutral-800 disabled:text-neutral-600 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Submit</span>
        </button>

        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="px-3 py-2.5 border border-neutral-800 hover:border-neutral-700 text-neutral-500 hover:text-neutral-300 rounded-lg text-xs"
        >
          Cancel
        </button>
      </form>
    </div>
  );
};
