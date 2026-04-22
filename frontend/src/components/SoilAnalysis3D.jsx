import React, { useState, useRef, useCallback } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';

const SoilAnalysis3D = ({ isDarkMode = false }) => {
  const [analyzing, setAnalyzing]         = useState(false);
  const [results, setResults]             = useState(null);
  const [error, setError]                 = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedFile, setSelectedFile]   = useState(null);
  const [dragOver, setDragOver]           = useState(false);
  const [analysisTime, setAnalysisTime]   = useState(null);
  const [analyzeStep, setAnalyzeStep]     = useState(0); // 0–4 animation steps
  const fileInputRef                      = useRef(null);

  /* ─── theme ─────────────────────────────────────────────────── */
  const bg        = isDarkMode ? 'linear-gradient(135deg,#0a1628 0%,#0d2b1a 50%,#0a1628 100%)' : '#f0fdf4';
  const card      = isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.95)';
  const cardBdr   = isDarkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(180,83,9,0.15)';
  const headCol   = isDarkMode ? '#fff'     : '#1c1917';
  const mutedCol  = isDarkMode ? '#78716c' : '#6b7280';
  const textCol   = isDarkMode ? '#d6d3d1' : '#1c1917';

  /* ─── file helpers ───────────────────────────────────────────── */
  const handleFileChange = useCallback((file) => {
    if (!file) return;
    setSelectedImage(URL.createObjectURL(file));
    setSelectedFile(file);
    setResults(null);
    setError(null);
    setAnalysisTime(null);
  }, []);

  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith('image/')) handleFileChange(f);
  };

  /* ─── analysis steps for animated progress ───────────────────── */
  const STEPS = [
    'Reading image pixels…',
    'Evaluating soil colour & texture…',
    'Measuring nutrient indicators…',
    'Cross-referencing agronomic database…',
    'Generating report…',
  ];

  const runStepAnimation = () => {
    let s = 0;
    setAnalyzeStep(s);
    const iv = setInterval(() => {
      s++;
      setAnalyzeStep(s);
      if (s >= STEPS.length - 1) clearInterval(iv);
    }, 900);
    return iv;
  };

  /* ─── main analyze handler ───────────────────────────────────── */
  const handleAnalyze = async () => {
    const file = selectedFile || fileInputRef.current?.files[0];
    if (!selectedImage || !file) { setError('Please select a soil image first.'); return; }
    setAnalyzing(true); setResults(null); setError(null);
    const iv = runStepAnimation();

    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) { window.location.href = '/signin'; return; }

        const response = await axios.post(
          `${API_BASE_URL}/api/soil/analyze`,
          { imageData: reader.result, location: '', notes: '' },
          { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
        );

        if (response.data.success) {
          setResults(response.data.analysis.analysis);
          setAnalysisTime(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
        } else {
          setError(response.data.error || 'Analysis failed. Please try again.');
        }
      } catch (err) {
        if (err.response?.status === 401) window.location.href = '/signin';
        else setError('Analysis failed. Please check your connection and try again.');
      } finally {
        clearInterval(iv);
        setAnalyzing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  /* ─── Nutrient bar ───────────────────────────────────────────── */
  const NutrientBar = ({ label, value }) => {
    const lv = (value || '').toLowerCase();
    const pct   = lv.includes('very low') ? 12 : lv.includes('low') ? 25 : lv.includes('high') ? 82 : lv.includes('medium') || lv.includes('adequate') ? 55 : 40;
    const color = lv.includes('very low') ? '#ef4444' : lv.includes('low') ? '#f97316' : lv.includes('high') ? '#22c55e' : '#f59e0b';
    const label2 = lv.includes('very low') ? 'Very Low' : lv.includes('low') ? 'Low' : lv.includes('high') ? 'High' : 'Medium';
    return (
      <div style={{ marginBottom: 16 }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom: 6 }}>
          <span style={{ color: mutedCol, fontSize:'0.83rem', fontWeight:600 }}>{label}</span>
          <span style={{ color, fontSize:'0.83rem', fontWeight:700, background:`${color}18`, padding:'2px 8px', borderRadius:8 }}>{label2}</span>
        </div>
        <div style={{ height:8, background:'rgba(255,255,255,0.08)', borderRadius:8, overflow:'hidden' }}>
          <div style={{
            height:'100%', width:`${pct}%`, borderRadius:8,
            background:`linear-gradient(90deg,${color}99,${color})`,
            boxShadow:`0 0 10px ${color}50`,
            transition:'width 1.4s cubic-bezier(0.22,1,0.36,1)',
          }} />
        </div>
        <p style={{ color: isDarkMode ? '#57534e' : '#9ca3af', fontSize:'0.73rem', margin:'4px 0 0', lineHeight:1.4 }}>{value}</p>
      </div>
    );
  };

  /* ─── pH colour ──────────────────────────────────────────────── */
  const phColor = (v) => {
    const n = parseFloat(v);
    if (isNaN(n)) return '#64748b';
    if (n < 5.5) return '#ef4444';
    if (n < 6)   return '#f97316';
    if (n < 7)   return '#22c55e';
    if (n < 7.5) return '#3b82f6';
    return '#a855f7';
  };

  /* ─── JSX ────────────────────────────────────────────────────── */
  return (
    <div style={{ minHeight:'calc(100vh - 68px)', background:bg, display:'flex',
      alignItems:'flex-start', justifyContent:'center', padding:'28px 16px',
      gap:24, flexWrap:'wrap', boxSizing:'border-box', transition:'background 0.3s' }}>

      {/* ── LEFT: Upload Panel ─────────────────────────────────── */}
      <div style={{ width:'100%', maxWidth:380, display:'flex', flexDirection:'column', gap:18 }}>

        {/* Title */}
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ width:52, height:52, borderRadius:16, flexShrink:0,
            background:'linear-gradient(135deg,#b45309,#92400e)',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:26, boxShadow:'0 8px 24px rgba(180,83,9,0.45)' }}>🪨</div>
          <div>
            <h2 style={{ color:headCol, margin:0, fontSize:'1.2rem', fontWeight:800 }}>Soil Health Analysis</h2>
            <p style={{ color:mutedCol, margin:0, fontSize:'0.79rem' }}>Upload a photo — get a full soil report instantly</p>
          </div>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            borderRadius:22,
            border:`2px dashed ${dragOver ? '#b45309' : selectedImage ? 'rgba(180,83,9,0.5)' : 'rgba(180,83,9,0.3)'}`,
            background: dragOver ? 'rgba(180,83,9,0.1)' : selectedImage ? 'transparent' : 'rgba(180,83,9,0.04)',
            aspectRatio:'4/3', overflow:'hidden', cursor:'pointer',
            display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
            transition:'all 0.3s', position:'relative',
            boxShadow: dragOver ? '0 0 32px rgba(180,83,9,0.35)' : selectedImage ? '0 4px 20px rgba(0,0,0,0.2)' : 'none',
          }}>
          {selectedImage ? (
            <>
              <img src={selectedImage} alt="Soil"
                style={{ width:'100%', height:'100%', objectFit:'cover' }} />
              <div style={{
                position:'absolute', inset:0, background:'rgba(0,0,0,0.52)',
                display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:6,
                opacity:0, transition:'opacity 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.opacity='1'}
                onMouseLeave={e => e.currentTarget.style.opacity='0'}>
                <span style={{ fontSize:28 }}>🔄</span>
                <span style={{ color:'#fff', fontWeight:700, fontSize:'0.88rem' }}>Change Image</span>
              </div>
            </>
          ) : (
            <div style={{ textAlign:'center', padding:'20px 18px' }}>
              <div style={{ fontSize:52, marginBottom:10, opacity:0.7 }}>📷</div>
              <p style={{ color:'#a8a29e', fontWeight:700, marginBottom:5, fontSize:'0.95rem' }}>Tap / Drop Soil Photo</p>
              <p style={{ color:'#78716c', fontSize:'0.78rem', margin:0 }}>JPG, PNG, WebP · Mobile camera supported</p>
            </div>
          )}
        </div>

        <input type="file" accept="image/*" capture="environment"
          ref={fileInputRef} style={{ display:'none' }}
          onChange={e => handleFileChange(e.target.files[0])} />

        {/* Analyze button */}
        <button onClick={handleAnalyze} disabled={analyzing || !selectedImage}
          style={{
            padding:'15px 22px', borderRadius:16, border:'none', width:'100%',
            background: !selectedImage ? 'rgba(180,83,9,0.15)' : analyzing ? 'rgba(180,83,9,0.4)' : 'linear-gradient(135deg,#92400e,#b45309)',
            color: !selectedImage ? '#78716c' : '#fff',
            fontSize:'1rem', fontWeight:700, cursor: !selectedImage||analyzing ? 'not-allowed' : 'pointer',
            transition:'all 0.3s',
            boxShadow: selectedImage && !analyzing ? '0 8px 28px rgba(180,83,9,0.45)' : 'none',
            touchAction:'manipulation',
          }}>
          {analyzing ? (
            <span style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10 }}>
              <span style={{ display:'inline-block', width:18, height:18,
                border:'2px solid rgba(255,255,255,0.25)', borderTopColor:'#fff',
                borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
              {STEPS[analyzeStep]}
            </span>
          ) : '🔬 Analyze Soil'}
        </button>

        {error && (
          <div style={{ padding:'12px 16px', borderRadius:12,
            background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)',
            color:'#fca5a5', fontSize:'0.86rem' }}>⚠️ {error}</div>
        )}

        {/* Photo tips */}
        <div style={{ padding:'15px 18px', borderRadius:16, background:card, border:cardBdr }}>
          <p style={{ color:mutedCol, fontSize:'0.78rem', margin:'0 0 10px', fontWeight:700, letterSpacing:0.5 }}>📱 TIPS FOR BEST RESULTS</p>
          {[
            'Take photo in natural daylight — avoid direct flash',
            'Spread soil flat on a light-coloured surface',
            'Include at least a large handful of soil',
            'Avoid shadows, fingers or objects in the frame',
          ].map((t, i) => (
            <p key={i} style={{ color:mutedCol, fontSize:'0.77rem', margin:'5px 0', display:'flex', gap:7, lineHeight:1.4 }}>
              <span style={{ color:'#b45309', flexShrink:0 }}>→</span>{t}
            </p>
          ))}
        </div>
      </div>

      {/* ── RIGHT: Results Panel ────────────────────────────────── */}
      <div style={{ flex:1, minWidth:280, maxWidth:560 }}>
        {!results && !analyzing ? (
          /* Empty state */
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center',
            justifyContent:'center', minHeight:440, textAlign:'center', gap:16 }}>
            <div style={{ fontSize:80, opacity:0.15 }}>🧪</div>
            <h3 style={{ color: isDarkMode ? '#4b6957' : '#9ca3af', fontWeight:700, margin:0, fontSize:'1.15rem' }}>
              Ready for Analysis
            </h3>
            <p style={{ color: isDarkMode ? '#374151' : '#6b7280', fontSize:'0.86rem', maxWidth:300, lineHeight:1.6 }}>
              Upload a photo of your soil and click <strong>Analyze Soil</strong> to receive a complete agronomic report — pH, nutrients, texture and crop recommendations.
            </p>
          </div>
        ) : analyzing ? (
          /* Loading state */
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center',
            justifyContent:'center', minHeight:440, gap:28 }}>
            <div style={{ position:'relative', width:90, height:90 }}>
              <div style={{ position:'absolute', inset:0, border:'4px solid rgba(180,83,9,0.15)',
                borderTopColor:'#b45309', borderRadius:'50%', animation:'spin 1s linear infinite' }} />
              <div style={{ position:'absolute', inset:10, border:'3px solid rgba(180,83,9,0.08)',
                borderBottomColor:'#92400e', borderRadius:'50%', animation:'spin 1.5s linear infinite reverse' }} />
            </div>
            <div style={{ textAlign:'center' }}>
              <p style={{ color: headCol, fontWeight:700, margin:'0 0 6px', fontSize:'1rem' }}>Analysing soil composition…</p>
              <p style={{ color:'#b45309', fontSize:'0.84rem', margin:0, fontWeight:600 }}>{STEPS[analyzeStep]}</p>
            </div>
            {/* Step dots */}
            <div style={{ display:'flex', gap:8 }}>
              {STEPS.map((_, i) => (
                <div key={i} style={{ width: i <= analyzeStep ? 24 : 8, height:8, borderRadius:8,
                  background: i <= analyzeStep ? '#b45309' : 'rgba(180,83,9,0.2)',
                  transition:'all 0.4s ease' }} />
              ))}
            </div>
          </div>
        ) : (
          /* Results */
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

            {/* Report header badge */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
              flexWrap:'wrap', gap:10 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ width:10, height:10, borderRadius:'50%', background:'#22c55e',
                  boxShadow:'0 0 8px #22c55e', animation:'pulse 2s infinite' }} />
                <span style={{ color:'#22c55e', fontSize:'0.75rem', fontWeight:700, letterSpacing:0.8 }}>
                  ANALYSIS COMPLETE
                </span>
              </div>
              {analysisTime && (
                <span style={{ color:mutedCol, fontSize:'0.73rem' }}>
                  🕐 Generated at {analysisTime}
                </span>
              )}
            </div>

            {/* Soil type banner */}
            <div style={{ padding:'18px 20px', borderRadius:18, background:'linear-gradient(135deg,rgba(180,83,9,0.12),rgba(146,64,14,0.08))',
              border:'1px solid rgba(180,83,9,0.25)' }}>
              <p style={{ color:'#b45309', fontSize:'0.72rem', fontWeight:700, letterSpacing:1, margin:'0 0 6px', textTransform:'uppercase' }}>Detected Soil Type</p>
              <h3 style={{ color: headCol, margin:0, fontWeight:800, fontSize:'1.1rem' }}>{results.soilType || '—'}</h3>
              {results.color && <p style={{ color:mutedCol, fontSize:'0.8rem', margin:'6px 0 0' }}>🎨 {results.color}</p>}
            </div>

            {/* Stats grid */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))', gap:10 }}>
              {[
                { label:'pH Level', value: results.ph?.value ? `${results.ph.value}` : '—',
                  sub: results.ph?.category, icon:'⚗️', accent: phColor(results.ph?.value) },
                { label:'Moisture', value: results.moisture, icon:'💧', accent:'#3b82f6' },
                { label:'Organic Matter', value: results.organicMatter, icon:'🍂', accent:'#a16207' },
              ].map((s, i) => (
                <div key={i} style={{ padding:'14px', borderRadius:16, background:card,
                  border: i===0 ? `1px solid ${phColor(results.ph?.value)}30` : cardBdr, textAlign:'center' }}>
                  <div style={{ fontSize:22, marginBottom:6 }}>{s.icon}</div>
                  <p style={{ color:mutedCol, fontSize:'0.67rem', fontWeight:700, letterSpacing:0.8, margin:'0 0 4px', textTransform:'uppercase' }}>{s.label}</p>
                  <p style={{ color: s.accent, fontSize:'1rem', fontWeight:800, margin:'0 0 2px', wordBreak:'break-word' }}>{s.value || '—'}</p>
                  {s.sub && <p style={{ color:mutedCol, fontSize:'0.68rem', margin:0 }}>{s.sub}</p>}
                </div>
              ))}
            </div>

            {/* Texture */}
            {results.texture && (
              <div style={{ padding:'14px 18px', borderRadius:14, background:card, border:cardBdr }}>
                <p style={{ color:mutedCol, fontSize:'0.7rem', fontWeight:700, letterSpacing:0.8, margin:'0 0 5px', textTransform:'uppercase' }}>Soil Texture & Structure</p>
                <p style={{ color:textCol, fontSize:'0.86rem', margin:0, lineHeight:1.6 }}>{results.texture}</p>
              </div>
            )}

            {/* Nutrients */}
            {results.nutrients && (
              <div style={{ padding:'18px 20px', borderRadius:18, background:card, border:cardBdr }}>
                <h4 style={{ color:headCol, margin:'0 0 18px', fontWeight:700 }}>🧬 Nutrient Profile</h4>
                <NutrientBar label="Nitrogen (N)" value={results.nutrients.nitrogen} />
                <NutrientBar label="Phosphorus (P)" value={results.nutrients.phosphorus} />
                <NutrientBar label="Potassium (K)" value={results.nutrients.potassium} />
              </div>
            )}

            {/* Recommendations */}
            {results.recommendations?.length > 0 && (
              <div style={{ padding:'18px 20px', borderRadius:18,
                background:'rgba(34,197,94,0.05)', border:'1px solid rgba(34,197,94,0.18)' }}>
                <h4 style={{ color:'#86efac', margin:'0 0 14px', fontWeight:700 }}>✅ Agronomic Recommendations</h4>
                {results.recommendations.map((rec, i) => (
                  <div key={i} style={{ display:'flex', gap:10, marginBottom:12, alignItems:'flex-start' }}>
                    <span style={{ background:'#22c55e22', color:'#22c55e', fontWeight:800,
                      fontSize:'0.78rem', padding:'2px 7px', borderRadius:8, flexShrink:0, marginTop:1 }}>{i+1}</span>
                    <p style={{ color: isDarkMode ? '#a7f3d0' : '#15803d', fontSize:'0.85rem', margin:0, lineHeight:1.65 }}>{rec}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Suitable crops */}
            {results.suitableCrops?.length > 0 && (
              <div style={{ padding:'16px 18px', borderRadius:16, background:card, border:cardBdr }}>
                <h4 style={{ color:headCol, margin:'0 0 12px', fontWeight:700 }}>🌾 Suitable Crops for This Soil</h4>
                <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                  {results.suitableCrops.map((c, i) => (
                    <span key={i} style={{ padding:'5px 14px', borderRadius:20,
                      background:'rgba(34,197,94,0.1)', border:'1px solid rgba(34,197,94,0.25)',
                      color: isDarkMode ? '#86efac' : '#15803d', fontSize:'0.82rem', fontWeight:600 }}>{c}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Improvements */}
            {results.improvements?.length > 0 && (
              <div style={{ padding:'18px 20px', borderRadius:18,
                background:'rgba(245,158,11,0.05)', border:'1px solid rgba(245,158,11,0.2)' }}>
                <h4 style={{ color:'#fcd34d', margin:'0 0 14px', fontWeight:700 }}>🔧 Soil Improvement Plan</h4>
                {results.improvements.map((imp, i) => (
                  <div key={i} style={{ display:'flex', gap:10, marginBottom:10, alignItems:'flex-start' }}>
                    <span style={{ color:'#f59e0b', fontSize:'1rem', flexShrink:0 }}>→</span>
                    <p style={{ color: isDarkMode ? '#fde68a' : '#b45309', fontSize:'0.85rem', margin:0, lineHeight:1.65 }}>{imp}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Footer note */}
            <div style={{ padding:'12px 16px', borderRadius:12,
              background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)' }}>
              <p style={{ color:mutedCol, fontSize:'0.73rem', margin:0, lineHeight:1.5 }}>
                📋 <strong>Note:</strong> This report is generated from agronomic databases using visual soil indicators. For laboratory-grade accuracy, collect a 500g sample (0–15 cm depth) and submit to your nearest Soil Testing Lab or obtain a free Soil Health Card from the District Agriculture Office.
              </p>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin  { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>
    </div>
  );
};

export default SoilAnalysis3D;
