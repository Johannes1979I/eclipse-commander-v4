/**
 * TELESCOPE MANAGER MODULE
 * Gestione avanzata telescopi e calcoli ottici
 */

class TelescopeManager {
    constructor() {
        this.currentTelescope = null;
        this.currentCamera = null;
        this.calculations = null;
    }
    
    /**
     * Imposta telescopio da database o custom
     * @param {string|Object} telescope - ID database o oggetto custom
     */
    setTelescope(telescope) {
        if (typeof telescope === 'string') {
            // Carica da database
            this.currentTelescope = EquipmentDatabase.findTelescope(telescope);
            if (!this.currentTelescope) {
                throw new Error('Telescopio non trovato nel database');
            }
        } else {
            // Custom
            this.currentTelescope = {
                name: telescope.name || 'Custom',
                type: telescope.type || 'custom',
                diameter: parseFloat(telescope.diameter),
                focalLength: parseFloat(telescope.focalLength),
                fRatio: parseFloat(telescope.focalLength) / parseFloat(telescope.diameter),
                manufacturer: telescope.manufacturer || 'Custom'
            };
        }
        
        // Calcola specifiche
        this.calculateTelescopeSpecs();
        
        // Ricalcola tutto se camera già impostata
        if (this.currentCamera) {
            this.calculateSystemPerformance();
        }
        
        return this.currentTelescope;
    }
    
    /**
     * Imposta camera da database o custom
     */
    setCamera(camera) {
        if (typeof camera === 'string') {
            this.currentCamera = EquipmentDatabase.findCamera(camera);
            if (!this.currentCamera) {
                throw new Error('Camera non trovata nel database');
            }
        } else {
            this.currentCamera = {
                name: camera.name || 'Custom',
                type: camera.type || 'generic',
                manufacturer: camera.manufacturer || 'Custom',
                width: parseInt(camera.width),
                height: parseInt(camera.height),
                pixelSize: parseFloat(camera.pixelSize),
                bitDepth: parseInt(camera.bitDepth) || 14,
                color: camera.color !== false,
                cooling: camera.cooling === true,
                gainUnity: parseInt(camera.gainUnity) || 120,
                gainLowNoise: parseInt(camera.gainLowNoise) || 200
            };
        }
        
        // Calcola dimensioni sensore
        this.calculateSensorSpecs();
        
        // Ricalcola tutto se telescopio già impostato
        if (this.currentTelescope) {
            this.calculateSystemPerformance();
        }
        
        return this.currentCamera;
    }
    
    /**
     * Calcola specifiche telescopio
     */
    calculateTelescopeSpecs() {
        if (!this.currentTelescope) return;
        
        const t = this.currentTelescope;
        
        // Light gathering power vs occhio umano (7mm)
        t.lightGatheringPower = Math.pow(t.diameter / 7, 2);
        
        // Risoluzione teorica (Dawes limit)
        t.dawesLimit = 120 / t.diameter; // arcsec
        
        // Risoluzione Rayleigh
        t.rayleighLimit = 138 / t.diameter; // arcsec
        
        // Magnification range utile
        t.magnificationMin = t.diameter * 0.5;
        t.magnificationMax = t.diameter * 2;
        
        // Focal ratio classification
        if (t.fRatio < 4) {
            t.speedClass = 'Ultra Fast';
        } else if (t.fRatio < 6) {
            t.speedClass = 'Fast';
        } else if (t.fRatio < 9) {
            t.speedClass = 'Medium';
        } else {
            t.speedClass = 'Slow';
        }
    }
    
    /**
     * Calcola specifiche sensore camera
     */
    calculateSensorSpecs() {
        if (!this.currentCamera) return;
        
        const c = this.currentCamera;
        
        // Dimensioni sensore in mm
        c.sensorWidth = (c.width * c.pixelSize) / 1000;
        c.sensorHeight = (c.height * c.pixelSize) / 1000;
        c.sensorDiagonal = Math.sqrt(
            Math.pow(c.sensorWidth, 2) + Math.pow(c.sensorHeight, 2)
        );
        
        // Formato sensore
        if (c.sensorDiagonal > 42) {
            c.format = 'Full Frame';
        } else if (c.sensorDiagonal > 30) {
            c.format = 'APS-C';
        } else if (c.sensorDiagonal > 20) {
            c.format = '4/3"';
        } else if (c.sensorDiagonal > 13) {
            c.format = '1"';
        } else {
            c.format = 'Small';
        }
        
        // Megapixel
        c.megapixels = Utils.round((c.width * c.height) / 1000000, 1);
    }
    
    /**
     * Calcola performance sistema telescopio+camera
     */
    calculateSystemPerformance() {
        if (!this.currentTelescope || !this.currentCamera) {
            this.calculations = null;
            return null;
        }
        
        const t = this.currentTelescope;
        const c = this.currentCamera;
        
        // Field of View
        const fovWidth = 2 * Math.atan(c.sensorWidth / (2 * t.focalLength)) * 180 / Math.PI;
        const fovHeight = 2 * Math.atan(c.sensorHeight / (2 * t.focalLength)) * 180 / Math.PI;
        const fovDiagonal = 2 * Math.atan(c.sensorDiagonal / (2 * t.focalLength)) * 180 / Math.PI;
        
        // Sampling (image scale)
        const sampling = (c.pixelSize / t.focalLength) * 206.265; // arcsec/pixel
        
        // Nyquist criterion
        const nyquistSampling = t.dawesLimit / 2;
        const samplingRatio = sampling / nyquistSampling;
        
        // Sun coverage
        const sunAngularDiameter = 0.53; // gradi
        const sunDiameterPixels = (sunAngularDiameter * 3600) / sampling;
        const sunDiameterMm = (sunDiameterPixels * c.pixelSize) / 1000;
        const sunCoveragePercent = (sunDiameterMm / c.sensorWidth) * 100;
        
        // Moon coverage (per confronto)
        const moonAngularDiameter = 0.52; // gradi
        const moonDiameterPixels = (moonAngularDiameter * 3600) / sampling;
        
        this.calculations = {
            // Field of View
            fov: {
                width: Utils.round(fovWidth, 3),
                height: Utils.round(fovHeight, 3),
                diagonal: Utils.round(fovDiagonal, 3),
                widthArcmin: Utils.round(fovWidth * 60, 1),
                heightArcmin: Utils.round(fovHeight * 60, 1)
            },
            
            // Sampling
            sampling: {
                value: Utils.round(sampling, 3),
                nyquist: Utils.round(nyquistSampling, 3),
                ratio: Utils.round(samplingRatio, 2),
                status: this.getSamplingStatus(samplingRatio),
                recommendation: this.getSamplingRecommendation(samplingRatio)
            },
            
            // Sun/Moon coverage
            targets: {
                sun: {
                    diameterPixels: Math.round(sunDiameterPixels),
                    diameterMm: Utils.round(sunDiameterMm, 2),
                    coveragePercent: Utils.round(sunCoveragePercent, 1),
                    fitsInFrame: sunCoveragePercent < 90
                },
                moon: {
                    diameterPixels: Math.round(moonDiameterPixels),
                    fitsInFrame: moonDiameterPixels < c.width * 0.9
                }
            },
            
            // Resolution
            resolution: {
                dawes: Utils.round(t.dawesLimit, 3),
                rayleigh: Utils.round(t.rayleighLimit, 3),
                pixelResolution: Utils.round(sampling, 3),
                effectiveResolution: Utils.round(Math.max(sampling, t.dawesLimit), 3)
            },
            
            // System info
            system: {
                focalRatio: Utils.round(t.fRatio, 2),
                speedClass: t.speedClass,
                lightGathering: Math.round(t.lightGatheringPower),
                sensorFormat: c.format,
                megapixels: c.megapixels
            }
        };
        
        return this.calculations;
    }
    
    /**
     * Determina stato sampling
     */
    getSamplingStatus(ratio) {
        if (ratio < 0.5) return 'heavy-oversampling';
        if (ratio < 0.8) return 'oversampling';
        if (ratio <= 1.5) return 'optimal';
        if (ratio <= 2.5) return 'undersampling';
        return 'critical-undersampling';
    }
    
    /**
     * Raccomandazione sampling
     */
    getSamplingRecommendation(ratio) {
        if (ratio < 0.5) {
            return 'Oversampling eccessivo. Considera binning 3x3 o 4x4 per ridurre file size senza perdere dettaglio.';
        }
        if (ratio < 0.8) {
            return 'Slight oversampling. Ottimo per seeing variabile. Considera binning 2x2 se vuoi ridurre file size.';
        }
        if (ratio <= 1.5) {
            return 'Sampling ottimale! Bilanciamento perfetto tra risoluzione e dimensione file.';
        }
        if (ratio <= 2.5) {
            return 'Undersampling moderato. Va bene per focali corte e wide field, ma perdi alcuni dettagli fini.';
        }
        return 'Undersampling critico. Perdi troppo dettaglio. Aumenta focale o cambia camera con pixel più piccoli.';
    }
    
    /**
     * Calcola binning ottimale
     */
    calculateOptimalBinning() {
        if (!this.calculations) return null;
        
        const ratio = this.calculations.sampling.ratio;
        
        if (ratio < 0.5) {
            return {
                recommended: 4,
                alternative: 3,
                reason: 'Forte oversampling - binning 4x4 mantiene risoluzione utile'
            };
        }
        if (ratio < 0.8) {
            return {
                recommended: 2,
                alternative: 1,
                reason: 'Oversampling - binning 2x2 ottimizza senza perdere dettaglio'
            };
        }
        if (ratio <= 1.5) {
            return {
                recommended: 1,
                alternative: null,
                reason: 'Sampling già ottimale - usa 1x1'
            };
        }
        
        return {
            recommended: 1,
            alternative: null,
            reason: 'Undersampling - binning peggiorerebbe. Usa 1x1 e aumenta focale.'
        };
    }
    
    /**
     * Calcola reducer/barlow necessario per sampling target
     */
    calculateFocalModifier(targetSampling) {
        if (!this.currentTelescope || !this.currentCamera) return null;
        
        const currentSampling = this.calculations.sampling.value;
        const ratio = targetSampling / currentSampling;
        
        // Focale necessaria
        const targetFocal = this.currentTelescope.focalLength * ratio;
        
        let recommendation = '';
        if (ratio < 1) {
            // Reducer needed
            recommendation = `Reducer ${Utils.round(ratio, 2)}x (es. 0.8x, 0.63x)`;
        } else if (ratio > 1) {
            // Barlow needed
            recommendation = `Barlow ${Utils.round(ratio, 2)}x (es. 2x, 3x)`;
        } else {
            recommendation = 'Nessuna modifica necessaria';
        }
        
        return {
            currentFocal: this.currentTelescope.focalLength,
            targetFocal: Math.round(targetFocal),
            modifier: Utils.round(ratio, 2),
            recommendation: recommendation
        };
    }
    
    /**
     * Genera report completo sistema
     */
    generateSystemReport() {
        if (!this.calculations) {
            return 'Sistema non configurato. Imposta telescopio e camera.';
        }
        
        const t = this.currentTelescope;
        const c = this.currentCamera;
        const calc = this.calculations;
        
        const report = {
            equipment: {
                telescope: `${t.name} (${t.diameter}mm f/${Utils.round(t.fRatio, 1)})`,
                camera: `${c.name} (${c.format}, ${c.megapixels}MP)`,
                combination: `${t.focalLength}mm + ${c.pixelSize}µm pixels`
            },
            
            performance: {
                fov: `${calc.fov.widthArcmin}' × ${calc.fov.heightArcmin}'`,
                sampling: `${calc.sampling.value}"/pixel`,
                samplingStatus: calc.sampling.status,
                resolution: `${calc.resolution.effectiveResolution}" effective`
            },
            
            targets: {
                sun: `${calc.targets.sun.diameterPixels}px (${calc.targets.sun.coveragePercent}% frame)`,
                sunFits: calc.targets.sun.fitsInFrame ? 'Sì' : 'No - troppo grande',
                moonFits: calc.targets.moon.fitsInFrame ? 'Sì' : 'No - troppo grande'
            },
            
            recommendations: {
                sampling: calc.sampling.recommendation,
                binning: this.calculateOptimalBinning(),
                suitability: this.assessSuitability()
            }
        };
        
        return report;
    }
    
    /**
     * Valuta idoneità setup per vari target
     */
    assessSuitability() {
        if (!this.calculations) return null;
        
        const sampling = this.calculations.sampling.value;
        const fov = this.calculations.fov.widthArcmin;
        const sunFits = this.calculations.targets.sun.fitsInFrame;
        
        return {
            eclipse: {
                score: sunFits && sampling < 10 ? 5 : sunFits ? 3 : 1,
                notes: sunFits ? 
                    'Ottimo per eclissi - sole inquadrato bene' : 
                    'Focale troppo lunga - sole non entra in frame'
            },
            solar: {
                score: sampling < 2 && sunFits ? 5 : sampling < 3 ? 4 : 3,
                notes: sampling < 2 ? 
                    'Eccellente risoluzione per dettagli solari' :
                    'Buona risoluzione per fotografia solare'
            },
            widefield: {
                score: fov > 180 ? 5 : fov > 120 ? 4 : fov > 60 ? 3 : 2,
                notes: fov > 180 ?
                    'FOV ampio eccellente per panorami e Via Lattea' :
                    fov > 60 ? 'FOV adeguato per oggetti estesi' :
                    'FOV troppo stretto per wide field'
            }
        };
    }
    
    /**
     * Confronta con altro setup
     */
    compareWith(otherTelescope, otherCamera) {
        const currentReport = this.generateSystemReport();
        
        // Salva setup corrente
        const savedTelescope = this.currentTelescope;
        const savedCamera = this.currentCamera;
        
        // Calcola altro setup
        this.setTelescope(otherTelescope);
        this.setCamera(otherCamera);
        const otherReport = this.generateSystemReport();
        
        // Ripristina setup corrente
        this.setTelescope(savedTelescope);
        this.setCamera(savedCamera);
        
        return {
            current: currentReport,
            other: otherReport,
            comparison: this.generateComparison(currentReport, otherReport)
        };
    }
    
    /**
     * Genera confronto tra due setup
     */
    generateComparison(setup1, setup2) {
        // TODO: Implementare logica confronto dettagliata
        return {
            message: 'Confronto setup - feature in sviluppo'
        };
    }
    
    /**
     * Export configurazione
     */
    exportConfiguration() {
        return {
            telescope: this.currentTelescope,
            camera: this.currentCamera,
            calculations: this.calculations,
            timestamp: new Date().toISOString()
        };
    }
}

// Export singleton
const telescopeManager = new TelescopeManager();
