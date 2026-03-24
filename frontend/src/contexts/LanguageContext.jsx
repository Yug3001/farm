import React, { createContext, useContext, useState, useEffect } from 'react';

// Create the Language Context
const LanguageContext = createContext();

// Language configuration
export const LANGUAGES = {
    en: { code: 'en', name: 'English', flag: '🇬🇧', nativeName: 'English', speechLang: 'en-US' },
    hi: { code: 'hi', name: 'Hindi', flag: '🇮🇳', nativeName: 'हिंदी', speechLang: 'hi-IN' },
    gu: { code: 'gu', name: 'Gujarati', flag: '🇮🇳', nativeName: 'ગુજરાતી', speechLang: 'gu-IN' },
    mr: { code: 'mr', name: 'Marathi', flag: '🇮🇳', nativeName: 'मराठी', speechLang: 'mr-IN' }
};

// Language Provider Component
export const LanguageProvider = ({ children }) => {
    const [selectedLanguage, setSelectedLanguage] = useState('en');
    const [isInitialized, setIsInitialized] = useState(false);

    // Load saved language preference on mount
    useEffect(() => {
        const savedLanguage = localStorage.getItem('preferredLanguage');
        if (savedLanguage && LANGUAGES[savedLanguage]) {
            setSelectedLanguage(savedLanguage);
        }
        setIsInitialized(true);
    }, []);

    // Save language preference whenever it changes
    const changeLanguage = (languageCode) => {
        if (LANGUAGES[languageCode]) {
            setSelectedLanguage(languageCode);
            localStorage.setItem('preferredLanguage', languageCode);

            // Dispatch custom event for components that need to react to language changes
            window.dispatchEvent(new CustomEvent('languageChanged', {
                detail: { language: languageCode }
            }));
        }
    };

    const getCurrentLanguage = () => {
        return LANGUAGES[selectedLanguage];
    };

    const value = {
        selectedLanguage,
        changeLanguage,
        getCurrentLanguage,
        languages: LANGUAGES,
        isInitialized
    };

    return (
        <LanguageContext.Provider value={value}>
            {children}
        </LanguageContext.Provider>
    );
};

// Custom hook to use the Language Context
export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};

export default LanguageContext;
