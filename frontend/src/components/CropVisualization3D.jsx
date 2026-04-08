import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { useLanguage } from '../contexts/LanguageContext';
import LanguageSelector from './LanguageSelector';

const CropVisualization3D = ({ isDarkMode = false }) => {
  const { selectedLanguage } = useLanguage();
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  // Theme palette
  const bg        = isDarkMode ? 'linear-gradient(135deg,#0a1628 0%,#091a0f 50%,#0a1628 100%)' : '#f0fdf4';
  const cardBg    = isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.95)';
  const cardBorder= isDarkMode ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(34,197,94,0.2)';
  const textMain  = isDarkMode ? '#d1fae5' : '#14532d';
  const textMuted = isDarkMode ? '#4b6957' : '#6b7280';
  const titleColor= isDarkMode ? '#fff' : '#14532d';
  const tipColor  = isDarkMode ? '#4b5563' : '#6b7280';

  useEffect(() => {
    if (results) setResults(null);
    setError(null);
  }, [selectedLanguage]);

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

  const handleScan = async () => {
    if (!selectedImage || !fileInputRef.current?.files[0]) {
      setError('Please select a crop or plant image first.');
      return;
    }
    setScanning(true);
    setResults(null);
    setError(null);

    const file = fileInputRef.current.files[0];
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) { window.location.href = '/signin'; return; }

        const response = await axios.post('http://localhost:5000/api/crop/analyze', {
          imageData: reader.result, location: '', notes: '', language: selectedLanguage
        }, { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } });

        if (response.data.success) setResults(response.data.analysis.analysis);
        else setError(response.data.error || 'Analysis failed. Please try again.');
      } catch (err) {
        if (err.response?.status === 401) window.location.href = '/signin';
        else setError('Analysis failed. Please check your connection and try again.');
      } finally {
        setScanning(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const getHealthColor = (score) => {
    if (!score && score !== 0) return '#64748b';
    if (score >= 80) return '#22c55e';
    if (score >= 60) return '#f59e0b';
    if (score >= 40) return '#f97316';
    return '#ef4444';
  };

  const getSeverityColor = (severity) => {
    const s = (severity || '').toLowerCase();
    if (s.includes('low')) return '#22c55e';
    if (s.includes('medium')) return '#f59e0b';
    if (s.includes('high')) return '#ef4444';
    return '#64748b';
  };

  const DiseaseCard = ({ item, type }) => (
    <div style={{ padding: '14px 16px', borderRadius: 16, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <span style={{ color: '#fca5a5', fontWeight: 700, fontSize: '0.9rem' }}>{type === 'disease' ? '🦠' : '🐛'} {item.name}</span>
        <span style={{ padding: '3px 10px', borderRadius: 10, background: `${getSeverityColor(item.severity)}22`, color: getSeverityColor(item.severity), fontSize: '0.72rem', fontWeight: 700, letterSpacing: 0.5 }}>{item.severity}</span>
      </div>
      {item.symptoms && <p style={{ color: '#f87171', fontSize: '0.8rem', margin: '0 0 8px' }}>⚠️ {item.symptoms}</p>}
      <p style={{ color: '#d6d3d1', fontSize: '0.82rem', margin: 0, lineHeight: 1.6 }}>💊 {item.treatment}</p>
    </div>
  );

  return (
    <div style={{
      minHeight: 'calc(100vh - 68px)',
      background: bg,
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      padding: '36px 20px', gap: 30, flexWrap: 'wrap', transition: 'background 0.3s'
    }}>

      {/* Left Panel: Upload */}
      <div style={{ width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 20, flexShrink: 0 }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 52, height: 52, borderRadius: 16, background: 'linear-gradient(135deg,#16a34a,#15803d)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, boxShadow: '0 8px 24px rgba(22,163,74,0.4)' }}>🌿</div>
          <div>
            <h2 style={{ color: titleColor, margin: 0, fontSize: '1.3rem', fontWeight: 700 }}>Crop Disease Scanner</h2>
            <p style={{ color: textMuted, margin: 0, fontSize: '0.82rem' }}>AI-powered plant health diagnosis</p>
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
            border: `2px dashed ${dragOver ? '#22c55e' : selectedImage ? '#4b6957' : 'rgba(34,197,94,0.3)'}`,
            background: dragOver ? 'rgba(34,197,94,0.08)' : selectedImage ? 'transparent' : 'rgba(34,197,94,0.04)',
            aspectRatio: '1', overflow: 'hidden', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.3s', position: 'relative',
            boxShadow: dragOver ? '0 0 30px rgba(34,197,94,0.2)' : 'none'
          }}
        >
          {selectedImage ? (
            <img src={selectedImage} alt="Crop" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ textAlign: 'center', padding: 24 }}>
              <div style={{ fontSize: 52, marginBottom: 16 }}>🌿</div>
              <p style={{ color: '#6b7280', fontWeight: 600, marginBottom: 8 }}>Drop crop image here</p>
              <p style={{ color: '#4b5563', fontSize: '0.82rem' }}>or click to browse · JPG, PNG, WebP</p>
            </div>
          )}
          {selectedImage && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.opacity = '1'}
              onMouseLeave={e => e.currentTarget.style.opacity = '0'}>
              <span style={{ color: '#fff', fontWeight: 700 }}>🔄 Change Image</span>
            </div>
          )}
        </div>

        <input type="file" accept="image/*" ref={fileInputRef} style={{ display: 'none' }}
          onChange={e => { if (e.target.files[0]) handleFileChange(e.target.files[0]); }} />

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button
            onClick={handleScan}
            disabled={scanning || !selectedImage}
            style={{
              flex: 1, padding: '16px 24px', borderRadius: 18, border: 'none',
              background: !selectedImage ? 'rgba(34,197,94,0.1)' : scanning ? 'rgba(34,197,94,0.3)' : 'linear-gradient(135deg,#15803d,#22c55e)',
              color: !selectedImage ? '#4b6957' : '#fff', fontSize: '1rem', fontWeight: 700,
              cursor: !selectedImage || scanning ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s', boxShadow: selectedImage && !scanning ? '0 8px 24px rgba(34,197,94,0.35)' : 'none'
            }}
          >
            {scanning ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                <span style={{ display: 'inline-block', width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                Scanning…
              </span>
            ) : '🔍 Diagnose Crop'}
          </button>
          <LanguageSelector />
        </div>

        {error && (
          <div style={{ padding: '14px 18px', borderRadius: 14, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', fontSize: '0.88rem' }}>
            ⚠️ {error}
          </div>
        )}

        {/* Instructions */}
        <div style={{ padding: '16px 20px', borderRadius: 18, background: cardBg, border: cardBorder }}>
          <p style={{ color: textMuted, fontSize: '0.8rem', margin: 0, fontWeight: 600, marginBottom: 10 }}>📸 PHOTO TIPS</p>
          {['Focus on the affected leaves clearly', 'Take photo in bright natural light', 'Include both healthy and sick leaves', 'Capture the stem and roots if possible'].map((tip, i) => (
            <p key={i} style={{ color: tipColor, fontSize: '0.78rem', margin: '5px 0', display: 'flex', gap: 8 }}>
              <span style={{ color: '#22c55e' }}>→</span>{tip}
            </p>
          ))}
        </div>
      </div>

      {/* Right Panel: Results */}
      <div style={{ flex: 1, maxWidth: 520 }}>
        {!results && !scanning ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 500, textAlign: 'center', gap: 16 }}>
            <div style={{ fontSize: 80, opacity: 0.25 }}>🌿</div>
            <h3 style={{ color: isDarkMode ? '#4b6957' : '#9ca3af', fontWeight: 600, margin: 0 }}>Ready to Diagnose</h3>
            <p style={{ color: isDarkMode ? '#374151' : '#6b7280', fontSize: '0.88rem', maxWidth: 300 }}>Upload a photo of your crop and click Diagnose to detect diseases, pests, and get expert treatment recommendations.</p>
          </div>
        ) : scanning ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 500, gap: 24 }}>
            <div style={{ width: 80, height: 80, border: '4px solid rgba(34,197,94,0.15)', borderTopColor: '#22c55e', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: isDarkMode ? '#d1fae5' : '#14532d', fontWeight: 700, margin: 0 }}>Scanning crop for diseases…</p>
              <p style={{ color: textMuted, fontSize: '0.85rem', margin: '8px 0 0' }}>Gemini AI is analyzing leaf patterns and symptoms</p>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Crop Identity */}
            <div style={{ padding: '20px 24px', borderRadius: 20, background: cardBg, border: cardBorder, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h3 style={{ color: textMain, margin: '0 0 4px', fontSize: '1.3rem', fontWeight: 800 }}>{results.cropName || '—'}</h3>
                <p style={{ color: textMuted, margin: 0, fontSize: '0.82rem', fontStyle: 'italic' }}>{results.scientificName}</p>
                <p style={{ color: isDarkMode ? '#6b7280' : '#4b5563', margin: '6px 0 0', fontSize: '0.82rem' }}>📊 Stage: {results.growthStage}</p>
              </div>
              {/* Health Score */}
              {results.health && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ width: 80, height: 80, borderRadius: '50%', border: `5px solid ${getHealthColor(results.health.score)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', boxShadow: `0 0 20px ${getHealthColor(results.health.score)}40` }}>
                    <span style={{ color: getHealthColor(results.health.score), fontWeight: 900, fontSize: '1.2rem' }}>{results.health.score}</span>
                    <span style={{ color: '#6b7280', fontSize: '0.6rem' }}>/100</span>
                  </div>
                  <p style={{ color: getHealthColor(results.health.score), fontSize: '0.72rem', fontWeight: 700, margin: '6px 0 0', letterSpacing: 0.5 }}>{results.health.status}</p>
                </div>
              )}
            </div>

            {/* Diseases */}
            {results.diseases?.length > 0 && (
              <div >
                <h4 style={{ color: '#fca5a5', margin: '0 0 12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>🦠 Detected Diseases</h4>
                {results.diseases.map((d, i) => <DiseaseCard key={i} item={d} type="disease" />)}
              </div>
            )}

            {/* Pests */}
            {results.pests?.length > 0 && (
              <div>
                <h4 style={{ color: '#fdba74', margin: '0 0 12px', fontWeight: 700 }}>🐛 Pest Infestation</h4>
                {results.pests.map((p, i) => <DiseaseCard key={i} item={p} type="pest" />)}
              </div>
            )}

            {/* Recommendations */}
            {results.recommendations?.length > 0 && (
              <div style={{ padding: '20px 24px', borderRadius: 20, background: 'rgba(34,197,94,0.04)', border: '1px solid rgba(34,197,94,0.15)' }}>
                <h4 style={{ color: '#86efac', margin: '0 0 14px', fontWeight: 700 }}>✅ Priority Actions</h4>
                {results.recommendations.map((rec, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                    <span style={{ color: '#22c55e', fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span>
                    <p style={{ color: '#a7f3d0', fontSize: '0.87rem', margin: 0, lineHeight: 1.6 }}>{rec}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Care Instructions */}
            {results.careInstructions && (
              <div style={{ padding: '20px 24px', borderRadius: 20, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <h4 style={{ color: '#d6d3d1', margin: '0 0 16px', fontWeight: 700 }}>💧 Care Instructions</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {[
                    { icon: '💧', label: 'Watering', val: results.careInstructions.watering },
                    { icon: '🌿', label: 'Fertilization', val: results.careInstructions.fertilization },
                    { icon: '✂️', label: 'Pruning', val: results.careInstructions.pruning },
                    { icon: '🛡️', label: 'Pest Control', val: results.careInstructions.pestControl },
                  ].map((item, i) => item.val && (
                    <div key={i} style={{ padding: '12px', borderRadius: 14, background: 'rgba(255,255,255,0.04)' }}>
                      <p style={{ color: '#78716c', fontSize: '0.7rem', fontWeight: 700, letterSpacing: 1, margin: '0 0 6px', textTransform: 'uppercase' }}>{item.icon} {item.label}</p>
                      <p style={{ color: '#d6d3d1', fontSize: '0.8rem', margin: 0, lineHeight: 1.5 }}>{item.val}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Harvest Prediction */}
            {results.harvestPrediction && (
              <div style={{ padding: '16px 20px', borderRadius: 18, background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ textAlign: 'center' }}>
                  <span style={{ color: '#fcd34d', fontWeight: 900, fontSize: '2rem' }}>{results.harvestPrediction.estimatedDays}</span>
                  <p style={{ color: '#78716c', fontSize: '0.72rem', fontWeight: 700, margin: 0 }}>DAYS</p>
                </div>
                <div>
                  <p style={{ color: '#fde68a', fontWeight: 700, margin: '0 0 4px', fontSize: '0.9rem' }}>🌾 Harvest Prediction</p>
                  <p style={{ color: '#d97706', fontSize: '0.82rem', margin: 0 }}>{results.harvestPrediction.expectedYield}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default CropVisualization3D;
