import React, { createContext, useContext, useState, useEffect } from 'react';

const LocationContext = createContext();

export const useLocation = () => {
    const context = useContext(LocationContext);
    if (!context) {
        throw new Error('useLocation must be used within a LocationProvider');
    }
    return context;
};

export const LocationProvider = ({ children }) => {
    const [location, setLocation] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [locationPermission, setLocationPermission] = useState('prompt');

    // Get user's current location
    const getCurrentLocation = () => {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation is not supported by your browser'));
                return;
            }

            setLoading(true);
            setError(null);

            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const coords = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        accuracy: position.coords.accuracy
                    };

                    try {
                        // Reverse geocoding to get location details
                        const locationData = await reverseGeocode(coords.latitude, coords.longitude);
                        const fullLocation = {
                            ...coords,
                            ...locationData
                        };

                        setLocation(fullLocation);
                        setLocationPermission('granted');
                        setLoading(false);

                        // Save to localStorage
                        localStorage.setItem('userLocation', JSON.stringify(fullLocation));

                        resolve(fullLocation);
                    } catch (err) {
                        setLocation(coords);
                        setLoading(false);
                        resolve(coords);
                    }
                },
                (err) => {
                    setError(err.message);
                    setLocationPermission('denied');
                    setLoading(false);
                    reject(err);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 300000 // Cache for 5 minutes
                }
            );
        });
    };

    // Reverse geocoding using OpenStreetMap Nominatim API (free)
    const reverseGeocode = async (latitude, longitude) => {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`,
                {
                    headers: {
                        'Accept-Language': 'en'
                    }
                }
            );

            if (!response.ok) throw new Error('Geocoding failed');

            const data = await response.json();

            return {
                city: data.address.city || data.address.town || data.address.village || '',
                state: data.address.state || '',
                country: data.address.country || '',
                district: data.address.state_district || '',
                region: data.address.region || '',
                displayName: data.display_name || '',
                address: data.address
            };
        } catch (error) {
            console.error('Reverse geocoding error:', error);
            return {};
        }
    };

    // Get region-specific recommendations
    const getRegionRecommendations = async (locationData) => {
        // This would typically call your backend API
        // For now, return basic region info
        const region = locationData?.state || locationData?.region || 'Unknown';

        return {
            region,
            climate: getClimateZone(locationData?.latitude),
            recommendedCrops: getRecommendedCrops(region),
            season: getCurrentSeason(locationData?.latitude)
        };
    };

    // Helper: Get climate zone based on latitude
    const getClimateZone = (latitude) => {
        if (!latitude) return 'Unknown';
        const absLat = Math.abs(latitude);

        if (absLat < 23.5) return 'Tropical';
        if (absLat < 35) return 'Subtropical';
        if (absLat < 60) return 'Temperate';
        return 'Cold';
    };

    // Helper: Get recommended crops by region (India-focused)
    const getRecommendedCrops = (region) => {
        const cropsByRegion = {
            'Maharashtra': ['Cotton', 'Sugarcane', 'Soybean', 'Wheat', 'Rice'],
            'Punjab': ['Wheat', 'Rice', 'Cotton', 'Sugarcane'],
            'Gujarat': ['Cotton', 'Groundnut', 'Wheat', 'Rice'],
            'Karnataka': ['Rice', 'Sugarcane', 'Cotton', 'Coffee'],
            'Tamil Nadu': ['Rice', 'Sugarcane', 'Cotton', 'Groundnut'],
            'Uttar Pradesh': ['Wheat', 'Rice', 'Sugarcane', 'Potato'],
            'Rajasthan': ['Bajra', 'Wheat', 'Mustard', 'Barley'],
            'Madhya Pradesh': ['Wheat', 'Soybean', 'Rice', 'Cotton'],
            'West Bengal': ['Rice', 'Jute', 'Potato', 'Wheat'],
            'Andhra Pradesh': ['Rice', 'Cotton', 'Sugarcane', 'Tobacco']
        };

        return cropsByRegion[region] || ['Wheat', 'Rice', 'Cotton', 'Vegetables'];
    };

    // Helper: Get current season
    const getCurrentSeason = (latitude) => {
        const month = new Date().getMonth() + 1;
        const isNorthernHemisphere = !latitude || latitude > 0;

        if (isNorthernHemisphere) {
            if (month >= 3 && month <= 5) return 'Spring';
            if (month >= 6 && month <= 8) return 'Summer';
            if (month >= 9 && month <= 11) return 'Autumn';
            return 'Winter';
        } else {
            if (month >= 3 && month <= 5) return 'Autumn';
            if (month >= 6 && month <= 8) return 'Winter';
            if (month >= 9 && month <= 11) return 'Spring';
            return 'Summer';
        }
    };

    // Load saved location on mount
    useEffect(() => {
        const savedLocation = localStorage.getItem('userLocation');
        if (savedLocation) {
            try {
                setLocation(JSON.parse(savedLocation));
            } catch (err) {
                console.error('Error parsing saved location:', err);
            }
        }
    }, []);

    const value = {
        location,
        loading,
        error,
        locationPermission,
        getCurrentLocation,
        getRegionRecommendations,
        reverseGeocode
    };

    return (
        <LocationContext.Provider value={value}>
            {children}
        </LocationContext.Provider>
    );
};
