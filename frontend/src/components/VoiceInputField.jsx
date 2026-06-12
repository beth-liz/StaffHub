import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, RotateCcw, Trash2, AlertCircle, CheckCircle, Volume2 } from 'lucide-react';

const LANGUAGES = [
  { code: 'en-IN', label: 'English (India)' },
  { code: 'hi-IN', label: 'Hindi (हिंदी)' },
  { code: 'ml-IN', label: 'Malayalam (മലയാളം)' },
  { code: 'ta-IN', label: 'Tamil (தமிழ்)' },
  { code: 'te-IN', label: 'Telugu (తెలుగు)' },
  { code: 'kn-IN', label: 'Kannada (ಕನ್ನಡ)' },
];

const VoiceInputField = ({
  value,
  onChange,
  onVoiceDataChange,
  placeholder = 'Describe why you need this time-off...',
  label = 'Reason for Leave',
  required = true,
  rows = 3
}) => {
  const recognitionRef = useRef(null);
  const [isListening, setIsListening] = useState(false);
  const [language, setLanguage] = useState('en-IN');
  const [confidence, setConfidence] = useState(null);
  const [error, setError] = useState(null);
  const [interimText, setInterimText] = useState('');

  // Check if browser supports SpeechRecognition
  const SpeechRecognition = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
  const isSupported = !!SpeechRecognition;

  useEffect(() => {
    if (!isSupported) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
      setInterimText('');
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      // Don't error out on 'no-speech' since they might just be thinking
      if (event.error !== 'no-speech') {
        setError(event.error);
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimText('');
    };

    recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';
      let latestConfidence = null;

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
          latestConfidence = result[0].confidence;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      if (interimTranscript) {
        setInterimText(interimTranscript);
      }

      if (finalTranscript) {
        setInterimText('');
        // Append text to the existing value
        const updatedValue = value 
          ? `${value.trim()} ${finalTranscript.trim()}`
          : finalTranscript.trim();

        // Trigger react onChange form helper
        onChange({
          target: {
            name: 'reason',
            value: updatedValue
          }
        });

        if (latestConfidence !== null) {
          setConfidence(latestConfidence);
          if (onVoiceDataChange) {
            onVoiceDataChange({
              voiceTranscript: finalTranscript.trim(),
              speechLanguage: language,
              speechConfidence: latestConfidence
            });
          }
        }
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [language, isSupported, value, onChange, onVoiceDataChange]);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      setError(null);
      setConfidence(null);
      setInterimText('');
      try {
        recognitionRef.current?.start();
      } catch (err) {
        console.error('Failed to start speech recognition:', err);
        setError('Blocked or already running');
      }
    }
  };

  const handleClear = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    }
    onChange({
      target: {
        name: 'reason',
        value: ''
      }
    });
    setConfidence(null);
    setError(null);
    setInterimText('');
    if (onVoiceDataChange) {
      onVoiceDataChange({
        voiceTranscript: '',
        speechLanguage: '',
        speechConfidence: null
      });
    }
  };

  const handleRetry = () => {
    handleClear();
    // Start listening immediately
    setTimeout(() => {
      try {
        recognitionRef.current?.start();
      } catch (err) {
        console.error('Failed to restart speech recognition:', err);
      }
    }, 150);
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <label className="form-label text-xs font-semibold text-slate-700 dark:text-slate-350">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
        
        {isSupported && (
          <div className="flex items-center gap-2.5">
            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider dark:text-slate-500">Language</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              disabled={isListening}
              className="px-2.5 py-1 text-[10px] bg-slate-50 border border-slate-200/50 dark:bg-slate-900 dark:border-slate-800 dark:text-white rounded-lg font-semibold outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

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

      {/* Speech Assist Options & Indicators */}
      {isSupported && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-[10px] mt-1 text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            {isListening && (
              <span className="flex items-center gap-1.5 text-brand-600 dark:text-brand-400 font-semibold animate-pulse">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-500 animate-ping" />
                Listening ({LANGUAGES.find(l => l.code === language)?.label})... Speak now.
              </span>
            )}
            
            {interimText && (
              <span className="italic text-slate-400 max-w-[200px] truncate">
                "{interimText}"
              </span>
            )}

            {!isListening && confidence !== null && (
              <div className="flex items-center gap-1.5 font-bold">
                {confidence >= 0.8 ? (
                  <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle size={10} /> Clear match: {Math.round(confidence * 100)}% confidence
                  </span>
                ) : (
                  <span className="text-amber-500 dark:text-amber-400 flex items-center gap-1 font-bold">
                    <AlertCircle size={10} /> Low match: {Math.round(confidence * 100)}% confidence. Review text.
                  </span>
                )}
              </div>
            )}

            {error && (
              <span className="text-rose-500 font-semibold flex items-center gap-1">
                <AlertCircle size={10} /> Speech error: {error}
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

            {isListening && (
              <button
                type="button"
                onClick={handleRetry}
                className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/20 dark:hover:bg-amber-900/35 text-amber-700 dark:text-amber-400 rounded-lg border border-amber-100/20 transition-colors font-bold"
              >
                <RotateCcw size={10} /> Restart
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VoiceInputField;
