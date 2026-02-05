/**
 * DEVICE DETECTOR MODULE
 * Auto-discovery dispositivi Ekos e N.I.N.A. sulla rete locale
 */

class DeviceDetector {
    constructor() {
        this.scanning = false;
        this.foundDevices = [];
    }
    
    /**
     * Scan completo rete per trovare Ekos e N.I.N.A.
     * @param {Object} options - Opzioni scan
     */
    async scanAll(options = {}) {
        const {
            subnet = '192.168',
            scanEkos = true,
            scanNina = true,
            timeout = 10000
        } = options;
        
        if (this.scanning) {
            Utils.log('Scan già in corso', 'warn');
            return this.foundDevices;
        }
        
        this.scanning = true;
        this.foundDevices = [];
        
        Utils.log('Avvio scan rete completo...');
        
        const promises = [];
        
        // Scan Ekos
        if (scanEkos) {
            promises.push(
                this.scanEkosDevices(subnet).catch(error => {
                    Utils.log('Errore scan Ekos: ' + error.message, 'warn');
                    return [];
                })
            );
        }
        
        // Scan N.I.N.A.
        if (scanNina) {
            promises.push(
                this.scanNinaDevices(subnet).catch(error => {
                    Utils.log('Errore scan N.I.N.A.: ' + error.message, 'warn');
                    return [];
                })
            );
        }
        
        // Timeout
        const timeoutPromise = new Promise((resolve) => {
            setTimeout(() => {
                Utils.log('Timeout scan rete', 'warn');
                resolve([]);
            }, timeout);
        });
        
        // Attendi risultati o timeout
        const results = await Promise.race([
            Promise.all(promises),
            timeoutPromise
        ]);
        
        // Combina risultati
        for (let deviceList of results) {
            if (Array.isArray(deviceList)) {
                this.foundDevices.push(...deviceList);
            }
        }
        
        this.scanning = false;
        
        Utils.log(`Scan completato: ${this.foundDevices.length} dispositivi trovati`);
        
        return this.foundDevices;
    }
    
    /**
     * Scan dispositivi Ekos
     */
    async scanEkosDevices(subnet = '192.168') {
        const devices = await ekosConnector.scanNetwork(subnet);
        
        return devices.map(device => ({
            ...device,
            platform: 'ekos',
            name: `Ekos @ ${device.host}`,
            displayName: `Ekos/INDI (${device.host})`
        }));
    }
    
    /**
     * Scan dispositivi N.I.N.A.
     */
    async scanNinaDevices(subnet = '192.168') {
        const devices = await ninaConnector.scanNetwork(subnet);
        
        return devices.map(device => ({
            ...device,
            platform: 'nina',
            name: `N.I.N.A. @ ${device.host}`,
            displayName: `N.I.N.A. (${device.host})`
        }));
    }
    
    /**
     * Scan rapido IP comuni
     */
    async quickScan() {
        Utils.log('Quick scan IP comuni...');
        
        const commonHosts = [
            // Localhost
            { host: 'localhost', platforms: ['nina'] },
            { host: '127.0.0.1', platforms: ['nina'] },
            
            // Raspberry Pi hotspot
            { host: '192.168.4.1', platforms: ['ekos'] },
            
            // mDNS
            { host: 'raspberrypi.local', platforms: ['ekos'] },
            { host: 'stellarmate.local', platforms: ['ekos'] },
            
            // DHCP comuni
            { host: '192.168.1.100', platforms: ['ekos', 'nina'] },
            { host: '192.168.1.101', platforms: ['ekos', 'nina'] },
            { host: '192.168.0.100', platforms: ['ekos', 'nina'] }
        ];
        
        const results = [];
        const promises = [];
        
        for (let entry of commonHosts) {
            // Test Ekos
            if (entry.platforms.includes('ekos')) {
                promises.push(
                    ekosConnector.testConnection(entry.host).then(success => {
                        if (success) {
                            results.push({
                                platform: 'ekos',
                                host: entry.host,
                                port: CONFIG.EKOS_DEFAULT_PORT,
                                url: `http://${entry.host}:${CONFIG.EKOS_DEFAULT_PORT}`,
                                name: `Ekos @ ${entry.host}`,
                                displayName: `Ekos/INDI (${entry.host})`
                            });
                        }
                    }).catch(() => {})
                );
            }
            
            // Test N.I.N.A.
            if (entry.platforms.includes('nina')) {
                promises.push(
                    ninaConnector.testConnection(entry.host).then(success => {
                        if (success) {
                            results.push({
                                platform: 'nina',
                                host: entry.host,
                                port: CONFIG.NINA_DEFAULT_PORT,
                                url: `http://${entry.host}:${CONFIG.NINA_DEFAULT_PORT}`,
                                name: `N.I.N.A. @ ${entry.host}`,
                                displayName: `N.I.N.A. (${entry.host})`
                            });
                        }
                    }).catch(() => {})
                );
            }
        }
        
        await Promise.allSettled(promises);
        
        this.foundDevices = results;
        
        Utils.log(`Quick scan: ${results.length} dispositivi`);
        
        return results;
    }
    
    /**
     * Test connessione a dispositivo specifico
     */
    async testDevice(device) {
        try {
            if (device.platform === 'ekos') {
                return await ekosConnector.testConnection(device.host, device.port);
            } else if (device.platform === 'nina') {
                return await ninaConnector.testConnection(device.host, device.port);
            }
            
            return false;
            
        } catch (error) {
            return false;
        }
    }
    
    /**
     * Ottieni subnet da IP locale
     */
    guessSubnet() {
        // Prova a dedurre subnet da location
        // Default: 192.168
        // Nota: Non possibile ottenere IP locale dal browser per sicurezza
        // Questa è una stima basata su pattern comuni
        
        return '192.168';
    }
    
    /**
     * Filtra dispositivi per piattaforma
     */
    filterByPlatform(platform) {
        return this.foundDevices.filter(d => d.platform === platform);
    }
    
    /**
     * Ottieni dispositivi Ekos trovati
     */
    getEkosDevices() {
        return this.filterByPlatform('ekos');
    }
    
    /**
     * Ottieni dispositivi N.I.N.A. trovati
     */
    getNinaDevices() {
        return this.filterByPlatform('nina');
    }
    
    /**
     * Salva dispositivi preferiti
     */
    saveFavoriteDevices() {
        const favorites = this.foundDevices.map(device => ({
            platform: device.platform,
            host: device.host,
            port: device.port,
            name: device.displayName
        }));
        
        Storage.save('favorite_devices', favorites);
        Utils.log('Dispositivi salvati nei favoriti');
    }
    
    /**
     * Carica dispositivi preferiti
     */
    loadFavoriteDevices() {
        const favorites = Storage.load('favorite_devices', []);
        
        if (favorites.length > 0) {
            Utils.log(`Caricati ${favorites.length} dispositivi preferiti`);
        }
        
        return favorites;
    }
    
    /**
     * Connetti a dispositivo automaticamente
     */
    async autoConnect(device) {
        try {
            Utils.log(`Auto-connessione a ${device.displayName}...`);
            
            const result = await platformAdapter.connect(
                device.platform,
                device.host,
                device.port
            );
            
            if (result.success) {
                Utils.log('Auto-connessione riuscita');
                
                // Salva come ultimo usato
                Storage.save('last_used_device', device);
                
                return {
                    success: true,
                    device: device,
                    result: result
                };
            }
            
            return {
                success: false,
                error: 'Connessione fallita'
            };
            
        } catch (error) {
            Utils.log('Errore auto-connect: ' + error.message, 'error');
            
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Riconnetti a ultimo dispositivo usato
     */
    async reconnectLast() {
        const lastDevice = Storage.load('last_used_device', null);
        
        if (!lastDevice) {
            throw new Error('Nessun dispositivo precedente salvato');
        }
        
        Utils.log('Riconnessione a ultimo dispositivo...');
        
        return await this.autoConnect(lastDevice);
    }
    
    /**
     * Workflow completo: scan → selezione automatica → connessione
     */
    async autoSetup(preferredPlatform = null) {
        try {
            Utils.log('Auto-setup avviato...');
            
            // 1. Quick scan
            const devices = await this.quickScan();
            
            if (devices.length === 0) {
                throw new Error('Nessun dispositivo trovato. Verifica che Ekos o N.I.N.A. siano attivi sulla rete.');
            }
            
            // 2. Selezione dispositivo
            let selectedDevice;
            
            if (preferredPlatform) {
                // Preferenza specificata
                const preferred = devices.find(d => d.platform === preferredPlatform);
                selectedDevice = preferred || devices[0];
            } else {
                // Usa primo trovato
                selectedDevice = devices[0];
            }
            
            Utils.log(`Selezionato: ${selectedDevice.displayName}`);
            
            // 3. Connessione
            const result = await this.autoConnect(selectedDevice);
            
            if (!result.success) {
                throw new Error(result.error);
            }
            
            // 4. Auto-configura equipment
            await platformAdapter.autoConfigureEquipment();
            
            Utils.log('Auto-setup completato!');
            
            return {
                success: true,
                device: selectedDevice,
                platform: selectedDevice.platform,
                devicesFound: devices.length
            };
            
        } catch (error) {
            Utils.log('Errore auto-setup: ' + error.message, 'error');
            throw error;
        }
    }
    
    /**
     * Reset scan
     */
    reset() {
        this.scanning = false;
        this.foundDevices = [];
    }
    
    /**
     * Ottieni stato detector
     */
    getStatus() {
        return {
            scanning: this.scanning,
            devicesFound: this.foundDevices.length,
            ekosCount: this.getEkosDevices().length,
            ninaCount: this.getNinaDevices().length
        };
    }
}

// Export singleton
const deviceDetector = new DeviceDetector();
