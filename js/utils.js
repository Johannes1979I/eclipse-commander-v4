/**
 * UTILS.JS - Funzioni utility comuni
 */

const Utils = {
    /**
     * Formatta data in formato leggibile
     */
    formatDate(date, locale = 'it-IT') {
        return new Date(date).toLocaleDateString(locale, {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    },

    /**
     * Formatta tempo in HH:MM:SS
     */
    formatTime(date) {
        return new Date(date).toLocaleTimeString('it-IT', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
    },

    /**
     * Formatta durata in secondi come MM:SS o HH:MM:SS
     */
    formatDuration(seconds) {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        
        if (h > 0) {
            return `${h}h ${m}m ${s}s`;
        } else if (m > 0) {
            return `${m}m ${s}s`;
        } else {
            return `${s}s`;
        }
    },

    /**
     * Calcola distanza tra due punti geografici (Haversine)
     * @returns distanza in km
     */
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Raggio Terra in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        
        const a = Math.sin(dLat/2) ** 2 +
                  Math.cos(lat1 * Math.PI / 180) * 
                  Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon/2) ** 2;
        
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    },

    /**
     * Converte gradi in radianti
     */
    toRadians(degrees) {
        return degrees * Math.PI / 180;
    },

    /**
     * Converte radianti in gradi
     */
    toDegrees(radians) {
        return radians * 180 / Math.PI;
    },

    /**
     * Formatta coordinate geografiche
     */
    formatCoordinate(value, isLat = true) {
        const direction = isLat 
            ? (value >= 0 ? 'N' : 'S')
            : (value >= 0 ? 'E' : 'W');
        
        const absValue = Math.abs(value);
        const degrees = Math.floor(absValue);
        const minutes = (absValue - degrees) * 60;
        
        return `${degrees}° ${minutes.toFixed(2)}' ${direction}`;
    },

    /**
     * Arrotonda numero a decimali specificati
     */
    round(value, decimals = 2) {
        return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
    },

    /**
     * Clamp valore tra min e max
     */
    clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    },

    /**
     * Interpolazione lineare
     */
    lerp(start, end, t) {
        return start + (end - start) * t;
    },

    /**
     * Debounce function (evita chiamate troppo frequenti)
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * Verifica se browser supporta feature
     */
    supports: {
        geolocation: () => 'geolocation' in navigator,
        serviceWorker: () => 'serviceWorker' in navigator,
        notifications: () => 'Notification' in window,
        wakeLock: () => 'wakeLock' in navigator,
        vibrate: () => 'vibrate' in navigator
    },

    /**
     * Mostra notifica (se supportata)
     */
    async showNotification(title, options = {}) {
        if (!this.supports.notifications()) return false;
        
        if (Notification.permission === 'granted') {
            new Notification(title, options);
            return true;
        } else if (Notification.permission !== 'denied') {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                new Notification(title, options);
                return true;
            }
        }
        return false;
    },

    /**
     * Vibra device (se supportato)
     */
    vibrate(pattern = [200]) {
        if (this.supports.vibrate()) {
            navigator.vibrate(pattern);
        }
    },

    /**
     * Keep screen awake
     */
    wakeLock: null,
    async requestWakeLock() {
        if (!this.supports.wakeLock()) return false;
        
        try {
            this.wakeLock = await navigator.wakeLock.request('screen');
            console.log('Wake Lock attivo');
            return true;
        } catch (err) {
            console.error('Wake Lock fallito:', err);
            return false;
        }
    },

    /**
     * Release wake lock
     */
    async releaseWakeLock() {
        if (this.wakeLock) {
            await this.wakeLock.release();
            this.wakeLock = null;
            console.log('Wake Lock rilasciato');
        }
    },

    /**
     * Log con timestamp
     */
    log(message, level = 'info') {
        // Validazione parametro level ✅
        if (typeof level !== 'string') {
            // Se level non è una stringa, è probabilmente un oggetto passato per errore
            // Lo aggiungiamo al messaggio invece
            if (typeof message === 'string' && level !== undefined) {
                message = message + ' ' + JSON.stringify(level);
            }
            level = 'info';
        }
        
        const timestamp = new Date().toISOString();
        const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
        
        switch(level) {
            case 'error':
                console.error(prefix, message);
                break;
            case 'warn':
                console.warn(prefix, message);
                break;
            default:
                console.log(prefix, message);
        }
    },

    /**
     * Download file
     */
    downloadFile(content, filename, mimeType = 'text/plain') {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
};

// Rendi disponibile globalmente
if (typeof window !== 'undefined') {
    window.Utils = Utils;
}

