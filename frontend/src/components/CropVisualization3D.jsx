import React, { useState, useRef, useCallback } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';

const CropVisualization3D = ({ isDarkMode = false }) => {
  const [scanning, setScanning]           = useState(false);
  const [results, setResults]             = useState(null);
  const [error, setError]                 = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedFile, setSelectedFile]   = useState(null);
  const [dragOver, setDragOver]           = useState(false);
  const [scanTime, setScanTime]           = useState(null);
  const [scanStep, setScanStep]           = useState(0);
  const fileInputRef                      = useRef(null);

  /* ─── theme ───────────────────────────────────────────────── */
  const bg       = isDarkMode ? 'linear-gradient(135deg,#0a1628 0%,#091a0f 50%,#0a1628 100%)' : '#f0fdf4';
  const card     = isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.95)';
  const cardBdr  = isDarkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(34,197,94,0.2)';
  const headCol  = isDarkMode ? '#d1fae5' : '#14532d';
  const mutedCol = isDarkMode ? '#4b6957' : '#6b7280';
  const textCol  = isDarkMode ? '#d6d3d1' : '#1c1917';

  /* ─── helpers ─────────────────────────────────────────────── */
  const handleFileChange = useCallback((file) => {
    if (!file) return;
    setSelectedImage(URL.createObjectURL(file));
    setSelectedFile(file);
    setResults(null); setError(null); setScanTime(null);
  }, []);

  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith('image/')) handleFileChange(f);
  };

  const STEPS = [
    'Detecting crop species…',
    'Analyzing leaf patterns…',
    'Identifying disease markers…',
    'Assessing pest indicators…',
    'Generating diagnostic report…',
  ];

  const runStepAnimation = () => {
    let s = 0; setScanStep(s);
    const iv = setInterval(() => {
      s++; setScanStep(s);
      if (s >= STEPS.length - 1) clearInterval(iv);
    }, 900);
    return iv;
  };

  const handleScan = async () => {
    const file = selectedFile || fileInputRef.current?.files[0];
    if (!selectedImage || !file) { setError('Please select a crop image first.'); return; }
    setScanning(true); setResults(null); setError(null);
    const iv = runStepAnimation();

    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) { window.location.href = '/signin'; return; }

        const response = await axios.post(
          `${API_BASE_URL}/api/crop/analyze`,
          { imageData: reader.result, location: '', notes: '' },
          { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
        );

        if (response.data.success) {
          setResults(response.data.analysis.analysis);
          setScanTime(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
        } else {
          setError(response.data.error || 'Analysis failed. Please try again.');
        }
      } catch (err) {
        if (err.response?.status === 401) window.location.href = '/signin';
        else setError('Analysis failed. Please check your connection and try again.');
      } finally {
        clearInterval(iv); setScanning(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const getHealthColor  = (s) => !s && s !== 0 ? '#64748b' : s >= 80 ? '#22c55e' : s >= 60 ? '#f59e0b' : s >= 40 ? '#f97316' : '#ef4444';
  const getHealthLabel  = (s) => !s && s !== 0 ? '—' : s >= 80 ? 'Excellent' : s >= 60 ? 'Good' : s >= 40 ? 'Stressed' : 'Critical';
  const getSeverityColor = (sv) => {
    const s = (sv || '').toLowerCase();
    return s.includes('very low') ? '#22c55e' : s.includes('low') ? '#86efac' : s.includes('medium') ? '#f59e0b' : s.includes('high') ? '#ef4444' : '#64748b';
  };

  /* ─── card subcomponents ─────────────────────────────────── */
  const IssueCard = ({ item, type }) => (
    <div style={{ padding:'15px 16px', borderRadius:14, marginBottom:10,
      background: type === 'disease' ? 'rgba(239,68,68,0.06)' : 'rgba(251,146,60,0.06)',
      border: type === 'disease' ? '1px solid rgba(239,68,68,0.2)' : '1px solid rgba(251,146,60,0.2)' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8, flexWrap:'wrap', gap:6 }}>
        <span style={{ color: type === 'disease' ? '#fca5a5' : '#fdba74', fontWeight:700, fontSize:'0.88rem' }}>
          {type === 'disease' ? '🦠' : '🐛'} {item.name}
        </span>
        <span style={{ padding:'3px 10px', borderRadius:10, fontSize:'0.7rem', fontWeight:700,
          background:`${getSeverityColor(item.severity)}20`, color: getSeverityColor(item.severity) }}>
          {item.severity}
        </span>
      </div>
      {item.symptoms && (
        <p style={{ color: type === 'disease' ? '#f87171' : '#fb923c',
          fontSize:'0.8rem', margin:'0 0 8px', lineHeight:1.5 }}>
          ⚠️ {item.symptoms}
        </p>
      )}
      <div style={{ padding:'10px 12px', borderRadius:10, background:'rgba(255,255,255,0.04)',
        borderLeft:`3px solid ${type === 'disease' ? '#ef4444' : '#f97316'}` }}>
        <p style={{ color:'#94a3b8', fontSize:'0.72rem', fontWeight:700, margin:'0 0 4px', letterSpacing:0.6 }}>💊 TREATMENT</p>
        <p style={{ color: textCol, fontSize:'0.81rem', margin:0, lineHeight:1.6 }}>{item.treatment}</p>
      </div>
    </div>
  );

  /* ─── main JSX ────────────────────────────────────────────── */
  return (
    <div style={{ minHeight:'calc(100vh - 68px)', background:bg, display:'flex',
      alignItems:'flex-start', justifyContent:'center', padding:'28px 16px',
      gap:24, flexWrap:'wrap', boxSizing:'border-box', transition:'background 0.3s' }}>

      {/* ── LEFT: Upload ──────────────────────────────────────── */}
      <div style={{ width:'100%', maxWidth:380, display:'flex', flexDirection:'column', gap:18 }}>

        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ width:52, height:52, borderRadius:16, flexShrink:0,
            background:'linear-gradient(135deg,#16a34a,#15803d)',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:26, boxShadow:'0 8px 24px rgba(22,163,74,0.4)' }}>🌿</div>
          <div>
            <h2 style={{ color: isDarkMode ? '#fff' : '#14532d', margin:0, fontSize:'1.2rem', fontWeight:800 }}>
              Crop Disease Detector
            </h2>
            <p style={{ color:mutedCol, margin:0, fontSize:'0.79rem' }}>
              Photo-based plant health diagnosis & treatment
            </p>
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
            border:`2px dashed ${dragOver ? '#22c55e' : selectedImage ? 'rgba(34,197,94,0.5)' : 'rgba(34,197,94,0.3)'}`,
            background: dragOver ? 'rgba(34,197,94,0.08)' : selectedImage ? 'transparent' : 'rgba(34,197,94,0.04)',
            aspectRatio:'4/3', overflow:'hidden', cursor:'pointer',
            display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
            transition:'all 0.3s', position:'relative',
            boxShadow: dragOver ? '0 0 32px rgba(34,197,94,0.25)' : selectedImage ? '0 4px 20px rgba(0,0,0,0.15)' : 'none',
          }}>
          {selectedImage ? (
            <>
              <img src={selectedImage} alt="Crop" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
              <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.55)',
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
              <div style={{ fontSize:52, marginBottom:10, opacity:0.7 }}>🌿</div>
              <p style={{ color:'#6b7280', fontWeight:700, marginBottom:5, fontSize:'0.95rem' }}>Tap / Drop Crop Photo</p>
              <p style={{ color:'#4b5563', fontSize:'0.78rem', margin:0 }}>JPG, PNG, WebP · Mobile camera supported</p>
            </div>
          )}
        </div>

        <input type="file" accept="image/*" capture="environment"
          ref={fileInputRef} style={{ display:'none' }}
          onChange={e => { if (e.target.files[0]) handleFileChange(e.target.files[0]); }} />

        {/* Scan button */}
        <button onClick={handleScan} disabled={scanning || !selectedImage}
          style={{
            padding:'15px 22px', borderRadius:16, border:'none', width:'100%',
            background: !selectedImage ? 'rgba(34,197,94,0.1)' : scanning ? 'rgba(34,197,94,0.3)' : 'linear-gradient(135deg,#15803d,#22c55e)',
            color: !selectedImage ? '#4b6957' : '#fff',
            fontSize:'1rem', fontWeight:700, cursor: !selectedImage || scanning ? 'not-allowed' : 'pointer',
            transition:'all 0.3s',
            boxShadow: selectedImage && !scanning ? '0 8px 28px rgba(34,197,94,0.4)' : 'none',
            touchAction:'manipulation',
          }}>
          {scanning ? (
            <span style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10 }}>
              <span style={{ display:'inline-block', width:18, height:18,
                border:'2px solid rgba(255,255,255,0.25)', borderTopColor:'#fff',
                borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
              {STEPS[scanStep]}
            </span>
          ) : '🔍 Diagnose Crop'}
        </button>

        {error && (
          <div style={{ padding:'12px 16px', borderRadius:13,
            background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)',
            color:'#fca5a5', fontSize:'0.86rem' }}>⚠️ {error}</div>
        )}

        {/* Photo tips */}
        <div style={{ padding:'15px 18px', borderRadius:16, background:card, border:cardBdr }}>
          <p style={{ color:mutedCol, fontSize:'0.78rem', margin:'0 0 10px', fontWeight:700, letterSpacing:0.5 }}>📸 PHOTO TIPS</p>
          {[
            'Focus clearly on affected leaves — blurry shots reduce accuracy',
            'Natural light gives the most accurate colour reading',
            'Include both healthy and diseased areas in the frame',
            'Capture stems and underside of leaves if possible',
          ].map((t, i) => (
            <p key={i} style={{ color:mutedCol, fontSize:'0.77rem', margin:'5px 0', display:'flex', gap:7, lineHeight:1.4 }}>
              <span style={{ color:'#22c55e', flexShrink:0 }}>→</span>{t}
            </p>
          ))}
        </div>
      </div>

      {/* ── RIGHT: Results ────────────────────────────────────── */}
      <div style={{ flex:1, minWidth:280, maxWidth:560 }}>
        {!results && !scanning ? (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center',
            justifyContent:'center', minHeight:440, textAlign:'center', gap:16 }}>
            <div style={{ fontSize:80, opacity:0.15 }}>🌿</div>
            <h3 style={{ color: isDarkMode ? '#4b6957' : '#9ca3af', fontWeight:700, margin:0, fontSize:'1.15rem' }}>
              Ready to Diagnose
            </h3>
            <p style={{ color: isDarkMode ? '#374151' : '#6b7280', fontSize:'0.86rem', maxWidth:300, lineHeight:1.6 }}>
              Upload a photo of your crop and click <strong>Diagnose Crop</strong> to detect diseases, pests, growth stage and get expert treatment recommendations.
            </p>
          </div>
        ) : scanning ? (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center',
            justifyContent:'center', minHeight:440, gap:28 }}>
            <div style={{ position:'relative', width:90, height:90 }}>
              <div style={{ position:'absolute', inset:0, border:'4px solid rgba(34,197,94,0.15)',
                borderTopColor:'#22c55e', borderRadius:'50%', animation:'spin 1s linear infinite' }} />
              <div style={{ position:'absolute', inset:10, border:'3px solid rgba(34,197,94,0.08)',
                borderBottomColor:'#16a34a', borderRadius:'50%', animation:'spin 1.5s linear infinite reverse' }} />
              <div style={{ position:'absolute', inset:22, background:'rgba(34,197,94,0.1)',
                borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>🌿</div>
            </div>
            <div style={{ textAlign:'center' }}>
              <p style={{ color: isDarkMode ? '#d1fae5' : '#14532d', fontWeight:700, margin:'0 0 6px', fontSize:'1rem' }}>Scanning for crop issues…</p>
              <p style={{ color:'#22c55e', fontSize:'0.84rem', margin:0, fontWeight:600 }}>{STEPS[scanStep]}</p>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              {STEPS.map((_, i) => (
                <div key={i} style={{ width: i <= scanStep ? 24 : 8, height:8, borderRadius:8,
                  background: i <= scanStep ? '#22c55e' : 'rgba(34,197,94,0.15)',
                  transition:'all 0.4s ease' }} />
              ))}
            </div>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

            {/* Header */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ width:10, height:10, borderRadius:'50%', background:'#22c55e',
                  boxShadow:'0 0 8px #22c55e', animation:'pulse 2s infinite' }} />
                <span style={{ color:'#22c55e', fontSize:'0.75rem', fontWeight:700, letterSpacing:0.8 }}>DIAGNOSIS COMPLETE</span>
              </div>
              {scanTime && <span style={{ color:mutedCol, fontSize:'0.73rem' }}>🕐 {scanTime}</span>}
            </div>

            {/* Identity + health score */}
            <div style={{ padding:'18px 20px', borderRadius:18, background:card, border:cardBdr,
              display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:14 }}>
              <div>
                <p style={{ color:mutedCol, fontSize:'0.7rem', fontWeight:700, letterSpacing:0.8, margin:'0 0 4px', textTransform:'uppercase' }}>Identified Crop</p>
                <h3 style={{ color:headCol, margin:'0 0 2px', fontSize:'1.3rem', fontWeight:800 }}>{results.cropName || '—'}</h3>
                <p style={{ color:mutedCol, margin:'0 0 6px', fontSize:'0.8rem', fontStyle:'italic' }}>{results.scientificName}</p>
                <p style={{ color: isDarkMode ? '#6b7280' : '#4b5563', margin:0, fontSize:'0.8rem' }}>
                  📊 <strong>Stage:</strong> {results.growthStage}
                </p>
              </div>
              {results.health && (
                <div style={{ textAlign:'center', flexShrink:0 }}>
                  <div style={{ width:84, height:84, borderRadius:'50%',
                    border:`5px solid ${getHealthColor(results.health.score)}`,
                    display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column',
                    boxShadow:`0 0 22px ${getHealthColor(results.health.score)}40` }}>
                    <span style={{ color:getHealthColor(results.health.score), fontWeight:900, fontSize:'1.3rem', lineHeight:1 }}>
                      {results.health.score}
                    </span>
                    <span style={{ color:'#6b7280', fontSize:'0.58rem' }}>/100</span>
                  </div>
                  <p style={{ color:getHealthColor(results.health.score), fontSize:'0.72rem', fontWeight:700,
                    margin:'6px 0 0', letterSpacing:0.4 }}>
                    {getHealthLabel(results.health.score)}
                  </p>
                  <p style={{ color:mutedCol, fontSize:'0.68rem', margin:'2px 0 0' }}>{results.health.status}</p>
                </div>
              )}
            </div>

            {/* Diseases */}
            {results.diseases?.length > 0 && (
              <div>
                <h4 style={{ color:'#fca5a5', margin:'0 0 10px', fontWeight:700 }}>🦠 Detected Diseases</h4>
                {results.diseases.map((d, i) => <IssueCard key={i} item={d} type="disease" />)}
              </div>
            )}

            {/* No diseases — healthy */}
            {results.diseases?.length === 0 && results.health?.score >= 75 && (
              <div style={{ padding:'14px 18px', borderRadius:14,
                background:'rgba(34,197,94,0.08)', border:'1px solid rgba(34,197,94,0.2)' }}>
                <p style={{ color:'#86efac', fontWeight:700, margin:'0 0 4px', fontSize:'0.92rem' }}>✅ No Diseases Detected</p>
                <p style={{ color:mutedCol, fontSize:'0.82rem', margin:0 }}>
                  Your crop appears free of visible fungal, bacterial or viral disease symptoms. Maintain preventive spray schedule.
                </p>
              </div>
            )}

            {/* Pests */}
            {results.pests?.length > 0 && (
              <div>
                <h4 style={{ color:'#fdba74', margin:'0 0 10px', fontWeight:700 }}>🐛 Pest Activity</h4>
                {results.pests.map((p, i) => <IssueCard key={i} item={p} type="pest" />)}
              </div>
            )}

            {/* Recommendations */}
            {results.recommendations?.length > 0 && (
              <div style={{ padding:'18px 20px', borderRadius:18,
                background:'rgba(34,197,94,0.05)', border:'1px solid rgba(34,197,94,0.18)' }}>
                <h4 style={{ color:'#86efac', margin:'0 0 14px', fontWeight:700 }}>✅ Priority Actions</h4>
                {results.recommendations.map((rec, i) => (
                  <div key={i} style={{ display:'flex', gap:10, marginBottom:12 }}>
                    <span style={{ background:'#22c55e22', color:'#22c55e', fontWeight:800,
                      fontSize:'0.78rem', padding:'2px 7px', borderRadius:8, flexShrink:0, marginTop:1 }}>{i+1}</span>
                    <p style={{ color: isDarkMode ? '#a7f3d0' : '#15803d', fontSize:'0.85rem', margin:0, lineHeight:1.65 }}>{rec}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Care instructions */}
            {results.careInstructions && (
              <div style={{ padding:'18px 20px', borderRadius:18, background:card, border:cardBdr }}>
                <h4 style={{ color:headCol, margin:'0 0 14px', fontWeight:700 }}>💧 Crop Care Instructions</h4>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))', gap:10 }}>
                  {[
                    { icon:'💧', label:'Watering',       val:results.careInstructions.watering },
                    { icon:'🌿', label:'Fertilization',  val:results.careInstructions.fertilization },
                    { icon:'✂️', label:'Pruning',        val:results.careInstructions.pruning },
                    { icon:'🛡️', label:'Pest Control',   val:results.careInstructions.pestControl },
                  ].map((item, i) => item.val && (
                    <div key={i} style={{ padding:'12px', borderRadius:13, background:'rgba(255,255,255,0.04)',
                      border:'1px solid rgba(255,255,255,0.06)' }}>
                      <p style={{ color:mutedCol, fontSize:'0.68rem', fontWeight:700, letterSpacing:0.8,
                        margin:'0 0 5px', textTransform:'uppercase' }}>{item.icon} {item.label}</p>
                      <p style={{ color:textCol, fontSize:'0.8rem', margin:0, lineHeight:1.55 }}>{item.val}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Harvest */}
            {results.harvestPrediction && (
              <div style={{ padding:'16px 20px', borderRadius:16,
                background:'rgba(245,158,11,0.06)', border:'1px solid rgba(245,158,11,0.22)',
                display:'flex', gap:20, alignItems:'center', flexWrap:'wrap' }}>
                <div style={{ textAlign:'center', flexShrink:0 }}>
                  <span style={{ color:'#fcd34d', fontWeight:900, fontSize:'2rem', display:'block', lineHeight:1 }}>
                    {results.harvestPrediction.estimatedDays}
                  </span>
                  <span style={{ color:'#78716c', fontSize:'0.68rem', fontWeight:700 }}>DAYS</span>
                </div>
                <div>
                  <p style={{ color:'#fde68a', fontWeight:700, margin:'0 0 5px', fontSize:'0.92rem' }}>🌾 Harvest Prediction</p>
                  <p style={{ color:'#d97706', fontSize:'0.82rem', margin:0, lineHeight:1.5 }}>
                    {results.harvestPrediction.expectedYield}
                  </p>
                </div>
              </div>
            )}

            {/* Footer note */}
            <div style={{ padding:'12px 16px', borderRadius:12,
              background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)' }}>
              <p style={{ color:mutedCol, fontSize:'0.73rem', margin:0, lineHeight:1.5 }}>
                📋 <strong>Note:</strong> This diagnosis is based on visual pattern analysis using agronomic reference data. For confirmation, consult your local Krishi Vigyan Kendra (KVK) or Agriculture Extension Officer, especially before applying systemic pesticides.
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

export default CropVisualization3D;
