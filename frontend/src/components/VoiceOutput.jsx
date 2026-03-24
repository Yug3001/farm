import { useEffect, useRef } from 'react';

const VoiceOutput = ({ text, language = 'en', autoPlay = false }) => {
    const synthRef = useRef(null);
    const utteranceRef = useRef(null);

    // Language code mapping for Web Speech Synthesis API
    const languageMap = {
        'en': 'en-US',
        'hi': 'hi-IN',
        'gu': 'gu-IN',
        'mr': 'mr-IN'
    };

    useEffect(() => {
        // Check if browser supports Web Speech Synthesis API
        if ('speechSynthesis' in window) {
            synthRef.current = window.speechSynthesis;
        } else {
            console.warn('Text-to-Speech not supported in this browser');
        }

        return () => {
            // Cleanup: stop any ongoing speech
            if (synthRef.current) {
                synthRef.current.cancel();
            }
        };
    }, []);

    useEffect(() => {
        if (autoPlay && text && synthRef.current) {
            speak(text);
        }
    }, [text, autoPlay, language]);

    const speak = (textToSpeak) => {
        if (!synthRef.current || !textToSpeak) return;

        // Cancel any ongoing speech
        synthRef.current.cancel();

        // Create utterance
        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.lang = languageMap[language] || 'en-US';
        utterance.rate = 0.9; // Slightly slower for better clarity
        utterance.pitch = 1;
        utterance.volume = 1;

        utterance.onstart = () => {
            console.log('Speech started');
        };

        utterance.onend = () => {
            console.log('Speech ended');
        };

        utterance.onerror = (event) => {
            console.error('Speech error:', event.error);
        };

        utteranceRef.current = utterance;

        // Wait for voices to load (important for some browsers)
        const voices = synthRef.current.getVoices();
        if (voices.length === 0) {
            synthRef.current.addEventListener('voiceschanged', () => {
                const availableVoices = synthRef.current.getVoices();
                const preferredVoice = availableVoices.find(voice =>
                    voice.lang === languageMap[language]
                );
                if (preferredVoice) {
                    utterance.voice = preferredVoice;
                }
                synthRef.current.speak(utterance);
            }, { once: true });
        } else {
            const preferredVoice = voices.find(voice =>
                voice.lang === languageMap[language]
            );
            if (preferredVoice) {
                utterance.voice = preferredVoice;
            }
            synthRef.current.speak(utterance);
        }
    };

    const stop = () => {
        if (synthRef.current) {
            synthRef.current.cancel();
        }
    };

    // Return control functions
    return { speak, stop };
};

export default VoiceOutput;
