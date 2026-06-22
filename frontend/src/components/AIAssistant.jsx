import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mic, MicOff, Loader2, X, MessageSquare, Volume2, VolumeX,
  ChevronDown, CheckCircle, AlertCircle, RefreshCw
} from 'lucide-react';
import { sendAICommand, clearAISession } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import useSpeechRecognition, { RECOGNITION_STATUS } from '../hooks/useSpeechRecognition';

const AIAssistant = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [isOpen, setIsOpen]           = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [messages, setMessages]       = useState([]);
  const [inputText, setInputText]     = useState('');
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  const messagesEndRef = useRef(null);
  const synthRef       = useRef(window.speechSynthesis);

  // ── Session keys per user ──────────────────────────────────────────────────
  const sessionKey = user ? `ai_chat_messages_${user.id}` : null;
  const stateKey   = user ? `ai_chat_open_${user.id}`    : null;

  // ── Handle a fully recognised transcript ──────────────────────────────────
  const handleTranscriptReady = useCallback((text) => {
    if (!text || !text.trim()) {
      console.warn('[AIAssistant] Empty transcript received — skipping');
      return;
    }
    console.log('[AIAssistant] Transcript ready →', text);
    // Clear the input field and voice state immediately so the UI looks clean
    setInputText('');
    handleProcessCommand(text);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Speech recognition hook ────────────────────────────────────────────────
  const {
    isSupported,
    status:             voiceStatus,
    transcript:         liveTranscript,
    interimTranscript,
    error:              voiceError,
    isListening,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition({
    lang: 'en-IN',   // Indian English — better accuracy for Indian accents
    onTranscriptReady: handleTranscriptReady,
    useWhisperFallback: true,
  });

  // Sync live transcript into the input field for user feedback
  useEffect(() => {
    if (liveTranscript) setInputText(liveTranscript);
  }, [liveTranscript]);

  // Show voice errors as toasts
  // NOTE: The hook already suppresses false-positive Chrome 'network' errors
  // (those fired after a successful transcript). Only genuine errors reach here.
  useEffect(() => {
    if (!voiceError) return;
    if (voiceError.includes('denied') || voiceError.includes('not-allowed')) {
      toast.error(voiceError, { duration: 6000, id: 'mic-error' });
    } else if (voiceError.includes('internet connection')) {
      // Only show this when the hook confirmed it's a real network failure
      toast.error('Speech recognition requires an internet connection.', { duration: 4000, id: 'network-error' });
    } else if (voiceError.includes('No speech')) {
      // Silently shown in the status pill only
    } else {
      toast.error(`Voice error: ${voiceError}`, { duration: 4000, id: 'voice-error' });
    }
  }, [voiceError]);

  // ── Session management ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) {
      setMessages([]);
      setIsOpen(false);
      return;
    }

    const currentUserId = user.id;
    const storedUserId  = sessionStorage.getItem('ai_current_user_id');

    if (storedUserId && storedUserId !== currentUserId) {
      Object.keys(sessionStorage).forEach(key => {
        if (key.startsWith('ai_chat_messages_') || key.startsWith('ai_chat_open_')) {
          sessionStorage.removeItem(key);
        }
      });
    }
    sessionStorage.setItem('ai_current_user_id', currentUserId);

    const savedMessages = sessionStorage.getItem(sessionKey);
    if (savedMessages) {
      try { setMessages(JSON.parse(savedMessages)); }
      catch { setMessages([]); }
    } else {
      setMessages([{
        id: Date.now().toString(),
        sender: 'ai',
        text: `Hi ${user.name}, I'm your AI HR Assistant. How can I help you today?`,
        timestamp: new Date().toISOString()
      }]);
    }

    const savedOpenState = sessionStorage.getItem(stateKey);
    if (savedOpenState === 'true') setIsOpen(true);
  }, [user, sessionKey, stateKey]);

  useEffect(() => {
    if (sessionKey && messages.length > 0) {
      sessionStorage.setItem(sessionKey, JSON.stringify(messages));
    }
  }, [messages, sessionKey]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  // ── Speech synthesis ───────────────────────────────────────────────────────
  const speakText = useCallback((text) => {
    if (!voiceEnabled || !synthRef.current) return;
    synthRef.current.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voices    = synthRef.current.getVoices();
    const goodVoice = voices.find(v => v.lang.startsWith('en'));
    if (goodVoice) utterance.voice = goodVoice;
    utterance.rate = 1.05;
    synthRef.current.speak(utterance);
  }, [voiceEnabled]);

  // ── Process command ────────────────────────────────────────────────────────
  const handleProcessCommand = useCallback(async (commandText) => {
    const cmd = commandText?.trim();
    if (!cmd) {
      console.warn('[AIAssistant] handleProcessCommand called with empty string — skipped');
      return;
    }

    const userMsg = {
      id: Date.now().toString(),
      sender: 'user',
      text: cmd,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMsg]);
    setIsProcessing(true);

    try {
      const res = await sendAICommand(cmd);

      if (res.action === 'NAVIGATE' && res.path) {
        navigate(res.path);
      } else if (res.action === 'TOGGLE_DARK_MODE') {
        window.dispatchEvent(new CustomEvent('staffhub:toggleDarkMode', {
          detail: { enabled: !document.documentElement.classList.contains('dark') }
        }));
      } else if (res.action === 'DOWNLOAD_EXCEL' && res.path) {
        if (res.path === '/api/leaves/export') {
          const { exportLeaveReport } = await import('../services/api');
          await exportLeaveReport();
        } else if (res.path === '/api/employees/export') {
          const { exportEmployees } = await import('../services/api');
          await exportEmployees();
        }
      } else if (res.action === 'LOGOUT') {
        const goodbyeMsg = res.speechResponse || `Goodbye ${user?.name}! See you next time.`;
        speakText(goodbyeMsg);
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          sender: 'ai',
          text: goodbyeMsg,
          timestamp: new Date().toISOString()
        }]);
        setIsProcessing(false);
        toast.success('Logging you out...', { duration: 3000, icon: '👋' });
        setTimeout(() => { synthRef.current?.cancel(); logout(); navigate('/login'); }, 3000);
        return;
      }

      if (res.success || res.action) {
        window.dispatchEvent(new Event('staffhub:refreshData'));
      }

      const aiMsg = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: res.speechResponse || "I've completed that task for you.",
        timestamp: new Date().toISOString(),
        listItems: res.listItems || null
      };
      setMessages(prev => [...prev, aiMsg]);
      speakText(aiMsg.text);

    } catch (err) {
      console.error('[AIAssistant] AI Command failed:', err);
      const errText = err.message || 'I encountered an error trying to process that request.';
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: errText,
        timestamp: new Date().toISOString()
      }]);
      speakText(errText);
    } finally {
      setIsProcessing(false);
      // Reset voice state back to idle so status pill shows 'Online' again
      resetTranscript();
    }
  }, [navigate, user, speakText, logout, resetTranscript]);

  // ── Mic button toggle ──────────────────────────────────────────────────────
  const toggleListen = useCallback(() => {
    if (isProcessing) return;
    if (isListening) {
      stopListening();
    } else {
      if (voiceEnabled) synthRef.current?.cancel(); // stop any ongoing TTS
      resetTranscript();
      setInputText('');
      startListening();
    }
  }, [isProcessing, isListening, voiceEnabled, startListening, stopListening, resetTranscript]);

  // ── Text form submit ───────────────────────────────────────────────────────
  const handleTextSubmit = (e) => {
    e.preventDefault();
    if (inputText.trim() && !isProcessing) {
      handleProcessCommand(inputText.trim());
      setInputText('');
    }
  };

  const handleToggleOpen = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);
    if (stateKey) sessionStorage.setItem(stateKey, nextState.toString());
    // Stop listening if panel is closed
    if (!nextState && isListening) stopListening();
  };

  const handleListItemClick = (item) => {
    let cmd = '';
    if (item.type === 'leave')        cmd = `view number ${item.number}`;
    else if (item.type === 'notification') cmd = `mark notification ${item.number} as read`;
    else if (item.type === 'employee') cmd = `view number ${item.number}`;
    else                              cmd = `select number ${item.number}`;
    handleProcessCommand(cmd);
  };

  // ── Voice status pill config ───────────────────────────────────────────────
  const statusConfig = {
    [RECOGNITION_STATUS.IDLE]: {
      label: isProcessing ? 'Thinking...' : 'Online',
      color: 'text-slate-500',
    },
    [RECOGNITION_STATUS.LISTENING]: {
      label: '🎤 Listening...',
      color: 'text-rose-500 font-semibold animate-pulse',
    },
    [RECOGNITION_STATUS.PROCESSING]: {
      label: '⏳ Processing...',
      color: 'text-blue-500 font-semibold',
    },
    [RECOGNITION_STATUS.RECOGNIZED]: {
      label: '✓ Command recognized',
      color: 'text-emerald-500 font-semibold',
    },
    [RECOGNITION_STATUS.FAILED]: {
      label: voiceError?.includes('No speech') ? '⚠ No speech detected' : '✗ Recognition failed',
      color: 'text-amber-500 font-semibold',
    },
  };

  const currentStatusCfg = isProcessing
    ? statusConfig[RECOGNITION_STATUS.IDLE]
    : statusConfig[voiceStatus] || statusConfig[RECOGNITION_STATUS.IDLE];

  const suggestions = user?.role === 'Admin'
    ? ['Show pending requests', 'Create new employee', 'Export employees to Excel']
    : ['Apply for leave', 'Show my leave balance', 'Open my profile'];

  if (!user) return null;

  return (
    <>
      {/* Floating Action Button */}
      {!isOpen && (
        <button
          onClick={handleToggleOpen}
          className="fixed bottom-6 right-6 p-4 rounded-full bg-brand-600 text-white shadow-xl shadow-brand-500/30 hover:scale-105 hover:bg-brand-500 transition-all z-50 animate-bounce-slow"
          aria-label="Open AI Assistant"
        >
          <MessageSquare size={24} />
        </button>
      )}

      {/* Chat Window */}
      <div
        className={`fixed bottom-6 right-6 w-[380px] h-[560px] max-h-[85vh] max-w-[calc(100vw-3rem)] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl flex flex-col transition-all duration-300 transform origin-bottom-right z-50 border border-slate-200 dark:border-slate-800 ${
          isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0 pointer-events-none'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="relative">
              {/* Pulsing ring when listening */}
              {isListening && (
                <span className="absolute inset-0 rounded-xl bg-rose-500/30 animate-ping" />
              )}
              <div className={`relative w-9 h-9 rounded-xl flex items-center justify-center shadow-lg transition-all ${
                isListening
                  ? 'bg-rose-500 shadow-rose-500/30'
                  : 'bg-gradient-to-tr from-brand-500 to-indigo-600 shadow-brand-500/20'
              }`}>
                <Mic size={18} className="text-white" />
              </div>
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-800 dark:text-white">StaffHub Assistant</h3>
              <p className={`text-[10px] flex items-center gap-1 ${currentStatusCfg.color}`}>
                {currentStatusCfg.label}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              className="p-2 text-slate-400 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-500/10 rounded-lg transition-colors"
              title={voiceEnabled ? 'Mute Voice' : 'Enable Voice'}
            >
              {voiceEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>
            <button
              onClick={handleToggleOpen}
              className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors"
            >
              <ChevronDown size={18} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30 dark:bg-slate-900/30 custom-scrollbar">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                  msg.sender === 'user'
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-600/20 rounded-br-sm'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 shadow-sm border border-slate-100 dark:border-slate-700 rounded-bl-sm'
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.text}</p>

                {msg.listItems && msg.listItems.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {msg.listItems.map(item => (
                      <button
                        key={item.id || item.number}
                        onClick={() => handleListItemClick(item)}
                        className="w-full text-left flex items-start gap-2 p-2 rounded-lg bg-slate-50 hover:bg-brand-50 dark:bg-slate-900/50 dark:hover:bg-brand-500/10 border border-slate-100 dark:border-slate-700 transition-colors group text-xs"
                      >
                        <span className="font-mono font-bold text-brand-600 dark:text-brand-400 w-5 text-center bg-brand-50 dark:bg-brand-900/30 rounded">
                          {item.number}
                        </span>
                        <span className="flex-1 text-slate-600 dark:text-slate-300 group-hover:text-brand-700 dark:group-hover:text-brand-300 truncate">
                          {item.label}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                <span className={`text-[9px] block mt-1.5 ${msg.sender === 'user' ? 'text-brand-200' : 'text-slate-400'}`}>
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))}

          {/* Processing indicator */}
          {isProcessing && (
            <div className="flex justify-start">
              <div className="bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2">
                <Loader2 size={14} className="animate-spin text-brand-500" />
                <span className="text-xs text-slate-500">Processing...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-b-2xl">

          {/* Interim transcript live preview */}
          {interimTranscript && (
            <div className="mb-2 px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20">
              <p className="text-xs text-rose-600 dark:text-rose-400 italic truncate">
                🎤 {interimTranscript}
              </p>
            </div>
          )}

          {/* Voice status banner */}
          {voiceStatus === RECOGNITION_STATUS.FAILED && (
            <div className="mb-2 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 flex items-center justify-between">
              <span className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <AlertCircle size={10} />
                {voiceError || 'Recognition failed'}
              </span>
              <button
                onClick={toggleListen}
                className="text-[10px] text-amber-700 dark:text-amber-300 font-bold hover:underline flex items-center gap-0.5"
              >
                <RefreshCw size={9} /> Retry
              </button>
            </div>
          )}

          {voiceStatus === RECOGNITION_STATUS.RECOGNIZED && !isProcessing && (
            <div className="mb-2 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 flex items-center gap-1">
              <CheckCircle size={10} className="text-emerald-500" />
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Command recognized</span>
            </div>
          )}

          {/* Suggestion chips */}
          {messages.length < 3 && !isProcessing && !isListening && (
            <div className="flex flex-wrap gap-2 mb-3">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => handleProcessCommand(s)}
                  className="text-[10px] font-semibold px-2.5 py-1.5 rounded-full bg-slate-100 text-slate-600 hover:bg-brand-50 hover:text-brand-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-brand-500/20 dark:hover:text-brand-300 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={handleTextSubmit} className="flex flex-col gap-2">
            <div className="relative flex items-center">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={isListening ? 'Listening… speak now' : 'Type or say a command...'}
                disabled={isProcessing}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50 disabled:opacity-50 text-slate-800 dark:text-white placeholder-slate-400"
              />
              {inputText.trim() && !isListening && (
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="absolute right-2 p-1.5 bg-brand-600 text-white rounded-lg hover:bg-brand-500 transition-colors disabled:opacity-50"
                >
                  <MessageSquare size={14} />
                </button>
              )}
            </div>

            {/* Mic button */}
            {isSupported && (
              <button
                type="button"
                id="ai-assistant-mic-btn"
                onClick={toggleListen}
                disabled={isProcessing}
                className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50 ${
                  isListening
                    ? 'bg-rose-100 text-rose-600 hover:bg-rose-200 dark:bg-rose-500/20 dark:text-rose-400 ring-2 ring-rose-400/40'
                    : voiceStatus === RECOGNITION_STATUS.FAILED
                    ? 'bg-amber-50 text-amber-600 hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-400'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                {isListening ? (
                  <><MicOff size={16} /> Stop Listening</>
                ) : voiceStatus === RECOGNITION_STATUS.FAILED ? (
                  <><RefreshCw size={16} /> Retry Voice</>
                ) : (
                  <><Mic size={16} /> Tap to Speak</>
                )}
              </button>
            )}
          </form>
        </div>
      </div>
    </>
  );
};

export default AIAssistant;
