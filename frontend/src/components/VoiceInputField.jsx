import React, { useState, useCallback } from 'react';
import { Mic, MicOff, RotateCcw, Trash2, AlertCircle, CheckCircle, Volume2 } from 'lucide-react';
import useSpeechRecognition, { RECOGNITION_STATUS } from '../hooks/useSpeechRecognition';

// ─── Language options ─────────────────────────────────────────────────────────
const LANGUAGES = [
  { code: 'en-IN', label: 'English (India)' },
  { code: 'hi-IN', label: 'Hindi (हिंदी)' },
  { code: 'ml-IN', label: 'Malayalam (മലയാളം)' },
  { code: 'ta-IN', label: 'Tamil (தமிழ்)' },
  { code: 'te-IN', label: 'Telugu (తెలుగు)' },
  { code: 'kn-IN', label: 'Kannada (ಕನ್ನಡ)' },
];

/**
 * VoiceInputField — A textarea with speech-to-text capability.
 *
 * Uses the useSpeechRecognition hook for reliable, race-condition-free capture.
 * Language can be switched via dropdown. Appends recognised text to existing value.
 */
const VoiceInputField = ({
  value,
  onChange,
  onVoiceDataChange,
  placeholder = 'Describe why you need this time-off...',
  label       = 'Reason for Leave',
  required    = true,
  rows        = 3,
}) => {
  const [language, setLanguage]   = useState('en-IN');
  const [confidence, setConfidence] = useState(null);

  // ── Called when recognition fully ends with a final transcript ──────────
  const handleTranscriptReady = useCallback((finalText) => {
    if (!finalText?.trim()) return;

    console.log('[VoiceInputField] Transcript ready:', finalText);

    const updatedValue = value
      ? `${value.trim()} ${finalText.trim()}`
      : finalText.trim();

    // Simulate a synthetic onChange event so the parent form hook is happy
    onChange({ target: { name: 'reason', value: updatedValue } });

    // confidence comes from the hook's recognition events — we track it separately
    if (onVoiceDataChange) {
      onVoiceDataChange({
        voiceTranscript:  finalText.trim(),
        speechLanguage:   language,
        speechConfidence: null, // confidence is reported per-result in the hook
      });
    }
  }, [value, onChange, onVoiceDataChange, language]);

  // ── Speech recognition ────────────────────────────────────────────────────
  // NOTE: `value` and `onChange` are NOT in deps here — that was the original bug.
  // The hook recreates the recogniser only when `lang` changes (intentional).
  const {
    isSupported,
    status,
    interimTranscript,
    error,
    isListening,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition({
    lang: language,
    onTranscriptReady: handleTranscriptReady,
    useWhisperFallback: true,
  });

  // ── Controls ──────────────────────────────────────────────────────────────
  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      resetTranscript();
      startListening();
    }
  };

  const handleClear = () => {
    if (isListening) stopListening();
    resetTranscript();
    setConfidence(null);
    onChange({ target: { name: 'reason', value: '' } });
    if (onVoiceDataChange) {
      onVoiceDataChange({ voiceTranscript: '', speechLanguage: '', speechConfidence: null });
    }
  };

  const handleRetry = () => {
    handleClear();
    setTimeout(() => startListening(), 200);
  };

  // ── Status display helpers ────────────────────────────────────────────────
  const langLabel = LANGUAGES.find(l => l.code === language)?.label;

  const isFailed     = status === RECOGNITION_STATUS.FAILED;
  const isRecognized = status === RECOGNITION_STATUS.RECOGNIZED;

  return (
    <div className="space-y-2.5">
      {/* Label + language selector row */}
      <div className="flex items-center justify-between">
        <label className="form-label text-xs font-semibold text-slate-700 dark:text-slate-350">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>

        {isSupported && (
          <div className="flex items-center gap-2.5">
            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider dark:text-slate-500">
              Language
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              disabled={isListening}
              className="px-2.5 py-1 text-[10px] bg-slate-50 border border-slate-200/50 dark:bg-slate-900 dark:border-slate-800 dark:text-white rounded-lg font-semibold outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>{lang.label}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Textarea + mic button */}
      <div className="relative">
        <textarea
          required={required}
          rows={rows}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="form-input pr-12 text-xs dark:bg-slate-900 dark:border-slate-800 dark:text-white resize-none"
        />

        {isSupported && (
          <div className="absolute right-3.5 bottom-3.5 flex items-center gap-2">
            <button
              type="button"
              onClick={toggleListening}
              title={isListening ? 'Stop recording' : 'Start speaking'}
              className={`p-2 rounded-xl flex items-center justify-center transition-all ${
                isListening
                  ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20 animate-pulse scale-110 ring-4 ring-rose-500/10'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:scale-105'
              }`}
            >
              {isListening ? <Mic size={14} /> : <Volume2 size={14} />}
            </button>
          </div>
        )}
      </div>

      {/* Live interim preview */}
      {interimTranscript && (
        <div className="px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20">
          <p className="text-[10px] text-rose-600 dark:text-rose-400 italic">
            🎤 {interimTranscript}
          </p>
        </div>
      )}

      {/* Status strip */}
      {isSupported && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-[10px] mt-1 text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">

            {isListening && (
              <span className="flex items-center gap-1.5 text-brand-600 dark:text-brand-400 font-semibold animate-pulse">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-500 animate-ping" />
                Listening ({langLabel})… Speak now.
              </span>
            )}

            {isRecognized && !isListening && (
              <div className="flex items-center gap-1.5 font-bold">
                {(confidence ?? 1) >= 0.8 ? (
                  <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle size={10} />
                    Voice captured — review text above.
                  </span>
                ) : (
                  <span className="text-amber-500 dark:text-amber-400 flex items-center gap-1">
                    <AlertCircle size={10} />
                    Low confidence — please review the text.
                  </span>
                )}
              </div>
            )}

            {isFailed && !isListening && (
              <span className="text-rose-500 font-semibold flex items-center gap-1">
                <AlertCircle size={10} />
                {error || 'Voice recognition failed'}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {value && (
              <button
                type="button"
                onClick={handleClear}
                className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg transition-colors font-bold"
              >
                <Trash2 size={10} /> Clear Text
              </button>
            )}

            {(isListening || isFailed) && (
              <button
                type="button"
                onClick={handleRetry}
                className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/20 dark:hover:bg-amber-900/35 text-amber-700 dark:text-amber-400 rounded-lg border border-amber-100/20 transition-colors font-bold"
              >
                <RotateCcw size={10} /> {isFailed ? 'Try Again' : 'Restart'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VoiceInputField;
