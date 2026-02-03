/**
 * EXPOSURE OPTIMIZER MODULE
 * Ottimizzazione avanzata sequenze bracketing per eclissi e fotografia solare
 */

class ExposureOptimizer {
    
    /**
     * Ottimizza sequenze per eclissi totale
     * @param {Object} telescope - Configurazione telescopio
     * @param {Object} camera - Configurazione camera
     * @param {number} totalityDuration - Durata totalità in secondi
     * @returns {Object} Sequenze ottimizzate
     */
    optimizeEclipseSequences(telescope, camera, totalityDuration) {
        if (!telescope || !camera) {
            return this.getDefaultEclipseSequences();
        }
        
        // Fattori di ottimizzazione
        const focalFactor = telescope.focalLength / CONFIG.OPTIMIZATION.baseFocal;
        const fRatioFactor = telescope.fRatio / CONFIG.OPTIMIZATION.baseFratio;
        const cameraFactor = this.getCameraExposureFactor(camera);
        
        // Fattore combinato
        const combinedFactor = focalFactor * fRatioFactor * cameraFactor;
        
        // Sequenze base (in millisecondi)
        const baseSequences = {
            chromosphere: {
                name: 'Cromosfera',
                timing: 'C2+6s',
                priority: 'high',
                exposures: [0.5, 1, 2, 4, 8], // ms
                count: 5,
                description: 'Strato rosso sottile'
            },
            innerCorona: {
                name: 'Corona Interna',
                timing: 'C2+40s',
                priority: 'high',
                exposures: [4, 8, 16, 32, 63], // ms
                count: 5,
                description: 'Alone bianco brillante'
            },
            midCorona: {
                name: 'Corona Media',
                timing: 'metà totalità',
                priority: 'medium',
                exposures: [63, 125, 250, 500, 1000], // ms
                count: 5,
                description: 'Strutture coronali'
            },
            outerCorona: {
                name: 'Corona Esterna',
                timing: 'C3-40s',
                priority: 'medium',
                exposures: [1000, 2000, 4000, 8000], // ms
                count: 4,
                description: 'Streamer lontani'
            },
            prominence: {
                name: 'Protuberanze',
                timing: 'C3-6s',
                priority: 'high',
                exposures: [1, 2, 4], // ms
                count: 3,
                description: 'Esplosioni rosse'
            }
        };
        
        // Applica fattori di scala
        const optimized = {};
        for (let [key, seq] of Object.entries(baseSequences)) {
            optimized[key] = {
                ...seq,
                exposures: seq.exposures.map(exp => 
                    this.roundExposure(exp * combinedFactor)
                ),
                exposuresOriginal: seq.exposures,
                scaleFactor: Utils.round(combinedFactor, 3)
            };
        }
        
        // Aggiungi parametri camera
        if (camera.type === 'cmos') {
            optimized.cameraParams = {
                gainChromosphere: camera.gainLowNoise || 200,
                gainCorona: camera.gainUnity || 120,
                gainProminence: camera.gainLowNoise || 200,
                offset: 10,
                binning: 1
            };
        } else if (camera.type === 'dslr') {
            optimized.cameraParams = {
                isoChromosphere: 800,
                isoCorona: 400,
                isoProminence: 800,
                quality: 'RAW',
                binning: 1
            };
        }
        
        // Calcola timing preciso basato su durata totalità
        optimized.timeline = this.calculateEclipseTimeline(optimized, totalityDuration);
        
        // Stima frame totali
        optimized.totalFrames = this.calculateTotalFrames(optimized);
        optimized.estimatedDataSize = this.estimateDataSize(optimized, camera);
        
        return optimized;
    }
    
    /**
     * Ottimizza parametri per fotografia solare con filtro
     */
    optimizeSolarExposure(telescope, camera, filterType = 'nd5') {
        if (!telescope || !camera) {
            return this.getDefaultSolarExposure();
        }
        
        // Fattori filtro
        const filterFactors = {
            'nd5': 100000,      // ND5 = 100,000x riduzione
            'mylar': 100000,    // Mylar equivalente ND5
            'halpha': 1000,     // H-alpha con ERF
            'cak': 1000         // Calcium K
        };
        
        const filterFactor = filterFactors[filterType] || 100000;
        
        // Esposizione base per f/10, ISO 400, ND5
        const baseExposure = CONFIG.OPTIMIZATION.baseExposureSolar; // 1ms
        
        // Aggiusta per f/ratio
        const fRatioFactor = Math.pow(telescope.fRatio / 10, 2);
        
        // Aggiusta per tipo camera
        const cameraFactor = camera.type === 'dslr' ? 1.5 : 1.0;
        
        // Esposizione ottimale
        const optimalExposure = baseExposure * fRatioFactor * cameraFactor;
        
        // Range (±2 stops)
        const exposureMin = optimalExposure * 0.25;
        const exposureMax = optimalExposure * 4;
        
        return {
            filterType: filterType,
            filterFactor: filterFactor,
            exposure: {
                optimal: this.roundExposure(optimalExposure),
                min: this.roundExposure(exposureMin),
                max: this.roundExposure(exposureMax),
                unit: optimalExposure < 1 ? 'ms' : 's'
            },
            camera: camera.type === 'cmos' ? {
                gain: camera.gainUnity || 120,
                offset: 10,
                binning: 1,
                format: 'FITS'
            } : {
                iso: 400,
                quality: 'RAW',
                format: 'CR2/NEF'
            },
            frameRate: this.calculateSolarFrameRate(camera, optimalExposure),
            recommendations: this.getSolarRecommendations(telescope, camera, filterType)
        };
    }
    
    /**
     * Calcola fattore esposizione camera
     */
    getCameraExposureFactor(camera) {
        if (camera.type === 'cmos') {
            // CMOS più sensibile, specialmente con back-illuminated
            const qeFactor = (camera.qe || 0.8) / 0.8;
            return 0.8 * qeFactor;
        } else if (camera.type === 'dslr') {
            // DSLR meno sensibile, più rumore termico
            return 1.2;
        }
        return 1.0;
    }
    
    /**
     * Arrotonda esposizione a valori standard
     */
    roundExposure(ms) {
        if (ms < 1) {
            // Sotto 1ms: arrotonda a 0.1ms
            return Math.round(ms * 10) / 10;
        } else if (ms < 10) {
            // 1-10ms: arrotonda a 1ms
            return Math.round(ms);
        } else if (ms < 100) {
            // 10-100ms: arrotonda a 5ms
            return Math.round(ms / 5) * 5;
        } else if (ms < 1000) {
            // 100-1000ms: arrotonda a 10ms
            return Math.round(ms / 10) * 10;
        } else {
            // >1000ms: converti in secondi, arrotonda a 0.1s
            return Math.round(ms / 100) * 100;
        }
    }
    
    /**
     * Formatta esposizione per display
     */
    formatExposure(ms) {
        if (ms < 1) {
            return `${ms.toFixed(2)}ms`;
        } else if (ms < 1000) {
            return `${Math.round(ms)}ms`;
        } else {
            const seconds = ms / 1000;
            if (seconds < 10) {
                return `${seconds.toFixed(2)}s`;
            } else {
                return `${Math.round(seconds)}s`;
            }
        }
    }
    
    /**
     * Calcola timeline eclissi con timing preciso
     */
    calculateEclipseTimeline(sequences, totalityDuration) {
        const timeline = [];
        
        // Durata sequenze in secondi
        const chromosphereTime = 10; // C2+6s a C2+16s
        const innerCoronaTime = 30;  // C2+40s a C2+70s
        const midCoronaTime = 30;    // Centro ±15s
        const outerCoronaTime = 30;  // C3-70s a C3-40s
        const prominenceTime = 10;   // C3-16s a C3-6s
        
        // Cromosfera (inizio totalità)
        timeline.push({
            sequence: 'chromosphere',
            startOffset: 6,  // C2+6s
            duration: chromosphereTime,
            frames: sequences.chromosphere.count
        });
        
        // Corona interna
        timeline.push({
            sequence: 'innerCorona',
            startOffset: 40, // C2+40s
            duration: innerCoronaTime,
            frames: sequences.innerCorona.count
        });
        
        // Corona media (centro totalità)
        const midPoint = totalityDuration / 2;
        timeline.push({
            sequence: 'midCorona',
            startOffset: midPoint - 15,
            duration: midCoronaTime,
            frames: sequences.midCorona.count
        });
        
        // Corona esterna
        timeline.push({
            sequence: 'outerCorona',
            startOffset: totalityDuration - 70,
            duration: outerCoronaTime,
            frames: sequences.outerCorona.count
        });
        
        // Protuberanze (fine totalità)
        timeline.push({
            sequence: 'prominence',
            startOffset: totalityDuration - 16,
            duration: prominenceTime,
            frames: sequences.prominence.count
        });
        
        return timeline;
    }
    
    /**
     * Calcola frame totali
     */
    calculateTotalFrames(sequences) {
        let total = 0;
        for (let seq of Object.values(sequences)) {
            if (seq.count) {
                total += seq.count;
            }
        }
        return total;
    }
    
    /**
     * Stima dimensione dati
     */
    estimateDataSize(sequences, camera) {
        const totalFrames = this.calculateTotalFrames(sequences);
        
        // Dimensione singolo frame
        let frameSize;
        if (camera.type === 'cmos') {
            // FITS: width * height * bitDepth / 8
            const bytesPerPixel = (camera.bitDepth || 16) / 8;
            frameSize = camera.width * camera.height * bytesPerPixel;
        } else {
            // RAW DSLR: ~25-35MB tipico
            frameSize = 30 * 1024 * 1024; // 30MB
        }
        
        const totalBytes = frameSize * totalFrames;
        const totalMB = totalBytes / (1024 * 1024);
        const totalGB = totalMB / 1024;
        
        return {
            frames: totalFrames,
            perFrame: `${(frameSize / (1024 * 1024)).toFixed(1)}MB`,
            total: totalGB > 1 ? `${totalGB.toFixed(2)}GB` : `${totalMB.toFixed(0)}MB`,
            recommendedCardSize: totalGB > 1 ? `${Math.ceil(totalGB * 2)}GB` : `${Math.ceil(totalMB * 2 / 1024)}GB`
        };
    }
    
    /**
     * Calcola frame rate per video solare
     */
    calculateSolarFrameRate(camera, exposureMs) {
        if (camera.fps) {
            // Camera specifica frame rate
            return Math.min(camera.fps, 1000 / exposureMs);
        }
        
        // Stima basata su tipo
        if (camera.type === 'cmos' && camera.width < 2000) {
            // Camera planetaria veloce
            return Math.min(60, 1000 / exposureMs);
        }
        
        // Camera normale
        return Math.min(10, 1000 / exposureMs);
    }
    
    /**
     * Raccomandazioni fotografia solare
     */
    getSolarRecommendations(telescope, camera, filterType) {
        const recommendations = [];
        
        // Seeing
        recommendations.push({
            category: 'Seeing',
            good: 'Esposizione breve (0.5-1ms), binning 1x1, video >1000 frame',
            bad: 'Esposizione lunga (2-5ms), binning 2x2, still images'
        });
        
        // Filtro
        if (filterType === 'nd5' || filterType === 'mylar') {
            recommendations.push({
                category: 'Sicurezza Filtro',
                warning: 'CRITICO: Verifica integrità filtro prima di ogni sessione. NO fori o graffi!',
                mounting: 'Monta filtro su APERTURA telescopio, mai su oculare'
            });
        }
        
        // Processing
        recommendations.push({
            category: 'Post-Processing',
            workflow: 'AutoStakkert (stacking) → RegiStax (wavelet) → PixInsight (final)'
        });
        
        // Timing
        recommendations.push({
            category: 'Timing Ottimale',
            best: '2-3 ore dopo alba o prima tramonto (seeing migliore)',
            avoid: 'Mezzogiorno (turbolenza aria massima)'
        });
        
        return recommendations;
    }
    
    /**
     * Sequenze default (se equipment non configurato)
     */
    getDefaultEclipseSequences() {
        return {
            chromosphere: {
                name: 'Cromosfera',
                exposures: [0.5, 1, 2, 4, 8],
                count: 5
            },
            innerCorona: {
                name: 'Corona Interna',
                exposures: [4, 8, 16, 32, 63],
                count: 5
            },
            midCorona: {
                name: 'Corona Media',
                exposures: [63, 125, 250, 500, 1000],
                count: 5
            },
            outerCorona: {
                name: 'Corona Esterna',
                exposures: [1000, 2000, 4000, 8000],
                count: 4
            },
            prominence: {
                name: 'Protuberanze',
                exposures: [1, 2, 4],
                count: 3
            },
            note: 'Sequenze default - configura equipment per ottimizzazione'
        };
    }
    
    /**
     * Esposizione solare default
     */
    getDefaultSolarExposure() {
        return {
            filterType: 'nd5',
            exposure: {
                optimal: 1,
                min: 0.25,
                max: 4,
                unit: 'ms'
            },
            camera: {
                gain: 120,
                iso: 400
            },
            note: 'Parametri default - configura equipment per ottimizzazione'
        };
    }
    
    /**
     * Genera script sequenze (es. per N.I.N.A.)
     */
    generateSequenceScript(sequences, format = 'nina') {
        // TODO: Implementare export script
        return {
            format: format,
            sequences: sequences,
            note: 'Export script - feature in sviluppo'
        };
    }
}

// Export singleton
const exposureOptimizer = new ExposureOptimizer();
