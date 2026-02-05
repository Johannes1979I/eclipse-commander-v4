/**
 * STORAGE.JS - LocalStorage Manager
 * Gestione persistenza dati tra sessioni
 */

const Storage = {
    /**
     * Salva valore in localStorage
     */
    save(key, value) {
        try {
            const serialized = JSON.stringify(value);
            localStorage.setItem(key, serialized);
            return true;
        } catch (error) {
            console.error('Errore salvataggio:', error);
            return false;
        }
    },

    /**
     * Carica valore da localStorage
     */
    load(key, defaultValue = null) {
        try {
            const serialized = localStorage.getItem(key);
            if (serialized === null) return defaultValue;
            return JSON.parse(serialized);
        } catch (error) {
            console.error('Errore caricamento:', error);
            return defaultValue;
        }
    },

    /**
     * Rimuove valore da localStorage
     */
    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Errore rimozione:', error);
            return false;
        }
    },

    /**
     * Cancella tutto localStorage
     */
    clear() {
        try {
            localStorage.clear();
            return true;
        } catch (error) {
            console.error('Errore clear:', error);
            return false;
        }
    },

    /**
     * Verifica esistenza chiave
     */
    exists(key) {
        return localStorage.getItem(key) !== null;
    },

    // === GESTIONE EQUIPMENT ===

    saveEquipment(equipment) {
        return this.save(CONFIG.STORAGE.EQUIPMENT, equipment);
    },

    loadEquipment() {
        return this.load(CONFIG.STORAGE.EQUIPMENT, {
            telescope: null,
            camera: null
        });
    },

    // === GESTIONE LOCATION ===

    saveLocation(location) {
        return this.save(CONFIG.STORAGE.LOCATION, location);
    },

    loadLocation() {
        return this.load(CONFIG.STORAGE.LOCATION, null);
    },

    // === GESTIONE SETTINGS ===

    saveSettings(settings) {
        return this.save(CONFIG.STORAGE.SETTINGS, settings);
    },

    loadSettings() {
        return this.load(CONFIG.STORAGE.SETTINGS, {
            mode: 'eclipse',           // 'eclipse' o 'solar'
            alarmsEnabled: true,
            alarmVolume: 1.0,
            useVibration: true,
            autoWakeLock: true,
            language: 'it',
            theme: 'dark'
        });
    },

    // === GESTIONE ECLISSI FAVORITE ===

    saveFavoriteEclipse(eclipseId) {
        const favorites = this.load('favorite_eclipses', []);
        if (!favorites.includes(eclipseId)) {
            favorites.push(eclipseId);
            this.save('favorite_eclipses', favorites);
        }
    },

    removeFavoriteEclipse(eclipseId) {
        let favorites = this.load('favorite_eclipses', []);
        favorites = favorites.filter(id => id !== eclipseId);
        this.save('favorite_eclipses', favorites);
    },

    getFavoriteEclipses() {
        return this.load('favorite_eclipses', []);
    },

    isFavorite(eclipseId) {
        const favorites = this.getFavoriteEclipses();
        return favorites.includes(eclipseId);
    },

    // === GESTIONE ULTIMA ECLISSI SELEZIONATA ===

    saveLastEclipse(eclipseId) {
        this.save('last_eclipse', eclipseId);
    },

    loadLastEclipse() {
        return this.load('last_eclipse', null);
    },

    // === EXPORT/IMPORT CONFIGURAZIONE ===

    exportConfig() {
        return {
            equipment: this.loadEquipment(),
            location: this.loadLocation(),
            settings: this.loadSettings(),
            favorites: this.getFavoriteEclipses(),
            lastEclipse: this.loadLastEclipse(),
            version: CONFIG.VERSION,
            exportDate: new Date().toISOString()
        };
    },

    importConfig(config) {
        try {
            if (config.equipment) this.saveEquipment(config.equipment);
            if (config.location) this.saveLocation(config.location);
            if (config.settings) this.saveSettings(config.settings);
            if (config.favorites) this.save('favorite_eclipses', config.favorites);
            if (config.lastEclipse) this.saveLastEclipse(config.lastEclipse);
            return true;
        } catch (error) {
            console.error('Errore import:', error);
            return false;
        }
    },

    // === STATISTICHE STORAGE ===

    getStorageInfo() {
        let total = 0;
        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                total += localStorage[key].length + key.length;
            }
        }
        
        return {
            used: total,
            usedKB: (total / 1024).toFixed(2),
            itemCount: localStorage.length,
            available: 5 * 1024 * 1024, // ~5MB typical
            availableKB: 5 * 1024
        };
    }
};
