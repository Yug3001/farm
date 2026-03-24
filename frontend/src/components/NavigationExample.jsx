import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './NavigationExample.css';

// OPTION 1: Import from JavaScript config (recommended for production)
import { navigationConfig, getNavigationItems } from '../config/navigation.js';

// OPTION 2: Import XML parser to load from XML file dynamically
import { loadNavigationConfig } from '../utils/xmlParser.js';

/**
 * Navigation Component Example
 * This component demonstrates two ways to use the navigation configuration:
 * 1. Using the JavaScript config file (faster, no async loading)
 * 2. Using the XML parser to load from XML file (more flexible)
 */
const NavigationExample = ({ useXML = false }) => {
    const navigate = useNavigate();
    const [navData, setNavData] = useState(null);
    const [loading, setLoading] = useState(useXML);

    useEffect(() => {
        if (useXML) {
            // Load navigation from XML file
            loadNavigationConfig().then((data) => {
                setNavData(data);
                setLoading(false);
            });
        } else {
            // Use JavaScript config directly
            setNavData(navigationConfig);
        }
    }, [useXML]);

    if (loading) {
        return <div className="navigation-loading">Loading navigation...</div>;
    }

    if (!navData) {
        return <div className="navigation-error">Failed to load navigation</div>;
    }

    const handleNavigation = (route) => {
        navigate(route);
    };

    return (
        <nav className="navigation-container">
            <h2 className="app-name">{navData.appName}</h2>
            <ul className="navigation-menu">
                {navData.menuItems.map((item) => (
                    <li key={item.id} className="navigation-item">
                        <button
                            onClick={() => handleNavigation(item.route)}
                            className="navigation-button"
                            aria-label={item.description}
                        >
                            <span className="navigation-icon">{item.icon}</span>
                            <span className="navigation-label">{item.label}</span>
                        </button>
                    </li>
                ))}
            </ul>
        </nav>
    );
};

export default NavigationExample;

/**
 * USAGE EXAMPLES:
 * 
 * 1. Using JavaScript config (recommended):
 * <NavigationExample />
 * 
 * 2. Using XML file:
 * <NavigationExample useXML={true} />
 * 
 * 3. Direct import in any component:
 * import { getNavigationItems } from '../config/navigation.js';
 * const items = getNavigationItems();
 */
