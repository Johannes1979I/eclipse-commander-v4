/**
 * LOCATION PANEL MODULE
 * Gestisce panel località (GPS + manuale)
 */

class LocationPanel {
    constructor() {
        this.initialized = false;
        this.btnGetGPS = null;
        this.btnManualLocation = null;
        this.modalManualLocation = null;
        this.btnSaveManualLocation = null;
        this.currentLocation = null;
    }
    
    /**
     * Inizializza location panel
     */
    initialize() {
        if (this.initialized) return;
        
        // Ottieni riferimenti elementi
        this.btnGetGPS = document.getElementById('btnGetGPS');
        this.btnManualLocation = document.getElementById('btnManualLocation');
        this.modalManualLocation = document.getElementById('modalManualLocation');
        this.btnSaveManualLocation = document.getElementById('btnSaveManualLocation');
        this.btnCloseManual = document.getElementById('closeManualLocation');
        
        // Setup event listeners
        if (this.btnGetGPS) {
            this.btnGetGPS.addEventListener('click', async () => {
                Utils.log('GPS button clicked!');
                await this.handleGetGPS();
            });
            Utils.log('GPS button listener registrato');
        } else {
            Utils.log('ERRORE: btnGetGPS non trovato!', 'error');
        }
        
        if (this.btnManualLocation) {
            this.btnManualLocation.addEventListener('click', () => {
                this.showManualModal();
            });
        }
        
        if (this.btnSaveManualLocation) {
            this.btnSaveManualLocation.addEventListener('click', () => {
                this.handleSaveManual();
            });
        }
        
        if (this.btnCloseManual) {
            this.btnCloseManual.addEventListener('click', () => {
                this.hideManualModal();
            });
        }
        
        // Click fuori modal per chiudere
        if (this.modalManualLocation) {
            this.modalManualLocation.addEventListener('click', (e) => {
                if (e.target === this.modalManualLocation) {
                    this.hideManualModal();
                }
            });
        }
        
        // Carica località salvata
        this.currentLocation = locationManager.getCurrentLocation();
        if (this.currentLocation) {
            this.displayLocation(this.currentLocation);
        }
        
        this.initialized = true;
        
        Utils.log('Location panel inizializzato');
    }
    
    /**
     * Handler GPS button
     */
    async handleGetGPS() {
        Utils.log('=== handleGetGPS chiamato ===');
        
        if (!this.btnGetGPS) {
            Utils.log('ERRORE: btnGetGPS è null!', 'error');
            return;
        }
        
        Utils.log('Disabilito button e cambio testo...');
        
        // Disabilita button
        this.btnGetGPS.disabled = true;
        this.btnGetGPS.textContent = '📡 Ricerca GPS...';
        
        try {
            Utils.log('Chiamo locationManager.getGPSLocation()...');
            
            // Ottieni posizione GPS
            const location = await locationManager.getGPSLocation();
            
            Utils.log('GPS location ricevuta:', location);
            
            // Salva e mostra
            this.currentLocation = location;
            this.displayLocation(location);
            
            // Dispatch evento
            window.dispatchEvent(new CustomEvent('location:updated', {
                detail: location
            }));
            
            Utils.log('Mostro notifica successo...');
            notificationManager.show(`Località rilevata: ${location.name}`, 'success');
            
        } catch (error) {
            Utils.log('ERRORE GPS catturato: ' + error.message, 'error');
            notificationManager.show('Errore GPS: ' + error.message, 'error');
            
        } finally {
            Utils.log('Riabilito button...');
            // Riabilita button
            this.btnGetGPS.disabled = false;
            this.btnGetGPS.textContent = '📡 Ottieni Posizione GPS';
        }
        
        Utils.log('=== handleGetGPS completato ===');
    }
    
    /**
     * Mostra modal inserimento manuale
     */
    showManualModal() {
        if (!this.modalManualLocation) return;
        
        // Pre-compila con località corrente se disponibile
        if (this.currentLocation) {
            const latInput = document.getElementById('manualLat');
            const lonInput = document.getElementById('manualLon');
            const nameInput = document.getElementById('manualName');
            
            if (latInput) latInput.value = this.currentLocation.lat.toFixed(4);
            if (lonInput) lonInput.value = this.currentLocation.lon.toFixed(4);
            if (nameInput) nameInput.value = this.currentLocation.name || '';
        }
        
        // Mostra modal usando display block
        this.modalManualLocation.style.display = 'block';
    }
    
    /**
     * Nascondi modal
     */
    hideManualModal() {
        if (!this.modalManualLocation) return;
        
        // Nascondi modal usando display none
        this.modalManualLocation.style.display = 'none';
    }
    
    /**
     * Handler salva località manuale
     */
    async handleSaveManual() {
        const latInput = document.getElementById('manualLat');
        const lonInput = document.getElementById('manualLon');
        const nameInput = document.getElementById('manualName');
        
        if (!latInput || !lonInput) return;
        
        const lat = parseFloat(latInput.value);
        const lon = parseFloat(lonInput.value);
        const name = nameInput?.value || null;
        
        // Valida input
        if (isNaN(lat) || isNaN(lon)) {
            notificationManager.show('Coordinate non valide', 'error');
            return;
        }
        
        if (lat < -90 || lat > 90) {
            notificationManager.show('Latitudine deve essere tra -90 e 90', 'error');
            return;
        }
        
        if (lon < -180 || lon > 180) {
            notificationManager.show('Longitudine deve essere tra -180 e 180', 'error');
            return;
        }
        
        try {
            // Imposta località
            const location = await locationManager.setManualLocation(lat, lon, name);
            
            // Salva e mostra
            this.currentLocation = location;
            this.displayLocation(location);
            
            // Chiudi modal
            this.hideManualModal();
            
            // Dispatch evento
            window.dispatchEvent(new CustomEvent('location:updated', {
                detail: location
            }));
            
            notificationManager.show('Località impostata manualmente', 'success');
            
        } catch (error) {
            Utils.log('Errore località manuale: ' + error.message, 'error');
            notificationManager.show('Errore: ' + error.message, 'error');
        }
    }
    
    /**
     * Mostra località nel panel
     */
    displayLocation(location) {
        Utils.log('=== displayLocation chiamato ===');
        Utils.log('Location data:', location);
        
        const displayEl = document.getElementById('locationDisplay');
        
        if (!displayEl) {
            Utils.log('ERRORE: locationDisplay element non trovato!', 'error');
            return;
        }
        
        Utils.log('locationDisplay element trovato');
        
        // Update display
        const nameEl = document.getElementById('locationName');
        const latEl = document.getElementById('locationLat');
        const lonEl = document.getElementById('locationLon');
        
        Utils.log(`Elements: nameEl=${!!nameEl}, latEl=${!!latEl}, lonEl=${!!lonEl}`);
        
        if (nameEl) nameEl.textContent = location.name;
        if (latEl) latEl.textContent = location.lat.toFixed(4);
        if (lonEl) lonEl.textContent = location.lon.toFixed(4);
        
        // Mostra display
        displayEl.classList.remove('hidden');
        
        Utils.log(`Località visualizzata: ${location.name}`);
    }
    
    /**
     * Refresh panel
     */
    refresh() {
        const location = locationManager.getCurrentLocation();
        
        if (location) {
            this.currentLocation = location;
            this.displayLocation(location);
        }
    }
    
    /**
     * Ottieni località corrente
     */
    getLocation() {
        return this.currentLocation;
    }
}

// Export singleton
const locationPanel = new LocationPanel();
