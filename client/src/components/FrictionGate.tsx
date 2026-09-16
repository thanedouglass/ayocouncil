import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CompiledDiagnosticSchema } from '../types';
import { ShieldCheck, Code, AlertTriangle, Sparkles, RefreshCw } from 'lucide-react';

interface Props {
  schema: CompiledDiagnosticSchema;
  onConfirmDiagnosis: (confirmedSchema: CompiledDiagnosticSchema) => void;
  onRejectOrReset: () => void;
  isExecutingFanOut: boolean;
}

const spring = { type: 'spring', stiffness: 220, damping: 26 } as const;

/**
 * The Sovereign Friction Gate: the one place the machine stops and the human
 * must put their hands on the schema. Deliberately weighty — heavy blur,
 * a single ruby seam, and a button that must be *felt* to be pressed.
 */
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
      setParseError(`JSON syntax error: ${e.message}`);
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

  const canExecute = !parseError && !isExecutingFanOut;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={spring}
      className="relative"
    >
      {/* Static gravity aura — the gate is always lit, never pulsing. It waits. */}
      <div
        className="absolute -inset-8 pointer-events-none opacity-60"
        style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(255,42,75,0.08) 0%, transparent 60%)' }}
        aria-hidden
      />

      <div className="relative glass-pane p-6 sm:p-7 space-y-6 border-ruby/20">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-ruby/10 border border-ruby/40 flex items-center justify-center shadow-ruby-border">
              <ShieldCheck className="w-4 h-4 text-ruby" />
            </div>
            <div>
              <h2 className="font-sans text-sm font-semibold tracking-wide text-gray-100">
                Sovereign Friction Gate
              </h2>
              <div className="telemetry uppercase">Mandatory human authorship · pre-flight</div>
            </div>
          </div>

          <div className="flex items-center gap-2 telemetry uppercase">
            <span>Council state</span>
            <span className="px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-400/30 text-amber-300 font-semibold">
              Locked behind confirmation
            </span>
          </div>
        </div>

        {/* Epistemic mandate — human words, human type */}
        <div className="pl-4 border-l-2 border-ruby/60 space-y-1.5">
          <p className="telemetry uppercase text-ruby/90 flex items-center gap-1.5">
            <Code className="w-3.5 h-3.5" /> Epistemic ownership mandate
          </p>
          <p className="font-sans text-sm text-gray-300 leading-relaxed max-w-2xl">
            The Intake Agent has compiled its diagnostic extraction of your dilemma below. To prevent
            algorithmic passive dependency, the seven-seat Council remains locked until you inspect,
            edit, or claim this exact translation as your own sovereign inquiry.
          </p>
        </div>

        {/* Editable schema */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="telemetry uppercase">Compiled diagnostic schema · editable JSON</span>
            {hasEdited && (
              <motion.span
                initial={{ opacity: 0, x: 6 }}
                animate={{ opacity: 1, x: 0 }}
                className="telemetry text-cyan-400/90"
              >
                MODIFIED BY HUMAN CHAIRMAN
              </motion.span>
            )}
          </div>

          <motion.div animate={{ scale: parseError ? [1, 1.004, 1] : 1 }} transition={{ duration: 0.25 }}>
            <textarea
              value={jsonText}
              onChange={(e) => handleJsonChange(e.target.value)}
              rows={9}
              spellCheck={false}
              className={`w-full p-4 rounded-xl bg-black/50 backdrop-blur-xl font-mono text-xs leading-relaxed text-gray-100 focus:outline-none transition-all duration-300 border ${
                parseError
                  ? 'border-amber-400/50 shadow-[0_0_24px_-8px_rgba(251,191,36,0.4)]'
                  : 'border-white/10 focus:border-ruby/50 focus:shadow-[0_0_32px_-8px_rgba(255,42,75,0.35)]'
              }`}
            />
          </motion.div>

          {parseError && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 text-amber-300 font-mono text-xs"
            >
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{parseError}</span>
            </motion.div>
          )}
        </div>

        {/* Structured field inspection */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: 'Primary friction', value: schema.primary_friction || 'None' },
            { label: 'Somatic symptoms', value: schema.somatic_symptoms?.join(', ') || 'None detected' },
            { label: 'Involved actors', value: schema.involved_actors?.join(', ') || 'None specified' }
          ].map((field) => (
            <div key={field.label} className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
              <div className="telemetry uppercase">{field.label}</div>
              <div className="font-sans text-sm text-gray-200 mt-1.5 truncate">{field.value}</div>
            </div>
          ))}
        </div>

        {/* Sovereign confirmation */}
        <div className="pt-5 border-t border-white/5 flex flex-col sm:flex-row items-center gap-3">
          <motion.button
            onClick={handleExecute}
            disabled={!canExecute}
            whileHover={canExecute ? { scale: 1.015, boxShadow: '0 0 48px -6px rgba(255,42,75,0.55)' } : undefined}
            whileTap={canExecute ? { scale: 0.975 } : undefined}
            transition={spring}
            className={`flex-1 w-full flex items-center justify-center gap-2.5 px-6 py-4 rounded-xl font-mono text-xs sm:text-sm font-bold tracking-widest uppercase transition-colors ${
              canExecute
                ? 'bg-gradient-to-r from-ruby to-[#c81e3e] text-white shadow-ruby-glow'
                : 'bg-white/[0.03] border border-white/5 text-gray-600 cursor-not-allowed'
            }`}
          >
            {isExecutingFanOut ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Fanning out to 7 seats...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>I own this diagnosis · Execute fan-out</span>
              </>
            )}
          </motion.button>

          <motion.button
            onClick={onRejectOrReset}
            disabled={isExecutingFanOut}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            transition={spring}
            className="px-5 py-4 rounded-xl bg-white/[0.02] border border-white/10 hover:border-white/25 text-gray-400 hover:text-gray-200 font-mono text-xs uppercase tracking-widest transition-colors"
          >
            Reset intake
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};
