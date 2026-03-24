// Notification Service for FarmWise

class NotificationService {
    constructor() {
        this.permission = Notification.permission;
    }

    // Request notification permission
    async requestPermission() {
        if (!('Notification' in window)) {
            console.warn('This browser does not support notifications');
            return false;
        }

        if (this.permission === 'granted') {
            return true;
        }

        const permission = await Notification.requestPermission();
        this.permission = permission;
        return permission === 'granted';
    }

    // Show a notification
    async showNotification(title, options = {}) {
        const hasPermission = await this.requestPermission();

        if (!hasPermission) {
            console.warn('Notification permission denied');
            return null;
        }

        const defaultOptions = {
            icon: '/icons/icon-192x192.png',
            badge: '/icons/icon-72x72.png',
            vibrate: [200, 100, 200],
            requireInteraction: false,
            ...options
        };

        // Use service worker if available
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            const registration = await navigator.serviceWorker.ready;
            return registration.showNotification(title, defaultOptions);
        }

        // Fallback to regular notification
        return new Notification(title, defaultOptions);
    }

    // Reminder notification
    async showReminder(reminderData) {
        return this.showNotification('FarmWise Reminder', {
            body: reminderData.message || reminderData.title,
            icon: '/icons/icon-192x192.png',
            tag: `reminder-${reminderData.id}`,
            data: reminderData,
            actions: [
                { action: 'complete', title: 'Mark Complete' },
                { action: 'snooze', title: 'Snooze' }
            ]
        });
    }

    // Analysis complete notification
    async showAnalysisComplete(analysisType) {
        return this.showNotification('Analysis Complete', {
            body: `Your ${analysisType} analysis is ready to view`,
            icon: '/icons/icon-192x192.png',
            tag: `analysis-${analysisType}`,
            requireInteraction: true,
            actions: [
                { action: 'view', title: 'View Results' }
            ]
        });
    }

    // Weather alert notification
    async showWeatherAlert(weatherData) {
        return this.showNotification('Weather Alert', {
            body: weatherData.message,
            icon: '/icons/icon-192x192.png',
            tag: 'weather-alert',
            requireInteraction: true,
            vibrate: [300, 100, 300, 100, 300]
        });
    }

    // Crop recommendation notification
    async showCropRecommendation(cropData) {
        return this.showNotification('New Crop Recommendation', {
            body: `Based on your location, consider planting: ${cropData.crops.join(', ')}`,
            icon: '/icons/icon-192x192.png',
            tag: 'crop-recommendation',
            data: cropData
        });
    }

    // Schedule a notification
    scheduleNotification(title, options, delay) {
        setTimeout(() => {
            this.showNotification(title, options);
        }, delay);
    }

    // Cancel all notifications
    async cancelAll() {
        if ('serviceWorker' in navigator) {
            const registration = await navigator.serviceWorker.ready;
            const notifications = await registration.getNotifications();
            notifications.forEach(notification => notification.close());
        }
    }

    // Cancel notification by tag
    async cancelByTag(tag) {
        if ('serviceWorker' in navigator) {
            const registration = await navigator.serviceWorker.ready;
            const notifications = await registration.getNotifications({ tag });
            notifications.forEach(notification => notification.close());
        }
    }

    // Check if notifications are supported
    isSupported() {
        return 'Notification' in window;
    }

    // Get permission status
    getPermissionStatus() {
        return this.permission;
    }
}

// Create singleton instance
const notificationService = new NotificationService();

export default notificationService;

// Export utility functions
export const requestNotificationPermission = () =>
    notificationService.requestPermission();

export const showNotification = (title, options) =>
    notificationService.showNotification(title, options);

export const showReminder = (reminderData) =>
    notificationService.showReminder(reminderData);

export const showAnalysisComplete = (analysisType) =>
    notificationService.showAnalysisComplete(analysisType);

export const showWeatherAlert = (weatherData) =>
    notificationService.showWeatherAlert(weatherData);

export const showCropRecommendation = (cropData) =>
    notificationService.showCropRecommendation(cropData);
