import React, { useState } from 'react';
import {
  ReachAuditResult,
  ReachDimensionKey,
  OperationalAssumption
} from '../types';
import {
  ShieldCheck,
  CheckCircle2,
  Edit3,
  Check,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Lock,
  Sparkles,
  Sliders,
  Scale
} from 'lucide-react';

interface Props {
  audit: ReachAuditResult | null;
  onUpdateAssumption?: (assumptionId: string, updated: Partial<OperationalAssumption>) => void;
}

export const ReachAuditDrawer: React.FC<Props> = ({ audit, onUpdateAssumption }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeDimension, setActiveDimension] = useState<ReachDimensionKey | null>('agency_preservation');
  const [localAssumptions, setLocalAssumptions] = useState<OperationalAssumption[]>(
    audit?.assumptions || []
  );
  const [editingAssumptionId, setEditingAssumptionId] = useState<string | null>(null);
  const [editedText, setEditedText] = useState<string>('');

  // Sync when audit changes
  React.useEffect(() => {
    if (audit?.assumptions) {
      setLocalAssumptions(audit.assumptions);
    }
  }, [audit]);

  if (!audit) {
    return null;
  }

  const dimensionKeys: { key: ReachDimensionKey; label: string; letter: string }[] = [
    { key: 'relevance', label: 'Relevance', letter: 'R' },
    { key: 'epistemic_humility', label: 'Epistemic Humility', letter: 'E' },
    { key: 'agency_preservation', label: 'Agency Preservation', letter: 'A' },
    { key: 'context_sensitivity', label: 'Context Sensitivity', letter: 'C' },
    { key: 'harmonization', label: 'Harmonization', letter: 'H' }
  ];

  const handleAffirm = (id: string) => {
    const updated = localAssumptions.map((a) =>
      a.id === id ? { ...a, status: 'affirmed' as const } : a
    );
    setLocalAssumptions(updated);
    onUpdateAssumption?.(id, { status: 'affirmed' });
  };

  const handleStartEdit = (a: OperationalAssumption) => {
    setEditingAssumptionId(a.id);
    setEditedText(a.userNotes || a.statement);
  };

  const handleSaveEdit = (id: string) => {
    const updated = localAssumptions.map((a) =>
      a.id === id ? { ...a, status: 'modified' as const, statement: editedText } : a
    );
    setLocalAssumptions(updated);
    setEditingAssumptionId(null);
    onUpdateAssumption?.(id, { status: 'modified', statement: editedText });
  };

  const handleResetAssumption = (id: string) => {
    const original = audit.assumptions.find((a) => a.id === id);
    if (!original) return;
    const updated = localAssumptions.map((a) =>
      a.id === id ? { ...a, status: 'unreviewed' as const, statement: original.statement, userNotes: undefined } : a
    );
    setLocalAssumptions(updated);
    setEditingAssumptionId(null);
    onUpdateAssumption?.(id, { status: 'unreviewed', statement: original.statement });
  };

  const getScoreColor = (score: number) => {
    if (score >= 4.0) return 'text-emerald-400 border-emerald-500/50 bg-emerald-950/40';
    if (score >= 3.0) return 'text-cyan-400 border-cyan-500/50 bg-cyan-950/40';
    return 'text-amber-400 border-amber-500/50 bg-amber-950/40';
  };

  return (
    <div className="bg-[#0c0e17]/90 backdrop-blur-md border border-indigo-900/50 rounded-xl p-4 shadow-2xl space-y-4 font-mono transition-all">
      {/* Drawer Header */}
      <div className="flex items-center justify-between pb-3 border-b border-indigo-950/70">
        <div className="flex items-center space-x-2.5">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
            <Scale className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-indigo-200 tracking-wider uppercase">
                Latimer REACH Auto-Rater // Assumption Drawer
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-widest bg-indigo-950/80 border border-indigo-500/40 text-indigo-300">
                SCORE: {audit.overallScore.toFixed(1)}/5.0
              </span>
            </div>
            <div className="text-[10px] text-neutral-400 flex items-center gap-2 mt-0.5">
              <span>Evaluator: {audit.evaluator === 'latimer_api' ? 'Latimer Live API' : 'Deterministic Local Rubric'}</span>
              <span>•</span>
              <span className="text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                Anti-Patronization {audit.antiPatronizationPassed ? 'Passed' : 'Intercepted'}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-neutral-400 hover:text-neutral-200 p-1 rounded hover:bg-neutral-800/60 transition-colors flex items-center gap-1 text-[11px]"
        >
          <span>{isExpanded ? 'Collapse' : 'Expand'}</span>
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {isExpanded && (
        <div className="space-y-4">
          {/* Section 1: 5 REACH Dimension Chips */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-neutral-400">
              <span className="flex items-center gap-1.5 font-bold">
                <Sliders className="w-3 h-3 text-indigo-400" />
                REACH Evaluator Dimensions (Compressed 1–5 Scale)
              </span>
              <span className="text-neutral-500 text-[9px]">Calibrated 2.0–4.0 Median</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {dimensionKeys.map(({ key, label, letter }) => {
                const dim = audit.dimensions[key];
                if (!dim) return null;
                const isSelected = activeDimension === key;

                return (
                  <button
                    key={key}
                    onClick={() => setActiveDimension(isSelected ? null : key)}
                    className={`flex flex-col items-start p-2 rounded-lg border text-left transition-all ${
                      isSelected
                        ? 'border-indigo-400 bg-indigo-950/60 shadow-indigo-900/20 shadow-md'
                        : 'border-neutral-800 bg-[#101320] hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold bg-neutral-800/80 text-neutral-300">
                        {letter}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${getScoreColor(
                          dim.score
                        )}`}
                      >
                        {dim.score.toFixed(1)}
                      </span>
                    </div>
                    <span className="text-[11px] font-bold text-neutral-200 truncate w-full">
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Selected Dimension Rationale Detail Box */}
            {activeDimension && audit.dimensions[activeDimension] && (
              <div className="p-3 bg-[#111422] border border-indigo-900/40 rounded-lg text-xs space-y-1">
                <div className="text-[10px] uppercase font-bold text-indigo-300 flex items-center justify-between">
                  <span>Dimension Rationale: {audit.dimensions[activeDimension].name}</span>
                  <span className="text-neutral-400">Score: {audit.dimensions[activeDimension].score.toFixed(1)} / 5.0</span>
                </div>
                <p className="text-neutral-300 leading-relaxed text-[11px]">
                  {audit.dimensions[activeDimension].rationale}
                </p>
              </div>
            )}
          </div>

          {/* Section 2: Operational Assumptions Drawer */}
          <div className="space-y-2.5 pt-2 border-t border-indigo-950/70">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-wider">
              <span className="text-neutral-400 font-bold flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-cyan-400" />
                Operational Assumptions Made About Seeker's Reality
              </span>
              <span className="text-neutral-500 text-[9px]">
                Review & Confirm Contextual Preconditions
              </span>
            </div>

            <div className="space-y-2.5">
              {localAssumptions.map((assumption) => {
                const isEditing = editingAssumptionId === assumption.id;
                const isAffirmed = assumption.status === 'affirmed';
                const isModified = assumption.status === 'modified';

                return (
                  <div
                    key={assumption.id}
                    className={`p-3 rounded-lg border transition-all space-y-2 ${
                      isAffirmed
                        ? 'bg-[#0b1612] border-emerald-900/60'
                        : isModified
                        ? 'bg-[#15140f] border-amber-900/60'
                        : 'bg-[#11131c] border-neutral-800'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="px-2 py-0.5 rounded bg-neutral-800/80 text-cyan-300 font-bold uppercase tracking-wider">
                        {assumption.category}
                      </span>
                      <div className="flex items-center space-x-1.5">
                        {isAffirmed && (
                          <span className="text-emerald-400 font-bold flex items-center gap-1 text-[9px] uppercase tracking-widest">
                            <CheckCircle2 className="w-3 h-3" /> Affirmed
                          </span>
                        )}
                        {isModified && (
                          <span className="text-amber-400 font-bold flex items-center gap-1 text-[9px] uppercase tracking-widest">
                            <Edit3 className="w-3 h-3" /> Modified
                          </span>
                        )}
                      </div>
                    </div>

                    {isEditing ? (
                      <div className="space-y-2">
                        <textarea
                          value={editedText}
                          onChange={(e) => setEditedText(e.target.value)}
                          rows={2}
                          className="w-full p-2 bg-[#090a10] border border-indigo-500/60 rounded text-neutral-200 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-indigo-400"
                          placeholder="Refine or correct this operational assumption..."
                        />
                        <div className="flex items-center justify-end space-x-2 text-[10px]">
                          <button
                            onClick={() => setEditingAssumptionId(null)}
                            className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleSaveEdit(assumption.id)}
                            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-bold flex items-center gap-1"
                          >
                            <Check className="w-3 h-3" /> Save Edit
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-neutral-200 text-xs leading-relaxed">
                        {assumption.statement}
                      </p>
                    )}

                    {/* Action Bar */}
                    {!isEditing && (
                      <div className="flex items-center justify-between pt-1 border-t border-neutral-800/60 text-[10px]">
                        <span className="text-neutral-500 italic text-[9px]">
                          Precondition for somatic & synthesis advice
                        </span>
                        <div className="flex items-center space-x-1.5">
                          <button
                            onClick={() => handleAffirm(assumption.id)}
                            className={`px-2.5 py-1 rounded font-bold uppercase transition-all flex items-center gap-1 ${
                              isAffirmed
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/50'
                                : 'bg-[#141822] hover:bg-emerald-950 hover:text-emerald-300 text-neutral-400 border border-neutral-800'
                            }`}
                          >
                            <Check className="w-3 h-3" /> Affirm
                          </button>

                          <button
                            onClick={() => handleStartEdit(assumption)}
                            className={`px-2.5 py-1 rounded font-bold uppercase transition-all flex items-center gap-1 ${
                              isModified
                                ? 'bg-amber-950 text-amber-300 border border-amber-500/50'
                                : 'bg-[#141822] hover:bg-amber-950 hover:text-amber-300 text-neutral-400 border border-neutral-800'
                            }`}
                          >
                            <Edit3 className="w-3 h-3" /> Modify
                          </button>

                          {(isAffirmed || isModified) && (
                            <button
                              onClick={() => handleResetAssumption(assumption.id)}
                              className="p-1 text-neutral-500 hover:text-neutral-300 rounded hover:bg-neutral-800/50"
                              title="Reset to original assumption"
                            >
                              <RotateCcw className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 3: Ephemeral Zero-Retention Verification Banner */}
          <div className="p-2.5 bg-[#090b12] border border-emerald-900/40 rounded-lg flex items-center justify-between text-[10px] text-neutral-400">
            <div className="flex items-center space-x-2">
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                <strong className="text-neutral-300">Zero-Retention Guarantee:</strong> Assumption audits and seeker modifications are stored in volatile RAM only. No telemetry or training ingestion.
              </span>
            </div>
            <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 font-mono text-[9px] uppercase font-bold">
              RAM Only
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
