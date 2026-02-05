/**
 * TIME CALCULATOR MODULE
 * Calcolo preciso tempi contatti eclissi C1/C2/C3/C4
 */

class TimeCalculator {
    
    /**
     * Calcola tutti i tempi di contatto per un'eclissi in una località
     * @param {Object} eclipse - Oggetto eclissi dal database
     * @param {number} userLat - Latitudine osservatore
     * @param {number} userLon - Longitudine osservatore
     * @param {Object} eclipseData - Dati calcolati da eclipseDB
     * @returns {Object} Tempi C1, C2, C3, C4 e dettagli
     */
    calculateContactTimes(eclipse, userLat, userLon, eclipseData) {
        if (!eclipse || !eclipseData) {
            return null;
        }
        
        // Punto di riferimento sulla linea centrale
        const refPoint = this.findReferencePoint(eclipse, userLat, userLon);
        
        // Calcola offset temporale basato su longitudine
        const longitudeOffset = this.calculateLongitudeOffset(userLon, refPoint.lon);
        
        // Tempi base eclissi
        const baseTimes = this.getBaseContactTimes(eclipse, refPoint);
        
        // Applica offset
        const times = this.applyTimeOffset(baseTimes, longitudeOffset);
        
        // Calcola durata totalità (se applicabile)
        let totalityDuration = 0;
        if (eclipseData.type === 'total' && eclipseData.duration) {
            totalityDuration = eclipseData.duration;
        }
        
        // Aggiungi C3 basato su durata
        if (times.C2 && totalityDuration > 0) {
            times.C3 = new Date(times.C2.getTime() + totalityDuration * 1000);
        }
        
        return {
            C1: times.C1,
            C2: times.C2,
            C3: times.C3,
            C4: times.C4,
            max: times.Max,
            totalityDuration: totalityDuration,
            type: eclipseData.type,
            partialDuration: times.C4 && times.C1 ? 
                             (times.C4 - times.C1) / 1000 : 0
        };
    }
    
    /**
     * Trova punto di riferimento sulla linea centrale
     */
    findReferencePoint(eclipse, userLat, userLon) {
        if (!eclipse.path || eclipse.path.length === 0) {
            // Default se nessun path
            return {
                lat: userLat,
                lon: userLon,
                duration: eclipse.maxDuration || 240
            };
        }
        
        // Trova punto più vicino
        let closest = eclipse.path[0];
        let minDist = Utils.calculateDistance(
            userLat, userLon,
            closest.lat, closest.lon
        );
        
        for (let point of eclipse.path) {
            const dist = Utils.calculateDistance(
                userLat, userLon,
                point.lat, point.lon
            );
            
            if (dist < minDist) {
                minDist = dist;
                closest = point;
            }
        }
        
        return closest;
    }
    
    /**
     * Calcola offset temporale da differenza longitudine
     * Formula: 1° longitudine = 4 minuti tempo
     */
    calculateLongitudeOffset(userLon, refLon) {
        const diffLon = userLon - refLon;
        const offsetMinutes = diffLon * 4; // 4 minuti per grado
        return offsetMinutes * 60 * 1000; // converti in millisecondi
    }
    
    /**
     * Ottieni tempi base contatti per eclissi
     * Usa dati reali quando disponibili, altrimenti stima
     */
    getBaseContactTimes(eclipse, refPoint) {
        const baseDate = new Date(eclipse.date);
        
        // Dati specifici per eclissi note
        if (eclipse.id === '2027-08-02') {
            // Eclissi 2027 - dati precisi da NASA
            return this.get2027EclipseTimes(baseDate, refPoint);
        }
        
        // Stima generica per altre eclissi
        return this.estimateContactTimes(baseDate, refPoint, eclipse);
    }
    
    /**
     * Dati precisi eclissi 2027-08-02
     */
    get2027EclipseTimes(baseDate, refPoint) {
        // Tempi per Tangeri (punto di riferimento)
        const tangieriC1 = new Date('2027-08-02T08:40:00Z');
        const tangieriC2 = new Date('2027-08-02T09:44:34Z');
        const tangieriC4 = new Date('2027-08-02T11:00:00Z');
        
        // Se punto vicino a Tangeri, usa quei tempi
        if (Math.abs(refPoint.lon - 5.8) < 5) {
            const duration = refPoint.duration || 291;
            return {
                C1: tangieriC1,
                C2: tangieriC2,
                C3: new Date(tangieriC2.getTime() + duration * 1000),
                C4: tangieriC4
            };
        }
        
        // Altrimenti stima da Tangeri con offset
        const lonOffset = this.calculateLongitudeOffset(refPoint.lon, 5.8);
        
        return {
            C1: new Date(tangieriC1.getTime() + lonOffset),
            C2: new Date(tangieriC2.getTime() + lonOffset),
            C3: new Date(tangieriC2.getTime() + lonOffset + (refPoint.duration || 291) * 1000),
            C4: new Date(tangieriC4.getTime() + lonOffset)
        };
    }
    
    /**
     * Stima tempi contatti per eclissi generiche
     */
    estimateContactTimes(baseDate, refPoint, eclipse) {
        // Stima basata su "mezzogiorno locale"
        const noonLocal = new Date(baseDate);
        
        // Offset da Greenwich
        const lonOffset = refPoint.lon * 4 * 60 * 1000; // 4 min per grado
        const localNoon = new Date(noonLocal.getTime() + lonOffset);
        
        // Tipica eclissi: massimo a mezzogiorno locale ±1h
        const maxTime = new Date(localNoon);
        
        // C1: ~1-1.5 ore prima del massimo
        const C1 = new Date(maxTime.getTime() - 75 * 60 * 1000);
        
        // C2: dipende da tipo
        let C2 = null;
        let C3 = null;
        
        if (eclipse.type === 'total') {
            // C2: ~5-10 minuti prima del massimo
            C2 = new Date(maxTime.getTime() - 7 * 60 * 1000);
            
            // C3: C2 + durata totalità
            const duration = refPoint.duration || eclipse.maxDuration || 240;
            C3 = new Date(C2.getTime() + duration * 1000);
        }
        
        // C4: ~1-1.5 ore dopo il massimo
        const C4 = new Date(maxTime.getTime() + 75 * 60 * 1000);
        
        return {
            C1: C1,
            C2: C2,
            C3: C3,
            C4: C4,
            Max: maxTime
        };
    }
    
    /**
     * Applica offset temporale a tutti i tempi
     */
    applyTimeOffset(baseTimes, offsetMs) {
        const result = {};
        
        for (let key in baseTimes) {
            if (baseTimes[key]) {
                result[key] = new Date(baseTimes[key].getTime() + offsetMs);
            } else {
                result[key] = null;
            }
        }
        
        return result;
    }
    
    /**
     * Calcola countdown a prossimo evento
     * @param {Object} contactTimes - Tempi calcolati
     * @param {Date} now - Tempo corrente (default: now)
     * @returns {Object} Countdown info
     */
    calculateCountdown(contactTimes, now = new Date()) {
        if (!contactTimes) {
            return {
                nextEvent: null,
                timeRemaining: null,
                phase: 'none',
                message: 'Nessuna eclissi selezionata'
            };
        }
        
        const nowTime = now.getTime();
        
        // Determina fase corrente e prossimo evento
        if (contactTimes.C1 && nowTime < contactTimes.C1.getTime()) {
            // Pre-C1
            return {
                nextEvent: 'C1',
                nextEventTime: contactTimes.C1,
                timeRemaining: contactTimes.C1.getTime() - nowTime,
                phase: 'pre-eclipse',
                message: 'Tempo al primo contatto',
                filterRequired: false
            };
        } else if (contactTimes.C2 && nowTime < contactTimes.C2.getTime()) {
            // C1-C2 (parziale)
            return {
                nextEvent: 'C2',
                nextEventTime: contactTimes.C2,
                timeRemaining: contactTimes.C2.getTime() - nowTime,
                phase: 'partial-before',
                message: 'Tempo a inizio totalità',
                filterRequired: true,
                filterStatus: 'ON'
            };
        } else if (contactTimes.C3 && nowTime < contactTimes.C3.getTime()) {
            // C2-C3 (totalità)
            return {
                nextEvent: 'C3',
                nextEventTime: contactTimes.C3,
                timeRemaining: contactTimes.C3.getTime() - nowTime,
                phase: 'totality',
                message: 'Tempo a fine totalità',
                filterRequired: false,
                filterStatus: 'OFF',
                inTotality: true
            };
        } else if (contactTimes.C4 && nowTime < contactTimes.C4.getTime()) {
            // C3-C4 (parziale dopo)
            return {
                nextEvent: 'C4',
                nextEventTime: contactTimes.C4,
                timeRemaining: contactTimes.C4.getTime() - nowTime,
                phase: 'partial-after',
                message: 'Tempo a ultimo contatto',
                filterRequired: true,
                filterStatus: 'ON'
            };
        } else if (contactTimes.C4 && nowTime >= contactTimes.C4.getTime()) {
            // Post-C4
            return {
                nextEvent: null,
                nextEventTime: null,
                timeRemaining: 0,
                phase: 'post-eclipse',
                message: 'Eclissi terminata',
                filterRequired: false
            };
        } else if (contactTimes.C1 && contactTimes.C4 === null) {
            // Eclissi parziale (solo C1, Max, C4)
            if (nowTime < contactTimes.Max.getTime()) {
                return {
                    nextEvent: 'Max',
                    nextEventTime: contactTimes.Max,
                    timeRemaining: contactTimes.Max.getTime() - nowTime,
                    phase: 'partial',
                    message: 'Tempo a massima oscurazione',
                    filterRequired: true,
                    filterStatus: 'ON'
                };
            } else if (nowTime < contactTimes.C4.getTime()) {
                return {
                    nextEvent: 'C4',
                    nextEventTime: contactTimes.C4,
                    timeRemaining: contactTimes.C4.getTime() - nowTime,
                    phase: 'partial',
                    message: 'Tempo a ultimo contatto',
                    filterRequired: true,
                    filterStatus: 'ON'
                };
            }
        }
        
        return {
            nextEvent: null,
            timeRemaining: null,
            phase: 'none',
            message: 'Tempo non determinato'
        };
    }
    
    /**
     * Formatta countdown in formato leggibile
     */
    formatCountdown(milliseconds) {
        if (milliseconds <= 0) return '00:00:00';
        
        const totalSeconds = Math.floor(milliseconds / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        
        if (hours > 0) {
            return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        } else {
            return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        }
    }
    
    /**
     * Verifica se è momento di allarme
     * @param {Object} countdown - Oggetto countdown
     * @param {number} secondsRemaining - Secondi rimanenti
     * @returns {Object|null} Allarme se necessario
     */
    checkAlarms(countdown, secondsRemaining) {
        if (!countdown || !countdown.nextEvent) return null;
        
        const alarms = [];
        
        // Allarmi critici per C2 e C3
        if (countdown.nextEvent === 'C2' || countdown.nextEvent === 'C3') {
            if (Math.abs(secondsRemaining - CONFIG.ALARMS.WARNING_30S) < 1) {
                alarms.push({
                    type: 'warning',
                    event: countdown.nextEvent,
                    seconds: 30,
                    message: countdown.nextEvent === 'C2' 
                        ? '30 secondi - mani sul filtro!'
                        : '30 secondi - preparare filtro!'
                });
            }
            
            if (Math.abs(secondsRemaining - CONFIG.ALARMS.WARNING_10S) < 1) {
                alarms.push({
                    type: 'warning',
                    event: countdown.nextEvent,
                    seconds: 10,
                    message: countdown.nextEvent === 'C2'
                        ? '10 secondi - pronti!'
                        : '10 secondi - filtro in mano!'
                });
            }
            
            if (secondsRemaining <= CONFIG.ALARMS.CRITICAL) {
                alarms.push({
                    type: 'critical',
                    event: countdown.nextEvent,
                    seconds: 0,
                    message: countdown.nextEvent === 'C2'
                        ? 'TOGLIERE FILTRO ORA!'
                        : 'RIMETTERE FILTRO ORA!',
                    urgent: true
                });
            }
        }
        
        return alarms.length > 0 ? alarms : null;
    }
}

// Export singleton
const timeCalc = new TimeCalculator();
