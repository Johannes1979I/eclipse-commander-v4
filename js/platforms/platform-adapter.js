/**
 * PLATFORM ADAPTER MODULE
 * Adapter pattern per unificare interfacce Ekos e N.I.N.A.
 */

class PlatformAdapter {
    constructor() {
        this.currentPlatform = null; // 'ekos' o 'nina'
        this.connector = null;
        this.connected = false;
    }
    
    /**
     * Connetti a piattaforma
     * @param {string} platform - 'ekos' o 'nina'
     * @param {string} host - IP/hostname
     * @param {number} port - Porta
     */
    async connect(platform, host, port = null) {
        try {
            // Scegli connector
            if (platform === 'ekos') {
                this.connector = ekosConnector;
                port = port || CONFIG.EKOS_DEFAULT_PORT;
            } else if (platform === 'nina') {
                this.connector = ninaConnector;
                port = port || CONFIG.NINA_DEFAULT_PORT;
            } else {
                throw new Error('Piattaforma non supportata: ' + platform);
            }
            
            // Connetti
            const result = await this.connector.connect(host, port);
            
            this.currentPlatform = platform;
            this.connected = true;
            
            Utils.log(`Piattaforma connessa: ${platform}`);
            
            return result;
            
        } catch (error) {
            this.connected = false;
            throw error;
        }
    }
    
    /**
     * Disconnetti da piattaforma corrente
     */
    disconnect() {
        if (this.connector) {
            this.connector.disconnect();
        }
        
        this.currentPlatform = null;
        this.connector = null;
        this.connected = false;
    }
    
    /**
     * Ottieni dispositivi (interfaccia unificata)
     */
    async getDevices() {
        if (!this.connected) {
            throw new Error('Non connesso a nessuna piattaforma');
        }
        
        await this.connector.updateDevices();
        return this.connector.devices;
    }
    
    /**
     * Ottieni camere (interfaccia unificata)
     */
    getCameras() {
        if (!this.connected) return [];
        
        return this.connector.getCameras();
    }
    
    /**
     * Ottieni dettagli camera (interfaccia unificata)
     */
    async getCameraDetails(cameraName = null) {
        if (!this.connected) {
            throw new Error('Non connesso');
        }
        
        if (this.currentPlatform === 'ekos') {
            // Ekos richiede nome camera
            const cameras = this.getCameras();
            if (cameras.length === 0) {
                throw new Error('Nessuna camera connessa');
            }
            
            const camera = cameraName 
                ? cameras.find(c => c.name === cameraName)
                : cameras[0];
            
            if (!camera) {
                throw new Error('Camera non trovata');
            }
            
            return await this.connector.getCameraDetails(camera.name);
            
        } else {
            // N.I.N.A. auto-gestisce
            return await this.connector.getCameraDetails(cameraName);
        }
    }
    
    /**
     * Imposta temperatura camera (interfaccia unificata)
     */
    async setCameraTemperature(temperature, cameraName = null) {
        if (!this.connected) {
            throw new Error('Non connesso');
        }
        
        if (this.currentPlatform === 'ekos') {
            const cameras = this.getCameras();
            if (cameras.length === 0) {
                throw new Error('Nessuna camera');
            }
            
            const camera = cameraName || cameras[0].name;
            return await this.connector.setCameraTemperature(camera, temperature);
            
        } else {
            return await this.connector.setCameraTemperature(temperature);
        }
    }
    
    /**
     * Imposta gain camera (interfaccia unificata)
     */
    async setCameraGain(gain, cameraName = null) {
        if (!this.connected) {
            throw new Error('Non connesso');
        }
        
        if (this.currentPlatform === 'ekos') {
            const cameras = this.getCameras();
            if (cameras.length === 0) {
                throw new Error('Nessuna camera');
            }
            
            const camera = cameraName || cameras[0].name;
            return await this.connector.setCameraGain(camera, gain);
            
        } else {
            return await this.connector.setCameraGain(gain);
        }
    }
    
    /**
     * Imposta offset camera (interfaccia unificata)
     */
    async setCameraOffset(offset, cameraName = null) {
        if (!this.connected) {
            throw new Error('Non connesso');
        }
        
        if (this.currentPlatform === 'ekos') {
            const cameras = this.getCameras();
            if (cameras.length === 0) {
                throw new Error('Nessuna camera');
            }
            
            const camera = cameraName || cameras[0].name;
            return await this.connector.setCameraOffset(camera, offset);
            
        } else {
            return await this.connector.setCameraOffset(offset);
        }
    }
    
    /**
     * Cattura singola immagine (interfaccia unificata)
     * @param {number} exposure - Esposizione in secondi
     * @param {number} gain - Gain (o ISO per DSLR)
     * @param {number} binning - Binning
     * @param {string} cameraName - Nome camera (solo per Ekos)
     */
    async captureImage(exposure, gain = null, binning = 1, cameraName = null) {
        if (!this.connected) {
            throw new Error('Non connesso');
        }
        
        if (this.currentPlatform === 'ekos') {
            const cameras = this.getCameras();
            if (cameras.length === 0) {
                throw new Error('Nessuna camera');
            }
            
            const camera = cameraName || cameras[0].name;
            return await this.connector.captureImage(camera, exposure, gain, binning);
            
        } else {
            return await this.connector.captureImage(exposure, gain, binning);
        }
    }
    
    /**
     * Cattura sequenza immagini (interfaccia unificata)
     * @param {Array} sequence - Array di {exposure, gain, binning}
     * @param {string} cameraName - Nome camera (solo per Ekos)
     */
    async captureSequence(sequence, cameraName = null) {
        if (!this.connected) {
            throw new Error('Non connesso');
        }
        
        if (this.currentPlatform === 'ekos') {
            const cameras = this.getCameras();
            if (cameras.length === 0) {
                throw new Error('Nessuna camera');
            }
            
            const camera = cameraName || cameras[0].name;
            return await this.connector.captureSequence(camera, sequence);
            
        } else {
            return await this.connector.captureSequence(sequence);
        }
    }
    
    /**
     * Abort esposizione corrente (interfaccia unificata)
     */
    async abortExposure() {
        if (!this.connected) {
            throw new Error('Non connesso');
        }
        
        if (this.currentPlatform === 'nina') {
            return await this.connector.abortExposure();
        }
        
        // Ekos: TODO implementare abort se supportato
        Utils.log('Abort non supportato per Ekos', 'warn');
        return false;
    }
    
    /**
     * Auto-configura equipment da piattaforma
     */
    async autoConfigureEquipment() {
        if (!this.connected) {
            throw new Error('Non connesso');
        }
        
        try {
            // Ottieni dettagli camera
            const cameraDetails = await this.getCameraDetails();
            
            if (!cameraDetails) {
                throw new Error('Impossibile ottenere dettagli camera');
            }
            
            // Configura camera manager
            cameraManager.setCamera({
                name: cameraDetails.name,
                type: cameraDetails.type,
                pixelSize: cameraDetails.pixelSize,
                width: cameraDetails.width,
                height: cameraDetails.height,
                gainUnity: cameraDetails.gainUnity,
                gainLowNoise: cameraDetails.gainLowNoise || cameraDetails.gainUnity * 1.5,
                hasCooling: cameraDetails.hasCooling
            });
            
            Utils.log('Equipment auto-configurato da piattaforma');
            
            return {
                success: true,
                camera: cameraDetails
            };
            
        } catch (error) {
            Utils.log('Errore auto-config equipment: ' + error.message, 'error');
            throw error;
        }
    }
    
    /**
     * Ottieni stato completo
     */
    getStatus() {
        if (!this.connected || !this.connector) {
            return {
                connected: false,
                platform: null
            };
        }
        
        const connectorStatus = this.connector.getStatus();
        
        return {
            ...connectorStatus,
            platform: this.currentPlatform
        };
    }
    
    /**
     * Verifica se piattaforma supporta feature
     */
    supportsFeature(feature) {
        if (!this.connected) return false;
        
        const features = {
            ekos: {
                cooling: true,
                gain: true,
                offset: true,
                binning: true,
                profiles: true,
                abort: false
            },
            nina: {
                cooling: true,
                gain: true,
                offset: true,
                binning: true,
                profiles: false,
                abort: true
            }
        };
        
        return features[this.currentPlatform]?.[feature] || false;
    }
}

// Export singleton
const platformAdapter = new PlatformAdapter();
