import React, { useState } from 'react';
import { CompiledDiagnosticSchema } from '../types';
import { ShieldCheck, Code, AlertTriangle, Sparkles, RefreshCw } from 'lucide-react';

interface Props {
  schema: CompiledDiagnosticSchema;
  onConfirmDiagnosis: (confirmedSchema: CompiledDiagnosticSchema) => void;
  onRejectOrReset: () => void;
  isExecutingFanOut: boolean;
}

export const FrictionGate: React.FC<Props> = ({
  schema,
  onConfirmDiagnosis,
  onRejectOrReset,
  isExecutingFanOut
}) => {
  const [jsonText, setJsonText] = useState(JSON.stringify(schema, null, 2));
  const [parseError, setParseError] = useState<string | null>(null);
  const [hasEdited, setHasEdited] = useState(false);

  const handleJsonChange = (val: string) => {
    setJsonText(val);
    setHasEdited(true);
    try {
      const parsed = JSON.parse(val);
      if (!parsed.primary_friction || typeof parsed.primary_friction !== 'string') {
        setParseError('Schema missing required string: "primary_friction"');
      } else if (!Array.isArray(parsed.somatic_symptoms)) {
        setParseError('Schema requires array: "somatic_symptoms"');
      } else if (!Array.isArray(parsed.involved_actors)) {
        setParseError('Schema requires array: "involved_actors"');
      } else {
        setParseError(null);
      }
    } catch (e: any) {
      setParseError(`JSON Syntax Error: ${e.message}`);
    }
  };

  const handleExecute = () => {
    try {
      const parsed: CompiledDiagnosticSchema = JSON.parse(jsonText);
      onConfirmDiagnosis(parsed);
    } catch (e: any) {
      setParseError(`Cannot execute invalid JSON: ${e.message}`);
    }
  };

  return (
    <div className="w-full bg-[#0d0d14] border-2 border-ruby/60 rounded-xl p-5 sm:p-6 shadow-ruby-glow text-neutral-100 font-mono space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-ruby/30">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-ruby/20 border border-ruby flex items-center justify-center shadow-ruby-border">
            <ShieldCheck className="w-4 h-4 text-ruby animate-pulse" />
          </div>
          <div>
            <div className="text-xs sm:text-sm font-bold tracking-widest text-neutral-100 uppercase flex items-center gap-2">
              Sovereign Friction Gate <span className="text-ruby">//</span> Diagnostic Pre-Flight
            </div>
            <div className="text-[10px] text-neutral-400">
              Mandatory Human Authorship Check Before Council Fan-Out
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-[10px] uppercase font-bold tracking-wider">
          <span className="text-neutral-500">Council State:</span>
          <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/40 text-amber-400">
            LOCKED BEHIND CONFIRMATION
          </span>
        </div>
      </div>

      {/* Epistemic Mandate Banner */}
      <div className="p-3.5 bg-[#120a10] border-l-2 border-ruby text-neutral-300 text-xs leading-relaxed space-y-1">
        <p className="font-semibold text-ruby flex items-center gap-1.5 uppercase text-[11px]">
          <Code className="w-3.5 h-3.5" /> Epistemic Ownership Mandate:
        </p>
        <p>
          The Intake Agent has compiled its diagnostic extraction of your dilemma below. 
          To prevent algorithmic passive dependency, the 7-seat Council remains locked until you inspect, 
          edit, or claim this exact translation as your own sovereign inquiry.
        </p>
      </div>

      {/* Raw Editable Schema Area */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[11px] text-neutral-400">
          <span className="uppercase font-semibold tracking-wider">
            Compiled Diagnostic Schema (Editable JSON):
          </span>
          {hasEdited && (
            <span className="text-cyan-400 text-[10px]">
              Modified by Human Chairman
            </span>
          )}
        </div>

        <div className="relative">
          <textarea
            value={jsonText}
            onChange={(e) => handleJsonChange(e.target.value)}
            rows={9}
            spellCheck={false}
            className={`w-full p-4 bg-[#08080c] border rounded-lg font-mono text-xs leading-relaxed text-neutral-100 focus:outline-none transition-all ${
              parseError
                ? 'border-amber-500 focus:border-amber-400 focus:ring-1 focus:ring-amber-500'
                : 'border-ruby/40 focus:border-ruby focus:ring-1 focus:ring-ruby'
            }`}
          />
        </div>

        {parseError && (
          <div className="flex items-center space-x-2 text-amber-400 text-xs pt-1">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{parseError}</span>
          </div>
        )}
      </div>

      {/* Structured Field Inspection Tags */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 text-[11px]">
        <div className="p-2.5 bg-[#12121c] border border-neutral-800 rounded">
          <div className="text-[10px] text-neutral-500 uppercase font-bold">Primary Friction:</div>
          <div className="text-neutral-200 mt-1 truncate">
            {schema.primary_friction || 'None'}
          </div>
        </div>

        <div className="p-2.5 bg-[#12121c] border border-neutral-800 rounded">
          <div className="text-[10px] text-neutral-500 uppercase font-bold">Somatic Symptoms:</div>
          <div className="text-neutral-200 mt-1 truncate">
            {schema.somatic_symptoms?.join(', ') || 'None detected'}
          </div>
        </div>

        <div className="p-2.5 bg-[#12121c] border border-neutral-800 rounded">
          <div className="text-[10px] text-neutral-500 uppercase font-bold">Involved Actors:</div>
          <div className="text-neutral-200 mt-1 truncate">
            {schema.involved_actors?.join(', ') || 'None specified'}
          </div>
        </div>
      </div>

      {/* Confirmation Sovereign Gate Button */}
      <div className="pt-4 border-t border-neutral-800/80 flex flex-col sm:flex-row items-center gap-3">
        <button
          onClick={handleExecute}
          disabled={!!parseError || isExecutingFanOut}
          className={`flex-1 w-full flex items-center justify-center space-x-2.5 px-6 py-3.5 rounded-lg font-mono text-xs sm:text-sm font-bold tracking-widest uppercase transition-all shadow-ruby-glow ${
            parseError || isExecutingFanOut
              ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
              : 'bg-ruby hover:bg-ruby-hover text-white active:scale-95'
          }`}
        >
          {isExecutingFanOut ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>FANNING OUT TO 7 SEATS...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-white" />
              <span>I OWN THIS DIAGNOSIS [EXECUTE FAN-OUT]</span>
            </>
          )}
        </button>

        <button
          onClick={onRejectOrReset}
          disabled={isExecutingFanOut}
          className="px-4 py-3.5 border border-neutral-700 hover:border-neutral-500 text-neutral-400 hover:text-neutral-200 rounded-lg text-xs font-mono uppercase tracking-wider transition-all"
        >
          Reset Intake
        </button>
      </div>
    </div>
  );
};
