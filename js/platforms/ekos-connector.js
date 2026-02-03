/**
 * EKOS CONNECTOR MODULE
 * Connessione a Ekos/INDI tramite INDI Web Manager
 */

class EkosConnector {
    constructor() {
        this.baseUrl = null;
        this.connected = false;
        this.devices = [];
        this.profiles = [];
        this.activeProfile = null;
        this.pollInterval = null;
    }
    
    /**
     * Connetti a Ekos Web Manager
     * @param {string} host - IP o hostname (es. "192.168.4.1" o "raspberrypi.local")
     * @param {number} port - Porta (default 8624)
     */
    async connect(host, port = CONFIG.EKOS_DEFAULT_PORT) {
        try {
            this.baseUrl = `http://${host}:${port}`;
            
            Utils.log(`Connessione a Ekos: ${this.baseUrl}`);
            
            // Test connessione
            const response = await fetch(`${this.baseUrl}/api/server/status`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            // Verifica Content-Type della risposta ✅
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                // Risposta non è JSON - probabilmente pagina HTML di errore
                const text = await response.text();
                const preview = text.substring(0, 100);
                throw new Error(
                    `Server non risponde con JSON (ricevuto ${contentType || 'unknown'}). ` +
                    `Verifica che Ekos sia in esecuzione e l'API sia attiva. ` +
                    `Preview: ${preview}...`
                );
            }
            
            const status = await response.json();
            
            Utils.log('Ekos connesso: ' + JSON.stringify(status));
            
            this.connected = true;
            
            // Carica profili disponibili
            await this.loadProfiles();
            
            // Avvia polling dispositivi
            this.startPolling();
            
            return {
                success: true,
                status: status,
                url: this.baseUrl
            };
            
        } catch (error) {
            Utils.log('Errore connessione Ekos: ' + error.message, 'error');
            this.connected = false;
            
            // Messaggi di errore più utili ✅
            let userMessage = error.message;
            
            if (error.message.includes('Failed to fetch')) {
                userMessage = `Impossibile raggiungere Ekos su ${this.baseUrl}. Verifica che:
• Ekos sia in esecuzione
• L'indirizzo ${host} sia corretto
• La porta ${port} sia aperta
• Non ci siano firewall che bloccano la connessione`;
            } else if (error.message.includes('NetworkError')) {
                userMessage = `Errore di rete: verifica connessione a ${host}`;
            }
            
            throw new Error(userMessage);
        }
    }
    
    /**
     * Disconnetti da Ekos
     */
    disconnect() {
        this.stopPolling();
        this.connected = false;
        this.devices = [];
        this.baseUrl = null;
        
        Utils.log('Ekos disconnesso');
    }
    
    /**
     * Carica profili disponibili
     */
    async loadProfiles() {
        try {
            const response = await fetch(`${this.baseUrl}/api/profiles`, {
                method: 'GET'
            });
            
            if (!response.ok) {
                throw new Error('Errore caricamento profili');
            }
            
            this.profiles = await response.json();
            
            Utils.log(`Profili Ekos trovati: ${this.profiles.length}`);
            
            return this.profiles;
            
        } catch (error) {
            Utils.log('Errore caricamento profili: ' + error.message, 'error');
            return [];
        }
    }
    
    /**
     * Avvia profilo Ekos
     */
    async startProfile(profileName) {
        try {
            const response = await fetch(`${this.baseUrl}/api/profiles/start`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    profile: profileName
                })
            });
            
            if (!response.ok) {
                throw new Error('Errore avvio profilo');
            }
            
            this.activeProfile = profileName;
            
            Utils.log(`Profilo avviato: ${profileName}`);
            
            // Attendi dispositivi pronti
            await this.waitForDevices();
            
            return true;
            
        } catch (error) {
            Utils.log('Errore avvio profilo: ' + error.message, 'error');
            throw error;
        }
    }
    
    /**
     * Attendi che dispositivi siano pronti
     */
    async waitForDevices(timeout = 10000) {
        const startTime = Date.now();
        
        while (Date.now() - startTime < timeout) {
            await this.updateDevices();
            
            if (this.devices.length > 0) {
                Utils.log('Dispositivi pronti');
                return true;
            }
            
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        throw new Error('Timeout attesa dispositivi');
    }
    
    /**
     * Aggiorna lista dispositivi
     */
    async updateDevices() {
        if (!this.connected) return [];
        
        try {
            const response = await fetch(`${this.baseUrl}/api/devices`, {
                method: 'GET'
            });
            
            if (!response.ok) {
                throw new Error('Errore lettura dispositivi');
            }
            
            const devices = await response.json();
            
            // Processa dispositivi
            this.devices = devices.map(device => ({
                name: device.name || device.device,
                driver: device.driver,
                type: this.detectDeviceType(device),
                connected: device.state === 'Connected' || device.connected === true,
                interface: device.interface || 'INDI',
                raw: device
            }));
            
            return this.devices;
            
        } catch (error) {
            Utils.log('Errore update dispositivi: ' + error.message, 'warn');
            return this.devices;
        }
    }
    
    /**
     * Rileva tipo dispositivo
     */
    detectDeviceType(device) {
        const name = (device.name || device.driver || '').toLowerCase();
        const driver = (device.driver || '').toLowerCase();
        
        if (name.includes('ccd') || name.includes('camera') || 
            driver.includes('asi') || driver.includes('qhy')) {
            return 'camera';
        }
        if (name.includes('mount') || name.includes('telescope') ||
            driver.includes('eqmod') || driver.includes('ioptron')) {
            return 'mount';
        }
        if (name.includes('focuser') || driver.includes('focus')) {
            return 'focuser';
        }
        if (name.includes('wheel') || name.includes('filter')) {
            return 'filterwheel';
        }
        if (name.includes('guide') || driver.includes('guide')) {
            return 'guider';
        }
        
        return 'unknown';
    }
    
    /**
     * Ottieni camere disponibili
     */
    getCameras() {
        return this.devices.filter(d => d.type === 'camera');
    }
    
    /**
     * Ottieni dettagli camera
     */
    async getCameraDetails(cameraName) {
        try {
            const response = await fetch(`${this.baseUrl}/api/devices/${cameraName}/properties`, {
                method: 'GET'
            });
            
            if (!response.ok) {
                throw new Error('Errore lettura proprietà camera');
            }
            
            const properties = await response.json();
            
            // Estrai info utili
            const details = {
                name: cameraName,
                type: 'cmos', // Assume CMOS per INDI
                connected: true,
                properties: {}
            };
            
            // Cerca proprietà comuni
            for (let prop of properties) {
                if (prop.name === 'CCD_INFO') {
                    details.width = parseInt(prop.values?.CCD_MAX_X?.value) || 0;
                    details.height = parseInt(prop.values?.CCD_MAX_Y?.value) || 0;
                    details.pixelSize = parseFloat(prop.values?.CCD_PIXEL_SIZE?.value) || 0;
                    details.bitDepth = parseInt(prop.values?.CCD_BITSPERPIXEL?.value) || 16;
                }
                
                if (prop.name === 'CCD_TEMPERATURE') {
                    details.temperature = parseFloat(prop.values?.CCD_TEMPERATURE_VALUE?.value);
                    details.hasCooling = true;
                }
                
                if (prop.name === 'CCD_CONTROLS') {
                    details.gainMin = parseInt(prop.values?.Gain?.min) || 0;
                    details.gainMax = parseInt(prop.values?.Gain?.max) || 100;
                    details.gainUnity = 50; // Stima
                }
            }
            
            return details;
            
        } catch (error) {
            Utils.log('Errore dettagli camera: ' + error.message, 'error');
            return null;
        }
    }
    
    /**
     * Imposta proprietà dispositivo
     */
    async setProperty(deviceName, propertyName, values) {
        try {
            const response = await fetch(`${this.baseUrl}/api/devices/${deviceName}/properties/${propertyName}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(values)
            });
            
            if (!response.ok) {
                throw new Error(`Errore set property: ${response.statusText}`);
            }
            
            return true;
            
        } catch (error) {
            Utils.log(`Errore set property ${propertyName}: ${error.message}`, 'error');
            return false;
        }
    }
    
    /**
     * Imposta temperatura camera
     */
    async setCameraTemperature(cameraName, temperature) {
        return await this.setProperty(cameraName, 'CCD_TEMPERATURE', {
            CCD_TEMPERATURE_VALUE: temperature
        });
    }
    
    /**
     * Imposta gain camera
     */
    async setCameraGain(cameraName, gain) {
        return await this.setProperty(cameraName, 'CCD_CONTROLS', {
            Gain: gain
        });
    }
    
    /**
     * Imposta offset camera
     */
    async setCameraOffset(cameraName, offset) {
        return await this.setProperty(cameraName, 'CCD_CONTROLS', {
            Offset: offset
        });
    }
    
    /**
     * Cattura immagine
     */
    async captureImage(cameraName, exposure, gain = null, binning = 1) {
        try {
            // Imposta binning
            if (binning > 1) {
                await this.setProperty(cameraName, 'CCD_BINNING', {
                    HOR_BIN: binning,
                    VER_BIN: binning
                });
            }
            
            // Imposta gain se fornito
            if (gain !== null) {
                await this.setCameraGain(cameraName, gain);
            }
            
            // Avvia esposizione
            const result = await this.setProperty(cameraName, 'CCD_EXPOSURE', {
                CCD_EXPOSURE_VALUE: exposure
            });
            
            if (!result) {
                throw new Error('Errore avvio esposizione');
            }
            
            Utils.log(`Esposizione avviata: ${exposure}s @ Gain ${gain}`);
            
            return {
                success: true,
                exposure: exposure,
                gain: gain,
                binning: binning
            };
            
        } catch (error) {
            Utils.log('Errore capture: ' + error.message, 'error');
            throw error;
        }
    }
    
    /**
     * Cattura sequenza
     */
    async captureSequence(cameraName, sequence) {
        const results = [];
        
        for (let i = 0; i < sequence.length; i++) {
            const shot = sequence[i];
            
            try {
                const result = await this.captureImage(
                    cameraName,
                    shot.exposure / 1000, // ms to seconds
                    shot.gain,
                    shot.binning || 1
                );
                
                results.push(result);
                
                // Attendi completamento + buffer
                await new Promise(resolve => 
                    setTimeout(resolve, (shot.exposure / 1000 + 2) * 1000)
                );
                
            } catch (error) {
                Utils.log(`Errore frame ${i+1}/${sequence.length}: ${error.message}`, 'error');
                results.push({
                    success: false,
                    error: error.message
                });
            }
        }
        
        return results;
    }
    
    /**
     * Avvia polling stato dispositivi
     */
    startPolling(interval = 5000) {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
        }
        
        this.pollInterval = setInterval(() => {
            if (this.connected) {
                this.updateDevices();
            }
        }, interval);
    }
    
    /**
     * Ferma polling
     */
    stopPolling() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
    }
    
    /**
     * Test connessione
     */
    async testConnection(host, port = CONFIG.EKOS_DEFAULT_PORT) {
        try {
            const response = await fetch(`http://${host}:${port}/api/server/status`, {
                method: 'GET',
                timeout: 5000
            });
            
            return response.ok;
            
        } catch (error) {
            return false;
        }
    }
    
    /**
     * Scan rete per trovare Ekos
     */
    async scanNetwork(subnet = '192.168') {
        Utils.log('Scan rete Ekos...');
        
        const hosts = [];
        const promises = [];
        
        // Scan solo alcuni IP comuni
        const commonIPs = [
            `${subnet}.4.1`,     // Raspberry hotspot
            `${subnet}.1.100`,   // DHCP tipico
            `${subnet}.1.101`,
            `${subnet}.1.102`,
            'raspberrypi.local',
            'stellarmate.local'
        ];
        
        for (let ip of commonIPs) {
            promises.push(
                this.testConnection(ip).then(success => {
                    if (success) {
                        hosts.push({
                            host: ip,
                            port: CONFIG.EKOS_DEFAULT_PORT,
                            url: `http://${ip}:${CONFIG.EKOS_DEFAULT_PORT}`
                        });
                    }
                }).catch(() => {})
            );
        }
        
        await Promise.allSettled(promises);
        
        Utils.log(`Ekos trovati: ${hosts.length}`);
        
        return hosts;
    }
    
    /**
     * Ottieni stato connessione
     */
    getStatus() {
        return {
            connected: this.connected,
            url: this.baseUrl,
            profile: this.activeProfile,
            devices: this.devices.length,
            cameras: this.getCameras().length
        };
    }
    
    // ==================== EXPORT EKOS SEQUENCE (.esq) ====================
    
    /**
     * Converti sequenze Eclipse → formato EKOS XML (.esq)
     * @param {Array} sequences - Array di sequenze da Eclipse Commander
     * @returns {string} - XML formattato per EKOS
     */
    convertToEkosFormat(sequences) {
        Utils.log('=== CONVERSIONE EKOS .esq ===');
        
        // Ottieni equipment per parametri (accesso globale)
        const equipment = (typeof window !== 'undefined' && window.equipmentPanel) 
            ? window.equipmentPanel.getCurrentEquipment() 
            : null;
        const camera = equipment ? equipment.camera : null;
        
        if (camera) {
            Utils.log(`Camera rilevata: ${camera.name} (Unity Gain: ${camera.unityGain || 'N/A'})`);
        }
        
        // Inizio XML
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
        xml += '<SequenceQueue version="2.6">\n';
        
        // Observer (opzionale)
        xml += '  <Observer></Observer>\n';
        xml += '  <CCD>Eclipse Commander</CCD>\n';
        xml += '  <FilterWheel></FilterWheel>\n';
        
        // Converti ogni sequenza in job EKOS
        sequences.forEach((seq, index) => {
            Utils.log(`Conversione sequenza ${index + 1}/${sequences.length}: ${seq.name}`);
            
            // Per ogni esposizione nella sequenza
            if (seq.exposures && seq.exposures.length > 0) {
                seq.exposures.forEach((exposure, expIndex) => {
                    const exposureTime = this.parseExposureTime(exposure);
                    const shots = seq.shots || 1;
                    
                    // Calcola Gain/ISO
                    let finalGain = null;
                    let finalISO = null;
                    
                    if (seq.cameraType === 'cmos') {
                        if (seq.gain !== undefined && seq.gain !== null && seq.gain !== '') {
                            finalGain = parseInt(seq.gain);
                        } else if (camera && camera.unityGain) {
                            finalGain = camera.unityGain;
                            Utils.log(`📷 Unity Gain automatico: ${finalGain} (${camera.name})`);
                        }
                    } else if (seq.cameraType === 'dslr') {
                        if (seq.iso !== undefined && seq.iso !== null && seq.iso !== '') {
                            finalISO = parseInt(seq.iso);
                        } else {
                            finalISO = 400;
                        }
                    }
                    
                    // Crea Job EKOS
                    xml += '  <Job>\n';
                    xml += `    <Exposure>${exposureTime}</Exposure>\n`;
                    xml += `    <Format>FITS</Format>\n`;
                    xml += `    <Encoding>FITS</Encoding>\n`;
                    xml += `    <Binning>\n`;
                    xml += `      <X>${seq.binning || 1}</X>\n`;
                    xml += `      <Y>${seq.binning || 1}</Y>\n`;
                    xml += `    </Binning>\n`;
                    xml += `    <Frame>\n`;
                    xml += `      <X>0</X>\n`;
                    xml += `      <Y>0</Y>\n`;
                    xml += `      <W>0</W>\n`;
                    xml += `      <H>0</H>\n`;
                    xml += `    </Frame>\n`;
                    xml += `    <Temperature force="false">0</Temperature>\n`;
                    xml += `    <Filter>${seq.filter || '-'}</Filter>\n`;
                    xml += `    <Type>Light</Type>\n`;
                    xml += `    <Prefix>\n`;
                    xml += `      <RawPrefix>${seq.name}_${exposure}</RawPrefix>\n`;
                    xml += `      <FilterEnabled>false</FilterEnabled>\n`;
                    xml += `      <ExpEnabled>true</ExpEnabled>\n`;
                    xml += `      <TimestampEnabled>true</TimestampEnabled>\n`;
                    xml += `    </Prefix>\n`;
                    xml += `    <Count>${shots}</Count>\n`;
                    xml += `    <Delay>0</Delay>\n`;
                    
                    // Gain/ISO
                    if (finalGain !== null) {
                        xml += `    <Gain>${finalGain}</Gain>\n`;
                    }
                    if (seq.offset !== undefined && seq.offset !== null && seq.offset !== '') {
                        xml += `    <Offset>${seq.offset}</Offset>\n`;
                    }
                    if (finalISO !== null) {
                        xml += `    <ISO>${finalISO}</ISO>\n`;
                    }
                    
                    // Properties custom
                    xml += `    <Properties>\n`;
                    xml += `      <PropertyVector name="CCD_FRAME_TYPE">\n`;
                    xml += `        <OneElement name="FRAME_LIGHT" value="On"/>\n`;
                    xml += `      </PropertyVector>\n`;
                    xml += `    </Properties>\n`;
                    
                    // Calibration settings
                    xml += `    <Calibration>\n`;
                    xml += `      <FlatSource>\n`;
                    xml += `        <Type>Manual</Type>\n`;
                    xml += `      </FlatSource>\n`;
                    xml += `      <FlatDuration>\n`;
                    xml += `        <Type>Manual</Type>\n`;
                    xml += `      </FlatDuration>\n`;
                    xml += `      <PreMountPark>false</PreMountPark>\n`;
                    xml += `      <PreDomePark>false</PreDomePark>\n`;
                    xml += `    </Calibration>\n`;
                    
                    xml += '  </Job>\n';
                });
            }
        });
        
        xml += '</SequenceQueue>\n';
        
        Utils.log(`✅ Convertite ${sequences.length} sequenze in formato EKOS .esq`, 'success');
        
        return xml;
    }
    
    /**
     * Parsa tempo esposizione (es. "1/1000" → 0.001, "2s" → 2)
     * @param {string} exposure - Tempo esposizione
     * @returns {number} Secondi
     */
    parseExposureTime(exposure) {
        if (!exposure) return 1.0;
        
        const expStr = exposure.toString().trim().toLowerCase();
        
        // Frazione (es. "1/1000")
        if (expStr.includes('/')) {
            const parts = expStr.split('/');
            const num = parseFloat(parts[0]);
            const den = parseFloat(parts[1]);
            return num / den;
        }
        
        // Con "s" (es. "2s")
        if (expStr.endsWith('s')) {
            return parseFloat(expStr.replace('s', ''));
        }
        
        // Numero semplice
        return parseFloat(expStr);
    }
    
    /**
     * Export sequenze come file .esq scaricabile
     * @param {Array} sequences - Sequenze da esportare
     */
    exportToFile(sequences) {
        try {
            Utils.log('Export EKOS .esq file...');
            
            // Converti in XML
            const xmlContent = this.convertToEkosFormat(sequences);
            
            // Crea Blob
            const blob = new Blob([xmlContent], { type: 'application/xml' });
            
            // Genera nome file con timestamp
            const timestamp = new Date().getTime();
            const filename = `ekos_eclipse_sequence_${timestamp}.esq`;
            
            // Scarica file
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            Utils.log(`✅ File EKOS esportato: ${filename}`, 'success');
            
            return {
                success: true,
                filename: filename,
                size: blob.size
            };
            
        } catch (error) {
            Utils.log(`❌ Errore export EKOS: ${error.message}`, 'error');
            throw error;
        }
    }
}

// Export singleton
const ekosConnector = new EkosConnector();

// Rendi disponibile globalmente
if (typeof window !== 'undefined') {
    window.ekosConnector = ekosConnector;
}
