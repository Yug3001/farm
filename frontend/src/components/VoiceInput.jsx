import React, { useState, useEffect, useRef } from 'react';
import './VoiceInput.css';

const VoiceInput = ({ onTranscript, language = 'en' }) => {
    const [isListening, setIsListening] = useState(false);
    const [isSupported, setIsSupported] = useState(false);
    const recognitionRef = useRef(null);

    // Language code mapping for Web Speech API
    const languageMap = {
        'en': 'en-US',
        'hi': 'hi-IN',
        'gu': 'gu-IN',
        'mr': 'mr-IN'
    };

    useEffect(() => {
        // Check if browser supports Web Speech API
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (SpeechRecognition) {
            setIsSupported(true);
            const recognitionInstance = new SpeechRecognition();

            recognitionInstance.continuous = false;
            recognitionInstance.interimResults = false;
            recognitionInstance.maxAlternatives = 1;
            recognitionInstance.lang = languageMap[language] || 'en-US';

            recognitionInstance.onstart = () => {
                console.log('Voice recognition started');
                setIsListening(true);
            };

            recognitionInstance.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                console.log('Transcript:', transcript);
                if (onTranscript) {
                    onTranscript(transcript);
                }
            };

            recognitionInstance.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                setIsListening(false);

                if (event.error === 'no-speech') {
                    alert('No speech detected. Please try again.');
                } else if (event.error === 'not-allowed') {
                    alert('Microphone access denied. Please allow microphone access in your browser settings.');
                } else if (event.error === 'aborted') {
                    // User stopped manually, no alert needed
                } else if (event.error === 'network') {
                    alert('Network error: Unable to connect to speech recognition service. Please check your internet connection and try again.');
                } else if (event.error === 'audio-capture') {
                    alert('No microphone detected. Please connect a microphone and try again.');
                } else if (event.error === 'service-not-allowed') {
                    alert('Speech recognition service is not allowed. Please check your browser permissions.');
                } else {
                    // Don't show alert for other errors, just log them
                    console.warn(`Voice recognition error: ${event.error}`);
                }
            };

            recognitionInstance.onend = () => {
                console.log('Voice recognition ended');
                setIsListening(false);
            };

            recognitionRef.current = recognitionInstance;
        } else {
            setIsSupported(false);
            console.warn('Web Speech API not supported in this browser');
        }

        return () => {
            if (recognitionRef.current) {
                try {
                    recognitionRef.current.stop();
                } catch (e) {
                    // Ignore errors on cleanup
                }
            }
        };
    }, []);

    // Update language when it changes
    useEffect(() => {
        if (recognitionRef.current) {
            recognitionRef.current.lang = languageMap[language] || 'en-US';
            console.log('Language updated to:', languageMap[language]);
        }
    }, [language]);

    const toggleListening = () => {
        if (!recognitionRef.current) return;

        if (isListening) {
            // Stop listening
            try {
                recognitionRef.current.stop();
                setIsListening(false);
            } catch (error) {
                console.error('Error stopping recognition:', error);
                setIsListening(false);
            }
        } else {
            // Start listening with error handling
            try {
                // Add a small delay to ensure previous session is fully closed
                setTimeout(() => {
                    try {
                        recognitionRef.current.start();
                    } catch (error) {
                        console.error('Error starting recognition:', error);
                        if (error.message && error.message.includes('already started')) {
                            // If already started, stop and restart
                            recognitionRef.current.stop();
                            setTimeout(() => {
                                try {
                                    recognitionRef.current.start();
                                } catch (e) {
                                    console.error('Error restarting:', e);
                                    setIsListening(false);
                                    alert('Unable to start voice recognition. Please try again.');
                                }
                            }, 200);
                        } else {
                            setIsListening(false);
                            alert('Unable to start voice recognition. Please check your microphone and try again.');
                        }
                    }
                }, 100);
            } catch (error) {
                console.error('Error in toggle:', error);
                setIsListening(false);
            }
        }
    };

    if (!isSupported) {
        return null; // Don't show button if not supported
    }

    return (
        <button
            className={`voice-input-button ${isListening ? 'listening' : ''}`}
            onClick={toggleListening}
            title={isListening ? 'Stop listening' : 'Click to speak'}
            type="button"
        >
            {isListening ? (
                <>
                    <span className="voice-icon pulsing">🎤</span>
                    <span className="voice-text">Listening...</span>
                </>
            ) : (
                <>
                    <span className="voice-icon">🎤</span>
                </>
            )}
        </button>
    );
};

export default VoiceInput;
