import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { sendAICommand } from '../services/api';
import {
  Mic,
  MicOff,
  Send,
  X,
  Bot,
  Volume2,
  Trash2,
  Sparkles,
  VolumeX,
  CornerDownLeft
} from 'lucide-react';

const SUGGESTIONS = [
  "Show my leave balance",
  "Apply sick leave tomorrow because of fever",
  "Show my leave history",
  "Open my profile",
  "Show pending leave requests" // Admin only hint
];

const AIAssistant = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // If user not logged in, do not render assistant
  if (!user) return null;

  // Assistant states
  const [isOpen, setIsOpen] = useState(() => {
    return sessionStorage.getItem('ai_assistant_open') === 'true';
  });
  const [messages, setMessages] = useState(() => {
    const saved = sessionStorage.getItem('ai_chat_messages');
    return saved ? JSON.parse(saved) : [
      { role: 'assistant', content: `Hello ${user.name}! I am your HR voice assistant. You can speak to me or type a command. Try saying "Show my leave balance".` }
    ];
  });
  const [textCmd, setTextCmd] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(() => {
    return localStorage.getItem('ai_assistant_muted') === 'true';
  });

  const chatEndRef = useRef(null);
  const recognitionRef = useRef(null);

  // Sync states to sessionStorage/localStorage
  useEffect(() => {
    sessionStorage.setItem('ai_assistant_open', isOpen);
  }, [isOpen]);

  useEffect(() => {
    sessionStorage.setItem('ai_chat_messages', JSON.stringify(messages));
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    localStorage.setItem('ai_assistant_muted', isMuted);
    if (isMuted && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, [isMuted]);

  // Initialize Web Speech API
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-US';

      rec.onstart = () => {
        setIsListening(true);
        if (window.speechSynthesis) window.speechSynthesis.cancel();
      };

      rec.onend = () => {
        setIsListening(false);
      };

      rec.onerror = (e) => {
        console.error('Speech recognition error:', e.error);
        if (e.error !== 'no-speech') {
          toast.error(`Voice error: ${e.error}`);
        }
        setIsListening(false);
      };

      rec.onresult = (e) => {
        const transcript = e.results[0][0].transcript;
        if (transcript && transcript.trim()) {
          handleSendCommand(transcript);
        }
      };

      recognitionRef.current = rec;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Speak AI responses
  const speak = (text) => {
    if (isMuted || !('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';

    // Try to find a high quality natural English voice
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Natural'))) || voices[0];
    if (voice) {
      utterance.voice = voice;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  // Process text or voice command
  const handleSendCommand = async (commandText) => {
    if (!commandText || !commandText.trim()) return;
    const cleanCommand = commandText.trim();

    // Add user message to UI chat log
    const newUserMessage = { role: 'user', content: cleanCommand };
    setMessages((prev) => [...prev, newUserMessage]);

    setIsProcessing(true);
    setIsSpeaking(false);

    try {
      // Map existing messages to OpenAI backend message history structure
      // Limit context to last 10 exchanges to keep requests lightweight
      const chatHistory = messages
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .slice(-10)
        .map(m => ({ role: m.role, content: m.content }));

      const res = await sendAICommand({
        command: cleanCommand,
        history: chatHistory
      });

      if (res && res.speechResponse) {
        // Add AI response to log
        setMessages((prev) => [...prev, { role: 'assistant', content: res.speechResponse }]);
        
        // Execute speech synthesis
        speak(res.speechResponse);

        // Handle triggered actions
        if (res.action === 'NAVIGATE' && res.path) {
          setTimeout(() => {
            navigate(res.path);
            toast.success(`Navigating to ${res.path}`);
          }, 1500);
        }
      } else {
        throw new Error("Invalid backend service response format.");
      }
    } catch (err) {
      console.error(err);
      const errMsg = err.displayMessage || err.message || "Failed to process AI command.";
      setMessages((prev) => [...prev, { role: 'assistant', content: `I'm sorry, I encountered an error: ${errMsg}` }]);
      speak(`I'm sorry, I encountered an error: ${errMsg}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleListen = () => {
    if (!recognitionRef.current) {
      toast.error("Web Speech API is not supported in this browser. Please type commands.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!textCmd.trim()) return;
    handleSendCommand(textCmd);
    setTextCmd('');
  };

  const handleClearHistory = () => {
    setMessages([
      { role: 'assistant', content: `Hello ${user.name}! History cleared. Ask me something, like: "What is my casual leave balance?"` }
    ]);
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  return (
    <>
      {/* Floating Microphone Activation Button */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-center select-none">
        {isListening && (
          <span className="absolute -inset-2 rounded-full bg-brand-500/25 animate-ping" />
        )}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`h-14 w-14 rounded-full flex items-center justify-center text-white shadow-xl bg-gradient-to-tr from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 hover:scale-110 active:scale-95 transition-all duration-200 ${
            isOpen ? 'rotate-90' : ''
          }`}
          title="Open AI Voice Assistant"
        >
          {isListening ? (
            <MicOff size={22} className="animate-pulse text-rose-200" />
          ) : (
            <Mic size={22} />
          )}
        </button>
      </div>

      {/* Floating Glassmorphism Assistant Drawer Panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-96 max-w-[calc(100vw-3rem)] h-[500px] z-50 rounded-2xl glass-card border border-slate-700/50 bg-slate-900/90 text-white shadow-2xl flex flex-col overflow-hidden animate-fade-in">
          
          {/* Header */}
          <div className="px-4 py-3.5 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-brand-500/20 border border-brand-500/40 flex items-center justify-center text-brand-400">
                <Bot size={16} className={isListening || isProcessing ? "animate-pulse" : ""} />
              </div>
              <div>
                <span className="text-xs font-bold leading-none block">HR Voice Assistant</span>
                <span className="text-[9px] text-slate-500 font-semibold uppercase mt-0.5 tracking-wider block">
                  {isListening ? (
                    <span className="text-rose-400 flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-ping" />
                      Listening to speech...
                    </span>
                  ) : isProcessing ? (
                    <span className="text-brand-400">Thinking...</span>
                  ) : isSpeaking ? (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <Volume2 size={10} className="animate-bounce" />
                      Speaking response
                    </span>
                  ) : (
                    "Ready for command"
                  )}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Mute Button */}
              <button
                onClick={() => setIsMuted(!isMuted)}
                className={`p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors`}
                title={isMuted ? "Unmute Voice" : "Mute Voice"}
              >
                {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
              </button>

              {/* Clear Log Button */}
              <button
                onClick={handleClearHistory}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Clear Chat Logs"
              >
                <Trash2 size={14} />
              </button>

              {/* Close Button */}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Close Assistant Panel"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Messages scrollarea */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-slate-800">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex gap-2 max-w-[85%] ${
                  m.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
                }`}
              >
                {m.role !== 'user' && (
                  <div className="h-6 w-6 shrink-0 rounded-full bg-brand-600/30 border border-brand-500/30 flex items-center justify-center text-brand-400">
                    <Bot size={12} />
                  </div>
                )}
                <div
                  className={`p-2.5 rounded-xl text-xs leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-brand-600 text-white rounded-tr-none font-medium'
                      : 'bg-slate-800/80 border border-slate-700/30 text-slate-200 rounded-tl-none'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {isProcessing && (
              <div className="flex gap-2 max-w-[85%] mr-auto items-center">
                <div className="h-6 w-6 shrink-0 rounded-full bg-brand-600/30 border border-brand-500/30 flex items-center justify-center text-brand-400 animate-pulse">
                  <Bot size={12} />
                </div>
                <div className="flex gap-1.5 items-center bg-slate-800/50 p-2.5 rounded-xl border border-slate-700/30 rounded-tl-none">
                  <span className="h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce" />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Suggestion Chips */}
          <div className="px-4 py-2 border-t border-slate-800 bg-slate-950/20 flex gap-2 overflow-x-auto whitespace-nowrap scrollbar-none">
            {SUGGESTIONS.map((s, idx) => (
              <button
                key={idx}
                onClick={() => handleSendCommand(s)}
                disabled={isProcessing || isListening}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-800/60 hover:bg-brand-600/20 border border-slate-700/50 hover:border-brand-500/40 rounded-full text-[10px] text-slate-300 hover:text-brand-300 transition-colors font-semibold disabled:opacity-50"
              >
                <Sparkles size={9} />
                {s}
              </button>
            ))}
          </div>

          {/* Form / Inputs */}
          <form onSubmit={handleFormSubmit} className="p-3 bg-slate-950/50 border-t border-slate-800 flex items-center gap-2">
            <button
              type="button"
              onClick={toggleListen}
              disabled={isProcessing}
              className={`p-2 rounded-xl flex items-center justify-center transition-colors shrink-0 ${
                isListening
                  ? 'bg-rose-600 text-white animate-pulse'
                  : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
              title="Record Voice Command"
            >
              {isListening ? <MicOff size={16} /> : <Mic size={16} />}
            </button>

            <input
              type="text"
              value={textCmd}
              onChange={(e) => setTextCmd(e.target.value)}
              disabled={isProcessing || isListening}
              placeholder={isListening ? "Listening..." : "Type voice command here..."}
              className="flex-1 min-w-0 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 disabled:opacity-40 transition-colors"
            />

            <button
              type="submit"
              disabled={isProcessing || isListening || !textCmd.trim()}
              className="p-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl flex items-center justify-center transition-colors disabled:opacity-45 shrink-0"
              title="Send Command"
            >
              <Send size={14} />
            </button>
          </form>

        </div>
      )}
    </>
  );
};

export default AIAssistant;
