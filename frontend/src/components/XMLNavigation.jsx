import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { loadNavigationConfig } from '../utils/xmlParser';

/**
 * XMLNavigation Component
 * This component loads navigation data from navigation.xml and renders navigation links
 */
const XMLNavigation = () => {
    const [navigationData, setNavigationData] = useState(null);
    const [loading, setLoading] = useState(true);

    console.log('🔧 [XMLNavigation] Component rendered, current state:', {
        hasData: !!navigationData,
        loading,
        itemCount: navigationData?.menuItems?.length || 0
    });

    useEffect(() => {
        console.log('⚡ [XMLNavigation] useEffect triggered - starting navigation load');

        // Load navigation configuration from XML
        const loadNav = async () => {
            try {
                console.log('📞 [XMLNavigation] Calling loadNavigationConfig()...');
                const data = await loadNavigationConfig();
                console.log('📦 [XMLNavigation] Data received from loadNavigationConfig:', data);
                setNavigationData(data);
                console.log('✅ [XMLNavigation] Navigation data set in state');
            } catch (error) {
                console.error('❌ [XMLNavigation] Failed to load navigation:', error);
            } finally {
                setLoading(false);
                console.log('🏁 [XMLNavigation] Loading complete, loading state set to false');
            }
        };

        loadNav();
    }, []);

    if (loading) {
        return (
            <nav className="menu">
                <span>Loading...</span>
            </nav>
        );
    }

    if (!navigationData || !navigationData.menuItems) {
        console.warn('⚠️ [XMLNavigation] No navigation data available, showing error message');
        return (
            <nav className="menu">
                <span>Navigation unavailable</span>
            </nav>
        );
    }

    console.log('🎨 [XMLNavigation] Rendering navigation with', navigationData.menuItems.length, 'items');

    return (
        <nav className="menu">
            {navigationData.menuItems.map((item) => {
                console.log('  🔗 [XMLNavigation] Rendering item:', item.label, '→', item.route);
                return (
                    <NavLink
                        key={item.id}
                        to={item.route}
                        className={({ isActive }) => isActive ? 'active' : ''}
                        title={item.description}
                    >
                        {item.label}
                    </NavLink>
                );
            })}
        </nav>
    );
};

export default XMLNavigation;
