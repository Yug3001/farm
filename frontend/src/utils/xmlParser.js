/**
 * XML Parser Utility for Navigation
 * This utility parses the navigation.xml file and converts it to JavaScript objects
 */

/**
 * Parses XML string and returns navigation data
 * @param {string} xmlString - The XML content as a string
 * @returns {Object} Parsed navigation data
 */
export const parseNavigationXML = (xmlString) => {
    console.log('🔍 [XML Parser] Starting to parse XML string...');
    console.log('📄 [XML Parser] XML String length:', xmlString.length);

    // Create a DOM parser
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, 'text/xml');

    // Check for parsing errors
    const parserError = xmlDoc.querySelector('parsererror');
    if (parserError) {
        console.error('❌ [XML Parser] XML Parsing Error:', parserError.textContent);
        return null;
    }

    console.log('✅ [XML Parser] XML parsed successfully, no errors detected');

    // Extract app name
    const appNameElement = xmlDoc.querySelector('app-name');
    const appName = appNameElement ? appNameElement.textContent : 'FarmWise';
    console.log('🏷️ [XML Parser] App Name extracted:', appName);

    // Extract menu items
    const items = [];
    const itemElements = xmlDoc.querySelectorAll('menu-items > item');
    console.log('📋 [XML Parser] Found', itemElements.length, 'menu items');

    itemElements.forEach((item, index) => {
        const id = item.querySelector('id')?.textContent || '';
        const label = item.querySelector('label')?.textContent || '';
        const route = item.querySelector('route')?.textContent || '';
        const icon = item.querySelector('icon')?.textContent || '';
        const description = item.querySelector('description')?.textContent || '';

        console.log(`  📌 [XML Parser] Item ${index + 1}:`, { id, label, route, icon, description });

        items.push({
            id,
            label,
            route,
            icon,
            description
        });
    });

    const result = {
        appName,
        menuItems: items
    };

    console.log('✅ [XML Parser] Parsing complete! Final result:', result);
    return result;
};

/**
 * Fetches and parses the navigation.xml file
 * @returns {Promise<Object>} Parsed navigation data
 */
export const loadNavigationConfig = async () => {
    console.log('🚀 [XML Loader] Starting to load navigation.xml...');
    console.log('📍 [XML Loader] Fetching from: /config/navigation.xml');

    try {
        // Fetch the XML file from the public folder or config folder
        const response = await fetch('/config/navigation.xml');

        console.log('📡 [XML Loader] Fetch response received');
        console.log('   Status:', response.status, response.statusText);
        console.log('   OK:', response.ok);

        if (!response.ok) {
            throw new Error(`Failed to load navigation.xml: ${response.statusText}`);
        }

        const xmlText = await response.text();
        console.log('📥 [XML Loader] XML file loaded successfully');
        console.log('   File size:', xmlText.length, 'characters');

        const navigationData = parseNavigationXML(xmlText);

        if (navigationData) {
            console.log('✅ [XML Loader] Navigation data loaded and parsed successfully!');
            console.log('   Menu items count:', navigationData.menuItems.length);
        } else {
            console.warn('⚠️ [XML Loader] Parsing returned null, using fallback');
        }

        return navigationData;
    } catch (error) {
        console.error('❌ [XML Loader] Error loading navigation config:', error);
        console.warn('🔄 [XML Loader] Using fallback navigation data');

        // Return fallback navigation data
        const fallbackData = {
            appName: 'FarmWise',
            menuItems: [
                { id: 'soil', label: 'SOIL', route: '/dashboard/soil', icon: '🌍', description: 'Soil Analysis' },
                { id: 'crop', label: 'CROP', route: '/dashboard/crop', icon: '🌿', description: 'Crop Analysis' },
                { id: 'planner', label: 'PLANNER', route: '/dashboard/planner', icon: '📅', description: 'Smart Planner' },
                { id: 'advisor', label: 'ADVISOR', route: '/dashboard/advisor', icon: '🤖', description: 'Advisor Bot' },
                { id: 'reminders', label: 'REMINDERS', route: '/dashboard/reminders', icon: '🔔', description: 'Smart Reminders' }
            ]
        };

        console.log('📋 [XML Loader] Fallback data:', fallbackData);
        return fallbackData;
    }
};
