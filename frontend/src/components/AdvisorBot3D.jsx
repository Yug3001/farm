import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const AdvisorBot3D = ({ isDarkMode = false }) => {
  const [messages, setMessages] = useState([
    { id: 1, text: "🌱 Namaste! I'm FarmWise AI, your personal agricultural advisor. Ask me anything about crops, soil, pests, irrigation, or government schemes!", sender: 'bot', source: null }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async () => {
    if (!input.trim() || loading) return;
    const userText = input.trim();
    const userMessage = { id: Date.now(), text: userText, sender: 'user' };
    setMessages(prev => [...prev, userMessage]);
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

      const response = await axios.post('http://localhost:5000/api/advisor/ask', {
        question: userText,
        sessionId,
      }, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });

      const botMessage = {
        id: Date.now() + 1,
        text: response.data.answer,
        sender: 'bot',
        source: response.data.source || null
      };
      setMessages(prev => [...prev, botMessage]);

    } catch (error) {
      let errorText = "⚠️ Connection issue. Please check your network and try again.";
      if (error.message === 'auth' || error.response?.status === 401) {
        errorText = "🔒 Session expired. Redirecting to login...";
        setTimeout(() => window.location.href = '/signin', 2000);
      }
      setMessages(prev => [...prev, { id: Date.now() + 1, text: errorText, sender: 'bot', isError: true }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const quickQuestions = [
    { label: '🌾 NPK Fertilizer',   q: 'What is NPK fertilizer and how to use it?' },
    { label: '🐛 Pest Control',      q: 'How to control aphids organically?' },
    { label: '💧 Drip Irrigation',   q: 'Benefits of drip irrigation for wheat' },
    { label: '🏛️ PM Kisan',          q: 'What is PM Kisan scheme and eligibility?' },
    { label: '🌱 Soil Health',       q: 'How to improve soil fertility naturally?' },
    { label: '🌧️ Kharif Crops',     q: 'Best kharif crops to grow this season' },
    { label: '🧪 Soil Testing',      q: 'How to do soil testing for my farm?' },
    { label: '🌿 Organic Farming',   q: 'How to start organic farming in India?' },
  ];

  const formatText = (text) => {
    if (!text) return '';
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .split('\n').join('<br/>');
  };

  // Theme palette
  const bg      = isDarkMode ? 'linear-gradient(135deg,#0a1628 0%,#0d2b1a 50%,#0a1628 100%)' : '#f0fdf4';
  const panelBg = isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.95)';
  const panelBorder = isDarkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(34,197,94,0.2)';
  const inputBarBg  = isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(240,253,244,0.9)';
  const inputBarBorder = isDarkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(34,197,94,0.15)';
  const inputBg    = isDarkMode ? 'rgba(255,255,255,0.06)' : '#ffffff';
  const inputColor = isDarkMode ? '#fff' : '#1f2937';
  const inputBorderNormal = isDarkMode ? 'rgba(34,197,94,0.25)' : 'rgba(34,197,94,0.3)';
  const botBubbleBg = isDarkMode ? 'rgba(255,255,255,0.07)' : '#f0fdf4';
  const botBubbleBorder = isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(34,197,94,0.2)';
  const botTextColor = isDarkMode ? '#e2e8f0' : '#15803d';
  const headerCardBg = isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.9)';
  const headerCardBorder = isDarkMode ? '1px solid rgba(34,197,94,0.2)' : '1px solid rgba(34,197,94,0.25)';
  const titleColor   = isDarkMode ? '#ffffff' : '#15803d';
  const chipBg       = isDarkMode ? 'rgba(34,197,94,0.08)' : 'rgba(34,197,94,0.1)';
  const chipBorder   = isDarkMode ? '1px solid rgba(34,197,94,0.25)' : '1px solid rgba(34,197,94,0.3)';
  const chipColor    = isDarkMode ? '#86efac' : '#15803d';
  const statsBg      = isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.8)';
  const statsBorder  = isDarkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(34,197,94,0.15)';
  const statsColor   = isDarkMode ? '#94a3b8' : '#4b5563';

  return (
    <div style={{
      minHeight: 'calc(100vh - 68px)',
      background: bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px', position: 'relative', overflow: 'hidden',
      transition: 'background 0.3s'
    }}>
      {/* Decorative orbs (dark mode only) */}
      {isDarkMode && <>
        <div style={{ position:'absolute',top:'10%',left:'5%',width:300,height:300,borderRadius:'50%',background:'radial-gradient(circle,rgba(34,197,94,0.08) 0%,transparent 70%)',pointerEvents:'none' }} />
        <div style={{ position:'absolute',bottom:'15%',right:'8%',width:250,height:250,borderRadius:'50%',background:'radial-gradient(circle,rgba(16,185,129,0.06) 0%,transparent 70%)',pointerEvents:'none' }} />
      </>}

      <div style={{ width:'100%', maxWidth:860, display:'flex', flexDirection:'column', gap:16 }}>

        {/* Header Card */}
        <div style={{ background:headerCardBg, backdropFilter:'blur(20px)', border:headerCardBorder, borderRadius:24, padding:'18px 24px', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12, transition:'all 0.3s' }}>
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <div style={{ width:52, height:52, borderRadius:16, background:'linear-gradient(135deg,#22c55e,#16a34a)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:26, boxShadow:'0 8px 20px rgba(34,197,94,0.3)' }}>🤖</div>
            <div>
              <h2 style={{ color:titleColor, margin:0, fontSize:'1.2rem', fontWeight:700, transition:'color 0.3s' }}>FarmWise Agricultural AI</h2>
              <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:4 }}>
                <div style={{ width:7, height:7, borderRadius:'50%', background:'#22c55e', boxShadow:'0 0 8px #22c55e', animation:'pulse 2s infinite' }} />
                <span style={{ color:'#22c55e', fontSize:'0.75rem', fontWeight:700, letterSpacing:1 }}>GEMINI AI · ALWAYS ACTIVE</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Questions */}
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          {quickQuestions.map((item, i) => (
            <button key={i}
              onClick={() => { setInput(item.q); inputRef.current?.focus(); }}
              style={{ padding:'7px 14px', borderRadius:20, border:chipBorder, background:chipBg, color:chipColor, cursor:'pointer', fontSize:'0.78rem', fontWeight:600, transition:'all 0.2s', letterSpacing:0.3 }}
              onMouseEnter={e => { e.currentTarget.style.background = isDarkMode ? 'rgba(34,197,94,0.18)' : 'rgba(34,197,94,0.2)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = chipBg; }}
            >{item.label}</button>
          ))}
        </div>

        {/* Chat Window */}
        <div style={{ background:panelBg, backdropFilter:'blur(20px)', border:panelBorder, borderRadius:24, overflow:'hidden', boxShadow: isDarkMode ? '0 32px 64px rgba(0,0,0,0.4)' : '0 8px 32px rgba(34,197,94,0.12)', transition:'all 0.3s' }}>

          {/* Messages */}
          <div style={{ padding:'20px', minHeight:360, maxHeight:480, overflowY:'auto', display:'flex', flexDirection:'column', gap:14 }}>
            {messages.map(msg => (
              <div key={msg.id} style={{ display:'flex', alignItems:'flex-end', gap:8, justifyContent: msg.sender==='user' ? 'flex-end' : 'flex-start' }}>
                {msg.sender === 'bot' && (
                  <div style={{ width:32, height:32, borderRadius:10, background:'linear-gradient(135deg,#22c55e,#16a34a)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, flexShrink:0 }}>🤖</div>
                )}
                <div style={{ maxWidth:'72%' }}>
                  <div style={{
                    padding:'12px 16px',
                    borderRadius: msg.sender==='user' ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                    background: msg.sender==='user'
                      ? 'linear-gradient(135deg,#16a34a,#22c55e)'
                      : msg.isError ? 'rgba(239,68,68,0.1)' : botBubbleBg,
                    border: msg.sender==='user' ? 'none' : msg.isError ? '1px solid rgba(239,68,68,0.3)' : botBubbleBorder,
                    color: msg.sender==='user' ? '#fff' : msg.isError ? (isDarkMode?'#fca5a5':'#dc2626') : botTextColor,
                    fontSize:'0.93rem', lineHeight:1.7,
                    boxShadow: msg.sender==='user' ? '0 6px 16px rgba(22,163,74,0.3)' : '0 2px 8px rgba(0,0,0,0.08)',
                    transition:'background 0.3s, color 0.3s'
                  }} dangerouslySetInnerHTML={{ __html: formatText(msg.text) }} />
                  {/* Source badge */}
                  {msg.sender==='bot' && msg.source && (
                    <div style={{ marginTop:5, display:'inline-flex', alignItems:'center', gap:4, fontSize:'0.7rem', fontWeight:700, padding:'2px 10px', borderRadius:10,
                      background: msg.source==='Knowledge Base' ? 'rgba(34,197,94,0.1)' : 'rgba(129,140,248,0.1)',
                      color: msg.source==='Knowledge Base' ? '#22c55e' : '#818cf8',
                      border:`1px solid ${msg.source==='Knowledge Base' ? 'rgba(34,197,94,0.3)' : 'rgba(129,140,248,0.3)'}` }}>
                      {msg.source==='Knowledge Base' ? '✅ Knowledge Base' : '🤖 Gemini AI'}
                    </div>
                  )}
                </div>
                {msg.sender === 'user' && (
                  <div style={{ width:32, height:32, borderRadius:10, background:'linear-gradient(135deg,#16a34a,#22c55e)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, flexShrink:0 }}>👨‍🌾</div>
                )}
              </div>
            ))}
            {/* Typing indicator */}
            {loading && (
              <div style={{ display:'flex', alignItems:'flex-end', gap:8 }}>
                <div style={{ width:32, height:32, borderRadius:10, background:'linear-gradient(135deg,#22c55e,#16a34a)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15 }}>🤖</div>
                <div style={{ padding:'12px 18px', borderRadius:'20px 20px 20px 4px', background:botBubbleBg, border:botBubbleBorder }}>
                  <div style={{ display:'flex', gap:5, alignItems:'center' }}>
                    {[0,0.2,0.4].map((delay,i) => (
                      <div key={i} style={{ width:7,height:7,borderRadius:'50%',background:'#22c55e',animation:`bounce 1.2s ${delay}s infinite` }} />
                    ))}
                    <span style={{ color: isDarkMode?'#86efac':'#15803d', fontSize:'0.8rem', marginLeft:8 }}>Thinking…</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          <div style={{ padding:'14px 18px', borderTop:inputBarBorder, background:inputBarBg, display:'flex', gap:10, alignItems:'center', transition:'all 0.3s' }}>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && handleSubmit()}
              placeholder="Ask about crops, soil, pests, or schemes…"
              style={{ flex:1, padding:'13px 18px', borderRadius:30, border:`1.5px solid ${inputBorderNormal}`, background:inputBg, color:inputColor, fontSize:'0.93rem', outline:'none', transition:'all 0.2s' }}
              onFocus={e => { e.target.style.borderColor = '#22c55e'; e.target.style.boxShadow = '0 0 0 3px rgba(34,197,94,0.12)'; }}
              onBlur={e => { e.target.style.borderColor = inputBorderNormal; e.target.style.boxShadow = 'none'; }}
            />
            <button
              id="advisor-send-btn"
              onClick={handleSubmit}
              disabled={loading || !input.trim()}
              style={{
                width:48, height:48, borderRadius:14, border:'none',
                background: loading||!input.trim() ? 'rgba(34,197,94,0.2)' : 'linear-gradient(135deg,#16a34a,#22c55e)',
                color: loading||!input.trim() ? (isDarkMode?'#4b5563':'#9ca3af') : '#fff',
                fontSize:20, cursor: loading ? 'not-allowed' : 'pointer',
                display:'flex', alignItems:'center', justifyContent:'center',
                transition:'all 0.2s',
                boxShadow: loading||!input.trim() ? 'none' : '0 6px 16px rgba(34,197,94,0.35)'
              }}>➜</button>
          </div>
        </div>

        {/* Stats Row */}
        <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
          {[{icon:'🧠',label:'Gemini AI Powered'},{icon:'📚',label:'200+ Crop Topics'},{icon:'⚡',label:'Instant Responses'},{icon:'🔒',label:'Secure & Private'}].map((item,i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:7, padding:'7px 14px', borderRadius:20, background:statsBg, border:statsBorder, color:statsColor, fontSize:'0.78rem', fontWeight:600, transition:'all 0.3s' }}>
              <span>{item.icon}</span><span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes bounce { 0%,80%,100%{transform:scale(0.6);opacity:0.5} 40%{transform:scale(1);opacity:1} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        *::-webkit-scrollbar{width:4px}
        *::-webkit-scrollbar-thumb{background:rgba(34,197,94,0.3);border-radius:4px}
      `}</style>
    </div>
  );
};

export default AdvisorBot3D;
