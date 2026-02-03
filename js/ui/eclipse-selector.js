/**
 * ECLIPSE SELECTOR MODULE
 * Gestisce selector eclissi da database
 */

class EclipseSelector {
    constructor() {
        this.initialized = false;
        this.selectElement = null;
        this.eclipses = [];
        this.selectedEclipse = null;
    }
    
    /**
     * Inizializza eclipse selector
     */
    async initialize() {
        if (this.initialized) return;
        
        // Ottieni riferimento select
        this.selectElement = document.getElementById('eclipseSelect');
        
        if (!this.selectElement) {
            Utils.log('Eclipse select non trovato', 'warn');
            return;
        }
        
        // Carica database eclissi
        if (!eclipseDB.loaded) {
            await eclipseDB.load();
        }
        
        // Popola select
        await this.populateSelect();
        
        // Setup event listener
        this.selectElement.addEventListener('change', (e) => {
            this.handleSelection(e.target.value);
        });
        
        // Carica ultima eclissi se disponibile
        const lastEclipseId = Storage.loadLastEclipse();
        if (lastEclipseId) {
            this.selectElement.value = lastEclipseId;
            this.handleSelection(lastEclipseId);
        }
        
        this.initialized = true;
        
        Utils.log('Eclipse selector inizializzato');
    }
    
    /**
     * Popola select con eclissi
     */
    async populateSelect() {
        if (!this.selectElement) return;
        
        // Ottieni eclissi
        this.eclipses = eclipseDB.getAll();
        
        // Filtra eclissi future (opzionale)
        const now = new Date();
        const futureEclipses = this.eclipses.filter(e => new Date(e.date) >= now);
        
        // Ordina per data
        futureEclipses.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        // Popola select
        let html = '<option value="">Seleziona eclissi...</option>';
        
        for (let eclipse of futureEclipses) {
            const date = Utils.formatDate(eclipse.date);
            const type = eclipse.type === 'total' ? '🌑 Totale' : 
                        eclipse.type === 'annular' ? '⭕ Anulare' : 
                        '🌗 Parziale';
            
            html += `<option value="${eclipse.id}">
                ${date} - ${type} - Mag ${eclipse.magnitude.toFixed(2)}
            </option>`;
        }
        
        // Aggiungi eclissi passate (ultime 2)
        const pastEclipses = this.eclipses
            .filter(e => new Date(e.date) < now)
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 2);
        
        if (pastEclipses.length > 0) {
            html += '<optgroup label="Eclissi Passate (Test)">';
            
            for (let eclipse of pastEclipses) {
                const date = Utils.formatDate(eclipse.date);
                const type = eclipse.type === 'total' ? '🌑 Totale' : '⭕ Anulare';
                
                html += `<option value="${eclipse.id}">
                    ${date} - ${type} - Mag ${eclipse.magnitude.toFixed(2)}
                </option>`;
            }
            
            html += '</optgroup>';
        }
        
        this.selectElement.innerHTML = html;
        
        Utils.log(`Eclissi caricate: ${futureEclipses.length} future, ${pastEclipses.length} passate`);
    }
    
    /**
     * Handler selezione eclissi
     */
    async handleSelection(eclipseId) {
        if (!eclipseId) {
            this.selectedEclipse = null;
            return;
        }
        
        try {
            // Trova eclissi
            const eclipse = eclipseDB.findById(eclipseId);
            
            if (!eclipse) {
                throw new Error('Eclissi non trovata');
            }
            
            this.selectedEclipse = eclipse;
            
            Utils.log(`Eclissi selezionata: ${eclipse.name}`);
            
            // CHECK IMMEDIATO: Totale o Parziale per location GPS
            this.checkEclipseTypeForLocation(eclipse);
            
            // Se modalità eclissi attiva, seleziona nell'eclipseMode
            if (eclipseMode.active) {
                await eclipseMode.selectEclipse(eclipse);
                
                // Calcola se location disponibile
                const location = locationManager.getCurrentLocation();
                if (location) {
                    await eclipseMode.setLocation(location);
                    await eclipseMode.calculateEclipseData();
                }
            }
            
            // Dispatch evento
            window.dispatchEvent(new CustomEvent('eclipse:selected', {
                detail: eclipse
            }));
            
            notificationManager.show(`Eclissi: ${eclipse.name}`, 'info');
            
        } catch (error) {
            Utils.log('Errore selezione eclissi: ' + error.message, 'error');
            notificationManager.show('Errore: ' + error.message, 'error');
        }
    }
    
    /**
     * Refresh selector
     */
    async refresh() {
        await this.populateSelect();
        
        // Ripristina selezione se disponibile
        if (this.selectedEclipse) {
            this.selectElement.value = this.selectedEclipse.id;
        }
    }
    
    /**
     * Check se eclissi è totale o parziale per location GPS
     */
    checkEclipseTypeForLocation(eclipse) {
        // Ottieni location GPS
        const userLocation = locationManager.currentLocation;
        
        if (!userLocation || !userLocation.lat || !userLocation.lon) {
            // Nessun GPS - non fare check
            return;
        }
        
        // Se non ha path, non possiamo fare check
        if (!eclipse.path || eclipse.path.length === 0) {
            return;
        }
        
        // Trova location più vicina nel path
        let nearest = null;
        let minDistance = Infinity;
        
        eclipse.path.forEach(pathLoc => {
            const distance = this.calculateDistance(
                userLocation.lat, userLocation.lon,
                pathLoc.lat, pathLoc.lon
            );
            
            if (distance < minDistance) {
                minDistance = distance;
                nearest = pathLoc;
            }
        });
        
        // Determina tipo eclissi
        if (minDistance > 500) {
            // FUORI PATH - Parziale
            const coverage = Math.max(0, 100 - (minDistance - 100) / 10);
            
            setTimeout(() => {
                alert(`📍 ATTENZIONE!\n\n` +
                      `La tua posizione GPS:\n` +
                      `Lat: ${userLocation.lat.toFixed(2)}°, Lon: ${userLocation.lon.toFixed(2)}°\n\n` +
                      `NON è nel path della totalità!\n\n` +
                      `Vedrai un'eclissi PARZIALE con:\n` +
                      `• Copertura massima: ~${coverage.toFixed(1)}%\n` +
                      `• Distanza dal path: ${minDistance.toFixed(0)} km\n\n` +
                      `⚠️ FILTRO SOLARE OBBLIGATORIO\n` +
                      `   PER TUTTA LA DURATA!\n\n` +
                      `Per vedere la totalità, spostati più vicino al path centrale.`);
            }, 500);
        } else {
            // NEL PATH - Totale!
            const duration = nearest.duration || eclipse.maxDuration || 120;
            
            setTimeout(() => {
                alert(`✅ OTTIMO!\n\n` +
                      `La tua posizione GPS è nel path della totalità!\n\n` +
                      `Location più vicina: ${nearest.location || 'Path'}\n` +
                      `Durata totalità: ${duration}s (${Math.floor(duration/60)}m ${duration%60}s)\n` +
                      `Distanza dal centro path: ${minDistance.toFixed(0)} km\n\n` +
                      `🌑 Potrai rimuovere il filtro solare durante la totalità!`);
            }, 500);
        }
    }
    
    /**
     * Calcola distanza tra due coordinate (km)
     */
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Raggio Terra in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }
    
    /**
     * Ottieni eclissi selezionata
     */
    getSelectedEclipse() {
        return this.selectedEclipse;
    }
}

// Export singleton
const eclipseSelector = new EclipseSelector();
