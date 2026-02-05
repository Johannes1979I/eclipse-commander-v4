/**
 * ECLIPSE COMMANDER - MAIN.JS
 * Orchestratore principale applicazione
 * v3.0.0 - Modular Edition
 */

class EclipseCommander {
    constructor() {
        this.initialized = false;
        this.startTime = Date.now();
        this.currentMode = null;
        this.platformConnected = false;
    }
    
    /**
     * Inizializza applicazione completa
     */
    async initialize() {
        if (this.initialized) {
            Utils.log('App già inizializzata', 'warn');
            return;
        }
        
        Utils.log('=== ECLIPSE COMMANDER v3.0.0 ===');
        Utils.log('Inizializzazione app...');
        
        try {
            // 1. Setup error handlers globali
            this.setupErrorHandlers();
            
            // 1b. Inizializza Audio Manager
            audioManager.initialize();
            
            // 2. Inizializza UI controller
            await uiController.initialize();
            
            // 2b. Inizializza moduli UI
            locationPanel.initialize();
            modeSwitcher.initialize();
            equipmentPanel.initialize();
            eclipseSelector.initialize();
            notificationManager.initialize();
            countdownDisplay.initialize();
            eclipseSequences.initialize();  // ✅ Modulo sequenze semplificato
            
            // 2c. Collega sequenceUploader ai connectors (se disponibile)
            if (typeof sequenceUploader !== 'undefined') {
                sequenceUploader.setConnectors(ninaConnector, ekosConnector);
                Utils.log('✅ SequenceUploader collegato a NINA e Ekos connectors');
            } else {
                Utils.log('⚠️ SequenceUploader non disponibile', 'warn');
            }
            
            // 3. Setup connection handlers
            this.setupConnectionHandlers();
            
            // 4. Setup platform buttons
            this.setupPlatformButtons();
            
            // 5. Setup mode-specific handlers
            this.setupModeHandlers();
            
            // 6. Carica stato salvato
            await this.loadSavedState();
            
            // 7. Registra service worker
            this.registerServiceWorker();
            
            // 8. Setup PWA install prompt
            this.setupPWAInstall();
            
            // 9. Request wake lock se impostato
            const settings = Storage.loadSettings();
            if (settings.autoWakeLock) {
                Utils.requestWakeLock();
            }
            
            this.initialized = true;
            
            const elapsed = Date.now() - this.startTime;
            Utils.log(`App inizializzata con successo in ${elapsed}ms`);
            
            // Welcome message
            notificationManager.show('Eclipse Commander pronto! 🌑', 'success');
            
        } catch (error) {
            Utils.log('Errore fatale inizializzazione: ' + error.message, 'error');
            this.handleFatalError(error);
        }
    }
    
    /**
     * Setup error handlers globali
     */
    setupErrorHandlers() {
        // Catch errori non gestiti
        window.addEventListener('error', (event) => {
            Utils.log(`Errore non gestito: ${event.message}`, 'error');
            console.error(event.error);
            
            // Mostra alert all'utente per errori critici ✅
            if (event.error && event.error.message && event.error.message.includes('null')) {
                this.showErrorDialog(
                    'Errore Inizializzazione', 
                    event.error.message,
                    'Ricaricare l\'app può risolvere il problema.'
                );
            }
        });
        
        // Catch promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            Utils.log(`Promise rejection non gestita: ${event.reason}`, 'error');
            console.error(event.reason);
        });
        
        Utils.log('Error handlers globali configurati');
    }
    
    /**
     * Mostra dialog errore all'utente
     */
    showErrorDialog(title, message, suggestion) {
        // Crea modal errore se non esiste
        let errorModal = document.getElementById('errorModal');
        
        if (!errorModal) {
            errorModal = document.createElement('div');
            errorModal.id = 'errorModal';
            errorModal.className = 'modal';
            errorModal.style.display = 'block';
            errorModal.innerHTML = `
                <div class="modal-content" style="max-width: 500px; border: 2px solid #dc2626;">
                    <h2 style="color: #dc2626;">${title}</h2>
                    <p style="font-family: monospace; background: #1a1a1a; padding: 12px; border-radius: 4px;">
                        ${message}
                    </p>
                    <p>${suggestion}</p>
                    <button class="btn btn-primary btn-block" onclick="location.reload()">
                        🔄 Ricarica App
                    </button>
                </div>
            `;
            document.body.appendChild(errorModal);
        }
    }
    
    /**
     * Setup connection handlers
     */
    setupConnectionHandlers() {
        // Button connessione Ekos
        const btnEkos = document.getElementById('btnConnectEkos');
        if (btnEkos) {
            btnEkos.addEventListener('click', () => {
                this.handleConnectEkos();
            });
        }
        
        // Button connessione N.I.N.A.
        const btnNina = document.getElementById('btnConnectNina');
        if (btnNina) {
            btnNina.addEventListener('click', () => {
                this.handleConnectNina();
            });
        }
        
        Utils.log('Connection handlers configurati');
    }
    
    /**
     * Handler connessione Ekos
     */
    async handleConnectEkos() {
        try {
            notificationManager.show('Ricerca Ekos sulla rete...', 'info');
            
            // Auto-discovery
            const devices = await deviceDetector.scanEkosDevices();
            
            if (devices.length === 0) {
                // Prova IP di default
                notificationManager.show('Connessione a Ekos 192.168.4.1...', 'info');
                await platformAdapter.connect('ekos', '192.168.4.1', 8624);
            } else {
                // Usa primo trovato
                const device = devices[0];
                notificationManager.show(`Connessione a ${device.host}...`, 'info');
                await platformAdapter.connect('ekos', device.host, device.port);
            }
            
            // Successo
            this.platformConnected = true;
            
            notificationManager.show('Ekos connesso! ✓', 'success');
            
            // Auto-configura equipment
            await this.autoConfigureEquipment();
            
            // Dispatch evento
            window.dispatchEvent(new CustomEvent('platform:connected', {
                detail: 'ekos'
            }));
            
        } catch (error) {
            Utils.log('Errore connessione Ekos: ' + error.message, 'error');
            notificationManager.show('Connessione Ekos fallita: ' + error.message, 'error');
        }
    }
    
    /**
     * Handler connessione N.I.N.A.
     */
    async handleConnectNina() {
        try {
            notificationManager.show('Ricerca N.I.N.A...', 'info');
            
            // Auto-discovery
            const devices = await deviceDetector.scanNinaDevices();
            
            if (devices.length === 0) {
                // Prova localhost
                notificationManager.show('Connessione a N.I.N.A. localhost...', 'info');
                await platformAdapter.connect('nina', 'localhost', 1888);
            } else {
                // Usa primo trovato
                const device = devices[0];
                notificationManager.show(`Connessione a ${device.host}...`, 'info');
                await platformAdapter.connect('nina', device.host, device.port);
            }
            
            // Successo
            this.platformConnected = true;
            
            notificationManager.show('N.I.N.A. connesso! ✓', 'success');
            
            // Auto-configura equipment
            await this.autoConfigureEquipment();
            
            // Dispatch evento
            window.dispatchEvent(new CustomEvent('platform:connected', {
                detail: 'nina'
            }));
            
        } catch (error) {
            Utils.log('Errore connessione N.I.N.A.: ' + error.message, 'error');
            notificationManager.show('Connessione N.I.N.A. fallita: ' + error.message, 'error');
        }
    }
    
    /**
     * Auto-configura equipment da piattaforma
     */
    async autoConfigureEquipment() {
        try {
            const result = await platformAdapter.autoConfigureEquipment();
            
            if (result.success) {
                notificationManager.show('Equipment auto-configurato da piattaforma', 'success');
                
                // Refresh equipment panel
                equipmentPanel.refresh();
                
                // Ricalcola se eclissi selezionata
                if (eclipseMode.active && eclipseMode.selectedEclipse) {
                    await eclipseMode.calculateEclipseData();
                }
            }
            
        } catch (error) {
            Utils.log('Auto-config equipment fallito: ' + error.message, 'warn');
        }
    }
    
    /**
     * Setup platform-specific buttons
     */
    setupPlatformButtons() {
        // Button sequenze automatiche (solo modalità eclissi)
        const btnAutoSequence = document.getElementById('btnStartAutoSequence');
        if (btnAutoSequence) {
            btnAutoSequence.addEventListener('click', async () => {
                await this.handleStartAutoSequence();
            });
        }
        
        // Button calcola posizione sole (modalità solare)
        const btnCalculateSolar = document.getElementById('btnCalculateSolar');
        if (btnCalculateSolar) {
            btnCalculateSolar.addEventListener('click', () => {
                this.handleCalculateSolar();
            });
        }
    }
    
    /**
     * Handler avvio sequenze automatiche
     */
    async handleStartAutoSequence() {
        if (!this.platformConnected) {
            notificationManager.show('Connetti prima una piattaforma (Ekos o N.I.N.A.)', 'warning');
            return;
        }
        
        if (!eclipseMode.active || !eclipseMode.selectedEclipse) {
            notificationManager.show('Seleziona prima un\'eclissi', 'warning');
            return;
        }
        
        try {
            await eclipseMode.startAutoSequence();
            
            notificationManager.show('Sequenze automatiche ATTIVATE! 🚀', 'success', 0);
            
        } catch (error) {
            Utils.log('Errore avvio sequenze: ' + error.message, 'error');
            notificationManager.show('Errore: ' + error.message, 'error');
        }
    }
    
    /**
     * Handler calcolo posizione sole
     */
    handleCalculateSolar() {
        if (!solarMode.active) {
            solarMode.activate();
        }
        
        const sunPos = solarMode.updateSunPosition();
        
        if (sunPos) {
            uiController.updateSolarPosition();
            notificationManager.show(`Sole: ${sunPos.altitude.toFixed(1)}° altitudine`, 'info');
        } else {
            notificationManager.show('Imposta località per calcolare posizione sole', 'warning');
        }
    }
    
    /**
     * Setup mode-specific handlers
     */
    setupModeHandlers() {
        // Eventi modalità eclissi
        window.addEventListener('eclipse:countdown', (e) => {
            // Countdown già gestito da countdownDisplay
            // Log solo per debug
            // Utils.log(`Countdown: ${e.detail.phase}`);
        });
        
        window.addEventListener('eclipse:alarm', (e) => {
            // Allarmi già gestiti da notificationManager
            Utils.log(`Allarme: ${e.detail.message}`);
        });
        
        window.addEventListener('eclipse:sequence-complete', (e) => {
            Utils.log(`Sequenza completata: ${e.detail.sequence}`);
            notificationManager.show(
                `Sequenza ${e.detail.sequence} completata: ${e.detail.successCount} frame OK`,
                'success'
            );
        });
        
        // Eventi cambio modalità
        window.addEventListener('mode:changed', (e) => {
            this.currentMode = e.detail.mode;
            Utils.log(`Modalità attiva: ${this.currentMode}`);
            
            // Mostra/nascondi div modalità
            const eclipseModeDiv = document.getElementById('eclipseMode');
            const solarModeDiv = document.getElementById('solarMode');
            
            if (this.currentMode === 'eclipse') {
                if (eclipseModeDiv) eclipseModeDiv.classList.remove('hidden');
                if (solarModeDiv) solarModeDiv.classList.add('hidden');
                
                // Disattiva solar mode
                if (solarMode && solarMode.active) {
                    solarMode.deactivate();
                }
            } else if (this.currentMode === 'solar') {
                if (eclipseModeDiv) eclipseModeDiv.classList.add('hidden');
                if (solarModeDiv) solarModeDiv.classList.remove('hidden');
                
                // Attiva solar mode
                if (solarMode) {
                    solarMode.activate();
                }
            }
        });
        
        Utils.log('Mode handlers configurati');
    }
    
    /**
     * Carica stato salvato
     */
    async loadSavedState() {
        Utils.log('Caricamento stato salvato...');
        
        // Carica settings
        const settings = Storage.loadSettings();
        this.currentMode = settings.mode || 'eclipse';
        
        // Carica località
        const location = locationManager.getCurrentLocation();
        if (location) {
            Utils.log(`Località salvata: ${location.name}`);
        }
        
        // Carica equipment con validazione ✅
        const equipment = Storage.loadEquipment();
        if (equipment && equipment.telescope) {
            Utils.log(`Equipment salvato: ${equipment.telescope.name || 'Custom'}`);
        }
        
        // Carica ultima eclissi (già gestito da eclipseSelector)
        const lastEclipse = Storage.loadLastEclipse();
        if (lastEclipse) {
            Utils.log(`Ultima eclissi: ${lastEclipse}`);
        }
        
        Utils.log('Stato salvato caricato');
    }
    
    /**
     * Registra service worker
     */
    registerServiceWorker() {
        if (!Utils.supports.serviceWorker()) {
            Utils.log('Service Worker non supportato', 'warn');
            return;
        }
        
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                Utils.log('Service Worker registrato');
                
                // Update disponibile
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            notificationManager.show(
                                'Aggiornamento disponibile! Ricarica la pagina.',
                                'info',
                                0
                            );
                        }
                    });
                });
            })
            .catch(error => {
                Utils.log('Errore registrazione Service Worker: ' + error.message, 'warn');
            });
    }
    
    /**
     * Setup PWA install prompt
     */
    setupPWAInstall() {
        let deferredPrompt = null;
        
        window.addEventListener('beforeinstallprompt', (e) => {
            // Previeni prompt automatico
            e.preventDefault();
            deferredPrompt = e;
            
            Utils.log('PWA install prompt disponibile');
            
            // Mostra banner personalizzato
            this.showInstallBanner(deferredPrompt);
        });
        
        window.addEventListener('appinstalled', () => {
            Utils.log('PWA installata!');
            notificationManager.show('App installata con successo! 🎉', 'success');
            deferredPrompt = null;
        });
    }
    
    /**
     * Mostra banner installazione PWA
     */
    showInstallBanner(deferredPrompt) {
        // Crea banner
        const banner = document.createElement('div');
        banner.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 20px;
            right: 20px;
            background: var(--bg-secondary);
            border: 2px solid var(--accent-primary);
            border-radius: var(--border-radius);
            padding: var(--spacing-md);
            box-shadow: var(--shadow-lg);
            z-index: 9998;
            display: flex;
            align-items: center;
            gap: var(--spacing-md);
        `;
        
        banner.innerHTML = `
            <div style="flex: 1;">
                <strong>Installa Eclipse Commander</strong><br>
                <small>Usa come app nativa su questo dispositivo</small>
            </div>
            <button id="btnInstallPWA" class="btn btn-success">Installa</button>
            <button id="btnDismissPWA" class="btn btn-secondary">✗</button>
        `;
        
        document.body.appendChild(banner);
        
        // Handler installa
        document.getElementById('btnInstallPWA').addEventListener('click', async () => {
            if (!deferredPrompt) return;
            
            // Mostra prompt
            deferredPrompt.prompt();
            
            // Attendi scelta utente
            const result = await deferredPrompt.userChoice;
            
            if (result.outcome === 'accepted') {
                Utils.log('Utente ha accettato installazione PWA');
            } else {
                Utils.log('Utente ha rifiutato installazione PWA');
            }
            
            deferredPrompt = null;
            document.body.removeChild(banner);
        });
        
        // Handler dismiss
        document.getElementById('btnDismissPWA').addEventListener('click', () => {
            document.body.removeChild(banner);
        });
    }
    
    /**
     * Handler errore fatale
     */
    handleFatalError(error) {
        console.error('ERRORE FATALE:', error);
        
        // Mostra messaggio all'utente
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: var(--bg-secondary);
            border: 2px solid var(--accent-danger);
            border-radius: var(--border-radius);
            padding: var(--spacing-xl);
            max-width: 500px;
            z-index: 10000;
            text-align: center;
        `;
        
        errorDiv.innerHTML = `
            <h2 style="color: var(--accent-danger); margin-bottom: var(--spacing-md);">
                Errore Inizializzazione
            </h2>
            <p style="margin-bottom: var(--spacing-md);">
                ${error.message}
            </p>
            <button class="btn btn-primary" onclick="window.location.reload()">
                Ricarica App
            </button>
        `;
        
        document.body.appendChild(errorDiv);
    }
    
    /**
     * Ottieni stato app
     */
    getStatus() {
        return {
            initialized: this.initialized,
            currentMode: this.currentMode,
            platformConnected: this.platformConnected,
            platform: platformAdapter.currentPlatform,
            location: locationManager.getCurrentLocation() !== null,
            eclipse: eclipseMode.selectedEclipse !== null,
            equipment: telescopeManager.currentTelescope !== null,
            uptime: Date.now() - this.startTime
        };
    }
}

// === ISTANZA GLOBALE ===
const app = new EclipseCommander();

// === AUTO-START ===
// Avvia app quando DOM è pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        app.initialize();
    });
} else {
    // DOM già pronto
    app.initialize();
}

// === EXPORT GLOBALE (per debug console) ===
window.eclipseCommander = app;

// === DEBUG HELPERS (solo development) ===
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    window.debug = {
        app: app,
        eclipseMode: eclipseMode,
        solarMode: solarMode,
        locationManager: locationManager,
        telescopeManager: telescopeManager,
        platformAdapter: platformAdapter,
        deviceDetector: deviceDetector,
        eclipseDB: eclipseDB,
        uiController: uiController,
        storage: Storage,
        utils: Utils
    };
    
    console.log('🛠️ Debug mode attivo');
    console.log('Usa window.debug per accedere ai moduli');
    console.log('Esempio: debug.eclipseMode.getStatus()');
}
