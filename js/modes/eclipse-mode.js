/**
 * ECLIPSE MODE MODULE
 * Controller completo modalità ECLISSI
 */

class EclipseMode {
    constructor() {
        this.active = false;
        this.selectedEclipse = null;
        this.eclipseData = null;
        this.contactTimes = null;
        this.sequences = null;
        this.countdownInterval = null;
        this.autoSequenceActive = false;
        this.currentPhase = null;
        this.alarmHistory = [];
    }
    
    /**
     * Attiva modalità eclissi
     */
    activate() {
        this.active = true;
        Utils.log('Modalità ECLISSI attivata');
        
        // Carica ultima eclissi selezionata
        const lastEclipse = Storage.loadLastEclipse();
        if (lastEclipse) {
            this.loadEclipse(lastEclipse);
        }
    }
    
    /**
     * Disattiva modalità
     */
    deactivate() {
        this.stopCountdown();
        this.stopAutoSequence();
        this.active = false;
        Utils.log('Modalità ECLISSI disattivata');
    }
    
    /**
     * Seleziona eclissi (alias per loadEclipse)
     */
    async selectEclipse(eclipse) {
        if (typeof eclipse === 'string') {
            return await this.loadEclipse(eclipse);
        }
        // Se passato oggetto eclissi diretto
        return await this.loadEclipse(eclipse.id);
    }
    
    /**
     * Seleziona eclissi (alias per loadEclipse)
     */
    async selectEclipse(eclipse) {
        if (typeof eclipse === 'string') {
            return await this.loadEclipse(eclipse);
        }
        // Se passato oggetto eclissi diretto
        return await this.loadEclipse(eclipse.id);
    }
    
    /**
     * Carica eclissi dal database
     */
    async loadEclipse(eclipseId) {
        try {
            // Carica database se necessario
            if (!eclipseDB.loaded) {
                await eclipseDB.load();
            }
            
            // Trova eclissi
            this.selectedEclipse = eclipseDB.findById(eclipseId);
            
            if (!this.selectedEclipse) {
                throw new Error('Eclissi non trovata: ' + eclipseId);
            }
            
            Utils.log('Eclissi caricata: ' + this.selectedEclipse.name);
            
            // Salva come ultima
            Storage.saveLastEclipse(eclipseId);
            
            // Calcola per località corrente se disponibile
            const location = locationManager.getCurrentLocation();
            if (location) {
                this.calculateForCurrentLocation();
            }
            
            return this.selectedEclipse;
            
        } catch (error) {
            Utils.log('Errore caricamento eclissi: ' + error.message, 'error');
            throw error;
        }
    }
    
    /**
     * Calcola eclissi per località corrente
     */
    calculateForCurrentLocation() {
        const location = locationManager.getCurrentLocation();
        
        if (!location) {
            throw new Error('Località non impostata. Attiva GPS o inserisci manualmente.');
        }
        
        if (!this.selectedEclipse) {
            throw new Error('Nessuna eclissi selezionata');
        }
        
        Utils.log('Calcolo eclissi per località...');
        
        // Calcola tipo eclissi (totale/parziale/nessuna)
        this.eclipseData = eclipseDB.calculateForLocation(
            this.selectedEclipse,
            location.lat,
            location.lon
        );
        
        if (!this.eclipseData || this.eclipseData.type === 'none') {
            throw new Error('Eclissi non visibile da questa località');
        }
        
        Utils.log(`Tipo eclissi: ${this.eclipseData.type.toUpperCase()}`);
        Utils.log(`Coverage: ${this.eclipseData.coverage}%`);
        
        // Calcola tempi contatti
        this.contactTimes = timeCalc.calculateContactTimes(
            this.selectedEclipse,
            location.lat,
            location.lon,
            this.eclipseData
        );
        
        Utils.log('Tempi contatti calcolati');
        
        // Genera sequenze se equipment configurato
        this.generateSequences();
        
        return {
            eclipseData: this.eclipseData,
            contactTimes: this.contactTimes
        };
    }
    
    /**
     * Genera sequenze ottimizzate
     */
    generateSequences() {
        // Verifica equipment
        if (!telescopeManager.currentTelescope || !telescopeManager.currentCamera) {
            Utils.log('Equipment non configurato - usando sequenze default', 'warn');
            this.sequences = exposureOptimizer.optimizeEclipseSequences(null, null, 0);
            return this.sequences;
        }
        
        // Ottimizza per setup corrente
        const totalityDuration = this.eclipseData?.duration || 0;
        
        this.sequences = exposureOptimizer.optimizeEclipseSequences(
            telescopeManager.currentTelescope,
            telescopeManager.currentCamera,
            totalityDuration
        );
        
        Utils.log('Sequenze ottimizzate generate');
        Utils.log(`Frame totali: ${this.sequences.totalFrames}`);
        Utils.log(`Dimensione stimata: ${this.sequences.estimatedDataSize.total}`);
        
        return this.sequences;
    }
    
    /**
     * Avvia countdown real-time
     */
    startCountdown(callback) {
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
        }
        
        if (!this.contactTimes) {
            throw new Error('Tempi contatti non calcolati');
        }
        
        Utils.log('Countdown avviato');
        
        // Update immediato
        this.updateCountdown(callback);
        
        // Update ogni secondo
        this.countdownInterval = setInterval(() => {
            this.updateCountdown(callback);
        }, 1000);
    }
    
    /**
     * Aggiorna countdown
     */
    updateCountdown(callback) {
        const countdown = timeCalc.calculateCountdown(this.contactTimes);
        
        // Aggiorna fase corrente
        this.currentPhase = countdown.phase;
        
        // Calcola secondi rimanenti
        const secondsRemaining = countdown.timeRemaining 
            ? Math.floor(countdown.timeRemaining / 1000)
            : 0;
        
        // Verifica allarmi
        const alarms = timeCalc.checkAlarms(countdown, secondsRemaining);
        if (alarms) {
            this.handleAlarms(alarms);
        }
        
        // Callback con stato aggiornato
        if (callback) {
            callback({
                countdown: countdown,
                phase: this.currentPhase,
                secondsRemaining: secondsRemaining,
                formattedTime: timeCalc.formatCountdown(countdown.timeRemaining || 0)
            });
        }
    }
    
    /**
     * Gestisci allarmi
     */
    handleAlarms(alarms) {
        for (let alarm of alarms) {
            // Evita duplicati
            const alarmKey = `${alarm.event}-${alarm.seconds}`;
            if (this.alarmHistory.includes(alarmKey)) {
                continue;
            }
            
            this.alarmHistory.push(alarmKey);
            
            Utils.log(`ALLARME: ${alarm.message}`, 'warn');
            
            // Notifica audio
            this.playAlarm(alarm);
            
            // Vibrazione
            if (alarm.urgent) {
                Utils.vibrate([200, 100, 200, 100, 200]);
            } else {
                Utils.vibrate([200]);
            }
            
            // Notifica sistema
            Utils.showNotification('Eclipse Commander', {
                body: alarm.message,
                icon: '/icon-192.png',
                requireInteraction: alarm.urgent
            });
        }
    }
    
    /**
     * Play allarme sonoro
     */
    playAlarm(alarm) {
        // Crea beep usando Web Audio API
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = alarm.urgent ? 1000 : 800;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
            
            // Ripeti se urgente
            if (alarm.urgent) {
                setTimeout(() => this.playAlarm(alarm), 600);
            }
            
        } catch (error) {
            Utils.log('Audio non disponibile', 'warn');
        }
    }
    
    /**
     * Stop countdown
     */
    stopCountdown() {
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = null;
            Utils.log('Countdown fermato');
        }
    }
    
    /**
     * Avvia sequenze automatiche
     */
    async startAutoSequence() {
        if (!platformAdapter.connected) {
            throw new Error('Piattaforma non connessa. Connetti Ekos o N.I.N.A.');
        }
        
        if (!this.sequences) {
            throw new Error('Sequenze non generate. Configura equipment.');
        }
        
        if (!this.contactTimes || !this.contactTimes.C2) {
            throw new Error('Tempi contatti non calcolati per eclissi totale');
        }
        
        this.autoSequenceActive = true;
        
        Utils.log('Sequenze automatiche AVVIATE');
        Utils.log('Il sistema eseguirà automaticamente le sequenze bracketing durante la totalità');
        
        // Monitora timing e esegui sequenze
        await this.monitorAndExecuteSequences();
    }
    
    /**
     * Monitora timing ed esegui sequenze
     */
    async monitorAndExecuteSequences() {
        const timeline = this.sequences.timeline;
        
        for (let entry of timeline) {
            if (!this.autoSequenceActive) {
                Utils.log('Sequenze automatiche annullate', 'warn');
                break;
            }
            
            // Calcola tempo assoluto esecuzione
            const executeTime = new Date(this.contactTimes.C2.getTime() + entry.startOffset * 1000);
            
            Utils.log(`Sequenza ${entry.sequence} schedulata per ${Utils.formatTime(executeTime)}`);
            
            // Attendi momento giusto
            await this.waitUntil(executeTime);
            
            if (!this.autoSequenceActive) break;
            
            // Esegui sequenza
            Utils.log(`ESECUZIONE: ${entry.sequence}`);
            
            try {
                await this.executeSequence(entry.sequence);
            } catch (error) {
                Utils.log(`Errore sequenza ${entry.sequence}: ${error.message}`, 'error');
            }
        }
        
        this.autoSequenceActive = false;
        Utils.log('Sequenze automatiche COMPLETATE');
    }
    
    /**
     * Attendi fino a momento specificato
     */
    async waitUntil(targetTime) {
        while (new Date() < targetTime && this.autoSequenceActive) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }
    
    /**
     * Esegui sequenza specifica
     */
    async executeSequence(sequenceName) {
        const sequence = this.sequences[sequenceName];
        
        if (!sequence || !sequence.exposures) {
            throw new Error('Sequenza non trovata: ' + sequenceName);
        }
        
        // Prepara array shots
        const shots = sequence.exposures.map((exposure, index) => ({
            exposure: exposure,
            gain: this.sequences.cameraParams?.gainCorona || 120,
            binning: 1,
            name: `${sequenceName}_${index + 1}`
        }));
        
        // Esegui tramite platform adapter
        const results = await platformAdapter.captureSequence(shots);
        
        Utils.log(`Sequenza ${sequenceName} completata: ${results.length} frame`);
        
        return results;
    }
    
    /**
     * Stop sequenze automatiche
     */
    stopAutoSequence() {
        this.autoSequenceActive = false;
        Utils.log('Sequenze automatiche fermate');
    }
    
    /**
     * Cattura manuale singolo frame
     */
    async captureManual(exposure, gain) {
        if (!platformAdapter.connected) {
            throw new Error('Piattaforma non connessa');
        }
        
        Utils.log(`Cattura manuale: ${exposure}ms @ Gain ${gain}`);
        
        return await platformAdapter.captureImage(
            exposure / 1000, // ms to seconds
            gain,
            1 // binning
        );
    }
    
    /**
     * Ottieni lista eclissi disponibili
     */
    async getAvailableEclipses() {
        if (!eclipseDB.loaded) {
            await eclipseDB.load();
        }
        
        return eclipseDB.getAll();
    }
    
    /**
     * Ottieni eclissi visibili da località corrente
     */
    async getVisibleEclipses() {
        const location = locationManager.getCurrentLocation();
        
        if (!location) {
            throw new Error('Località non impostata');
        }
        
        if (!eclipseDB.loaded) {
            await eclipseDB.load();
        }
        
        const now = new Date();
        const future = new Date();
        future.setFullYear(future.getFullYear() + 10);
        
        return eclipseDB.findVisibleFrom(location.lat, location.lon, now, future);
    }
    
    /**
     * Ottieni prossima eclissi
     */
    async getNextEclipse() {
        if (!eclipseDB.loaded) {
            await eclipseDB.load();
        }
        
        return eclipseDB.findNearest();
    }
    
    /**
     * Export stato modalità
     */
    exportState() {
        return {
            active: this.active,
            eclipse: this.selectedEclipse,
            eclipseData: this.eclipseData,
            contactTimes: this.contactTimes,
            sequences: this.sequences,
            currentPhase: this.currentPhase,
            autoSequenceActive: this.autoSequenceActive
        };
    }
    
    /**
     * Genera report pre-eclissi
     */
    generatePreEclipseReport() {
        if (!this.selectedEclipse || !this.eclipseData) {
            throw new Error('Eclissi non configurata');
        }
        
        const location = locationManager.getCurrentLocation();
        
        return {
            eclipse: {
                name: this.selectedEclipse.name,
                date: Utils.formatDate(this.selectedEclipse.date),
                type: this.selectedEclipse.type
            },
            observation: {
                location: location?.name || 'Sconosciuta',
                coordinates: location ? 
                    `${location.lat.toFixed(4)}°, ${location.lon.toFixed(4)}°` : 
                    'N/A',
                eclipseType: this.eclipseData.type,
                coverage: `${this.eclipseData.coverage}%`,
                magnitude: this.eclipseData.magnitude?.toFixed(3),
                duration: this.eclipseData.duration ? 
                    Utils.formatDuration(this.eclipseData.duration) : 
                    'N/A'
            },
            timing: this.contactTimes ? {
                C1: Utils.formatTime(this.contactTimes.C1),
                C2: this.contactTimes.C2 ? Utils.formatTime(this.contactTimes.C2) : 'N/A',
                C3: this.contactTimes.C3 ? Utils.formatTime(this.contactTimes.C3) : 'N/A',
                C4: Utils.formatTime(this.contactTimes.C4),
                totalDuration: Utils.formatDuration(this.contactTimes.partialDuration)
            } : null,
            equipment: telescopeManager.currentTelescope && telescopeManager.currentCamera ? {
                telescope: telescopeManager.currentTelescope.name,
                camera: telescopeManager.currentCamera.name,
                fov: telescopeManager.calculations?.fov.widthArcmin + "' × " + 
                     telescopeManager.calculations?.fov.heightArcmin + "'",
                sampling: telescopeManager.calculations?.sampling.value + '"/pixel'
            } : null,
            sequences: this.sequences ? {
                totalFrames: this.sequences.totalFrames,
                dataSize: this.sequences.estimatedDataSize?.total,
                phases: Object.keys(this.sequences).filter(k => 
                    typeof this.sequences[k] === 'object' && this.sequences[k].exposures
                ).length
            } : null
        };
    }
}

// Export singleton
const eclipseMode = new EclipseMode();
