import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';

/* ── quick-question bank ─────────────────────────────────────────────────── */
const QUICK_QUESTIONS = [
  { label: '🌾 NPK Fertilizer', q: 'What is NPK fertilizer and how do I use it correctly?' },
  { label: '🐛 Pest Control', q: 'How to control aphids organically in my field?' },
  { label: '💧 Drip Irrigation', q: 'What are the benefits of drip irrigation and how to get subsidy?' },
  { label: '🏛️ PM Kisan', q: 'What is PM Kisan scheme, eligibility and how to apply?' },
  { label: '🌱 Soil Health', q: 'How to improve soil fertility naturally without chemicals?' },
  { label: '🌧️ Kharif Crops', q: 'Which are the best kharif crops to grow this monsoon season?' },
  { label: '🧪 Soil Testing', q: 'How to do soil testing for my farm and what to check?' },
  { label: '🌿 Organic Farming', q: 'How to start organic farming in India from scratch?' },
  { label: '🌾 Wheat Growing', q: 'How to grow wheat — sowing time, fertilizer and irrigation?' },
  { label: '🍅 Tomato Diseases', q: 'What causes leaf curl in tomato and how to treat it?' },
  { label: '🌽 Maize Pests', q: 'How to control fall armyworm in maize crop?' },
  { label: '📋 Fasal Bima', q: 'Tell me about Pradhan Mantri Fasal Bima Yojana crop insurance' },
  { label: '🌊 Waterlogging', q: 'My field has waterlogging problem, how to fix it?' },
  { label: '📈 Increase Yield', q: 'How to increase crop yield without increasing costs?' },
  { label: '🌰 Groundnut', q: 'How to grow groundnut — soil, fertilizer and pest management?' },
  { label: '💊 Urea Application', q: 'When and how much urea should I apply for wheat crop?' },
];

const AdvisorBot3D = ({ isDarkMode = false }) => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: 'Namaste! 🌾 I\'m your **FarmWise Agricultural Advisor** — ask me anything about crops, soil, pests, fertilizers, irrigation, or government schemes. I\'m here to help you grow better!',
      sender: 'bot',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const visibleQuestions = showAll ? QUICK_QUESTIONS : QUICK_QUESTIONS.slice(0, 8);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /* ── send message ──────────────────────────────────────────────────────── */
  const handleSubmit = async (overrideText) => {
    const userText = (overrideText || input).trim();
    if (!userText || loading) return;

    setMessages(prev => [...prev, { id: Date.now(), text: userText, sender: 'user' }]);
    setInput('');
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('auth');

      let sessionId = localStorage.getItem('advisorSessionId');
      if (!sessionId) {
        sessionId = `session_${Date.now()}`;
        localStorage.setItem('advisorSessionId', sessionId);
      }

      const response = await axios.post(
        `${API_BASE_URL}/api/advisor/ask`,
        { question: userText, sessionId },
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } },
      );

      const answer = response.data?.answer || '⚠️ No response received. Please try again.';

      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        text: answer,
        sender: 'bot',
      }]);

    } catch (error) {
      let errorText = '⚠️ Connection issue. Please check your network and try again.';
      if (error.message === 'auth' || error.response?.status === 401) {
        errorText = '🔒 Session expired. Redirecting to login…';
        setTimeout(() => (window.location.href = '/signin'), 2000);
      }
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        text: errorText,
        sender: 'bot',
        isError: true,
      }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  /* ── simple markdown formatter ─────────────────────────────────────────── */
  const formatText = (text) => {
    if (!text) return '';
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .split('\n').join('<br/>');
  };

  /* ── theme tokens ──────────────────────────────────────────────────────── */
  const bg = isDarkMode ? 'linear-gradient(135deg,#0a1628 0%,#0d2b1a 50%,#0a1628 100%)' : '#f0fdf4';
  const panelBg = isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.95)';
  const panelBdr = isDarkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(34,197,94,0.2)';
  const inputBg = isDarkMode ? 'rgba(255,255,255,0.06)' : '#ffffff';
  const inputColor = isDarkMode ? '#fff' : '#1f2937';
  const inputBdrN = isDarkMode ? 'rgba(34,197,94,0.25)' : 'rgba(34,197,94,0.3)';
  const botBubbleBg = isDarkMode ? 'rgba(255,255,255,0.07)' : '#f0fdf4';
  const botBubbleBdr = isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(34,197,94,0.2)';
  const botTextColor = isDarkMode ? '#e2e8f0' : '#15803d';
  const hdrCardBg = isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.9)';
  const hdrCardBdr = isDarkMode ? '1px solid rgba(34,197,94,0.2)' : '1px solid rgba(34,197,94,0.25)';
  const titleColor = isDarkMode ? '#ffffff' : '#15803d';
  const chipBg = isDarkMode ? 'rgba(34,197,94,0.08)' : 'rgba(34,197,94,0.1)';
  const chipBdr = isDarkMode ? '1px solid rgba(34,197,94,0.2)' : '1px solid rgba(34,197,94,0.3)';
  const chipColor = isDarkMode ? '#86efac' : '#15803d';
  const statsBg = isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.8)';
  const statsBdr = isDarkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(34,197,94,0.15)';
  const statsColor = isDarkMode ? '#94a3b8' : '#4b5563';

  /* ── render ────────────────────────────────────────────────────────────── */
  return (
    <div style={{
      minHeight: 'calc(100vh - 68px)', background: bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '16px', position: 'relative', overflow: 'hidden',
      transition: 'background 0.3s', boxSizing: 'border-box',
    }}>

      {/* decorative orbs (dark mode only) */}
      {isDarkMode && <>
        <div style={{
          position: 'absolute', top: '10%', left: '5%', width: 300, height: 300,
          borderRadius: '50%', pointerEvents: 'none',
          background: 'radial-gradient(circle,rgba(34,197,94,0.08) 0%,transparent 70%)'
        }} />
        <div style={{
          position: 'absolute', bottom: '15%', right: '8%', width: 250, height: 250,
          borderRadius: '50%', pointerEvents: 'none',
          background: 'radial-gradient(circle,rgba(16,185,129,0.06) 0%,transparent 70%)'
        }} />
      </>}

      <div style={{ width: '100%', maxWidth: 880, display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* ── Header card ──────────────────────────────────────────────────── */}
        <div style={{
          background: hdrCardBg, backdropFilter: 'blur(20px)', border: hdrCardBdr,
          borderRadius: 20, padding: '14px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14, flexShrink: 0,
              background: 'linear-gradient(135deg,#22c55e,#16a34a)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 24, boxShadow: '0 8px 20px rgba(34,197,94,0.3)',
            }}>🧑‍🌾</div>

            <div>
              <h2 style={{ color: titleColor, margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
                FarmWise Agricultural Advisor
              </h2>
              {/* ✅ Fixed: removed "GEMINI AI" — now shows Groq AI branding */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                <div style={{
                  width: 7, height: 7, borderRadius: '50%', background: '#22c55e',
                  boxShadow: '0 0 8px #22c55e', animation: 'pulse 2s infinite', flexShrink: 0,
                }} />
                <span style={{ color: '#22c55e', fontSize: '0.72rem', fontWeight: 700, letterSpacing: 0.8 }}>
                  GROQ AI · ALWAYS ACTIVE
                </span>
              </div>
            </div>
          </div>

          {/* Stats badges */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[
              { icon: '📚', label: '200+ Topics' },
              { icon: '⚡', label: 'Instant' },
              { icon: '🌾', label: 'Indian Farming' },
            ].map((s, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px',
                borderRadius: 14, background: statsBg, border: statsBdr,
                color: statsColor, fontSize: '0.73rem', fontWeight: 600,
              }}>
                <span>{s.icon}</span><span>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Quick-question chips ─────────────────────────────────────────── */}
        <div>
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
            {visibleQuestions.map((item, i) => (
              <button key={i} onClick={() => handleSubmit(item.q)}
                style={{
                  padding: '6px 12px', borderRadius: 20, border: chipBdr,
                  background: chipBg, color: chipColor, cursor: 'pointer',
                  fontSize: '0.76rem', fontWeight: 600, transition: 'all 0.2s',
                  minHeight: 34, touchAction: 'manipulation', letterSpacing: 0.2,
                }}>
                {item.label}
              </button>
            ))}
            <button onClick={() => setShowAll(v => !v)}
              style={{
                padding: '6px 12px', borderRadius: 20,
                border: isDarkMode ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(0,0,0,0.1)',
                background: 'transparent', color: statsColor, cursor: 'pointer',
                fontSize: '0.76rem', fontWeight: 600, transition: 'all 0.2s',
                minHeight: 34, touchAction: 'manipulation',
              }}>
              {showAll ? '↑ Show less' : `+${QUICK_QUESTIONS.length - 8} more`}
            </button>
          </div>
        </div>

        {/* ── Chat window ──────────────────────────────────────────────────── */}
        <div style={{
          background: panelBg, backdropFilter: 'blur(20px)', border: panelBdr,
          borderRadius: 20, overflow: 'hidden',
          boxShadow: isDarkMode ? '0 32px 64px rgba(0,0,0,0.4)' : '0 8px 32px rgba(34,197,94,0.12)',
        }}>

          {/* Messages list */}
          <div style={{
            padding: '16px', minHeight: 320, maxHeight: 460, overflowY: 'auto',
            display: 'flex', flexDirection: 'column', gap: 12,
            WebkitOverflowScrolling: 'touch',
          }}>
            {messages.map(msg => (
              <div key={msg.id} style={{
                display: 'flex', alignItems: 'flex-end', gap: 8,
                justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start',
              }}>
                {msg.sender === 'bot' && (
                  <div style={{
                    width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                    background: 'linear-gradient(135deg,#22c55e,#16a34a)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15,
                  }}>🧑‍🌾</div>
                )}

                <div style={{ maxWidth: '79%' }}>
                  <div
                    style={{
                      padding: '12px 16px',
                      borderRadius: msg.sender === 'user' ? '18px 18px 4px 18px' : '4px 18px 18px 18px',
                      background: msg.sender === 'user'
                        ? 'linear-gradient(135deg,#16a34a,#22c55e)'
                        : msg.isError ? 'rgba(239,68,68,0.1)' : botBubbleBg,
                      border: msg.sender === 'user' ? 'none'
                        : msg.isError ? '1px solid rgba(239,68,68,0.3)' : botBubbleBdr,
                      color: msg.sender === 'user' ? '#fff'
                        : msg.isError ? (isDarkMode ? '#fca5a5' : '#dc2626') : botTextColor,
                      fontSize: '0.9rem', lineHeight: 1.75,
                      boxShadow: msg.sender === 'user' ? '0 4px 14px rgba(22,163,74,0.3)' : '0 2px 8px rgba(0,0,0,0.06)',
                      wordBreak: 'break-word',
                    }}
                    dangerouslySetInnerHTML={{ __html: formatText(msg.text) }}
                  />
                </div>

                {msg.sender === 'user' && (
                  <div style={{
                    width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                    background: 'linear-gradient(135deg,#16a34a,#22c55e)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
                  }}>👨‍🌾</div>
                )}
              </div>
            ))}

            {/* Typing indicator */}
            {loading && (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 10,
                  background: 'linear-gradient(135deg,#22c55e,#16a34a)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15,
                }}>🧑‍🌾</div>
                <div style={{
                  padding: '12px 18px', borderRadius: '4px 18px 18px 18px',
                  background: botBubbleBg, border: botBubbleBdr,
                }}>
                  <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                    {[0, 0.2, 0.4].map((delay, i) => (
                      <div key={i} style={{
                        width: 7, height: 7, borderRadius: '50%', background: '#22c55e',
                        animation: `bounce 1.2s ${delay}s infinite`,
                      }} />
                    ))}
                    <span style={{
                      color: isDarkMode ? '#86efac' : '#15803d',
                      fontSize: '0.78rem', marginLeft: 8, fontStyle: 'italic',
                    }}>Searching knowledge base…</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input bar */}
          <div style={{
            padding: '12px 14px',
            borderTop: isDarkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(34,197,94,0.15)',
            background: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(240,253,244,0.9)',
            display: 'flex', gap: 8, alignItems: 'center',
          }}>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSubmit()}
              placeholder="Ask about crops, soil, pests, schemes, irrigation…"
              style={{
                flex: 1, padding: '12px 18px', borderRadius: 28,
                border: `1.5px solid ${inputBdrN}`, background: inputBg,
                color: inputColor, fontSize: '0.92rem', outline: 'none',
                transition: 'all 0.2s', minWidth: 0,
              }}
              onFocus={e => { e.target.style.borderColor = '#22c55e'; e.target.style.boxShadow = '0 0 0 3px rgba(34,197,94,0.12)'; }}
              onBlur={e => { e.target.style.borderColor = inputBdrN; e.target.style.boxShadow = 'none'; }}
            />
            <button
              onClick={() => handleSubmit()}
              disabled={loading || !input.trim()}
              style={{
                width: 46, height: 46, borderRadius: 13, border: 'none', flexShrink: 0,
                background: loading || !input.trim()
                  ? 'rgba(34,197,94,0.15)'
                  : 'linear-gradient(135deg,#16a34a,#22c55e)',
                color: loading || !input.trim() ? (isDarkMode ? '#4b5563' : '#9ca3af') : '#fff',
                fontSize: 18, cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s', touchAction: 'manipulation',
                boxShadow: loading || !input.trim() ? 'none' : '0 6px 16px rgba(34,197,94,0.35)',
              }}>➜</button>
          </div>
        </div>

        {/* ── Footer badges ────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
          {[
            { icon: '🤖', label: 'Groq AI Powered' },
            { icon: '📚', label: '200+ Crop Topics' },
            { icon: '🌾', label: 'Indian Agriculture Focus' },
            { icon: '🔒', label: 'Secure & Private' },
            { icon: '📱', label: 'Works on Any Device' },
          ].map((item, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px',
              borderRadius: 18, background: statsBg, border: statsBdr,
              color: statsColor, fontSize: '0.75rem', fontWeight: 600,
            }}>
              <span>{item.icon}</span><span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes bounce { 0%,80%,100%{transform:scale(0.6);opacity:0.5} 40%{transform:scale(1);opacity:1} }
        @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:0.4} }
        *::-webkit-scrollbar{width:4px}
        *::-webkit-scrollbar-thumb{background:rgba(34,197,94,0.3);border-radius:4px}
      `}</style>
    </div>
  );
};

export default AdvisorBot3D;