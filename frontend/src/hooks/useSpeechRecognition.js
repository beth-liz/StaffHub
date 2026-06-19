/**
 * useSpeechRecognition — Robust custom hook for browser Speech Recognition.
 *
 * Design goals:
 *  - Stable recognizer: created ONCE via useRef, never rebuilt on re-render.
 *  - Race-condition free: final transcript is captured in a ref, not state.
 *    The `onTranscriptReady` callback fires AFTER recognition fully ends.
 *  - 300 ms start delay so microphone hardware is initialised before
 *    recognition begins (eliminates missed first syllables).
 *  - Automatic retry on `no-speech` / `aborted` (up to MAX_RETRIES times).
 *  - Rich status enum: idle | listening | processing | recognized | failed
 *  - Whisper fallback: on browser recognition failure the recorded audio blob
 *    is POSTed to /api/ai/transcribe (OpenAI Whisper) for higher accuracy.
 *  - Console logging of every final transcript for debugging.
 */

import { useRef, useState, useCallback, useEffect } from 'react';
import { transcribeAudio } from '../services/api';

// ─── Constants ────────────────────────────────────────────────────────────────
const MAX_RETRIES = 2;           // auto-retry attempts on no-speech / aborted
const START_DELAY_MS = 300;      // mic warm-up delay before recognition begins
const SILENCE_TIMEOUT_MS = 15000; // 15 s of continuous silence before stopping
                                  // Long commands like "Apply sick leave for next Monday
                                  // because I have a doctor's appointment" can take 8–12 s

export const RECOGNITION_STATUS = {
  IDLE: 'idle',
  LISTENING: 'listening',
  PROCESSING: 'processing',
  RECOGNIZED: 'recognized',
  FAILED: 'failed',
};

// ─── Check browser support ────────────────────────────────────────────────────
const getSpeechRecognitionClass = () =>
  typeof window !== 'undefined' &&
  (window.SpeechRecognition || window.webkitSpeechRecognition);

/**
 * @param {object}   options
 * @param {string}   [options.lang='en-IN']            BCP-47 language code
 * @param {function} [options.onTranscriptReady]        Called with (finalText) after recognition ends
 * @param {boolean}  [options.useWhisperFallback=true]  Try Whisper on browser failure
 */
const useSpeechRecognition = ({
  lang = 'en-IN',
  onTranscriptReady,
  useWhisperFallback = true,
} = {}) => {
  const SpeechRecognitionClass = getSpeechRecognitionClass();
  const isSupported = !!SpeechRecognitionClass;

  // ── State ─────────────────────────────────────────────────────────────────
  const [status, setStatus]                   = useState(RECOGNITION_STATUS.IDLE);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [transcript, setTranscript]           = useState('');
  const [error, setError]                     = useState(null);

  // ── Refs (never stale, no re-renders) ────────────────────────────────────
  const recognitionRef      = useRef(null);  // the SpeechRecognition instance
  const mediaRecorderRef    = useRef(null);  // for Whisper audio capture
  const audioChunksRef      = useRef([]);    // audio data chunks
  const finalTranscriptRef  = useRef('');    // captures result without stale closure
  const retryCountRef       = useRef(0);
  const startDelayTimerRef  = useRef(null);
  const silenceTimerRef     = useRef(null);
  const isListeningRef      = useRef(false); // to prevent double-start
  const manualStopRef       = useRef(false); // to prevent browser VAD from killing long sessions
  const pendingErrorRef     = useRef(null);  // store errors until Whisper fallback completes
  const onTranscriptReadyRef = useRef(onTranscriptReady); // keep latest callback

  // Keep callback ref fresh
  useEffect(() => {
    onTranscriptReadyRef.current = onTranscriptReady;
  }, [onTranscriptReady]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const resetSilenceTimer = useCallback(() => {
    clearSilenceTimer();
    silenceTimerRef.current = setTimeout(() => {
      // Silence timeout — stop gracefully so onend fires
      if (recognitionRef.current && isListeningRef.current) {
        console.log('[SpeechRecognition] Silence timeout (15s) reached — stopping naturally');
        manualStopRef.current = true;
        recognitionRef.current.stop();
      }
    }, SILENCE_TIMEOUT_MS);
  }, [clearSilenceTimer]);

  // ── Whisper fallback ──────────────────────────────────────────────────────
  const tryWhisperFallback = useCallback(async () => {
    if (!useWhisperFallback) return null;
    const chunks = audioChunksRef.current;
    if (!chunks || chunks.length === 0) return null;

    try {
      setStatus(RECOGNITION_STATUS.PROCESSING);
      const mimeType = chunks[0]?.type || 'audio/webm';
      const blob = new Blob(chunks, { type: mimeType });
      console.log('[Whisper] Attempting fallback transcription, blob size:', blob.size);
      const result = await transcribeAudio(blob, mimeType);
      if (result?.transcript?.trim()) {
        const text = result.transcript.trim();
        console.log('[Whisper] Transcript:', text);
        finalTranscriptRef.current = text;
        setTranscript(text);
        setStatus(RECOGNITION_STATUS.RECOGNIZED);
        onTranscriptReadyRef.current?.(text);
        return text;
      }
    } catch (err) {
      console.warn('[Whisper] Fallback failed:', err.message);
    }
    return null;
  }, [useWhisperFallback]);

  // ── Start audio capture for Whisper ──────────────────────────────────────
  const startAudioCapture = useCallback(async () => {
    if (!useWhisperFallback) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      // Prefer formats Whisper accepts
      const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg']
        .find(t => MediaRecorder.isTypeSupported(t)) || '';

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.start(250); // collect chunks every 250 ms
      mediaRecorderRef.current = recorder;
    } catch {
      // getUserMedia may fail if permission already denied — ignore silently
    }
  }, [useWhisperFallback]);

  const stopAudioCapture = useCallback(() => {
    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream?.getTracks().forEach(t => t.stop());
      }
    } catch {
      // ignore
    }
    mediaRecorderRef.current = null;
  }, []);

  // ── Build the SpeechRecognition instance (once) ───────────────────────────
  useEffect(() => {
    if (!isSupported) return;

    const recognition = new SpeechRecognitionClass();

    // ── Configuration ─────────────────────────────────────────────────────
    recognition.continuous      = true;   // don't auto-stop on first pause
    recognition.interimResults  = true;   // live partial results
    recognition.maxAlternatives = 1;
    recognition.lang            = lang;

    // ── Handlers ──────────────────────────────────────────────────────────
    recognition.onstart = () => {
      isListeningRef.current = true;
      // Do NOT wipe finalTranscriptRef here, because auto-restarts need to append text.
      // Wiping is handled exclusively in startListening().
      setError(null);
      setStatus(RECOGNITION_STATUS.LISTENING);
      resetSilenceTimer();
      console.log(`[SpeechRecognition] Started (lang: ${recognition.lang})`);
    };

    recognition.onresult = (event) => {
      resetSilenceTimer(); // user is speaking — reset the silence watchdog

      let interim = '';
      let final   = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text   = result[0].transcript;
        if (result.isFinal) {
          final += text;
          console.log(
            `[SpeechRecognition] Final segment: "${text}" (confidence: ${(result[0].confidence * 100).toFixed(1)}%)`
          );
        } else {
          interim += text;
        }
      }

      if (interim) setInterimTranscript(interim);

      if (final) {
        // Accumulate final segments (continuous mode produces multiple final results)
        finalTranscriptRef.current = (finalTranscriptRef.current + ' ' + final).trim();
        setTranscript(finalTranscriptRef.current);
        setInterimTranscript('');
      }
    };

    recognition.onerror = async (event) => {
      const err = event.error;
      console.warn('[SpeechRecognition] Error:', err);

      // If we've already stopped listening, ignore ghost errors (like trailing network errors)
      if (!isListeningRef.current) {
        console.warn('[SpeechRecognition] Error fired after listening stopped — completely ignoring ghost error');
        return;
      }

      clearSilenceTimer();

      if (err === 'aborted') {
        // Intentional stop — don't retry
        return;
      }

      if (err === 'not-allowed' || err === 'service-not-allowed') {
        manualStopRef.current = true;
        isListeningRef.current = false;
        stopAudioCapture();
        setError('Microphone access denied. Please allow microphone permissions in your browser settings.');
        setStatus(RECOGNITION_STATUS.FAILED);
        return;
      }

      if (err === 'network') {
        // IMPORTANT: Chrome (and Edge) often fire a spurious 'network' onerror
        // AFTER a successful recognition result, right before onend fires.
        // If we already have a captured transcript, this error is a false positive —
        // suppress it entirely. The onend handler will deliver the result normally.
        if (finalTranscriptRef.current.trim()) {
          console.warn('[SpeechRecognition] Network error fired but transcript already captured — suppressing false positive');
          return;
        }
        console.warn('[SpeechRecognition] Genuine network error — deferring to Whisper fallback');
        pendingErrorRef.current = 'Network error. Check your internet connection.';
        manualStopRef.current = true;
        isListeningRef.current = false;
        stopAudioCapture();
        return;
      }

      if (err === 'no-speech' || err === 'audio-capture') {
        // If the user hasn't explicitly stopped (e.g. silence timer hasn't fired),
        // we should just infinitely auto-restart to simulate continuous listening.
        if (!manualStopRef.current) {
          console.log('[SpeechRecognition] no-speech detected, auto-restarting to keep listening...');
          setTimeout(() => {
            try { recognition.start(); } catch {}
          }, 300);
          return;
        }

        pendingErrorRef.current = 'No speech detected. Please try again.';
        isListeningRef.current = false;
        stopAudioCapture();
        return;
      }

      // Unknown error — defer to Whisper
      pendingErrorRef.current = err;
      manualStopRef.current = true;
      isListeningRef.current = false;
      stopAudioCapture();
    };

    recognition.onend = async () => {
      if (!manualStopRef.current && isListeningRef.current) {
        // Browser's VAD stopped recognition early due to a natural pause,
        // but our 15s silence timeout hasn't fired yet!
        // We must auto-restart to allow the user to speak long sentences with pauses.
        console.log('[SpeechRecognition] Browser VAD stopped early. Auto-restarting to reach 15s silence timeout...');
        try {
          recognition.start();
        } catch { /* ignore if already started */ }
        return;
      }

      clearSilenceTimer();
      isListeningRef.current = false;
      stopAudioCapture();
      setInterimTranscript('');

      const finalText = finalTranscriptRef.current.trim();
      console.log('[SpeechRecognition] Ended. Final transcript:', finalText || '(empty)');

      if (finalText) {
        setStatus(RECOGNITION_STATUS.RECOGNIZED);
        // Small buffer so React state is flushed before callback
        setTimeout(() => {
          onTranscriptReadyRef.current?.(finalText);
        }, 50);
      } else {
        // No text from browser STT. Let's try Whisper!
        console.log('[SpeechRecognition] No final text from browser. Running Whisper fallback...');
        const whisperText = await tryWhisperFallback();
        if (!whisperText) {
          // Whisper also failed. Now we can safely surface the pending error.
          setError(pendingErrorRef.current || 'No speech detected. Please try again.');
          setStatus(RECOGNITION_STATUS.FAILED);
        } else {
          console.log('[SpeechRecognition] Whisper fallback succeeded! Suppressing browser errors.');
          // Error completely suppressed. onTranscriptReady already fired inside tryWhisperFallback.
        }
      }
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.onstart  = null;
      recognition.onresult = null;
      recognition.onerror  = null;
      recognition.onend    = null;
      try { recognition.abort(); } catch { /* ignore */ }
    };
    // lang changes should recreate the recognizer with the new language
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, isSupported]);

  // ── Public API ────────────────────────────────────────────────────────────
  const startListening = useCallback(() => {
    if (!isSupported) return;
    if (isListeningRef.current) {
      console.warn('[SpeechRecognition] Already listening — ignoring start call');
      return;
    }

    // Reset state
    manualStopRef.current = false;
    pendingErrorRef.current = null;
    retryCountRef.current = 0;
    finalTranscriptRef.current = '';
    audioChunksRef.current = [];
    setTranscript('');
    setInterimTranscript('');
    setError(null);
    setStatus(RECOGNITION_STATUS.LISTENING);

    // Clear any pending start
    if (startDelayTimerRef.current) {
      clearTimeout(startDelayTimerRef.current);
    }

    // Start audio capture for Whisper simultaneously
    startAudioCapture();

    // 300 ms warm-up delay before recognition starts
    startDelayTimerRef.current = setTimeout(() => {
      try {
        recognitionRef.current?.start();
      } catch (err) {
        console.error('[SpeechRecognition] Failed to start:', err.message);
        setError('Failed to start microphone. Please try again.');
        setStatus(RECOGNITION_STATUS.FAILED);
        stopAudioCapture();
      }
    }, START_DELAY_MS);
  }, [isSupported, startAudioCapture, stopAudioCapture]);

  const stopListening = useCallback(() => {
    manualStopRef.current = true;
    clearSilenceTimer();
    if (startDelayTimerRef.current) {
      clearTimeout(startDelayTimerRef.current);
      startDelayTimerRef.current = null;
    }
    try {
      if (isListeningRef.current) {
        recognitionRef.current?.stop(); // graceful stop → triggers onend
      }
    } catch { /* ignore */ }
  }, [clearSilenceTimer]);

  const resetTranscript = useCallback(() => {
    finalTranscriptRef.current = '';
    setTranscript('');
    setInterimTranscript('');
    setStatus(RECOGNITION_STATUS.IDLE);
    setError(null);
  }, []);

  // Update language on the existing recognizer when lang prop changes
  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.lang = lang;
    }
  }, [lang]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearSilenceTimer();
      if (startDelayTimerRef.current) clearTimeout(startDelayTimerRef.current);
      stopAudioCapture();
      try { recognitionRef.current?.abort(); } catch { /* ignore */ }
    };
  }, [clearSilenceTimer, stopAudioCapture]);

  return {
    isSupported,
    status,
    transcript,
    interimTranscript,
    error,
    isListening: status === RECOGNITION_STATUS.LISTENING,
    startListening,
    stopListening,
    resetTranscript,
  };
};

export default useSpeechRecognition;
