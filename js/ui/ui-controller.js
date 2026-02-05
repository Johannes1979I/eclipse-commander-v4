/**
 * UI CONTROLLER - FIXED VERSION
 * Handler connessione manuale + tutti gli altri controlli UI
 */

class UIController {
    constructor() {
        this.initialized = false;
    }
    
    initialize() {
        if (this.initialized) return;
        
        // Location buttons gestiti da locationPanel.js
        // this.initializeLocationButtons(); // RIMOSSO - gestito da locationPanel
        
        this.initializePlatformButtons();
        this.initializeSolarButtons();
        
        this.initialized = true;
        Utils.log('UI Controller inizializzato');
    }
    
    initializePlatformButtons() {
        // Ekos button
        const btnEkos = document.getElementById('btnConnectEkos');
        if (btnEkos) {
            btnEkos.addEventListener('click', async () => {
                await this.connectToEkos();
            });
        }
        
        // Nina button
        const btnNina = document.getElementById('btnConnectNina');
        if (btnNina) {
            btnNina.addEventListener('click', async () => {
                await this.connectToNina();
            });
        }
        
        // ⭐ PULSANTE TEST CONNESSIONE NINA ⭐
        const btnTestNina = document.getElementById('btnTestNina');
        if (btnTestNina) {
            btnTestNina.addEventListener('click', async () => {
                await this.testNinaConnection();
            });
        }
        
        // ⭐ FIX: CONNESSIONE MANUALE CHECKBOX ⭐
        const chkManual = document.getElementById('chkManualConnection');
        const manualDiv = document.getElementById('manualConnectionDiv');
        
        if (chkManual && manualDiv) {
            chkManual.addEventListener('change', (e) => {
                if (e.target.checked) {
                    // MOSTRA FORM CONNESSIONE MANUALE
                    manualDiv.classList.remove('hidden');
                    Utils.log('Connessione manuale abilitata');
                } else {
                    // NASCONDI FORM
                    manualDiv.classList.add('hidden');
                }
            });
        }
        
        // ⭐ FIX: PULSANTE CONNETTI MANUALE ⭐
        const btnConnectManual = document.getElementById('btnConnectManual');
        if (btnConnectManual) {
            btnConnectManual.addEventListener('click', async () => {
                const host = document.getElementById('inputHost')?.value || 'localhost';
                const port = parseInt(document.getElementById('inputPort')?.value) || 8624;
                
                // Determina piattaforma da porta
                if (port === 8624 || port === 7624) {
                    await this.connectToEkos(host, port);
                } else if (port === 1888) {
                    await this.connectToNina(host, port);
                } else {
                    notificationManager.show('Porta non riconosciuta. Usa 8624 (Ekos) o 1888 (N.I.N.A.)', 'warning');
                }
            });
        }
    }
    
    initializeSolarButtons() {
        const btnCalculate = document.getElementById('btnCalculateSolar');
        if (btnCalculate) {
            btnCalculate.addEventListener('click', () => {
                if (solarMode) {
                    solarMode.calculateSolarPosition();
                }
            });
        }
        
        const btnTimelapse = document.getElementById('btnStartTimelapse');
        if (btnTimelapse) {
            btnTimelapse.addEventListener('click', () => {
                if (solarMode) {
                    solarMode.startTimelapse();
                }
            });
        }
    }
    
    async connectToEkos(host = 'localhost', port = 8624) {
        try {
            notificationManager.show(`Connessione a Ekos ${host}:${port}...`, 'info');
            
            const success = await ekosConnector.connect(host, port);
            
            if (success) {
                notificationManager.show('✅ Connesso a Ekos!', 'success');
                this.updateConnectionStatus('Ekos', 'connected');
            } else {
                notificationManager.show('❌ Connessione a Ekos fallita', 'error');
                this.updateConnectionStatus('Ekos', 'failed');
            }
        } catch (error) {
            Utils.log('Errore connessione Ekos: ' + error.message, 'error');
            notificationManager.show('Errore: ' + error.message, 'error');
            this.updateConnectionStatus('Ekos', 'error');
        }
    }
    
    async connectToNina(host = 'localhost', port = 1888) {
        try {
            notificationManager.show(`Connessione a N.I.N.A. ${host}:${port}...`, 'info');
            
            // Mostra indicatore
            this.updateNinaStatusIndicator('connecting', host, port);
            
            const result = await ninaConnector.connect(host, port);
            
            if (result.success) {
                notificationManager.show('✅ Connesso a N.I.N.A.!', 'success');
                this.updateConnectionStatus('N.I.N.A.', 'connected');
                this.updateNinaStatusIndicator('connected', host, port, result.apiVersion);
            } else {
                notificationManager.show('❌ Connessione a N.I.N.A. fallita', 'error');
                this.updateConnectionStatus('N.I.N.A.', 'failed');
                this.updateNinaStatusIndicator('failed', host, port);
            }
        } catch (error) {
            Utils.log('Errore connessione N.I.N.A.: ' + error.message, 'error');
            notificationManager.show('Errore: ' + error.message, 'error');
            this.updateConnectionStatus('N.I.N.A.', 'error');
            this.updateNinaStatusIndicator('error', host, port, null, error.message);
        }
    }
    
    /**
     * Test connessione NINA (senza connettersi)
     */
    async testNinaConnection() {
        try {
            const host = document.getElementById('inputHost')?.value || 'localhost';
            const port = parseInt(document.getElementById('inputPort')?.value) || 1888;
            
            notificationManager.show(`🔍 Test connessione N.I.N.A. ${host}:${port}...`, 'info');
            
            this.updateNinaStatusIndicator('testing', host, port);
            
            // Test reale
            const isAvailable = await ninaConnector.testConnection(host, port);
            
            if (isAvailable) {
                notificationManager.show('✅ N.I.N.A. trovato e raggiungibile!', 'success');
                this.updateNinaStatusIndicator('available', host, port);
            } else {
                notificationManager.show('❌ N.I.N.A. non raggiungibile. Verifica che sia acceso e che l\'Advanced API plugin sia attivo.', 'error');
                this.updateNinaStatusIndicator('unavailable', host, port);
            }
            
        } catch (error) {
            Utils.log('Errore test N.I.N.A.: ' + error.message, 'error');
            notificationManager.show('Errore test: ' + error.message, 'error');
            this.updateNinaStatusIndicator('error', 'localhost', 1888, null, error.message);
        }
    }
    
    /**
     * Aggiorna indicatore visivo stato NINA
     */
    updateNinaStatusIndicator(status, host, port, apiVersion = null, errorMsg = null) {
        const indicator = document.getElementById('ninaStatusIndicator');
        const icon = document.getElementById('ninaStatusIcon');
        const text = document.getElementById('ninaStatusText');
        const details = document.getElementById('ninaStatusDetails');
        
        if (!indicator || !icon || !text || !details) return;
        
        // Mostra indicatore
        indicator.classList.remove('hidden');
        
        // Stili base
        let borderColor = '#444';
        let iconText = '🔴';
        let statusText = 'N.I.N.A. Non Connesso';
        let detailsText = '';
        
        switch (status) {
            case 'connecting':
                borderColor = '#ffa500';
                iconText = '🟡';
                statusText = 'Connessione in corso...';
                detailsText = `${host}:${port}`;
                break;
                
            case 'testing':
                borderColor = '#ffa500';
                iconText = '🔍';
                statusText = 'Test connessione...';
                detailsText = `${host}:${port}`;
                break;
                
            case 'connected':
                borderColor = '#4caf50';
                iconText = '🟢';
                statusText = 'N.I.N.A. Connesso';
                detailsText = `${host}:${port} • API ${apiVersion || 'v2'}`;
                break;
                
            case 'available':
                borderColor = '#4caf50';
                iconText = '✅';
                statusText = 'N.I.N.A. Disponibile';
                detailsText = `${host}:${port} è raggiungibile`;
                break;
                
            case 'unavailable':
                borderColor = '#f44336';
                iconText = '❌';
                statusText = 'N.I.N.A. Non Raggiungibile';
                detailsText = `${host}:${port} non risponde`;
                break;
                
            case 'failed':
                borderColor = '#f44336';
                iconText = '⚠️';
                statusText = 'Connessione Fallita';
                detailsText = `Verifica che N.I.N.A. sia acceso`;
                break;
                
            case 'error':
                borderColor = '#ff5722';
                iconText = '⚠️';
                statusText = 'Errore Connessione';
                detailsText = errorMsg || 'Errore sconosciuto';
                break;
        }
        
        // Applica stili
        indicator.style.borderColor = borderColor;
        icon.textContent = iconText;
        text.textContent = statusText;
        details.textContent = detailsText;
    }
    
    updateConnectionStatus(platform, status) {
        const statusDiv = document.getElementById('connectionStatus');
        if (!statusDiv) return;
        
        let html = '';
        let className = '';
        
        if (status === 'connected') {
            html = `✅ Connesso a ${platform}`;
            className = 'alert alert-success';
        } else if (status === 'failed') {
            html = `❌ Connessione a ${platform} fallita. Verifica che il software sia avviato.`;
            className = 'alert alert-error';
        } else if (status === 'error') {
            html = `⚠️ Errore connessione a ${platform}. Controlla host e porta.`;
            className = 'alert alert-warning';
        }
        
        statusDiv.innerHTML = `<div class="${className}">${html}</div>`;
        statusDiv.classList.remove('hidden');
    }
}

const uiController = new UIController();
