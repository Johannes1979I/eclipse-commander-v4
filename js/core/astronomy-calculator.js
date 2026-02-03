/**
 * ASTRONOMY CALCULATOR MODULE
 * Calcoli astronomici per posizione sole e coordinate celesti
 */

class AstronomyCalculator {
    
    /**
     * Calcola posizione sole per data e località specifiche
     * @param {Date} date - Data/ora
     * @param {number} lat - Latitudine (gradi)
     * @param {number} lon - Longitudine (gradi)
     * @returns {Object} {altitude, azimuth, hourAngle, declination}
     */
    calculateSunPosition(date, lat, lon) {
        // Julian Date
        const jd = this.dateToJulianDate(date);
        const n = jd - 2451545.0; // Giorni da J2000
        
        // Longitudine media sole
        let L = (280.460 + 0.9856474 * n) % 360;
        if (L < 0) L += 360;
        
        // Anomalia media
        let g = (357.528 + 0.9856003 * n) % 360;
        if (g < 0) g += 360;
        const gRad = Utils.toRadians(g);
        
        // Longitudine eclittica
        let lambda = L + 1.915 * Math.sin(gRad) + 0.020 * Math.sin(2 * gRad);
        lambda = lambda % 360;
        if (lambda < 0) lambda += 360;
        const lambdaRad = Utils.toRadians(lambda);
        
        // Obliquità eclittica
        const epsilon = 23.439 - 0.0000004 * n;
        const epsilonRad = Utils.toRadians(epsilon);
        
        // Declinazione
        const sinDelta = Math.sin(epsilonRad) * Math.sin(lambdaRad);
        const delta = Math.asin(sinDelta);
        const declination = Utils.toDegrees(delta);
        
        // Ascensione retta
        const cosLambda = Math.cos(lambdaRad);
        const sinLambda = Math.sin(lambdaRad);
        const cosEpsilon = Math.cos(epsilonRad);
        const alpha = Math.atan2(cosEpsilon * sinLambda, cosLambda);
        const rightAscension = Utils.toDegrees(alpha);
        
        // Tempo siderale locale
        const UT = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
        let GMST = (280.460 + 360.9856474 * n + 15 * UT) % 360;
        if (GMST < 0) GMST += 360;
        
        let LST = (GMST + lon) % 360;
        if (LST < 0) LST += 360;
        
        // Angolo orario
        let H = LST - rightAscension;
        if (H < -180) H += 360;
        if (H > 180) H -= 360;
        const HRad = Utils.toRadians(H);
        
        // Coordinate orizzontali
        const latRad = Utils.toRadians(lat);
        const cosDelta = Math.cos(delta);
        
        // Altitudine
        const sinAlt = Math.sin(latRad) * sinDelta + 
                       Math.cos(latRad) * cosDelta * Math.cos(HRad);
        const altitude = Utils.toDegrees(Math.asin(sinAlt));
        
        // Azimuth (da Nord, verso Est)
        const cosAlt = Math.cos(Math.asin(sinAlt));
        const sinAz = -cosDelta * Math.sin(HRad) / cosAlt;
        const cosAz = (sinDelta - Math.sin(latRad) * sinAlt) / (Math.cos(latRad) * cosAlt);
        
        let azimuth = Utils.toDegrees(Math.atan2(sinAz, cosAz));
        if (azimuth < 0) azimuth += 360;
        
        return {
            altitude: Utils.round(altitude, 2),
            azimuth: Utils.round(azimuth, 2),
            hourAngle: Utils.round(H, 2),
            declination: Utils.round(declination, 2),
            rightAscension: Utils.round(rightAscension, 2),
            isVisible: altitude > 0
        };
    }
    
    /**
     * Calcola alba e tramonto
     * @param {Date} date - Data (solo la data conta, ora ignorata)
     * @param {number} lat - Latitudine
     * @param {number} lon - Longitudine
     * @returns {Object} {sunrise, sunset, dayLength}
     */
    calculateSunriseSunset(date, lat, lon) {
        // Usa mezzogiorno locale come punto di partenza
        const noon = new Date(date);
        noon.setHours(12, 0, 0, 0);
        
        // Calcola declinazione sole a mezzogiorno
        const noonPos = this.calculateSunPosition(noon, lat, lon);
        const dec = Utils.toRadians(noonPos.declination);
        const latRad = Utils.toRadians(lat);
        
        // Angolo orario alba/tramonto (altitude = -0.833° per rifrazione)
        const h0 = Utils.toRadians(-0.833);
        const cosH = (Math.sin(h0) - Math.sin(latRad) * Math.sin(dec)) / 
                     (Math.cos(latRad) * Math.cos(dec));
        
        // Check se sole sorge/tramonta
        if (cosH > 1) {
            // Sole sempre sotto orizzonte (notte polare)
            return {
                sunrise: null,
                sunset: null,
                dayLength: 0,
                polarNight: true
            };
        } else if (cosH < -1) {
            // Sole sempre sopra orizzonte (giorno polare)
            return {
                sunrise: null,
                sunset: null,
                dayLength: 24 * 3600,
                polarDay: true
            };
        }
        
        const H0 = Utils.toDegrees(Math.acos(cosH));
        
        // Tempi in ore
        const sunriseTime = 12 - H0 / 15 - lon / 15;
        const sunsetTime = 12 + H0 / 15 - lon / 15;
        
        // Converti in Date objects
        const sunrise = new Date(date);
        sunrise.setUTCHours(Math.floor(sunriseTime));
        sunrise.setUTCMinutes((sunriseTime % 1) * 60);
        sunrise.setUTCSeconds(0);
        
        const sunset = new Date(date);
        sunset.setUTCHours(Math.floor(sunsetTime));
        sunset.setUTCMinutes((sunsetTime % 1) * 60);
        sunset.setUTCSeconds(0);
        
        const dayLength = (sunset - sunrise) / 1000; // secondi
        
        return {
            sunrise: sunrise,
            sunset: sunset,
            dayLength: dayLength,
            dayLengthFormatted: Utils.formatDuration(dayLength)
        };
    }
    
    /**
     * Calcola culminazione (massima altitudine)
     * @param {Date} date - Data
     * @param {number} lat - Latitudine
     * @param {number} lon - Longitudine
     * @returns {Object} {time, altitude}
     */
    calculateCulmination(date, lat, lon) {
        // Stima iniziale: mezzogiorno locale
        let bestTime = new Date(date);
        bestTime.setHours(12, 0, 0, 0);
        
        // Offset fuso orario
        const tzOffset = lon / 15; // Ore
        bestTime.setUTCHours(12 - tzOffset);
        
        // Affina con iterazione
        let maxAlt = -90;
        let culminationTime = bestTime;
        
        // Cerca in finestra ±2 ore da stima
        for (let offset = -120; offset <= 120; offset += 5) {
            const testTime = new Date(bestTime.getTime() + offset * 60 * 1000);
            const pos = this.calculateSunPosition(testTime, lat, lon);
            
            if (pos.altitude > maxAlt) {
                maxAlt = pos.altitude;
                culminationTime = testTime;
            }
        }
        
        // Affina ulteriormente (minuto per minuto)
        const refineStart = new Date(culminationTime.getTime() - 5 * 60 * 1000);
        for (let offset = 0; offset <= 10; offset++) {
            const testTime = new Date(refineStart.getTime() + offset * 60 * 1000);
            const pos = this.calculateSunPosition(testTime, lat, lon);
            
            if (pos.altitude > maxAlt) {
                maxAlt = pos.altitude;
                culminationTime = testTime;
            }
        }
        
        return {
            time: culminationTime,
            altitude: Utils.round(maxAlt, 2)
        };
    }
    
    /**
     * Calcola coordinate allineamento polare montatura
     * @param {number} lat - Latitudine osservatore
     * @param {number} lon - Longitudine osservatore
     * @returns {Object} Coordinate allineamento
     */
    calculatePolarAlignment(lat, lon) {
        const hemisphere = lat >= 0 ? 'Nord' : 'Sud';
        const poleStar = lat >= 0 ? 'Polaris' : 'Sigma Octantis';
        
        // Altezza = latitudine (in valore assoluto)
        const altitude = Math.abs(lat);
        
        // Azimuth: 0° (Nord) o 180° (Sud)
        const azimuth = lat >= 0 ? 0 : 180;
        
        // Coordinate Polaris (per emisfero nord)
        const polarisRA = 2.530; // ore (2h 31m 49s)
        const polarisDec = 89.264; // gradi
        
        // Coordinate Sigma Octantis (per emisfero sud)
        const sigmaRA = 21.079; // ore
        const sigmaDec = -88.957; // gradi
        
        return {
            hemisphere: hemisphere,
            latitude: Utils.round(lat, 4),
            altitude: Utils.round(altitude, 2),
            azimuth: azimuth,
            poleStar: poleStar,
            poleStarCoords: hemisphere === 'Nord' ? {
                ra: polarisRA,
                dec: polarisDec,
                raFormatted: '2h 31m 49s',
                decFormatted: '+89° 15\' 51"'
            } : {
                ra: sigmaRA,
                dec: sigmaDec,
                raFormatted: '21h 4m 43s',
                decFormatted: '-88° 57\' 23"'
            },
            instructions: hemisphere === 'Nord' 
                ? 'Puntare montatura a Nord, inclinare a ' + Utils.round(altitude, 1) + '° di altitudine'
                : 'Puntare montatura a Sud, inclinare a ' + Utils.round(altitude, 1) + '° di altitudine'
        };
    }
    
    /**
     * Converti data in Julian Date
     */
    dateToJulianDate(date) {
        const year = date.getUTCFullYear();
        const month = date.getUTCMonth() + 1;
        const day = date.getUTCDate();
        const hour = date.getUTCHours() + 
                     date.getUTCMinutes() / 60 + 
                     date.getUTCSeconds() / 3600;
        
        let a = Math.floor((14 - month) / 12);
        let y = year + 4800 - a;
        let m = month + 12 * a - 3;
        
        let jdn = day + 
                  Math.floor((153 * m + 2) / 5) + 
                  365 * y + 
                  Math.floor(y / 4) - 
                  Math.floor(y / 100) + 
                  Math.floor(y / 400) - 
                  32045;
        
        return jdn + (hour - 12) / 24;
    }
    
    /**
     * Calcola equazione del tempo (differenza tempo solare vero vs medio)
     * @param {Date} date - Data
     * @returns {number} Minuti di differenza
     */
    calculateEquationOfTime(date) {
        const jd = this.dateToJulianDate(date);
        const n = jd - 2451545.0;
        
        const L = (280.460 + 0.9856474 * n) % 360;
        const g = (357.528 + 0.9856003 * n) % 360;
        const gRad = Utils.toRadians(g);
        
        const lambda = L + 1.915 * Math.sin(gRad) + 0.020 * Math.sin(2 * gRad);
        const lambdaRad = Utils.toRadians(lambda);
        
        const epsilon = 23.439 - 0.0000004 * n;
        const epsilonRad = Utils.toRadians(epsilon);
        
        const alpha = Math.atan2(Math.cos(epsilonRad) * Math.sin(lambdaRad), Math.cos(lambdaRad));
        const alphaDeg = Utils.toDegrees(alpha);
        
        const eot = 4 * (L - alphaDeg); // minuti
        
        return Utils.round(eot, 2);
    }
    
    /**
     * Calcola angolo parallasse solare (importante per eclissi)
     * @param {number} distance - Distanza Terra-Sole in AU
     * @returns {number} Angolo in arcsec
     */
    calculateSolarParallax(distance = 1.0) {
        const parallax = 8.794 / distance; // arcsec
        return Utils.round(parallax, 3);
    }
}

// Export singleton
const astronomyCalc = new AstronomyCalculator();
