import React, { useState } from 'react';
import { ChairmanDossier } from '../types';
import {
  Compass,
  Flame,
  Footprints,
  Volume2,
  ChevronDown,
  ChevronUp,
  Cpu,
  ShieldCheck,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ArrowUpRight
} from 'lucide-react';

interface Props {
  dossier: ChairmanDossier | null;
  isLoading: boolean;
  onVocalize: (script: string) => void;
  isSpeaking: boolean;
  liveCotStream?: Record<
    string,
    {
      seatName?: string;
      friction?: string;
      antiDogmaAudit?: string;
      synthesis?: string;
    }
  >;
}

export const CouncilDossierPane: React.FC<Props> = ({
  dossier,
  isLoading,
  onVocalize,
  isSpeaking,
  liveCotStream = {}
}) => {
  const [showRawSeats, setShowRawSeats] = useState(false);
  const [showGlassBox, setShowGlassBox] = useState(true);
  const [activeSeatTab, setActiveSeatTab] = useState<string>('seat_1_stoic_empiricist');

  const streamKeys = Object.keys(liveCotStream);
  const isStreamingCoT = isLoading && streamKeys.length > 0;

  if (isLoading && !isStreamingCoT) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[480px] p-8 bg-[#0d0d12] border border-[#2a2a38] rounded-lg">
        <div className="w-12 h-12 border-2 border-ruby/30 border-t-ruby rounded-full animate-spin mb-4"></div>
        <div className="text-ruby font-mono text-sm tracking-widest animate-pulse">
          CONVOKING SEVEN-SEAT COUNCIL...
        </div>
        <div className="text-neutral-500 font-mono text-xs mt-2">
          Streaming Chain of Thought & Anti-Dogma Audits across 7 models
        </div>
      </div>
    );
  }

  if (!dossier && !isStreamingCoT) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[480px] p-8 bg-[#0d0d12] border border-dashed border-[#262633] rounded-lg text-center">
        <Compass className="w-12 h-12 text-neutral-600 mb-3" />
        <div className="text-neutral-400 font-mono text-sm font-semibold tracking-wider uppercase">
          Council Chamber Awaiting Convocation
        </div>
        <div className="text-neutral-600 font-mono text-xs mt-2 max-w-sm">
          Submit an inquiry through the Austere Intake Layer to trigger the 7-seat fan-out and watch the live Anti-Dogma CoT audit.
        </div>
      </div>
    );
  }

  // Active seats to show in the Glass Box (either from completed dossier or live streaming)
  const seatsList = dossier?.rawSeatDeliberations || [];
  const selectedSeat = seatsList.find((s) => s.seatId === activeSeatTab);
  const liveStreamForSeat = liveCotStream[activeSeatTab];

  return (
    <div className="flex flex-col h-full bg-[#0d0d12] border border-neutral-800 rounded-lg overflow-hidden shadow-2xl">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-[#12121a] border-b border-neutral-800">
        <div className="flex items-center space-x-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-mono tracking-widest text-neutral-200 font-semibold uppercase">
            Chairman Dossier // Epistemic Consensus
          </span>
        </div>
        <div className="flex items-center space-x-3 text-[11px] font-mono text-neutral-400">
          {dossier ? (
            <>
              <span className="text-neutral-500">Latency:</span>
              <span className="text-neutral-300">{dossier.metadata.totalFanOutLatencyMs}ms</span>
              <span className="text-neutral-600">|</span>
              <span className="text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Anti-Dogma Verified
              </span>
            </>
          ) : (
            <span className="text-cyan-400 animate-pulse">Streaming CoT Audits...</span>
          )}
        </div>
      </div>

      {/* Main Dossier & Glass Box Content */}
      <div className="flex-1 p-5 overflow-y-auto space-y-6 font-mono text-xs leading-relaxed">
        {/* Oral Script Card (When dossier ready) */}
        {dossier && (
          <div className="p-4 bg-[#14141d] border-l-2 border-ruby rounded-r-lg shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] tracking-widest uppercase font-bold text-ruby flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5" /> Chairman Oral Decree
              </span>
              <button
                onClick={() => onVocalize(dossier.spokenSynthesisScript)}
                disabled={isSpeaking}
                className={`px-2.5 py-1 text-[10px] uppercase font-bold tracking-wider rounded border transition-all ${
                  isSpeaking
                    ? 'border-ruby bg-ruby text-white animate-pulse'
                    : 'border-ruby/40 text-ruby hover:bg-ruby hover:text-white'
                }`}
              >
                {isSpeaking ? 'Speaking...' : 'Play Audio'}
              </button>
            </div>
            <p className="text-neutral-200 italic leading-relaxed text-sm">
              "{dossier.spokenSynthesisScript}"
            </p>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* GLASS BOX UI: REASONING PROCESS & ANTI-DOGMA AUDIT                */}
        {/* ------------------------------------------------------------------ */}
        <div className="p-4 bg-[#090b10] border-2 border-emerald-950/70 rounded-xl space-y-4 shadow-lg">
          <div className="flex items-center justify-between pb-2.5 border-b border-emerald-950/60">
            <div className="flex items-center space-x-2">
              <Eye className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-emerald-300 uppercase tracking-widest flex items-center gap-1.5">
                Glass Box // Anti-Dogma CoT Audit
              </span>
            </div>
            <button
              onClick={() => setShowGlassBox(!showGlassBox)}
              className="text-[10px] text-neutral-400 hover:text-neutral-200 uppercase flex items-center gap-1"
            >
              <span>{showGlassBox ? 'Collapse Box' : 'Expand Box'}</span>
              {showGlassBox ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>

          {showGlassBox && (
            <div className="space-y-3.5">
              {/* Seat Selector Tabs */}
              <div className="flex flex-wrap gap-1.5 pb-1">
                {[
                  { id: 'seat_1_stoic_empiricist', label: 'I: Stoic' },
                  { id: 'seat_2_existentialist', label: 'II: Existential' },
                  { id: 'seat_3_cyberneticist', label: 'III: Systems' },
                  { id: 'seat_4_mystic_cosmologist', label: 'IV: Mystic' },
                  { id: 'seat_5_pragmatist', label: 'V: Pragmatic' },
                  { id: 'seat_6_psychoanalytic', label: 'VI: Archetypal' },
                  { id: 'seat_7_dialectical', label: 'VII: Dialectical & Growth' }
                ].map((tab) => {
                  const hasLiveStream = !!liveCotStream[tab.id];
                  const isSelected = activeSeatTab === tab.id;

                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveSeatTab(tab.id)}
                      className={`px-2.5 py-1 text-[10px] font-bold rounded uppercase tracking-wider transition-all flex items-center gap-1 ${
                        isSelected
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : hasLiveStream
                          ? 'bg-[#111818] text-emerald-400 border border-emerald-800/60'
                          : 'bg-[#101017] text-neutral-400 hover:text-neutral-200 border border-neutral-800'
                      }`}
                    >
                      {hasLiveStream && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />}
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* CoT 3-Step Reasoning Pane for Active Seat */}
              <div className="space-y-3 bg-[#0c0e14] border border-neutral-800 p-3.5 rounded-lg">
                {/* Step 1: Friction Analysis */}
                <div className="space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                    <span>1. Friction Analysis (&lt;thought_step_1_friction&gt;)</span>
                  </div>
                  <div className="p-2.5 bg-[#090b10] border border-cyan-950/40 rounded text-neutral-300 text-xs">
                    {selectedSeat?.cotSteps?.friction ||
                      liveStreamForSeat?.friction || (
                        <span className="text-neutral-600 italic">Awaiting model friction analysis...</span>
                      )}
                  </div>
                </div>

                {/* Step 2: Anti-Dogma Audit */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
                    <span className="text-emerald-400 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>2. Anti-Dogma Audit (&lt;thought_step_2_anti_dogma_audit&gt;)</span>
                    </span>

                    <span className="px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-[9px] font-bold tracking-widest flex items-center gap-1 shadow-sm">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      ANTI-DOGMA AUDITED
                    </span>
                  </div>

                  <div className="p-2.5 bg-[#08120d] border border-emerald-900/50 rounded text-emerald-200 text-xs leading-relaxed">
                    {selectedSeat?.cotSteps?.antiDogmaAudit ||
                      liveStreamForSeat?.antiDogmaAudit || (
                        <span className="text-neutral-600 italic">
                          Model actively self-auditing to purge institutional evangelism, guru complexes, and prescriptive dogma...
                        </span>
                      )}
                  </div>

                  {selectedSeat?.auditWarning && (
                    <div className="flex items-center space-x-1.5 text-amber-400 text-[10px] pt-0.5">
                      <AlertTriangle className="w-3 h-3" />
                      <span>Audit Notice: {selectedSeat.auditWarning}</span>
                    </div>
                  )}
                </div>

                {/* Step 3: Synthesis */}
                <div className="space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <span>3. Non-Prescriptive Synthesis (&lt;thought_step_3_synthesis&gt;)</span>
                  </div>
                  <div className="p-2.5 bg-[#090b10] border border-amber-950/40 rounded text-neutral-300 text-xs">
                    {selectedSeat?.cotSteps?.synthesis ||
                      liveStreamForSeat?.synthesis || (
                        <span className="text-neutral-600 italic">Synthesizing friction-meeting response...</span>
                      )}
                  </div>
                </div>

                {/* Final Perspective */}
                {selectedSeat && (
                  <div className="pt-2 border-t border-neutral-800">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-ruby" />
                      <span>Clean Perspective Output (&lt;final_perspective&gt;)</span>
                    </div>
                    <p className="text-neutral-100 italic bg-[#14141e] p-2.5 rounded border border-neutral-800">
                      "{selectedSeat.perspectiveText}"
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Section: Strategic Expansion Vector // Outgrowing the Space */}
        {dossier?.strategicExpansionVector && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-indigo-300 font-semibold uppercase tracking-wider text-[11px]">
              <span className="flex items-center space-x-2">
                <ArrowUpRight className="w-4 h-4 text-indigo-400" />
                <span>Strategic Expansion Vector // Outgrowing the Space</span>
              </span>
              <span className="px-2 py-0.5 rounded bg-indigo-950/80 border border-indigo-500/40 text-indigo-300 text-[9px] font-bold tracking-widest uppercase">
                Container Diagnosis
              </span>
            </div>
            <div className="p-3.5 bg-[#0e101c] border-l-2 border-indigo-500 border-t border-r border-b border-indigo-950/60 rounded-r-lg text-neutral-200 shadow-sm">
              <div className="text-[10px] font-mono uppercase text-indigo-400 font-bold mb-1.5 flex items-center gap-1.5">
                <span>Autonomous Capacity & External Transition</span>
              </div>
              <p className="text-xs leading-relaxed text-neutral-200 font-mono">
                {dossier.strategicExpansionVector}
              </p>
            </div>
          </div>
        )}

        {/* Section: Cosmic Alignments */}
        {dossier && (
          <div className="space-y-2.5">
            <div className="flex items-center space-x-2 text-neutral-400 font-semibold uppercase tracking-wider text-[11px]">
              <Compass className="w-4 h-4 text-cyan-400" />
              <span>Cosmic Alignments (Consensus)</span>
            </div>
            <div className="space-y-2">
              {dossier.cosmicAlignments.map((alignment, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-[#111118] border border-cyan-950/40 rounded text-neutral-300 flex items-start space-x-2.5"
                >
                  <span className="text-cyan-400 font-bold text-xs">0{idx + 1}</span>
                  <span className="flex-1">{alignment}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section: Key Tensions */}
        {dossier && (
          <div className="space-y-2.5">
            <div className="flex items-center space-x-2 text-neutral-400 font-semibold uppercase tracking-wider text-[11px]">
              <Flame className="w-4 h-4 text-amber-500" />
              <span>Key Tensions (Dialectical Friction)</span>
            </div>
            <div className="space-y-2">
              {dossier.keyTensions.map((tension, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-[#111118] border border-amber-950/40 rounded text-neutral-300 flex items-start space-x-2.5"
                >
                  <span className="text-amber-500 font-bold text-xs">⚡</span>
                  <span className="flex-1">{tension}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section: Somatic Prescriptions */}
        {dossier && (
          <div className="space-y-2.5">
            <div className="flex items-center space-x-2 text-neutral-400 font-semibold uppercase tracking-wider text-[11px]">
              <Footprints className="w-4 h-4 text-emerald-400" />
              <span>Somatic Prescriptions (Grounding Actions)</span>
            </div>
            <div className="space-y-2">
              {dossier.somaticPrescriptions.map((script, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-[#111118] border border-emerald-950/40 rounded text-neutral-300 flex items-start space-x-2.5"
                >
                  <span className="text-emerald-400 font-bold text-xs">→</span>
                  <span className="flex-1">{script}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Raw Council Seats Collapsible */}
        {dossier && (
          <div className="pt-2 border-t border-neutral-800/80">
            <button
              onClick={() => setShowRawSeats(!showRawSeats)}
              className="flex items-center justify-between w-full text-[11px] text-neutral-400 hover:text-neutral-200 py-1 font-mono uppercase tracking-wider"
            >
              <span className="flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-neutral-500" />
                Raw Deliberations ({dossier.rawSeatDeliberations.length} Seats)
              </span>
              {showRawSeats ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showRawSeats && (
              <div className="mt-3 space-y-2.5">
                {dossier.rawSeatDeliberations.map((seat) => (
                  <div
                    key={seat.seatId}
                    className="p-3 bg-[#0a0a0f] border border-neutral-800 rounded font-mono text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-neutral-300">{seat.seatName}</span>
                      <span className="text-neutral-500">{seat.model} ({seat.latencyMs}ms)</span>
                    </div>
                    <div className="text-neutral-500 text-[10px]">{seat.archetype}</div>
                    <p className="text-neutral-300 text-xs italic">"{seat.perspectiveText}"</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
