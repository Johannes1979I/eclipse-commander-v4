/**
 * NINA CONNECTOR MODULE
 * Connessione a N.I.N.A. Advanced API (v1 e v2)
 */

class NinaConnector {
    constructor() {
        this.baseUrl = null;
        this.connected = false;
        this.apiVersion = null;
        this.devices = [];
        this.pollInterval = null;
    }
    
    /**
     * Connetti a N.I.N.A.
     * @param {string} host - IP o hostname
     * @param {number} port - Porta (default 1888)
     */
    async connect(host, port = CONFIG.NINA_DEFAULT_PORT) {
        try {
            this.baseUrl = `http://${host}:${port}`;
            
            Utils.log(`Connessione a N.I.N.A.: ${this.baseUrl}`);
            
            // Auto-detect API version
            const version = await this.detectApiVersion();
            
            if (!version) {
                throw new Error('N.I.N.A. Advanced API non trovata. Verifica che il plugin sia installato e attivo.');
            }
            
            this.apiVersion = version;
            this.connected = true;
            
            Utils.log(`N.I.N.A. API ${version} connessa`);
            
            // Carica dispositivi
            await this.updateDevices();
            
            // Avvia polling
            this.startPolling();
            
            return {
                success: true,
                apiVersion: version,
                url: this.baseUrl
            };
            
        } catch (error) {
            Utils.log('Errore connessione N.I.N.A.: ' + error.message, 'error');
            this.connected = false;
            
            // Messaggi di errore più utili ✅
            let userMessage = error.message;
            
            if (error.message.includes('Failed to fetch')) {
                userMessage = `Impossibile raggiungere N.I.N.A. su ${this.baseUrl}. Verifica che:
• N.I.N.A. sia in esecuzione
• L'Advanced API plugin sia installato e attivo
• L'indirizzo ${host} sia corretto
• La porta ${port} sia aperta (default: 1888)
• Non ci siano firewall che bloccano la connessione`;
            } else if (error.message.includes('NetworkError')) {
                userMessage = `Errore di rete: verifica connessione a ${host}`;
            }
            
            throw new Error(userMessage);
        }
    }
    
    /**
     * Rileva versione API (v1 o v2)
     * USA ENDPOINT /version UFFICIALE
     */
    async detectApiVersion() {
        // Prova v2 con endpoint ufficiale /version
        try {
            const responseV2 = await fetch(`${this.baseUrl}/v2/api/version`, {
                method: 'GET',
                signal: AbortSignal.timeout(3000)
            });
            
            if (responseV2.ok) {
                const data = await responseV2.json();
                
                // Verifica formato risposta API v2
                if (data && (data.Response || data.Success !== undefined)) {
                    Utils.log('N.I.N.A. API v2 rilevata - Version: ' + (data.Response || 'unknown'));
                    return 'v2';
                }
            }
        } catch (e) {
            Utils.log('Test v2 fallito: ' + e.message, 'debug');
        }
        
        // Prova v1
        try {
            const responseV1 = await fetch(`${this.baseUrl}/api/version`, {
                method: 'GET',
                signal: AbortSignal.timeout(3000)
            });
            
            if (responseV1.ok) {
                Utils.log('N.I.N.A. API v1 rilevata');
                return 'v1';
            }
        } catch (e) {
            Utils.log('Test v1 fallito: ' + e.message, 'debug');
        }
        
        return null;
    }
    
    /**
     * Disconnetti da N.I.N.A.
     */
    disconnect() {
        this.stopPolling();
        this.connected = false;
        this.devices = [];
        this.baseUrl = null;
        this.apiVersion = null;
        
        Utils.log('N.I.N.A. disconnesso');
    }
    
    /**
     * Aggiorna lista dispositivi
     */
    async updateDevices() {
        if (!this.connected) return [];
        
        try {
            const endpoint = this.apiVersion === 'v2' 
                ? '/v2/api/equipment/info'
                : '/api/equipment/info';
            
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                method: 'GET'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            // Verifica Content-Type della risposta ✅
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const text = await response.text();
                const preview = text.substring(0, 100);
                throw new Error(
                    `N.I.N.A. non risponde con JSON (ricevuto ${contentType || 'unknown'}). ` +
                    `Verifica che l'Advanced API plugin sia attivo. Preview: ${preview}...`
                );
            }
            
            const data = await response.json();
            
            // Processa dispositivi
            this.devices = [];
            
            // Camera
            if (data.camera && data.camera.connected) {
                this.devices.push({
                    name: data.camera.name,
                    type: 'camera',
                    connected: true,
                    info: data.camera
                });
            }
            
            // Mount
            if (data.telescope && data.telescope.connected) {
                this.devices.push({
                    name: data.telescope.name,
                    type: 'mount',
                    connected: true,
                    info: data.telescope
                });
            }
            
            // Focuser
            if (data.focuser && data.focuser.connected) {
                this.devices.push({
                    name: data.focuser.name,
                    type: 'focuser',
                    connected: true,
                    info: data.focuser
                });
            }
            
            // Filter Wheel
            if (data.filterWheel && data.filterWheel.connected) {
                this.devices.push({
                    name: data.filterWheel.name,
                    type: 'filterwheel',
                    connected: true,
                    info: data.filterWheel
                });
            }
            
            Utils.log(`N.I.N.A. dispositivi trovati: ${this.devices.length}`);
            
            return this.devices;
            
        } catch (error) {
            Utils.log('Errore update dispositivi N.I.N.A.: ' + error.message, 'warn');
            return this.devices;
        }
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
    async getCameraDetails(cameraName = null) {
        const cameras = this.getCameras();
        if (cameras.length === 0) {
            return null;
        }
        
        const camera = cameraName 
            ? cameras.find(c => c.name === cameraName)
            : cameras[0];
        
        if (!camera || !camera.info) {
            return null;
        }
        
        const info = camera.info;
        
        // Mappa proprietà N.I.N.A. a formato standard
        const details = {
            name: info.name,
            type: this.detectCameraType(info.name),
            connected: true,
            width: info.pixelSizeX ? Math.round(info.sensorSizeX / info.pixelSizeX) : 0,
            height: info.pixelSizeY ? Math.round(info.sensorSizeY / info.pixelSizeY) : 0,
            pixelSize: info.pixelSizeX || info.pixelSize || 0,
            bitDepth: info.bitDepth || 16,
            hasCooling: info.canSetTemperature || false,
            temperature: info.temperature,
            gainMin: info.gainMin || 0,
            gainMax: info.gainMax || 100,
            gainUnity: Math.round((info.gainMin + info.gainMax) / 2) // Stima
        };
        
        // Calcola dimensioni sensore se non fornite
        if (details.width === 0 && info.sensorSizeX) {
            details.sensorWidth = info.sensorSizeX;
            details.sensorHeight = info.sensorSizeY;
        }
        
        return details;
    }
    
    /**
     * Rileva tipo camera dal nome
     */
    detectCameraType(name) {
        if (!name) return 'generic';
        
        const nameLower = name.toLowerCase();
        
        if (nameLower.includes('asi') || nameLower.includes('zwo') ||
            nameLower.includes('qhy') || nameLower.includes('atik')) {
            return 'cmos';
        }
        
        if (nameLower.includes('canon') || nameLower.includes('nikon') ||
            nameLower.includes('sony') || nameLower.includes('pentax')) {
            return 'dslr';
        }
        
        return 'generic';
    }
    
    /**
     * Imposta temperatura camera
     */
    async setCameraTemperature(temperature) {
        try {
            const endpoint = this.apiVersion === 'v2'
                ? '/v2/api/camera/temperature'
                : '/api/camera/temperature';
            
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    temperature: temperature,
                    enable: true
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            Utils.log(`Temperatura camera impostata: ${temperature}°C`);
            
            return true;
            
        } catch (error) {
            Utils.log('Errore set temperatura: ' + error.message, 'error');
            return false;
        }
    }
    
    /**
     * Imposta gain camera
     */
    async setCameraGain(gain) {
        try {
            const endpoint = this.apiVersion === 'v2'
                ? '/v2/api/camera/gain'
                : '/api/camera/gain';
            
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    gain: gain
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            Utils.log(`Gain camera impostato: ${gain}`);
            
            return true;
            
        } catch (error) {
            Utils.log('Errore set gain: ' + error.message, 'error');
            return false;
        }
    }
    
    /**
     * Imposta offset camera
     */
    async setCameraOffset(offset) {
        try {
            const endpoint = this.apiVersion === 'v2'
                ? '/v2/api/camera/offset'
                : '/api/camera/offset';
            
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    offset: offset
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            Utils.log(`Offset camera impostato: ${offset}`);
            
            return true;
            
        } catch (error) {
            Utils.log('Errore set offset: ' + error.message, 'error');
            return false;
        }
    }
    
    /**
     * Cattura immagine
     */
    async captureImage(exposure, gain = null, binning = 1) {
        try {
            // Imposta parametri se forniti
            if (gain !== null) {
                await this.setCameraGain(gain);
            }
            
            // Costruisci richiesta cattura
            const endpoint = this.apiVersion === 'v2'
                ? '/v2/api/camera/capture'
                : '/api/camera/capture';
            
            const body = {
                exposureTime: exposure,
                binning: binning,
                imageType: 'LIGHT'
            };
            
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            Utils.log(`Esposizione N.I.N.A. avviata: ${exposure}s @ Gain ${gain}`);
            
            return {
                success: true,
                exposure: exposure,
                gain: gain,
                binning: binning
            };
            
        } catch (error) {
            Utils.log('Errore capture N.I.N.A.: ' + error.message, 'error');
            throw error;
        }
    }
    
    /**
     * Cattura sequenza
     */
    async captureSequence(sequence) {
        const results = [];
        
        for (let i = 0; i < sequence.length; i++) {
            const shot = sequence[i];
            
            try {
                const result = await this.captureImage(
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
     * Ferma esposizione corrente
     */
    async abortExposure() {
        try {
            const endpoint = this.apiVersion === 'v2'
                ? '/v2/api/camera/abort'
                : '/api/camera/abort';
            
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                method: 'POST'
            });
            
            if (response.ok) {
                Utils.log('Esposizione abortita');
                return true;
            }
            
            return false;
            
        } catch (error) {
            Utils.log('Errore abort: ' + error.message, 'error');
            return false;
        }
    }
    
    /**
     * Avvia polling stato
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
     * Test connessione REALE
     * Verifica se N.I.N.A. risponde su /version
     */
    async testConnection(host, port = CONFIG.NINA_DEFAULT_PORT) {
        try {
            Utils.log(`Test connessione NINA: ${host}:${port}`, 'debug');
            
            // Test v2 con endpoint /version
            let response = await fetch(`http://${host}:${port}/v2/api/version`, {
                method: 'GET',
                signal: AbortSignal.timeout(3000)
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data && (data.Response || data.Success !== undefined)) {
                    Utils.log(`✅ NINA v2 trovato su ${host}:${port}`, 'success');
                    return true;
                }
            }
            
            // Test v1
            response = await fetch(`http://${host}:${port}/api/version`, {
                method: 'GET',
                signal: AbortSignal.timeout(3000)
            });
            
            if (response.ok) {
                Utils.log(`✅ NINA v1 trovato su ${host}:${port}`, 'success');
                return true;
            }
            
            Utils.log(`❌ NINA non trovato su ${host}:${port}`, 'debug');
            return false;
            
        } catch (error) {
            Utils.log(`❌ Test fallito ${host}:${port} - ${error.message}`, 'debug');
            return false;
        }
    }
    
    /**
     * Scan rete per trovare N.I.N.A.
     */
    async scanNetwork(subnet = '192.168') {
        Utils.log('Scan rete N.I.N.A....');
        
        const hosts = [];
        const promises = [];
        
        // Scan IP comuni
        const commonIPs = [
            'localhost',
            '127.0.0.1',
            `${subnet}.1.100`,
            `${subnet}.1.101`,
            `${subnet}.1.102`,
            `${subnet}.4.1`
        ];
        
        for (let ip of commonIPs) {
            promises.push(
                this.testConnection(ip).then(success => {
                    if (success) {
                        hosts.push({
                            host: ip,
                            port: CONFIG.NINA_DEFAULT_PORT,
                            url: `http://${ip}:${CONFIG.NINA_DEFAULT_PORT}`
                        });
                    }
                }).catch(() => {})
            );
        }
        
        await Promise.allSettled(promises);
        
        Utils.log(`N.I.N.A. trovati: ${hosts.length}`);
        
        return hosts;
    }
    
    /**
     * ========================================
     * UPLOAD SEQUENZE A N.I.N.A. - REALE!
     * ========================================
     */
    
    /**
     * Carica sequenze su N.I.N.A. (VERO!)
     * @param {Array} sequences - Array di sequenze Eclipse Commander
     * @returns {Object} Risultato upload
     */
    async uploadSequences(sequences) {
        if (!this.connected) {
            throw new Error('N.I.N.A. non connesso. Connetti prima di inviare sequenze.');
        }
        
        try {
            Utils.log('🚀 Inizio upload sequenze a N.I.N.A...', 'info');
            Utils.log(`Sequenze da inviare: ${sequences.length}`, 'info');
            
            // Converti in formato NINA Advanced Sequencer
            const ninaJSON = this.convertToNINAFormat(sequences);
            
            Utils.log('📦 Formato NINA creato', 'debug');
            Utils.log('JSON size: ' + JSON.stringify(ninaJSON).length + ' bytes', 'debug');
            
            // Endpoint per v2
            const endpoint = this.apiVersion === 'v2'
                ? `${this.baseUrl}/v2/api/sequence/load`
                : `${this.baseUrl}/api/sequence/load`;
            
            Utils.log(`📡 Invio a: ${endpoint}`, 'info');
            
            // Invia a NINA
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(ninaJSON),
                signal: AbortSignal.timeout(10000) // 10s timeout
            });
            
            // Verifica risposta
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }
            
            const result = await response.json();
            
            Utils.log('✅ Sequenze caricate su N.I.N.A.!', 'success');
            Utils.log('Risposta NINA: ' + JSON.stringify(result), 'debug');
            
            // Verifica formato risposta v2
            if (this.apiVersion === 'v2') {
                if (result.Success) {
                    return {
                        success: true,
                        message: result.Response || 'Sequenze caricate',
                        uploaded: sequences.length,
                        apiResponse: result
                    };
                } else {
                    throw new Error(result.Error || 'Errore sconosciuto da NINA');
                }
            }
            
            // v1 risposta
            return {
                success: true,
                message: 'Sequenze caricate',
                uploaded: sequences.length,
                apiResponse: result
            };
            
        } catch (error) {
            Utils.log('❌ Errore upload sequenze: ' + error.message, 'error');
            
            // Messaggio utente friendly
            let userMessage = error.message;
            
            if (error.message.includes('400')) {
                userMessage = 'NINA ha rifiutato le sequenze. Verifica che NINA sia nella scheda Sequencer.';
            } else if (error.message.includes('500')) {
                userMessage = 'Errore interno NINA. Controlla i log di NINA.';
            } else if (error.message.includes('timeout')) {
                userMessage = 'Timeout: NINA non risponde. Verifica che NINA sia in esecuzione.';
            } else if (error.message.includes('Failed to fetch')) {
                userMessage = 'Impossibile raggiungere NINA. Connessione persa?';
            }
            
            return {
                success: false,
                error: userMessage,
                details: error.message
            };
        }
    }
    
    /**
     * Converti sequenze Eclipse Commander → NINA Advanced Sequencer JSON
     * @param {Array} sequences - Sequenze EC
     * @returns {Object} JSON NINA format
     */
    convertToNINAFormat(sequences) {
        Utils.log('Conversione formato NINA con ObservableCollections...', 'debug');
        
        // ✅ Ottieni equipment per Unity Gain automatico
        const equipment = equipmentPanel ? equipmentPanel.getCurrentEquipment() : null;
        const camera = equipment ? equipment.camera : null;
        
        if (camera) {
            Utils.log(`Camera rilevata: ${camera.name} (Unity Gain: ${camera.unityGain || 'N/A'})`);
        }
        
        // Struttura base NINA Advanced Sequencer (FORMATO CORRETTO CON ObservableCollection!)
        const ninaSequence = {
            "$type": "NINA.Sequencer.Container.SequenceRootContainer, NINA.Sequencer",
            "Name": "Eclipse Sequence - Eclipse Commander",
            "Description": `Sequenza eclissi generata da Eclipse Commander - ${sequences.length} fasi`,
            "Strategy": {
                "$type": "NINA.Sequencer.Container.ExecutionStrategy.SequentialStrategy, NINA.Sequencer"
            },
            "Conditions": {
                "$type": "System.Collections.ObjectModel.ObservableCollection`1[[NINA.Sequencer.Conditions.ISequenceCondition, NINA.Sequencer]], System",
                "$values": []
            },
            "Triggers": {
                "$type": "System.Collections.ObjectModel.ObservableCollection`1[[NINA.Sequencer.Trigger.ISequenceTrigger, NINA.Sequencer]], System",
                "$values": []
            },
            "Items": {
                "$type": "System.Collections.ObjectModel.ObservableCollection`1[[NINA.Sequencer.SequenceItem.ISequenceItem, NINA.Sequencer]], System",
                "$values": []
            }
        };
        
        // Converti ogni sequenza in instruction NINA
        sequences.forEach((seq, index) => {
            Utils.log(`Converti sequenza ${index+1}: ${seq.name}`, 'debug');
            
            // Container per questa fase (FORMATO CORRETTO!)
            const phaseContainer = {
                "$type": "NINA.Sequencer.Container.SequentialContainer, NINA.Sequencer",
                "Name": seq.name || `Fase ${index + 1}`,
                "Description": seq.description || seq.phase || '',
                "Strategy": {
                    "$type": "NINA.Sequencer.Container.ExecutionStrategy.SequentialStrategy, NINA.Sequencer"
                },
                "Conditions": {
                    "$type": "System.Collections.ObjectModel.ObservableCollection`1[[NINA.Sequencer.Conditions.ISequenceCondition, NINA.Sequencer]], System",
                    "$values": []
                },
                "Triggers": {
                    "$type": "System.Collections.ObjectModel.ObservableCollection`1[[NINA.Sequencer.Trigger.ISequenceTrigger, NINA.Sequencer]], System",
                    "$values": []
                },
                "IsExpanded": true,
                "Items": {
                    "$type": "System.Collections.ObjectModel.ObservableCollection`1[[NINA.Sequencer.SequenceItem.ISequenceItem, NINA.Sequencer]], System",
                    "$values": []
                }
            };
            
            // Aggiungi istruzioni per ogni esposizione
            if (seq.exposures && seq.exposures.length > 0) {
                const shots = seq.shots || 1;
                
                // ✅ Calcola Gain/ISO automatico (Unity Gain o manuale)
                let finalGain = null;
                let finalOffset = null;
                let finalISO = null;
                
                if (seq.cameraType === 'cmos') {
                    // CMOS: Gain + Offset
                    if (seq.gain !== undefined && seq.gain !== null && seq.gain !== '') {
                        finalGain = parseInt(seq.gain);  // Gain manuale (override)
                        Utils.log(`🎛️ Gain manuale: ${finalGain}`);
                    } else if (camera && camera.unityGain) {
                        finalGain = camera.unityGain;  // Unity Gain automatico
                        Utils.log(`📷 Unity Gain automatico: ${finalGain} (${camera.name})`);
                    }
                    
                    if (seq.offset !== undefined && seq.offset !== null && seq.offset !== '') {
                        finalOffset = parseInt(seq.offset);
                    } else {
                        finalOffset = 10;  // Offset standard
                    }
                } else if (seq.cameraType === 'dslr') {
                    // DSLR: ISO
                    if (seq.iso !== undefined && seq.iso !== null && seq.iso !== '') {
                        finalISO = parseInt(seq.iso);  // ISO manuale
                        Utils.log(`📷 ISO manuale: ${finalISO}`);
                    } else {
                        finalISO = 400;  // ISO standard
                    }
                }
                
                // ✅ SmartExposure per ogni esposizione (STRUTTURA SEMPLICE!)
                seq.exposures.forEach((exposure, expIndex) => {
                    const exposureTime = this.parseExposureTime(exposure);
                    
                    const smartExposure = {
                        "$type": "NINA.Sequencer.SequenceItem.Imaging.SmartExposure, NINA.Sequencer",
                        "Name": exposure,
                        "Description": `${shots} × ${exposure} - ${seq.name}`,
                        "ExposureTime": exposureTime,
                        "ExposureCount": shots,
                        "ImageType": "LIGHT",
                        "Dither": true,
                        "DitherAfterEveryNthExposure": 3,
                        "Attempts": 1
                    };
                    
                    // Aggiungi parametri camera
                    if (finalGain !== null) {
                        smartExposure.Gain = finalGain;
                    }
                    if (finalOffset !== null) {
                        smartExposure.Offset = finalOffset;
                    }
                    if (finalISO !== null) {
                        smartExposure.Gain = finalISO;  // NINA usa "Gain" anche per ISO DSLR
                    }
                    
                    // Binning
                    smartExposure.Binning = {
                        "X": seq.binning || 1,
                        "Y": seq.binning || 1
                    };
                    
                    phaseContainer.Items.$values.push(smartExposure);
                });
            } else {
                // Se non ci sono esposizioni, crea un'annotation
                Utils.log(`⚠️ Sequenza ${seq.name} senza esposizioni`, 'warn');
                
                const annotation = {
                    "$type": "NINA.Sequencer.SequenceItem.Utility.Annotation, NINA.Sequencer",
                    "Name": "Info",
                    "Description": seq.name,
                    "Text": `Fase: ${seq.name}\nDurata: ${seq.duration}s\nFiltro: ${seq.filter || 'Non specificato'}`
                };
                
                phaseContainer.Items.$values.push(annotation);
            }
            
            ninaSequence.Items.$values.push(phaseContainer);
        });
        
        Utils.log(`✅ Convertite ${sequences.length} sequenze in formato NINA ObservableCollection`, 'success');
        
        return ninaSequence;
    }
    
    /**
     * Parsa tempo esposizione (es. "1/1000" → 0.001, "2s" → 2)
     * @param {string} exposure - Tempo esposizione
     * @returns {number} Secondi
     */
    parseExposureTime(exposure) {
        if (typeof exposure === 'number') {
            return exposure;
        }
        
        const str = String(exposure).trim();
        
        // Frazione (es. "1/1000")
        if (str.includes('/')) {
            const parts = str.split('/');
            const numerator = parseFloat(parts[0]);
            const denominator = parseFloat(parts[1]);
            return numerator / denominator;
        }
        
        // Secondi (es. "2s", "0.001s")
        if (str.endsWith('s')) {
            return parseFloat(str.replace('s', ''));
        }
        
        // Numero puro
        return parseFloat(str) || 1.0;
    }
    
    /**
     * Ottieni stato connessione
     */
    getStatus() {
        return {
            connected: this.connected,
            url: this.baseUrl,
            apiVersion: this.apiVersion,
            devices: this.devices.length,
            cameras: this.getCameras().length
        };
    }
}

// Export singleton
const ninaConnector = new NinaConnector();
