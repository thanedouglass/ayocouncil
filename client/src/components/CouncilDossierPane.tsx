import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChairmanDossier } from '../types';
import { GlassBoxCoTPane, LiveCotEntry } from './GlassBoxCoTPane';
import { stoneForSeat } from '../lib/stones';
import {
  Compass,
  Flame,
  Footprints,
  Volume2,
  ChevronDown,
  ShieldCheck
} from 'lucide-react';

interface Props {
  dossier: ChairmanDossier | null;
  isLoading: boolean;
  onVocalize: (script: string) => void;
  isSpeaking: boolean;
  liveCotStream?: Record<string, LiveCotEntry>;
  /** Controlled seat focus — set from the 3D orbit when a stone is clicked. */
  focusedSeatId?: string | null;
  onFocusSeat?: (seatId: string | null) => void;
}

const spring = { type: 'spring', stiffness: 240, damping: 28 } as const;

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

/** A dossier consensus section (alignments / tensions / prescriptions). */
const DossierSection: React.FC<{
  icon: React.ReactNode;
  title: string;
  items: string[];
  marker: (idx: number) => React.ReactNode;
}> = ({ icon, title, items, marker }) => (
  <div className="space-y-2.5">
    <div className="telemetry uppercase flex items-center gap-2">
      {icon}
      <span>{title}</span>
    </div>
    <div className="space-y-2">
      {items.map((text, idx) => (
        <motion.div
          key={idx}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: idx * 0.06 }}
          className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-start gap-3"
        >
          <span className="font-mono text-xs mt-0.5">{marker(idx)}</span>
          <span className="flex-1 font-sans text-sm text-gray-200 leading-relaxed">{text}</span>
        </motion.div>
      ))}
    </div>
  </div>
);

export const CouncilDossierPane: React.FC<Props> = ({
  dossier,
  isLoading,
  onVocalize,
  isSpeaking,
  liveCotStream = {},
  focusedSeatId,
  onFocusSeat
}) => {
  const [internalExpanded, setInternalExpanded] = useState<string | null>(null);
  // Controlled when the orbit drives focus; falls back to internal state.
  const expandedSeat = focusedSeatId !== undefined ? focusedSeatId : internalExpanded;
  const setExpandedSeat = (id: string | null) => {
    if (onFocusSeat) onFocusSeat(id);
    else setInternalExpanded(id);
  };

  const streamKeys = Object.keys(liveCotStream);
  const isStreamingCoT = isLoading && streamKeys.length > 0;

  // Empty chamber — awaiting convocation
  if (!dossier && !isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="glass-pane flex flex-col items-center justify-center h-full min-h-[480px] p-8 text-center border-dashed"
      >
        <Compass className="w-10 h-10 text-gray-700 mb-4" />
        <div className="font-sans text-sm font-medium text-gray-400">
          Council chamber awaiting convocation
        </div>
        <p className="telemetry mt-2 max-w-sm normal-case tracking-normal leading-relaxed">
          Submit an inquiry through the Austere Intake Layer to trigger the 7-seat fan-out and
          watch the live anti-dogma CoT audit.
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div layout transition={spring} className="glass-pane flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <motion.div
            className={`w-2 h-2 rounded-full ${isLoading ? 'bg-ruby' : 'bg-emerald-400'}`}
            animate={isLoading ? { opacity: [1, 0.3, 1] } : { opacity: 1 }}
            transition={{ duration: 1.4, repeat: isLoading ? Infinity : 0 }}
          />
          <span className="telemetry uppercase text-gray-300">
            Chairman Dossier <span className="text-gray-600">//</span> Epistemic Consensus
          </span>
        </div>
        <div className="telemetry flex items-center gap-3">
          {dossier ? (
            <>
              <span>{dossier.metadata.totalFanOutLatencyMs}ms</span>
              <span className="text-emerald-400/90 flex items-center gap-1 tracking-normal">
                <ShieldCheck className="w-3.5 h-3.5" />
                Anti-dogma verified
              </span>
            </>
          ) : (
            <motion.span
              className="text-ruby/90"
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 1.8, repeat: Infinity }}
            >
              {isStreamingCoT ? 'STREAMING COT AUDITS' : 'CONVOKING SEVEN SEATS'}
            </motion.span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 p-5 overflow-y-auto space-y-6">
        {/* Oral decree — the human-facing synthesis, stark and legible */}
        {dossier && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={spring}
            className="relative p-5 rounded-2xl bg-white/[0.03] border border-white/5 overflow-hidden"
          >
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: 'radial-gradient(ellipse at 0% 0%, rgba(255,42,75,0.08) 0%, transparent 55%)' }}
              aria-hidden
            />
            <div className="relative flex items-center justify-between mb-3">
              <span className="telemetry uppercase text-ruby/90 flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5" /> Chairman oral decree
              </span>
              <motion.button
                onClick={() => onVocalize(dossier.spokenSynthesisScript)}
                disabled={isSpeaking}
                whileHover={!isSpeaking ? { scale: 1.04 } : undefined}
                whileTap={!isSpeaking ? { scale: 0.95 } : undefined}
                transition={spring}
                className={`px-3 py-1.5 rounded-full font-mono text-[10px] uppercase tracking-widest border transition-colors ${
                  isSpeaking
                    ? 'border-ruby bg-ruby text-white animate-pulse'
                    : 'border-ruby/40 text-ruby hover:bg-ruby hover:text-white'
                }`}
              >
                {isSpeaking ? 'Speaking...' : 'Play audio'}
              </motion.button>
            </div>
            <p className="relative font-sans text-base text-gray-100 leading-relaxed">
              “{dossier.spokenSynthesisScript}”
            </p>
          </motion.div>
        )}

        {/* The Glass Box terminal — aura lives while seats deliberate */}
        <GlassBoxCoTPane
          seats={dossier?.rawSeatDeliberations || []}
          liveCotStream={liveCotStream}
          isGenerating={isLoading}
        />

        {dossier && (
          <>
            <DossierSection
              icon={<Compass className="w-3.5 h-3.5 text-cyan-400/80" />}
              title="Cosmic alignments · consensus"
              items={dossier.cosmicAlignments}
              marker={(idx) => <span className="text-cyan-400/80 font-semibold">0{idx + 1}</span>}
            />

            <DossierSection
              icon={<Flame className="w-3.5 h-3.5 text-amber-400/80" />}
              title="Key tensions · dialectical friction"
              items={dossier.keyTensions}
              marker={() => <span className="text-amber-400/80">⚡</span>}
            />

            <DossierSection
              icon={<Footprints className="w-3.5 h-3.5 text-emerald-400/80" />}
              title="Somatic prescriptions · grounding actions"
              items={dossier.somaticPrescriptions}
              marker={() => <span className="text-emerald-400/80">→</span>}
            />

            {/* The seven seats — expandable glass cards */}
            <div className="space-y-2.5 pt-3 border-t border-white/5">
              <div className="telemetry uppercase">
                The seven seats · {dossier.rawSeatDeliberations.length} deliberations
              </div>

              {dossier.rawSeatDeliberations.map((seat, idx) => {
                const isOpen = expandedSeat === seat.seatId;
                const stone = stoneForSeat(seat.seatId);
                return (
                  <motion.div
                    key={seat.seatId}
                    layout
                    transition={spring}
                    className="rounded-2xl overflow-hidden backdrop-blur-xl bg-black/40 border border-white/10 transition-shadow duration-500"
                    style={{
                      borderColor: isOpen ? `${stone.color}66` : undefined,
                      boxShadow: isOpen
                        ? `0 0 32px -8px ${stone.color}59, inset 0 1px 0 0 rgba(255,255,255,0.05)`
                        : `0 0 18px -12px ${stone.color}40`
                    }}
                  >
                    <button
                      onClick={() => setExpandedSeat(isOpen ? null : seat.seatId)}
                      className="w-full flex items-center gap-4 px-4 py-3.5 text-left"
                    >
                      <span
                        className="w-8 h-8 rounded-full flex items-center justify-center font-mono text-xs border transition-colors"
                        style={{
                          borderColor: `${stone.color}${isOpen ? '99' : '4d'}`,
                          color: stone.color,
                          background: isOpen ? `${stone.color}1a` : 'transparent',
                          boxShadow: isOpen ? `0 0 14px -2px ${stone.color}80` : undefined
                        }}
                      >
                        {ROMAN[idx] ?? idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="font-sans text-sm font-medium text-gray-200 truncate">
                          {seat.seatName}
                        </div>
                        <div className="telemetry truncate">{seat.archetype}</div>
                      </div>
                      <div className="telemetry hidden sm:flex items-center gap-2">
                        <span style={{ color: stone.color }}>◆ {stone.name}</span>
                        <span>{seat.model} · {seat.latencyMs}ms</span>
                      </div>
                      <motion.span animate={{ rotate: isOpen ? 180 : 0 }} transition={spring}>
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                      </motion.span>
                    </button>

                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          key="seat-body"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={spring}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4 pt-1 space-y-3 border-t border-white/5">
                            <p className="font-sans text-sm text-gray-100 leading-relaxed pt-3">
                              “{seat.perspectiveText}”
                            </p>
                            <div className="telemetry flex items-center gap-3 flex-wrap">
                              <span>STATUS: {seat.status.toUpperCase()}</span>
                              {seat.auditPassed !== undefined && (
                                <span className={seat.auditPassed ? 'text-emerald-400/80' : 'text-amber-400/80'}>
                                  AUDIT: {seat.auditPassed ? 'PASSED' : 'FLAGGED'}
                                </span>
                              )}
                              <span className="sm:hidden">{seat.model} · {seat.latencyMs}ms</span>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
};
