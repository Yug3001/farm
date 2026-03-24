import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useLanguage } from '../contexts/LanguageContext';
import LanguageSelector from './LanguageSelector';
import './AdvisorBot3D.css';

const AdvisorBot3D = () => {
  const { selectedLanguage, getCurrentLanguage } = useLanguage();
  const [messages, setMessages] = useState([
    { id: 1, text: "Farmwise Here !! Tell me your problems", sender: 'bot', source: null }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState(null);
  const messagesEndRef = useRef(null);
  const synthRef = useRef(null);

  // Initialize speech synthesis
  useEffect(() => {
    if ('speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
    }
    return () => {
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Reset conversation when language changes
  useEffect(() => {
    // Stop any ongoing speech
    if (synthRef.current) {
      synthRef.current.cancel();
      setSpeakingMessageId(null);
    }
    // Reset messages when language changes for fresh conversation in new language
    setMessages([
      { id: 1, text: "Farmwise Here !! Tell me your problems", sender: 'bot' }
    ]);
  }, [selectedLanguage]);

  const speakText = (text, messageId) => {
    if (!synthRef.current) return;

    // If already speaking this message, stop it
    if (speakingMessageId === messageId) {
      synthRef.current.cancel();
      setSpeakingMessageId(null);
      return;
    }

    // Stop any ongoing speech
    synthRef.current.cancel();

    const currentLang = getCurrentLanguage();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = currentLang.speechLang;
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;

    utterance.onstart = () => {
      setSpeakingMessageId(messageId);
    };

    utterance.onend = () => {
      setSpeakingMessageId(null);
    };

    utterance.onerror = (event) => {
      console.error('Speech error:', event.error);
      setSpeakingMessageId(null);
    };

    // Try to find a voice for the selected language
    const voices = synthRef.current.getVoices();
    const preferredVoice = voices.find(voice => voice.lang === currentLang.speechLang);
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    synthRef.current.speak(utterance);
  };

  const handleSubmit = async () => {
    if (!input.trim()) return;

    const userMessage = { id: Date.now(), text: input, sender: 'user' };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // Get token from localStorage
      const token = localStorage.getItem('token');

      if (!token) {
        throw new Error('Please login to use the advisor');
      }

      // Generate or get session ID
      let sessionId = localStorage.getItem('advisorSessionId');
      if (!sessionId) {
        sessionId = `session_${Date.now()}`;
        localStorage.setItem('advisorSessionId', sessionId);
      }

      const response = await axios.post('http://localhost:5000/api/advisor/ask', {
        question: userMessage.text,
        sessionId: sessionId,
        language: selectedLanguage
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const botMessage = {
        id: Date.now() + 1,
        text: response.data.answer,
        sender: 'bot',
        source: response.data.source || null
      };
      setMessages(prev => [...prev, botMessage]);

      // Auto-play voice output for bot response
      setTimeout(() => {
        speakText(response.data.answer, botMessage.id);
      }, 500);

    } catch (error) {
      console.error('Error fetching advice:', error);
      let errorText = "I'm having trouble connecting to the farm database. Please try again later.";

      if (error.response?.status === 401) {
        errorText = "Please login to use the advisor. Redirecting to login page...";
        setTimeout(() => window.location.href = '/signin', 2000);
      } else if (error.message === 'Please login to use the advisor') {
        errorText = "Please login to use the advisor. Redirecting to login page...";
        setTimeout(() => window.location.href = '/signin', 2000);
      }

      const errorMessage = {
        id: Date.now() + 1,
        text: errorText,
        sender: 'bot',
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const runQuickTest = (question) => {
    setInput(question);
    setTimeout(() => {
      const btn = document.getElementById('advisor-send-btn');
      if (btn) btn.click();
    }, 100);
  };

  return (
    <div className="main" style={{ flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', paddingTop: '100px' }}>
      <section className="advisor-card">
        <div className="advisor-header">
          <div className="bot-icon">🤖</div>
          <div>
            <h2>Agricultural Advisor</h2>
            <span className="status">● ALWAYS READY</span>
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <LanguageSelector />
          </div>
        </div>

        {/* Quick Test Buttons */}
        <div style={{ display: 'flex', gap: '10px', padding: '10px 16px', flexWrap: 'wrap', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.15)' }}>
          <span style={{ fontSize: '11px', color: '#aaa', alignSelf: 'center', fontWeight: 600, letterSpacing: '0.5px' }}>QUICK TEST:</span>
          <button
            id="test-simple-btn"
            onClick={() => runQuickTest('What is NPK?')}
            style={{ fontSize: '12px', padding: '5px 12px', borderRadius: '20px', border: '1px solid #22c55e', background: 'rgba(34,197,94,0.12)', color: '#22c55e', cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s' }}
            title="Routed to Knowledge Base (no API call)"
          >
            ✅ Simple: "What is NPK?"
          </button>
          <button
            id="test-complex-btn"
            onClick={() => runQuickTest('Analyze my soil with pH 6.5, nitrogen 20, phosphorus 15')}
            style={{ fontSize: '12px', padding: '5px 12px', borderRadius: '20px', border: '1px solid #818cf8', background: 'rgba(129,140,248,0.12)', color: '#818cf8', cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s' }}
            title="Routed to Gemini AI"
          >
            🤖 Complex: "Analyze my soil..."
          </button>
        </div>

        <div className="advisor-body">

          {messages.map((msg) => (
            <div key={msg.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', width: '100%', justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start' }}>
              <div className={`chat-bubble ${msg.sender}`} style={{ maxWidth: msg.sender === 'bot' ? '75%' : '80%' }}>
                {msg.text}
                {/* Source Badge */}
                {msg.sender === 'bot' && msg.source && (
                  <div style={{
                    marginTop: '8px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '3px 10px',
                    borderRadius: '12px',
                    background: msg.source === 'Knowledge Base'
                      ? 'rgba(34,197,94,0.15)'
                      : 'rgba(129,140,248,0.15)',
                    color: msg.source === 'Knowledge Base' ? '#22c55e' : '#818cf8',
                    border: msg.source === 'Knowledge Base'
                      ? '1px solid rgba(34,197,94,0.4)'
                      : '1px solid rgba(129,140,248,0.4)',
                    letterSpacing: '0.3px'
                  }}>
                    {msg.source === 'Knowledge Base' ? '✅ Knowledge Base' : '🤖 Gemini AI'}
                  </div>
                )}
              </div>
              {msg.sender === 'bot' && !msg.isError && (
                <button
                  onClick={() => speakText(msg.text, msg.id)}
                  className="speaker-button"
                  title={speakingMessageId === msg.id ? "Stop speaking" : "Read aloud"}
                  style={{
                    background: speakingMessageId === msg.id ? '#ff4444' : '#1f5135',
                    border: 'none',
                    borderRadius: '50%',
                    width: '36px',
                    height: '36px',
                    cursor: 'pointer',
                    fontSize: '18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    transition: 'all 0.2s',
                    marginTop: '5px'
                  }}
                >
                  {speakingMessageId === msg.id ? '⏸️' : '🔊'}
                </button>
              )}
            </div>
          ))}
          {loading && <div className="chat-bubble bot">Typing...</div>}
          <div ref={messagesEndRef} />
        </div>

        <div className="advisor-input">
          <input
            type="text"
            id="question"
            placeholder="Describe your farming challenge..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
            inputMode="text"
          />

          <button id="advisor-send-btn" onClick={handleSubmit}>➜</button>
        </div>
      </section>


    </div>
  );
};

export default AdvisorBot3D;

