import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, MicOff, Loader2, X, MessageSquare, Volume2, VolumeX, ChevronDown, List, LogOut } from 'lucide-react';
import { sendAICommand, clearAISession } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

// Safe checking for Speech Recognition API
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

const AIAssistant = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [messages, setMessages] = useState([]);
  const [transcript, setTranscript] = useState('');
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const synthRef = window.speechSynthesis;

  // Session keys specific to this user
  const sessionKey = user ? `ai_chat_messages_${user.id}` : null;
  const stateKey = user ? `ai_chat_open_${user.id}` : null;

  // Initialize and check session
  useEffect(() => {
    if (!user) {
      setMessages([]);
      setIsOpen(false);
      return;
    }
    
    // Check if we switched users — clear out mismatched keys just in case
    const currentUserId = user.id;
    const storedUserId = sessionStorage.getItem('ai_current_user_id');
    
    if (storedUserId && storedUserId !== currentUserId) {
      Object.keys(sessionStorage).forEach(key => {
        if (key.startsWith('ai_chat_messages_') || key.startsWith('ai_chat_open_')) {
          sessionStorage.removeItem(key);
        }
      });
    }
    sessionStorage.setItem('ai_current_user_id', currentUserId);

    // Load user's isolated history
    const savedMessages = sessionStorage.getItem(sessionKey);
    if (savedMessages) {
      try {
        setMessages(JSON.parse(savedMessages));
      } catch {
        setMessages([]);
      }
    } else {
      setMessages([{
        id: Date.now().toString(),
        sender: 'ai',
        text: `Hi ${user.name}, I'm your AI HR Assistant. How can I help you today?`,
        timestamp: new Date().toISOString()
      }]);
    }

    const savedOpenState = sessionStorage.getItem(stateKey);
    if (savedOpenState === 'true') {
      setIsOpen(true);
    }
  }, [user, sessionKey, stateKey]);

  // Persist messages to this user's isolated session
  useEffect(() => {
    if (sessionKey && messages.length > 0) {
      sessionStorage.setItem(sessionKey, JSON.stringify(messages));
    }
  }, [messages, sessionKey]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  // Handle Speech Synthesis
  const speakText = (text) => {
    if (!voiceEnabled || !synthRef) return;
    synthRef.cancel(); // stop previous
    const utterance = new SpeechSynthesisUtterance(text);
    // Find a good english voice if possible
    const voices = synthRef.getVoices();
    const goodVoice = voices.find(v => v.lang.includes('en-GB') || v.lang.includes('en-US'));
    if (goodVoice) utterance.voice = goodVoice;
    utterance.rate = 1.05; // slightly faster
    synthRef.speak(utterance);
  };

  // Initialize Speech Recognition
  useEffect(() => {
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        if (voiceEnabled) synthRef?.cancel();
      };

      recognition.onresult = (event) => {
        const current = event.resultIndex;
        const result = event.results[current];
        const text = result[0].transcript;
        setTranscript(text);
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        
        // Handle specific errors gracefully
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          toast.error('Microphone access denied. Please allow microphone permissions in your browser settings.', { duration: 5000 });
        } else if (event.error === 'network') {
          toast.error('Speech recognition requires an internet connection.', { duration: 3000 });
        } else if (event.error === 'aborted') {
          // User or system aborted — silent
        } else if (event.error === 'no-speech') {
          // No speech detected — auto-restart if panel is open
          if (isOpen) {
            // Don't auto-restart, just inform
          }
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      synthRef?.cancel();
    };
  }, [voiceEnabled, synthRef, isOpen]);

  // Process transcript when listening stops naturally
  useEffect(() => {
    if (!isListening && transcript.trim()) {
      handleProcessCommand(transcript);
      setTranscript('');
    }
  }, [isListening]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleListen = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      setTranscript('');
      recognitionRef.current?.start();
    }
  };

  const handleProcessCommand = async (commandText) => {
    if (!commandText.trim()) return;

    // Add user message
    const userMsg = {
      id: Date.now().toString(),
      sender: 'user',
      text: commandText,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMsg]);
    setIsProcessing(true);

    try {
      // Send to server (server manages conversation history now)
      const res = await sendAICommand(commandText);

      // Handle post-action UI navigation and events
      if (res.action === 'NAVIGATE' && res.path) {
        navigate(res.path);
      } else if (res.action === 'TOGGLE_DARK_MODE') {
        const event = new CustomEvent('staffhub:toggleDarkMode', { 
          detail: { enabled: !document.documentElement.classList.contains('dark') } 
        });
        window.dispatchEvent(event);
      } else if (res.action === 'DOWNLOAD_EXCEL' && res.path) {
        // Trigger download
        const url = `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}${res.path}`;
        window.open(url, '_blank');
      } else if (res.action === 'LOGOUT') {
        // Formal logout workflow: Speak → Wait 3s → Clear → Redirect
        const goodbyeMsg = res.speechResponse || `Goodbye ${user?.name}! See you next time.`;
        speakText(goodbyeMsg);
        
        const aiMsg = {
          id: (Date.now() + 1).toString(),
          sender: 'ai',
          text: goodbyeMsg,
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, aiMsg]);
        setIsProcessing(false);
        
        toast.success('Logging you out...', { duration: 3000, icon: '👋' });
        
        // Wait 3 seconds for speech to finish, then logout
        setTimeout(() => {
          synthRef?.cancel();
          logout();
          navigate('/login');
        }, 3000);
        return; // Early return — don't add message twice
      }

      // Always dispatch a global refresh event after any successful AI action
      if (res.success || res.action) {
        window.dispatchEvent(new Event('staffhub:refreshData'));
      }

      // Add AI response message
      const aiMsg = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: res.speechResponse || "I've completed that task for you.",
        timestamp: new Date().toISOString(),
        listItems: res.listItems || null
      };

      setMessages(prev => [...prev, aiMsg]);
      
      // Speak it
      speakText(aiMsg.text);

    } catch (err) {
      console.error('AI Command failed:', err);
      const errMsg = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: err.message || "I encountered an error trying to process that request.",
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errMsg]);
      speakText(errMsg.text);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTextSubmit = (e) => {
    e.preventDefault();
    if (transcript.trim()) {
      handleProcessCommand(transcript);
      setTranscript('');
    }
  };

  const handleToggleOpen = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);
    if (stateKey) {
      sessionStorage.setItem(stateKey, nextState.toString());
    }
  };

  // Click handler for list items
  const handleListItemClick = (item) => {
    let cmd = '';
    if (item.type === 'leave') {
      // Determine if admin looking at pending, or employee looking at own. 
      // Safest is to just send the number back to context
      cmd = `view number ${item.number}`; // Generic
    } else if (item.type === 'notification') {
      cmd = `mark notification ${item.number} as read`;
    } else if (item.type === 'employee') {
      cmd = `view number ${item.number}`;
    } else {
      cmd = `select number ${item.number}`;
    }
    handleProcessCommand(cmd);
  };

  // Suggestion chips based on role
  const suggestions = user?.role === 'Admin' 
    ? ["Show pending requests", "Create new employee", "Export employees to Excel"]
    : ["Apply for leave", "Show my leave balance", "Open my profile"];

  // Don't render anything if not logged in
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
        className={`fixed bottom-6 right-6 w-[380px] h-[550px] max-h-[85vh] max-w-[calc(100vw-3rem)] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl flex flex-col transition-all duration-300 transform origin-bottom-right z-50 border border-slate-200 dark:border-slate-800 ${
          isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0 pointer-events-none'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-brand-500/20">
                <Mic size={18} className="text-white" />
              </div>
              {isListening && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping" />
              )}
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-800 dark:text-white">StaffHub Assistant</h3>
              <p className="text-[10px] text-slate-500 flex items-center gap-1">
                {isProcessing ? 'Thinking...' : isListening ? 'Listening...' : 'Online'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              className="p-2 text-slate-400 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-500/10 rounded-lg transition-colors"
              title={voiceEnabled ? "Mute Voice" : "Enable Voice"}
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
            <div
              key={msg.id}
              className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                  msg.sender === 'user'
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-600/20 rounded-br-sm'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 shadow-sm border border-slate-100 dark:border-slate-700 rounded-bl-sm'
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.text}</p>
                
                {/* Render numbered list items if they exist */}
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
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder={isListening ? "Listening..." : "Type or say a command..."}
                disabled={isProcessing}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50 disabled:opacity-50 text-slate-800 dark:text-white placeholder-slate-400"
              />
              {transcript && !isListening && (
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="absolute right-2 p-1.5 bg-brand-600 text-white rounded-lg hover:bg-brand-500 transition-colors disabled:opacity-50"
                >
                  <MessageSquare size={14} />
                </button>
              )}
            </div>
            
            <button
              type="button"
              onClick={toggleListen}
              disabled={isProcessing}
              className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                isListening 
                  ? 'bg-rose-100 text-rose-600 hover:bg-rose-200 dark:bg-rose-500/20 dark:text-rose-400' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
              } disabled:opacity-50`}
            >
              {isListening ? (
                <><MicOff size={16} /> Stop Listening</>
              ) : (
                <><Mic size={16} /> Tap to Speak</>
              )}
            </button>
          </form>
        </div>
      </div>
    </>
  );
};

export default AIAssistant;
