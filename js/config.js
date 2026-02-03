/**
 * ECLIPSE COMMANDER - Configuration
 * Configurazioni globali applicazione
 */

const CONFIG = {
    // Versione app
    VERSION: '3.0.0',
    APP_NAME: 'Eclipse Commander 2027',
    
    // API endpoints
    EKOS_DEFAULT_PORT: 8624,
    NINA_DEFAULT_PORT: 1888,
    
    // GPS config
    GPS_TIMEOUT: 10000,
    GPS_HIGH_ACCURACY: true,
    
    // Allarmi (secondi prima evento)
    ALARMS: {
        WARNING_30S: 30,
        WARNING_10S: 10,
        CRITICAL: 0
    },
    
    // Parametri camere default
    CAMERA_DEFAULTS: {
        CMOS: {
            gainUnity: 120,
            gainLowNoise: 200,
            tempTarget: -10,
            binning: 1
        },
        DSLR: {
            isoStandard: 400,
            isoHigh: 800,
            quality: 'RAW+JPG'
        }
    },
    
    // Ottimizzazione
    OPTIMIZATION: {
        baseFocal: 600,        // mm (riferimento)
        baseFratio: 5,         // f/5 riferimento
        baseExposureSolar: 0.001 // 1ms per f/10 con ND5
    },
    
    // Storage keys
    STORAGE: {
        EQUIPMENT: 'eclipse_equipment',
        LOCATION: 'eclipse_location',
        SETTINGS: 'eclipse_settings'
    }
};

// Export
if (typeof module !== 'undefined') module.exports = CONFIG;
