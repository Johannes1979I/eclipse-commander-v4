/**
 * SETTINGS PANEL MODULE
 * Gestisce panel impostazioni applicazione
 */

class SettingsPanel {
    constructor() {
        this.initialized = false;
        this.settings = null;
    }
    
    /**
     * Inizializza settings panel
     */
    initialize() {
        if (this.initialized) return;
        
        // Carica settings
        this.settings = Storage.loadSettings();
        
        // TODO: Implementare UI settings quando necessario
        // Per ora settings gestiti via Storage direttamente
        
        this.initialized = true;
        
        Utils.log('Settings panel inizializzato');
    }
    
    /**
     * Ottieni settings correnti
     */
    getSettings() {
        return this.settings || Storage.loadSettings();
    }
    
    /**
     * Aggiorna setting
     */
    updateSetting(key, value) {
        if (!this.settings) {
            this.settings = Storage.loadSettings();
        }
        
        this.settings[key] = value;
        Storage.saveSettings(this.settings);
        
        // Applica cambiamenti
        this.applySettings();
        
        Utils.log(`Setting aggiornato: ${key} = ${value}`);
    }
    
    /**
     * Applica settings
     */
    applySettings() {
        const settings = this.getSettings();
        
        // Tema
        if (settings.theme === 'light') {
            document.body.classList.add('theme-light');
        } else {
            document.body.classList.remove('theme-light');
        }
        
        // Wake lock
        if (settings.autoWakeLock) {
            Utils.requestWakeLock();
        } else {
            Utils.releaseWakeLock();
        }
        
        // Altre impostazioni...
    }
    
    /**
     * Reset settings a default
     */
    resetToDefaults() {
        this.settings = {
            mode: 'eclipse',
            alarmsEnabled: true,
            alarmVolume: 1.0,
            useVibration: true,
            autoWakeLock: true,
            language: 'it',
            theme: 'dark'
        };
        
        Storage.saveSettings(this.settings);
        this.applySettings();
        
        Utils.log('Settings ripristinati a default');
        
        notificationManager.show('Impostazioni ripristinate', 'success');
    }
    
    /**
     * Export configurazione completa app
     */
    exportConfiguration() {
        const config = {
            settings: this.getSettings(),
            equipment: Storage.loadEquipment(),
            location: locationManager.getCurrentLocation(),
            lastEclipse: Storage.loadLastEclipse(),
            favorites: Storage.getFavoriteEclipses(),
            version: CONFIG.VERSION,
            exportDate: new Date().toISOString()
        };
        
        // Download come JSON
        const json = JSON.stringify(config, null, 2);
        Utils.downloadFile(json, 'eclipse-commander-config.json', 'application/json');
        
        notificationManager.show('Configurazione esportata', 'success');
    }
    
    /**
     * Import configurazione
     */
    importConfiguration(configJson) {
        try {
            const config = JSON.parse(configJson);
            
            // Valida versione
            if (config.version && config.version !== CONFIG.VERSION) {
                Utils.log(`Import da versione diversa: ${config.version}`, 'warn');
            }
            
            // Importa settings
            if (config.settings) {
                this.settings = config.settings;
                Storage.saveSettings(config.settings);
            }
            
            // Importa equipment
            if (config.equipment) {
                Storage.saveEquipment(config.equipment);
            }
            
            // Importa location
            if (config.location) {
                Storage.saveLocation(config.location);
            }
            
            // Importa last eclipse
            if (config.lastEclipse) {
                Storage.saveLastEclipse(config.lastEclipse);
            }
            
            // Importa favorites
            if (config.favorites) {
                Storage.save('favorite_eclipses', config.favorites);
            }
            
            // Applica settings
            this.applySettings();
            
            notificationManager.show('Configurazione importata', 'success');
            
            // Refresh UI
            window.location.reload();
            
        } catch (error) {
            Utils.log('Errore import configurazione: ' + error.message, 'error');
            notificationManager.show('Errore import: ' + error.message, 'error');
        }
    }
}

// Export singleton
const settingsPanel = new SettingsPanel();
