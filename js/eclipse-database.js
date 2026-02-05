/**
 * ECLIPSE DATABASE MODULE
 * Gestione database eclissi con ricerca e filtri
 */

class EclipseDatabase {
    constructor() {
        this.eclipses = [];
        this.loaded = false;
    }
    
    // Carica database da JSON
    async load() {
        try {
            const response = await fetch('data/eclipses.json');
            const data = await response.json();
            this.eclipses = data.eclipses.map(e => ({
                ...e,
                date: new Date(e.date)
            }));
            this.loaded = true;
            return true;
        } catch (error) {
            console.error('Errore caricamento database:', error);
            return false;
        }
    }
    
    // Trova eclissi più vicina temporalmente
    findNearest(fromDate = new Date()) {
        return this.eclipses
            .filter(e => e.date >= fromDate)
            .sort((a, b) => a.date - b.date)[0];
    }
    
    // Trova eclissi per ID
    findById(id) {
        return this.eclipses.find(e => e.id === id);
    }
    
    // Trova eclissi visibili da località
    findVisibleFrom(lat, lon, startDate, endDate) {
        return this.eclipses.filter(eclipse => {
            if (eclipse.date < startDate || eclipse.date > endDate) return false;
            
            // Per totali/anulari verifica vicinanza path
            if (eclipse.type === 'total' || eclipse.type === 'annular') {
                return eclipse.path.some(point => {
                    const dist = this.calculateDistance(lat, lon, point.lat, point.lon);
                    return dist < 1500; // Visibile entro 1500km
                });
            }
            return true; // Parziali visibili ovunque (con riduzione)
        });
    }
    
    // Calcola tipo eclissi per località specifica
    calculateForLocation(eclipse, userLat, userLon) {
        if (!eclipse) return null;
        
        // Trova punto più vicino sul path
        const closest = this.findClosestPathPoint(eclipse.path, userLat, userLon);
        const distance = this.calculateDistance(userLat, userLon, closest.lat, closest.lon);
        
        // Larghezza path (approssimata)
        const pathWidth = eclipse.pathWidthKm || 200;
        
        if (distance <= pathWidth / 2) {
            // TOTALE - dentro il path
            const duration = this.interpolateDuration(eclipse.path, userLat, userLon);
            return {
                type: 'total',
                coverage: 100,
                duration: duration,
                distance: distance,
                magnitude: eclipse.magnitude
            };
        } else if (distance <= 2000) {
            // PARZIALE
            const coverage = Math.max(0, 100 * (1 - distance / 2000)) * eclipse.magnitude;
            return {
                type: 'partial',
                coverage: Math.round(coverage),
                distance: distance,
                magnitude: eclipse.magnitude * (coverage / 100)
            };
        } else {
            // NON VISIBILE
            return {
                type: 'none',
                coverage: 0,
                distance: distance
            };
        }
    }
    
    // Trova punto più vicino sul path
    findClosestPathPoint(path, lat, lon) {
        if (!path || path.length === 0) return {lat: 0, lon: 0};
        
        let closest = path[0];
        let minDist = this.calculateDistance(lat, lon, closest.lat, closest.lon);
        
        for (let point of path) {
            const dist = this.calculateDistance(lat, lon, point.lat, point.lon);
            if (dist < minDist) {
                minDist = dist;
                closest = point;
            }
        }
        return closest;
    }
    
    // Interpola durata totalità
    interpolateDuration(path, lat, lon) {
        const closest = this.findClosestPathPoint(path, lat, lon);
        return closest.duration || 240; // Default 4 minuti
    }
    
    // Distanza tra due punti (Haversine)
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) ** 2 +
                  Math.cos(lat1 * Math.PI / 180) * 
                  Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon/2) ** 2;
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }
    
    // Lista tutte eclissi
    getAll() {
        return this.eclipses;
    }
    
    // Filtra per tipo
    filterByType(type) {
        return this.eclipses.filter(e => e.type === type);
    }
}

// Export singolo
const eclipseDB = new EclipseDatabase();
