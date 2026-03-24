import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import './LanguageSelector.css';

const LanguageSelector = () => {
    const { selectedLanguage, changeLanguage, languages } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);

    const languageArray = Object.values(languages);

    const handleLanguageSelect = (languageCode) => {
        changeLanguage(languageCode);
        setIsOpen(false);
    };

    const currentLanguage = languages[selectedLanguage];

    return (
        <div className="language-selector">
            <button
                className="language-button"
                onClick={() => setIsOpen(!isOpen)}
                aria-label="Select Language"
            >
                <span className="language-flag">{currentLanguage.flag}</span>
                <span className="language-name">{currentLanguage.nativeName}</span>
                <span className="language-arrow">{isOpen ? '▲' : '▼'}</span>
            </button>

            {isOpen && (
                <div className="language-dropdown">
                    {languageArray.map((language) => (
                        <button
                            key={language.code}
                            className={`language-option ${selectedLanguage === language.code ? 'active' : ''}`}
                            onClick={() => handleLanguageSelect(language.code)}
                        >
                            <span className="language-flag">{language.flag}</span>
                            <div className="language-info">
                                <span className="language-native">{language.nativeName}</span>
                                <span className="language-english">{language.name}</span>
                            </div>
                            {selectedLanguage === language.code && (
                                <span className="language-check">✓</span>
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default LanguageSelector;
