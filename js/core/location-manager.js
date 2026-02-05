/**
 * LOCATION MANAGER MODULE
 * Gestione GPS, reverse geocoding e località
 */

class LocationManager {
    constructor() {
        this.currentLocation = null;
        this.watchId = null;
        this.isWatching = false;
    }
    
    /**
     * Ottieni posizione GPS corrente
     * @returns {Promise<Object>} Location object
     */
    async getGPSLocation() {
        Utils.log('=== getGPSLocation chiamato ===');
        
        return new Promise((resolve, reject) => {
            if (!Utils.supports.geolocation()) {
                Utils.log('ERRORE: Geolocation non supportato', 'error');
                reject(new Error('GPS non supportato su questo dispositivo'));
                return;
            }
            
            Utils.log('Geolocation supportato, richiedo posizione...');
            
            const options = {
                enableHighAccuracy: CONFIG.GPS_HIGH_ACCURACY,
                timeout: CONFIG.GPS_TIMEOUT,
                maximumAge: 0
            };
            
            Utils.log('GPS options:', options);
            
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    Utils.log('GPS SUCCESS callback!');
                    Utils.log('Position coords:', position.coords);
                    
                    const location = {
                        lat: position.coords.latitude,
                        lon: position.coords.longitude,
                        alt: position.coords.altitude || 0,
                        accuracy: position.coords.accuracy,
                        timestamp: position.timestamp,
                        source: 'gps'
                    };
                    
                    Utils.log(`GPS OK: ${location.lat.toFixed(4)}, ${location.lon.toFixed(4)}`);
                    
                    // Reverse geocoding per ottenere nome località
                    try {
                        Utils.log('Tento reverse geocoding...');
                        const name = await this.reverseGeocode(location.lat, location.lon);
                        location.name = name;
                        Utils.log('Reverse geocoding OK:', name);
                    } catch (error) {
                        Utils.log('Reverse geocoding fallito: ' + error.message, 'warn');
                        location.name = this.formatCoordinates(location.lat, location.lon);
                        Utils.log('Uso coordinate come nome:', location.name);
                    }
                    
                    this.currentLocation = location;
                    
                    // Salva in storage
                    Utils.log('Salvo location in storage...');
                    Storage.saveLocation(location);
                    
                    Utils.log('Risolvo promise con location');
                    resolve(location);
                },
                (error) => {
                    Utils.log('GPS ERROR callback!', 'error');
                    Utils.log('Error code:', error.code);
                    Utils.log('Error message:', error.message);
                    
                    let errorMsg = 'Errore GPS';
                    
                    switch(error.code) {
                        case error.PERMISSION_DENIED:
                            errorMsg = 'Permesso GPS negato. Abilita permessi località nelle impostazioni.';
                            break;
                        case error.POSITION_UNAVAILABLE:
                            errorMsg = 'Posizione non disponibile. Verifica di essere all\'aperto.';
                            break;
                        case error.TIMEOUT:
                            errorMsg = 'Timeout GPS. Riprova.';
                            break;
                        default:
                            errorMsg = 'Errore GPS sconosciuto.';
                    }
                    
                    Utils.log(errorMsg, 'error');
                    reject(new Error(errorMsg));
                },
                options
            );
        });
    }
    
    /**
     * Alias per getGPSLocation() - per compatibilità
     * @returns {Promise<Object>} Location object
     */
    async getCurrentLocationGPS() {
        return await this.getGPSLocation();
    }
    
    /**
     * Imposta località manualmente
     * @param {number} lat - Latitudine
     * @param {number} lon - Longitudine
     * @param {string} name - Nome località (opzionale)
     * @returns {Promise<Object>} Location object
     */
    async setManualLocation(lat, lon, name = null) {
        // Valida coordinate
        if (lat < -90 || lat > 90) {
            throw new Error('Latitudine deve essere tra -90 e 90 gradi');
        }
        if (lon < -180 || lon > 180) {
            throw new Error('Longitudine deve essere tra -180 e 180 gradi');
        }
        
        const location = {
            lat: parseFloat(lat),
            lon: parseFloat(lon),
            alt: 0,
            accuracy: null,
            timestamp: Date.now(),
            source: 'manual',
            name: name
        };
        
        // Se nome non fornito, usa reverse geocoding
        if (!name) {
            try {
                location.name = await this.reverseGeocode(lat, lon);
            } catch (error) {
                location.name = this.formatCoordinates(lat, lon);
            }
        }
        
        this.currentLocation = location;
        
        // Salva in storage
        Storage.saveLocation(location);
        
        Utils.log(`Località manuale: ${location.name}`);
        
        return location;
    }
    
    /**
     * Alias per setManualLocation() - per compatibilità
     * @param {number} lat - Latitudine
     * @param {number} lon - Longitudine
     * @param {string} name - Nome località (opzionale)
     * @returns {Promise<Object>} Location object
     */
    async setLocation(lat, lon, name = null) {
        return await this.setManualLocation(lat, lon, name);
    }
    
    /**
     * Reverse geocoding - converti coordinate in nome località
     * @param {number} lat - Latitudine
     * @param {number} lon - Longitudine
     * @returns {Promise<string>} Nome località
     */
    async reverseGeocode(lat, lon) {
        try {
            // Usa Nominatim (OpenStreetMap)
            const url = `https://nominatim.openstreetmap.org/reverse?` +
                       `lat=${lat}&lon=${lon}&format=json&` +
                       `accept-language=it`;
            
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'EclipseCommander/3.0'
                }
            });
            
            if (!response.ok) {
                throw new Error('Geocoding API error: ' + response.status);
            }
            
            const data = await response.json();
            
            // Estrai nome località
            let name = data.display_name;
            
            // Semplifica (prendi prime 3 componenti)
            if (name) {
                const parts = name.split(',').slice(0, 3);
                name = parts.join(', ').trim();
            }
            
            return name || this.formatCoordinates(lat, lon);
            
        } catch (error) {
            Utils.log('Reverse geocoding error: ' + error.message, 'warn');
            return this.formatCoordinates(lat, lon);
        }
    }
    
    /**
     * Forward geocoding - cerca località per nome
     * @param {string} query - Nome località da cercare
     * @returns {Promise<Array>} Array di risultati
     */
    async searchLocation(query) {
        try {
            const url = `https://nominatim.openstreetmap.org/search?` +
                       `q=${encodeURIComponent(query)}&format=json&` +
                       `accept-language=it&limit=5`;
            
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'EclipseCommander/3.0'
                }
            });
            
            if (!response.ok) {
                throw new Error('Search API error: ' + response.status);
            }
            
            const data = await response.json();
            
            return data.map(item => ({
                name: item.display_name,
                lat: parseFloat(item.lat),
                lon: parseFloat(item.lon),
                type: item.type,
                importance: item.importance
            }));
            
        } catch (error) {
            Utils.log('Location search error: ' + error.message, 'error');
            return [];
        }
    }
    
    /**
     * Formatta coordinate come stringa
     */
    formatCoordinates(lat, lon) {
        return `${Utils.formatCoordinate(lat, true)}, ${Utils.formatCoordinate(lon, false)}`;
    }
    
    /**
     * Ottieni località corrente (da memoria o storage)
     */
    getCurrentLocation() {
        if (this.currentLocation) {
            return this.currentLocation;
        }
        
        // Prova a caricare da storage
        const stored = Storage.loadLocation();
        if (stored) {
            this.currentLocation = stored;
            return stored;
        }
        
        return null;
    }
    
    /**
     * Calcola distanza da località corrente
     * @param {number} targetLat - Latitudine target
     * @param {number} targetLon - Longitudine target
     * @returns {number|null} Distanza in km
     */
    calculateDistanceFromCurrent(targetLat, targetLon) {
        const current = this.getCurrentLocation();
        if (!current) return null;
        
        return Utils.calculateDistance(
            current.lat, current.lon,
            targetLat, targetLon
        );
    }
    
    /**
     * Avvia monitoraggio continuo posizione
     * @param {Function} callback - Chiamato ad ogni aggiornamento
     */
    startWatching(callback) {
        if (!Utils.supports.geolocation()) {
            Utils.log('GPS non supportato', 'error');
            return false;
        }
        
        if (this.isWatching) {
            Utils.log('Watch GPS già attivo', 'warn');
            return true;
        }
        
        const options = {
            enableHighAccuracy: true,
            timeout: 30000,
            maximumAge: 0
        };
        
        this.watchId = navigator.geolocation.watchPosition(
            (position) => {
                const location = {
                    lat: position.coords.latitude,
                    lon: position.coords.longitude,
                    alt: position.coords.altitude || 0,
                    accuracy: position.coords.accuracy,
                    timestamp: position.timestamp,
                    source: 'gps-watch'
                };
                
                this.currentLocation = location;
                
                if (callback) {
                    callback(location);
                }
            },
            (error) => {
                Utils.log('Watch GPS error: ' + error.message, 'error');
            },
            options
        );
        
        this.isWatching = true;
        Utils.log('Watch GPS avviato');
        return true;
    }
    
    /**
     * Ferma monitoraggio posizione
     */
    stopWatching() {
        if (this.watchId !== null) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
            this.isWatching = false;
            Utils.log('Watch GPS fermato');
        }
    }
    
    /**
     * Calcola fuso orario approssimato da longitudine
     * @param {number} lon - Longitudine
     * @returns {number} Offset UTC in ore
     */
    estimateTimezoneFromLongitude(lon) {
        // Approssimazione: 15° longitudine = 1 ora
        return Math.round(lon / 15);
    }
    
    /**
     * Ottieni informazioni complete località corrente
     */
    getLocationInfo() {
        const location = this.getCurrentLocation();
        if (!location) return null;
        
        // Calcola allineamento polare
        const polarAlign = astronomyCalc.calculatePolarAlignment(
            location.lat, 
            location.lon
        );
        
        // Calcola fuso orario
        const tzOffset = this.estimateTimezoneFromLongitude(location.lon);
        
        return {
            ...location,
            formattedCoords: this.formatCoordinates(location.lat, location.lon),
            polarAlignment: polarAlign,
            estimatedTimezone: `UTC${tzOffset >= 0 ? '+' : ''}${tzOffset}`,
            hemisphere: location.lat >= 0 ? 'Nord' : 'Sud'
        };
    }
    
    /**
     * Salva località nei favoriti
     */
    saveFavoriteLocation(location, favoriteName) {
        const favorites = Storage.load('favorite_locations', []);
        
        favorites.push({
            name: favoriteName || location.name,
            lat: location.lat,
            lon: location.lon,
            savedAt: new Date().toISOString()
        });
        
        Storage.save('favorite_locations', favorites);
        Utils.log('Località salvata nei favoriti');
    }
    
    /**
     * Carica località favorite
     */
    getFavoriteLocations() {
        return Storage.load('favorite_locations', []);
    }
    
    /**
     * Rimuovi località dai favoriti
     */
    removeFavoriteLocation(index) {
        const favorites = this.getFavoriteLocations();
        favorites.splice(index, 1);
        Storage.save('favorite_locations', favorites);
    }
}

// Export singleton
const locationManager = new LocationManager();
