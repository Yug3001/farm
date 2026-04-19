import React, { useState, useRef } from 'react';
import axios from 'axios';

const SoilAnalysis3D = ({ isDarkMode = false }) => {
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  // Theme palette
  const bg         = isDarkMode ? 'linear-gradient(135deg,#0a1628 0%,#0d2b1a 50%,#0a1628 100%)' : '#f0fdf4';
  const cardBg     = isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.95)';
  const cardBorder = isDarkMode ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(180,83,9,0.15)';
  const textMain   = isDarkMode ? '#d6d3d1' : '#1c1917';
  const textMuted  = isDarkMode ? '#78716c' : '#6b7280';
  const emptyColor = isDarkMode ? '#4b6957' : '#9ca3af';

  const handleFileChange = (file) => {
    if (!file) return;
    setSelectedImage(URL.createObjectURL(file));
    setResults(null);
    setError(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) handleFileChange(file);
  };

  const handleAnalyze = async () => {
    if (!selectedImage || !fileInputRef.current?.files[0]) {
      setError('Please select a soil image first.');
      return;
    }
    setAnalyzing(true);
    setResults(null);
    setError(null);

    const file = fileInputRef.current.files[0];
    const reader = new FileReader();

    reader.onloadend = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) { window.location.href = '/signin'; return; }

        const response = await axios.post('http://localhost:5000/api/soil/analyze', {
          imageData: reader.result, location: '', notes: ''
        }, { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } });

        if (response.data.success) setResults(response.data.analysis.analysis);
        else setError(response.data.error || 'Analysis failed. Please try again.');
      } catch (err) {
        if (err.response?.status === 401) { window.location.href = '/signin'; }
        else setError('Analysis failed. Please check your connection and try again.');
      } finally {
        setAnalyzing(false);
      }
    };

    reader.readAsDataURL(file);
  };

  const getPhColor = (phVal) => {
    const ph = parseFloat(phVal);
    if (isNaN(ph)) return '#64748b';
    if (ph < 5.5) return '#ef4444';
    if (ph < 6.5) return '#f97316';
    if (ph < 7.5) return '#22c55e';
    return '#3b82f6';
  };

  const NutrientBar = ({ label, value }) => {
    const level = (value || '').toLowerCase();
    const pct = level.includes('high') ? 80 : level.includes('medium') ? 50 : 25;
    const color = level.includes('high') ? '#22c55e' : level.includes('medium') ? '#f59e0b' : '#ef4444';
    return (
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600 }}>{label}</span>
          <span style={{ color, fontSize: '0.85rem', fontWeight: 700 }}>{value || '—'}</span>
        </div>
        <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 6, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 6, transition: 'width 1s ease', boxShadow: `0 0 8px ${color}60` }} />
        </div>
      </div>
    );
  };

  return (
    <div style={{
      minHeight: 'calc(100vh - 68px)',
      background: bg,
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      padding: '36px 20px', gap: 30, transition: 'background 0.3s'
    }}>

      {/* Left: Upload Panel */}
      <div style={{ width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 20, flexShrink: 0 }}>

        {/* Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 52, height: 52, borderRadius: 16, background: 'linear-gradient(135deg,#b45309,#92400e)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, boxShadow: '0 8px 24px rgba(180,83,9,0.4)' }}>🪨</div>
          <div>
            <h2 style={{ color: isDarkMode ? '#fff' : '#1c1917', margin: 0, fontSize: '1.3rem', fontWeight: 700 }}>Soil Analysis</h2>
            <p style={{ color: textMuted, margin: 0, fontSize: '0.82rem' }}>AI-powered soil health assessment</p>
          </div>
        </div>

        {/* Drop Zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            borderRadius: 24,
            border: `2px dashed ${dragOver ? '#b45309' : selectedImage ? '#78716c' : 'rgba(180,83,9,0.4)'}`,
            background: dragOver ? 'rgba(180,83,9,0.1)' : selectedImage ? 'transparent' : 'rgba(180,83,9,0.05)',
            aspectRatio: '1', overflow: 'hidden', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.3s', position: 'relative',
            boxShadow: dragOver ? '0 0 30px rgba(180,83,9,0.3)' : 'none'
          }}
        >
          {selectedImage ? (
            <img src={selectedImage} alt="Soil" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ textAlign: 'center', padding: 24 }}>
              <div style={{ fontSize: 52, marginBottom: 16 }}>📷</div>
              <p style={{ color: '#a8a29e', fontWeight: 600, marginBottom: 8 }}>Drop soil image here</p>
              <p style={{ color: '#78716c', fontSize: '0.82rem' }}>or click to browse · JPG, PNG, WebP</p>
            </div>
          )}
          {selectedImage && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.opacity = '1'}
              onMouseLeave={e => e.currentTarget.style.opacity = '0'}>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: '0.9rem' }}>🔄 Change Image</span>
            </div>
          )}
        </div>

        <input type="file" accept="image/*" ref={fileInputRef} style={{ display: 'none' }} onChange={e => handleFileChange(e.target.files[0])} />

        <button
          onClick={handleAnalyze}
          disabled={analyzing || !selectedImage}
          style={{
            padding: '16px 24px', borderRadius: 18, border: 'none',
            background: !selectedImage ? 'rgba(180,83,9,0.2)' : analyzing ? 'rgba(180,83,9,0.4)' : 'linear-gradient(135deg,#92400e,#b45309)',
            color: !selectedImage ? '#78716c' : '#fff', fontSize: '1rem', fontWeight: 700,
            cursor: !selectedImage || analyzing ? 'not-allowed' : 'pointer',
            transition: 'all 0.3s', boxShadow: selectedImage && !analyzing ? '0 8px 24px rgba(180,83,9,0.4)' : 'none'
          }}
        >
          {analyzing ? (
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <span style={{ display: 'inline-block', width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              Analyzing...
            </span>
          ) : '🔬 Analyze Soil'}
        </button>

        {error && (
          <div style={{ padding: '14px 18px', borderRadius: 14, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', fontSize: '0.88rem' }}>
            ⚠️ {error}
          </div>
        )}

        {/* Tips */}
        <div style={{ padding: '16px 20px', borderRadius: 18, background: cardBg, border: cardBorder }}>
          <p style={{ color: textMuted, fontSize: '0.8rem', margin: 0, fontWeight: 600, marginBottom: 10 }}>📱 TIPS FOR BEST RESULTS</p>
          {['Take photo in natural daylight', 'Spread soil flat on a surface', 'Include at least a cup of soil', 'Avoid shadows over the sample'].map((tip, i) => (
            <p key={i} style={{ color: textMuted, fontSize: '0.78rem', margin: '5px 0', display: 'flex', gap: 8 }}>
              <span style={{ color: '#b45309' }}>→</span>{tip}
            </p>
          ))}
        </div>
      </div>

      {/* Right: Results Panel */}
      <div style={{ flex: 1, maxWidth: 520 }}>
        {!results && !analyzing ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 500, textAlign: 'center', gap: 16 }}>
            <div style={{ fontSize: 80, opacity: 0.25 }}>🧪</div>
            <h3 style={{ color: emptyColor, fontWeight: 600, margin: 0 }}>Ready for Analysis</h3>
            <p style={{ color: isDarkMode ? '#57534e' : '#9ca3af', fontSize: '0.88rem', maxWidth: 300 }}>Upload a soil photo and click Analyze to get AI-powered insights about pH, nutrients, and crop recommendations.</p>
          </div>
        ) : analyzing ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 500, gap: 24 }}>
            <div style={{ width: 80, height: 80, border: '4px solid rgba(180,83,9,0.2)', borderTopColor: '#b45309', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: isDarkMode ? '#d6d3d1' : '#1c1917', fontWeight: 700, margin: 0 }}>Analyzing soil composition…</p>
              <p style={{ color: textMuted, fontSize: '0.85rem', margin: '8px 0 0' }}>Gemini AI is examining texture, color & nutrients</p>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Top Stats Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              {[
                { label: 'Soil Type', value: results.soilType, icon: '🌍' },
                { label: 'pH Level', value: results.ph?.value ? `${results.ph.value} (${results.ph.category})` : results.ph, icon: '⚗️', color: getPhColor(results.ph?.value) },
                { label: 'Moisture', value: results.moisture, icon: '💧' }
              ].map((stat, i) => (
                <div key={i} style={{ padding: '16px', borderRadius: 18, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>{stat.icon}</div>
                  <p style={{ color: textMuted, fontSize: '0.7rem', fontWeight: 700, letterSpacing: 1, margin: '0 0 4px', textTransform: 'uppercase' }}>{stat.label}</p>
                  <p style={{ color: stat.color || textMain, fontSize: '0.82rem', fontWeight: 600, margin: 0 }}>{stat.value || '—'}</p>
                </div>
              ))}
            </div>

            {/* Nutrients */}
            {results.nutrients && (
              <div style={{ padding: '20px 24px', borderRadius: 20, background: cardBg, border: cardBorder }}>
                <h4 style={{ color: isDarkMode ? '#d6d3d1' : '#1c1917', margin: '0 0 20px', fontWeight: 700 }}>🧬 Nutrient Profile</h4>
                <NutrientBar label="Nitrogen (N)" value={results.nutrients.nitrogen} />
                <NutrientBar label="Phosphorus (P)" value={results.nutrients.phosphorus} />
                <NutrientBar label="Potassium (K)" value={results.nutrients.potassium} />
              </div>
            )}

            {/* Recommendations */}
            {results.recommendations?.length > 0 && (
              <div style={{ padding: '20px 24px', borderRadius: 20, background: 'rgba(34,197,94,0.04)', border: '1px solid rgba(34,197,94,0.15)' }}>
                <h4 style={{ color: '#86efac', margin: '0 0 14px', fontWeight: 700 }}>✅ Recommendations</h4>
                {results.recommendations.map((rec, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'flex-start' }}>
                    <span style={{ color: '#22c55e', fontWeight: 700, fontSize: '0.9rem', flexShrink: 0 }}>{i + 1}.</span>
                    <p style={{ color: isDarkMode ? '#a7f3d0' : '#15803d', fontSize: '0.87rem', margin: 0, lineHeight: 1.6 }}>{rec}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Suitable Crops */}
            {results.suitableCrops?.length > 0 && (
              <div style={{ padding: '20px 24px', borderRadius: 20, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <h4 style={{ color: '#d6d3d1', margin: '0 0 14px', fontWeight: 700 }}>🌾 Suitable Crops</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {results.suitableCrops.map((crop, i) => (
                    <span key={i} style={{ padding: '6px 14px', borderRadius: 20, background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)', color: '#86efac', fontSize: '0.83rem', fontWeight: 600 }}>{crop}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Improvements */}
            {results.improvements?.length > 0 && (
              <div style={{ padding: '20px 24px', borderRadius: 20, background: 'rgba(245,158,11,0.04)', border: '1px solid rgba(245,158,11,0.15)' }}>
                <h4 style={{ color: '#fcd34d', margin: '0 0 14px', fontWeight: 700 }}>🔧 Improvements Needed</h4>
                {results.improvements.map((imp, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'flex-start' }}>
                    <span style={{ color: '#f59e0b', fontSize: '1rem', flexShrink: 0 }}>→</span>
                    <p style={{ color: '#fde68a', fontSize: '0.87rem', margin: 0, lineHeight: 1.6 }}>{imp}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Additional Info */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {results.texture && (
                <div style={{ padding: '16px', borderRadius: 16, background: cardBg, border: cardBorder }}>
                  <p style={{ color: textMuted, fontSize: '0.7rem', fontWeight: 700, letterSpacing: 1, margin: '0 0 6px', textTransform: 'uppercase' }}>Texture</p>
                  <p style={{ color: textMain, fontSize: '0.85rem', margin: 0 }}>{results.texture}</p>
                </div>
              )}
              {results.organicMatter && (
                <div style={{ padding: '16px', borderRadius: 16, background: cardBg, border: cardBorder }}>
                  <p style={{ color: textMuted, fontSize: '0.7rem', fontWeight: 700, letterSpacing: 1, margin: '0 0 6px', textTransform: 'uppercase' }}>Organic Matter</p>
                  <p style={{ color: textMain, fontSize: '0.85rem', margin: 0 }}>{results.organicMatter}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default SoilAnalysis3D;
