import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SeatDeliberation } from '../types';
import { Eye, ShieldCheck, CheckCircle2, AlertTriangle, Sparkles, ChevronDown } from 'lucide-react';

export interface LiveCotEntry {
  seatName?: string;
  friction?: string;
  antiDogmaAudit?: string;
  synthesis?: string;
}

interface Props {
  seats: SeatDeliberation[];
  liveCotStream: Record<string, LiveCotEntry>;
  isGenerating: boolean;
}

const SEAT_TABS = [
  { id: 'seat_1_stoic_empiricist', label: 'I · Stoic' },
  { id: 'seat_2_existentialist', label: 'II · Existential' },
  { id: 'seat_3_cyberneticist', label: 'III · Systems' },
  { id: 'seat_4_mystic_cosmologist', label: 'IV · Mystic' },
  { id: 'seat_5_pragmatist', label: 'V · Pragmatic' },
  { id: 'seat_6_psychoanalytic', label: 'VI · Archetypal' },
  { id: 'seat_7_dialectical', label: 'VII · Dialectical' }
];

const spring = { type: 'spring', stiffness: 260, damping: 28 } as const;

/** One step of the 3-step reasoning readout. */
const CotStep: React.FC<{
  index: number;
  title: string;
  accent: string;
  content?: string;
  placeholder: string;
  badge?: React.ReactNode;
}> = ({ index, title, accent, content, placeholder, badge }) => (
  <div className="space-y-1.5">
    <div className="flex items-center justify-between">
      <div className="telemetry uppercase flex items-center gap-2">
        <span className={`${accent} font-semibold`}>{index}</span>
        <span className={accent}>{title}</span>
      </div>
      {badge}
    </div>
    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 font-mono text-xs leading-relaxed text-gray-300">
      {content || <span className="text-gray-600 italic">{placeholder}</span>}
      {!content ? null : null}
    </div>
  </div>
);

/**
 * The Glass Box: a non-interactive frosted terminal exposing each seat's
 * 3-step chain of thought. While the council deliberates, a crimson-to-violet
 * aura breathes behind the glass.
 */
export const GlassBoxCoTPane: React.FC<Props> = ({ seats, liveCotStream, isGenerating }) => {
  const [activeSeatTab, setActiveSeatTab] = useState<string>('seat_1_stoic_empiricist');
  const [collapsed, setCollapsed] = useState(false);

  const selectedSeat = seats.find((s) => s.seatId === activeSeatTab);
  const live = liveCotStream[activeSeatTab];

  const friction = selectedSeat?.cotSteps?.friction || live?.friction;
  const audit = selectedSeat?.cotSteps?.antiDogmaAudit || live?.antiDogmaAudit;
  const synthesis = selectedSeat?.cotSteps?.synthesis || live?.synthesis;
  const auditComplete = !!(selectedSeat?.cotSteps?.antiDogmaAudit || (!isGenerating && audit));

  return (
    <div className="relative">
      {/* ---- The Aura: crimson→violet radial blobs breathing behind the glass ---- */}
      <AnimatePresence>
        {isGenerating && (
          <motion.div
            key="aura"
            className="absolute -inset-6 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 1.2 } }}
            aria-hidden
          >
            <motion.div
              className="absolute w-2/3 h-2/3 left-0 top-0 rounded-full blur-3xl"
              style={{ background: 'radial-gradient(circle, rgba(220,38,69,0.35) 0%, transparent 70%)' }}
              animate={{
                x: ['0%', '35%', '5%', '0%'],
                y: ['0%', '20%', '45%', '0%'],
                scale: [1, 1.25, 0.9, 1]
              }}
              transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
              className="absolute w-2/3 h-2/3 right-0 bottom-0 rounded-full blur-3xl"
              style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.3) 0%, transparent 70%)' }}
              animate={{
                x: ['0%', '-30%', '-5%', '0%'],
                y: ['0%', '-25%', '-40%', '0%'],
                scale: [1.1, 0.85, 1.3, 1.1]
              }}
              transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---- The Glass Box itself ---- */}
      <motion.div layout transition={spring} className="relative glass-pane-dense p-5 space-y-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Eye className="w-4 h-4 text-emerald-400/80" />
            <span className="telemetry uppercase text-gray-300">
              Glass Box <span className="text-gray-600">//</span> Anti-Dogma CoT Audit
            </span>
            {isGenerating && (
              <motion.span
                className="w-1.5 h-1.5 rounded-full bg-ruby"
                animate={{ opacity: [1, 0.2, 1], scale: [1, 1.4, 1] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
              />
            )}
          </div>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="telemetry uppercase flex items-center gap-1 hover:text-gray-300 transition-colors"
          >
            <span>{collapsed ? 'Expand' : 'Collapse'}</span>
            <motion.span animate={{ rotate: collapsed ? 0 : 180 }} transition={spring}>
              <ChevronDown className="w-3 h-3" />
            </motion.span>
          </button>
        </div>

        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.div
              key="body"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={spring}
              className="space-y-4 overflow-hidden"
            >
              {/* Seat selector tabs */}
              <div className="flex flex-wrap gap-1.5">
                {SEAT_TABS.map((tab) => {
                  const hasLive = !!liveCotStream[tab.id];
                  const isSelected = activeSeatTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveSeatTab(tab.id)}
                      className={`relative px-3 py-1.5 rounded-full font-mono text-[10px] uppercase tracking-widest transition-colors ${
                        isSelected ? 'text-white' : hasLive ? 'text-emerald-300/90' : 'text-gray-500 hover:text-gray-300'
                      }`}
                    >
                      {isSelected && (
                        <motion.span
                          layoutId="seat-tab-pill"
                          transition={spring}
                          className="absolute inset-0 rounded-full bg-white/10 border border-white/10"
                        />
                      )}
                      <span className="relative flex items-center gap-1.5">
                        {hasLive && isGenerating && (
                          <motion.span
                            className="w-1 h-1 rounded-full bg-emerald-400"
                            animate={{ opacity: [1, 0.3, 1] }}
                            transition={{ duration: 1.2, repeat: Infinity }}
                          />
                        )}
                        {tab.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* 3-step reasoning readout */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeSeatTab}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={spring}
                  className="space-y-3.5"
                >
                  <CotStep
                    index={1}
                    title="Friction Analysis"
                    accent="text-cyan-400/90"
                    content={friction}
                    placeholder="Awaiting model friction analysis..."
                  />

                  <CotStep
                    index={2}
                    title="Anti-Dogma Audit"
                    accent="text-emerald-400/90"
                    content={audit}
                    placeholder="Model actively self-auditing to purge institutional evangelism, guru complexes, and prescriptive dogma..."
                    badge={
                      <AnimatePresence>
                        {auditComplete && (
                          <motion.span
                            initial={{ opacity: 0, scale: 0.85 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.85 }}
                            transition={spring}
                            className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-400/30 text-emerald-300 font-mono text-[9px] font-semibold tracking-widest flex items-center gap-1.5 shadow-emerald-seal"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            ANTI-DOGMA AUDITED
                          </motion.span>
                        )}
                      </AnimatePresence>
                    }
                  />

                  {selectedSeat?.auditWarning && (
                    <div className="flex items-center gap-1.5 text-amber-400/90 font-mono text-[10px] tracking-wide">
                      <AlertTriangle className="w-3 h-3" />
                      <span>Audit notice: {selectedSeat.auditWarning}</span>
                    </div>
                  )}

                  <CotStep
                    index={3}
                    title="Non-Prescriptive Synthesis"
                    accent="text-amber-400/90"
                    content={synthesis}
                    placeholder="Synthesizing friction-meeting response..."
                  />

                  {/* Final clean perspective — human-legible, so it gets the sans face */}
                  {selectedSeat && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.15 }}
                      className="pt-3 border-t border-white/5 space-y-2"
                    >
                      <div className="telemetry uppercase flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3 text-ruby" />
                        <span>Clean Perspective Output</span>
                      </div>
                      <p className="font-sans text-sm text-gray-100 leading-relaxed p-3.5 rounded-xl bg-white/[0.03] border border-white/5">
                        “{selectedSeat.perspectiveText}”
                      </p>
                    </motion.div>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Trust footer */}
              <div className="flex items-center gap-1.5 telemetry pt-1">
                <ShieldCheck className="w-3 h-3 text-emerald-500/70" />
                <span>Non-interactive terminal · reasoning exposed verbatim · no edits possible</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
