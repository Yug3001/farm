import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { useLanguage } from '../contexts/LanguageContext';
import LanguageSelector from './LanguageSelector';
import './CropVisualization3D.css';

const CropVisualization3D = () => {
  const { selectedLanguage } = useLanguage();
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState(null);
  const fileInputRef = useRef(null);
  const [selectedImage, setSelectedImage] = useState(null);

  // Clear results when language changes so user can get new analysis in selected language
  useEffect(() => {
    if (results) {
      setResults(null);
    }
  }, [selectedLanguage]);

  const handleCameraClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedImage(URL.createObjectURL(file));
      setResults(null);
    }
  };

  const handleScan = async () => {
    if (!selectedImage || !fileInputRef.current?.files[0]) {
      alert("Please capture or upload a crop image first.");
      return;
    }

    setScanning(true);
    setResults(null);

    const file = fileInputRef.current.files[0];
    const reader = new FileReader();

    reader.onloadend = async () => {
      try {
        // Get token from localStorage
        const token = localStorage.getItem('token');

        if (!token) {
          alert('Please login to use crop analysis');
          window.location.href = '/signin';
          return;
        }

        const response = await axios.post('http://localhost:5000/api/crop/analyze', {
          imageData: reader.result, // Send Base64 string
          location: '', // Optional: can add location input
          notes: '', // Optional: can add notes input
          language: selectedLanguage
        }, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.data.success) {
          setResults(response.data.analysis.analysis); // Note: nested analysis object from backend
        } else if (response.data.error) {
          alert(response.data.error);
        }
      } catch (error) {
        console.error("Crop scan failed", error);
        if (error.response?.status === 401) {
          alert('Session expired. Please login again.');
          window.location.href = '/signin';
        } else {
          alert("Analysis failed. Please try again.");
        }
      } finally {
        setScanning(false);
      }
    };

    reader.readAsDataURL(file);
  };

  return (
    <>
      <main className="main">
        <section className="left-section">
          <div className="capture-card">
            <div className="icon-box" onClick={handleCameraClick}>
              {selectedImage ? <img src={selectedImage} alt="Crop" style={{ width: '100%', height: '100%', borderRadius: '22px', objectFit: 'cover' }} /> : '🌿'}
            </div>
            <h2>Capture Crop</h2>
            <p>Place your crop sample to get the best results.</p>
            <input
              type="file"
              id="fileInput"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleFileChange}
            />
          </div>

          <div style={{ marginTop: '30px', display: 'flex', gap: '15px', alignItems: 'center', width: '100%', maxWidth: '380px', margin: '30px auto 0' }}>
            <button className="scan-btn" onClick={handleScan} disabled={scanning} style={{ flex: 1, margin: 0 }}>
              {scanning ? "Analyzing..." : "🔍 Analyze Crop"}
            </button>
            <LanguageSelector />
          </div>
        </section>

        <section className="right-section">
          {!results ? (
            <>
              <div className="analysis-icon">🧪</div>
              <h2>Ready for Crop Analysis</h2>
            </>
          ) : (
            <div className="advisor-card" style={{ width: '100%', boxShadow: 'none', border: '1px solid #eee' }}>
              <div className="advisor-header" style={{ padding: '20px', background: results.disease === 'Healthy' ? '#4CAF50' : '#f44336' }}>
                <div>
                  <h2>Crop Report</h2>
                  <span className="status">● COMPLETE</span>
                </div>
              </div>
              <div className="advisor-body" style={{ minHeight: 'auto', padding: '20px', alignItems: 'flex-start', textAlign: 'left' }}>
                <div style={{ width: '100%' }}>
                  <h3>Diagnosis: {results.disease}</h3>
                  <p>Confidence: {results.confidence}</p>
                  <p>Severity: {results.severity}</p>

                  {results.bestTime && (
                    <div style={{ margin: '15px 0', padding: '10px', background: '#f0fdf4', borderRadius: '8px', fontSize: '0.9rem' }}>
                      <p style={{ marginBottom: '5px' }}><strong>📅 Best Time to Grow:</strong> {results.bestTime}</p>
                      <p style={{ color: '#d32f2f' }}><strong>❌ Avoid Planting:</strong> {results.worstTime}</p>
                    </div>
                  )}

                  <hr style={{ margin: '15px 0', border: 'none', borderTop: '1px solid #eee' }} />
                  <p><strong>Treatment Plan:</strong> {results.treatment}</p>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>


    </>
  );
};

export default CropVisualization3D;

