import React from 'react';
import { ChairmanDossier, ElegbaResponse } from '../types';
import { SovereignResolutionEditor } from './SovereignResolutionEditor';
import { Flame, Skull, Zap, Sparkles, RefreshCw } from 'lucide-react';

interface Props {
  dossier: ChairmanDossier | null;
  elegba: ElegbaResponse | null;
  isLoading: boolean;
  onSummonElegba: () => void;
  onAffirmDirective: (text: string) => void;
  onRewriteDirective: (text: string) => void;
}

export const ElegbaInterventionPane: React.FC<Props> = ({
  dossier,
  elegba,
  isLoading,
  onSummonElegba,
  onAffirmDirective,
  onRewriteDirective
}) => {
  const isDossierReady = !!dossier;

  return (
    <div className="flex flex-col h-full bg-[#0a0a0c] border border-ruby/40 rounded-lg overflow-hidden shadow-ruby-glow transition-all">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-[#120a0f] border-b border-ruby/30">
        <div className="flex items-center space-x-2.5">
          <Flame className="w-4 h-4 text-ruby animate-bounce" />
          <span className="text-xs font-mono tracking-widest text-ruby font-bold uppercase">
            The Elegba Intervention (Crossroads Protocol)
          </span>
        </div>

        {elegba && (
          <div className="flex items-center space-x-2 text-[10px] font-mono text-ruby/80">
            <Zap className="w-3 h-3 text-ruby" />
            <span>Groq LPU: {elegba.latencyMs}ms</span>
          </div>
        )}
      </div>

      {/* Main Container */}
      <div className="flex-1 p-5 overflow-y-auto flex flex-col justify-between font-mono text-xs leading-relaxed">
        {/* State 1: No Dossier Yet */}
        {!isDossierReady && (
          <div className="flex flex-col items-center justify-center flex-1 min-h-[380px] text-center p-6 border border-dashed border-neutral-900 rounded-lg">
            <Skull className="w-10 h-10 text-neutral-800 mb-3" />
            <div className="text-neutral-500 font-mono text-xs uppercase tracking-wider font-semibold">
              The Crossroads Are Dormant
            </div>
            <div className="text-neutral-700 font-mono text-[11px] mt-1 max-w-xs">
              The Elegba adversarial trigger remains locked until the 7-seat Council completes its synthesis.
            </div>
          </div>
        )}

        {/* State 2: Dossier Ready, but Elegba not yet summoned */}
        {isDossierReady && !elegba && (
          <div className="flex flex-col items-center justify-center flex-1 min-h-[380px] text-center p-8 bg-[#0e0a0e] border border-ruby/20 rounded-lg space-y-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-ruby/10 border border-ruby flex items-center justify-center shadow-ruby-glow animate-pulse">
                <Flame className="w-8 h-8 text-ruby" />
              </div>
            </div>

            <div className="space-y-1.5 max-w-sm">
              <div className="text-neutral-200 font-mono text-sm font-bold tracking-wider uppercase">
                Consensus Established
              </div>
              <p className="text-neutral-400 text-xs">
                The 7-Seat Council recommends a safe, unanimous synthesis. Will you accept it blindly, or summon the Trickster to stress-test your perimeter?
              </p>
            </div>

            <button
              onClick={onSummonElegba}
              disabled={isLoading}
              className={`flex items-center space-x-2 px-6 py-3 rounded font-mono text-xs font-bold tracking-widest uppercase transition-all shadow-ruby-glow ${
                isLoading
                  ? 'bg-ruby/40 text-white cursor-wait'
                  : 'bg-ruby hover:bg-ruby-hover text-white active:scale-95'
              }`}
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>SUMMONING CROSSROADS...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 text-white" />
                  <span>SUMMON THE CROSSROADS</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* State 3: Elegba Pushback Active */}
        {elegba && (
          <div className="space-y-4 flex-1">
            <div className="p-4 bg-[#140b10] border-l-4 border-ruby rounded-r-lg space-y-3 shadow-md">
              <div className="flex items-center justify-between text-[11px] text-ruby font-bold uppercase tracking-wider pb-2 border-b border-ruby/20">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Èṣù-Ẹlẹ́gbára Adversarial Counter-Strike
                </span>
                <span className="text-[10px] text-neutral-400 font-normal">
                  Model: LLaMA 3.3 70B (Groq)
                </span>
              </div>

              {/* Render the Trickster text preserving paragraphs */}
              <div className="text-neutral-200 space-y-3 leading-relaxed text-xs sm:text-sm font-mono whitespace-pre-line">
                {elegba.pushback}
              </div>
            </div>

            {/* Sovereign Closing Gate */}
            <SovereignResolutionEditor
              originalScript={dossier?.spokenSynthesisScript || ''}
              onAffirm={onAffirmDirective}
              onRewrite={onRewriteDirective}
            />
          </div>
        )}
      </div>
    </div>
  );
};
