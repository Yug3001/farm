import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { loadNavigationConfig } from '../utils/xmlParser';

const XMLNavigation = ({ isDarkMode = true }) => {
    const [navigationData, setNavigationData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadNav = async () => {
            try {
                const data = await loadNavigationConfig();
                setNavigationData(data);
            } catch (error) {
                console.error('Failed to load navigation:', error);
            } finally {
                setLoading(false);
            }
        };
        loadNav();
    }, []);

    const inactiveColor = isDarkMode ? '#94a3b8' : '#4b5563';
    const activeBg     = isDarkMode ? 'rgba(34,197,94,0.15)' : 'rgba(34,197,94,0.12)';
    const activeColor  = isDarkMode ? '#22c55e' : '#15803d';
    const activeBorder = isDarkMode ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(34,197,94,0.35)';

    if (loading) return <nav style={{ display: 'flex', gap: 8 }}><span style={{ color: inactiveColor }}>Loading…</span></nav>;
    if (!navigationData?.menuItems) return <nav style={{ display: 'flex', gap: 8 }}><span style={{ color: inactiveColor }}>—</span></nav>;

    return (
        <nav style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            {navigationData.menuItems.map((item) => (
                <NavLink
                    key={item.id}
                    to={item.route}
                    title={item.description}
                    style={({ isActive }) => ({
                        padding: '8px 16px',
                        borderRadius: 20,
                        fontWeight: 600,
                        fontSize: '0.88rem',
                        textDecoration: 'none',
                        transition: 'all 0.2s',
                        letterSpacing: 0.2,
                        background: isActive ? activeBg : 'transparent',
                        color: isActive ? activeColor : inactiveColor,
                        border: isActive ? activeBorder : '1px solid transparent',
                        boxShadow: isActive && isDarkMode ? '0 0 12px rgba(34,197,94,0.15)' : 'none',
                    })}
                >
                    {item.label}
                </NavLink>
            ))}
        </nav>
    );
};

export default XMLNavigation;
