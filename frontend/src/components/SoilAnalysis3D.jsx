import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { useLanguage } from '../contexts/LanguageContext';
import LanguageSelector from './LanguageSelector';
import './SoilAnalysis3D.css'; // Keeping the file name, but content is new styles

const SoilAnalysis3D = () => {
  const { selectedLanguage } = useLanguage();
  const [analyzing, setAnalyzing] = useState(false);
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

  const handleAnalyze = async () => {
    if (!selectedImage || !fileInputRef.current?.files[0]) {
      alert("Please capture or upload a soil image first.");
      return;
    }

    setAnalyzing(true);
    setResults(null);

    const file = fileInputRef.current.files[0];
    const reader = new FileReader();

    reader.onloadend = async () => {
      try {
        // Get token from localStorage
        const token = localStorage.getItem('token');

        if (!token) {
          alert('Please login to use soil analysis');
          window.location.href = '/signin';
          return;
        }

        const response = await axios.post('http://localhost:5000/api/soil/analyze', {
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
        console.error("Analysis failed", error);
        if (error.response?.status === 401) {
          alert('Session expired. Please login again.');
          window.location.href = '/signin';
        } else {
          alert("Analysis failed. Please try again.");
        }
      } finally {
        setAnalyzing(false);
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
              {selectedImage ? <img src={selectedImage} alt="Soil" style={{ width: '100%', height: '100%', borderRadius: '22px', objectFit: 'cover' }} /> : '📷'}
            </div>
            <h2>Capture Soil</h2>
            <p>Place your soil sample for best results.</p>
            <input
              type="file"
              id="fileInput"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleFileChange}
            />
          </div>

          <div style={{ marginTop: '30px', display: 'flex', gap: '15px', alignItems: 'center', width: '100%', maxWidth: '380px', margin: '30px auto 0' }}>
            <button className="scan-btn" onClick={handleAnalyze} disabled={analyzing} style={{ flex: 1, margin: 0 }}>
              {analyzing ? "Analyzing..." : "🔍 Initiate Scan"}
            </button>
            <LanguageSelector />
          </div>
        </section>

        <section className="right-section">
          {!results ? (
            <>
              <div className="analysis-icon">🧪</div>
              <h2>Ready for Soil Analysis</h2>
            </>
          ) : (
            <div className="advisor-card" style={{ width: '100%', boxShadow: 'none', border: '1px solid #eee' }}>
              <div className="advisor-header" style={{ padding: '20px' }}>
                <div>
                  <h2>Soil Report</h2>
                  <span className="status">● COMPLETE</span>
                </div>
              </div>
              <div className="advisor-body" style={{ minHeight: 'auto', padding: '20px', alignItems: 'flex-start', textAlign: 'left' }}>
                <div style={{ width: '100%' }}>
                  {results.soilType && (
                    <h3 style={{ color: '#1f5135', marginBottom: '10px' }}>
                      {results.soilType}
                    </h3>
                  )}

                  {results.ph && (
                    <p><strong>pH Level:</strong> {results.ph.value || results.ph} {results.ph.category && `(${results.ph.category})`}</p>
                  )}

                  {results.texture && <p><strong>Texture:</strong> {results.texture}</p>}
                  {results.color && <p><strong>Color:</strong> {results.color}</p>}
                  {results.moisture && <p><strong>Moisture:</strong> {results.moisture}</p>}
                  {results.organicMatter && <p><strong>Organic Matter:</strong> {results.organicMatter}</p>}

                  {results.nutrients && (
                    <>
                      <hr style={{ margin: '15px 0', border: 'none', borderTop: '1px solid #eee' }} />
                      <h4 style={{ marginBottom: '10px' }}>Nutrients:</h4>
                      <p><strong>Nitrogen:</strong> {results.nutrients.nitrogen}</p>
                      <p><strong>Phosphorus:</strong> {results.nutrients.phosphorus}</p>
                      <p><strong>Potassium:</strong> {results.nutrients.potassium}</p>
                    </>
                  )}

                  {results.recommendations && results.recommendations.length > 0 && (
                    <>
                      <hr style={{ margin: '15px 0', border: 'none', borderTop: '1px solid #eee' }} />
                      <h4 style={{ marginBottom: '10px' }}>Recommendations:</h4>
                      <ul style={{ marginLeft: '20px', lineHeight: '1.8' }}>
                        {results.recommendations.map((rec, index) => (
                          <li key={index}>{rec}</li>
                        ))}
                      </ul>
                    </>
                  )}

                  {results.suitableCrops && results.suitableCrops.length > 0 && (
                    <>
                      <hr style={{ margin: '15px 0', border: 'none', borderTop: '1px solid #eee' }} />
                      <h4 style={{ marginBottom: '10px' }}>Suitable Crops:</h4>
                      <p>{results.suitableCrops.join(', ')}</p>
                    </>
                  )}

                  {results.improvements && results.improvements.length > 0 && (
                    <>
                      <hr style={{ margin: '15px 0', border: 'none', borderTop: '1px solid #eee' }} />
                      <h4 style={{ marginBottom: '10px' }}>Improvements:</h4>
                      <ul style={{ marginLeft: '20px', lineHeight: '1.8' }}>
                        {results.improvements.map((imp, index) => (
                          <li key={index}>{imp}</li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </section>
      </main>


    </>
  );
};

export default SoilAnalysis3D;

