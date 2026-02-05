/**
 * ECLIPSE SEQUENCE GENERATOR
 * Genera sequenze di scatto automatiche per le fasi dell'eclissi
 */

class EclipseSequenceGenerator {
    constructor() {
        this.sequences = [];
        this.filterSettings = {
            partial: { filter: 'ND5', filterName: 'Filtro Solare ND5 (ND 100000)' },
            totality: { filter: 'none', filterName: 'Nessun Filtro' },
            chromosphere: { filter: 'Ha', filterName: 'Filtro H-Alpha (opzionale)' },
            corona: { filter: 'none', filterName: 'Nessun Filtro' },
            baily: { filter: 'none', filterName: 'Nessun Filtro' }
        };
    }
    
    /**
     * Imposta tipo di filtro per una fase
     */
    setFilterForPhase(phase, filterType, filterName) {
        if (this.filterSettings[phase]) {
            this.filterSettings[phase].filter = filterType;
            this.filterSettings[phase].filterName = filterName;
        }
    }
    
    /**
     * Genera sequenze automatiche per eclissi
     */
    generateSequences(eclipseData, equipment, preferences = {}) {
        const sequences = [];
        
        // Default preferences
        const prefs = {
            partialExposures: preferences.partialExposures || [1/4000, 1/2000, 1/1000],
            totalityExposures: preferences.totalityExposures || [1/4000, 1/2000, 1/1000, 1/500, 1/250, 1/125, 1/60, 1/30, 1/15, 1/8, 1/4, 1/2, 1, 2],
            coronaExposures: preferences.coronaExposures || [1/1000, 1/500, 1/125, 1/30, 1/8, 1/2, 1, 2, 4],
            chromosphereExposure: preferences.chromosphereExposure || 1/2000,
            bailyExposures: preferences.bailyExposures || [1/4000, 1/2000, 1/1000, 1/500],
            iso: preferences.iso || 400,
            shotsPerExposure: preferences.shotsPerExposure || 3,
            enableBracketing: preferences.enableBracketing !== false
        };
        
        // 1. PRIMO CONTATTO (C1) - Parziale iniziale
        if (eclipseData.c1) {
            sequences.push({
                id: 'c1',
                name: 'C1 - Primo Contatto',
                phase: 'partial',
                startTime: eclipseData.c1,
                duration: 120, // 2 minuti
                filter: this.filterSettings.partial.filter,
                filterName: this.filterSettings.partial.filterName,
                exposures: prefs.partialExposures,
                iso: prefs.iso,
                shots: prefs.shotsPerExposure,
                priority: 'medium',
                description: 'Inizio parzialità - La Luna inizia a coprire il Sole',
                autoRemoveFilter: false
            });
        }
        
        // 2. FASE PARZIALE - Progressione verso totalità
        if (eclipseData.c1 && eclipseData.c2) {
            const midPartial = new Date((eclipseData.c1.getTime() + eclipseData.c2.getTime()) / 2);
            
            sequences.push({
                id: 'partial-mid',
                name: 'Parziale 50%',
                phase: 'partial',
                startTime: midPartial,
                duration: 180,
                filter: this.filterSettings.partial.filter,
                filterName: this.filterSettings.partial.filterName,
                exposures: prefs.partialExposures,
                iso: prefs.iso,
                shots: prefs.shotsPerExposure,
                priority: 'low',
                description: 'Metà della fase parziale',
                autoRemoveFilter: false
            });
        }
        
        // 3. SECONDO CONTATTO (C2) - Perle di Baily + Rimozione Filtro
        if (eclipseData.c2) {
            // 30 secondi PRIMA di C2 - avviso rimozione filtro
            const filterWarning = new Date(eclipseData.c2.getTime() - 30000);
            
            sequences.push({
                id: 'c2-warning',
                name: '⚠️ PREPARA RIMOZIONE FILTRO',
                phase: 'filter_warning',
                startTime: filterWarning,
                duration: 30,
                filter: this.filterSettings.partial.filter,
                filterName: 'PREPARA RIMOZIONE!',
                exposures: [],
                shots: 0,
                priority: 'critical',
                description: 'ATTENZIONE: Rimuovi filtro solare nei prossimi 30 secondi!',
                autoRemoveFilter: true,
                alertSound: 'warning',
                alertMessage: 'RIMUOVI FILTRO SOLARE ADESSO!'
            });
            
            // Perle di Baily (-5 secondi da C2)
            const bailyStart = new Date(eclipseData.c2.getTime() - 5000);
            
            sequences.push({
                id: 'c2-baily',
                name: 'C2 - Perle di Baily',
                phase: 'baily',
                startTime: bailyStart,
                duration: 10, // 10 secondi
                filter: this.filterSettings.baily.filter,
                filterName: this.filterSettings.baily.filterName,
                exposures: prefs.bailyExposures,
                iso: prefs.iso,
                shots: 5, // Molti scatti rapidi
                priority: 'critical',
                description: 'Perle di Baily - Scatti rapidi!',
                autoRemoveFilter: false
            });
            
            // Cromosfera (immediatamente dopo Baily)
            const chromosphereStart = new Date(eclipseData.c2.getTime() + 2000);
            
            sequences.push({
                id: 'c2-chromosphere',
                name: 'C2 - Cromosfera',
                phase: 'chromosphere',
                startTime: chromosphereStart,
                duration: 3,
                filter: this.filterSettings.chromosphere.filter,
                filterName: this.filterSettings.chromosphere.filterName,
                exposures: [prefs.chromosphereExposure],
                iso: prefs.iso,
                shots: 3,
                priority: 'high',
                description: 'Cromosfera rosata visibile',
                autoRemoveFilter: false
            });
        }
        
        // 4. TOTALITÀ - Corona solare
        if (eclipseData.c2 && eclipseData.c3) {
            const totalityDuration = (eclipseData.c3.getTime() - eclipseData.c2.getTime()) / 1000;
            
            // Inizio totalità - Corona interna
            const totalityStart = new Date(eclipseData.c2.getTime() + 5000);
            
            sequences.push({
                id: 'totality-inner-corona',
                name: 'Totalità - Corona Interna',
                phase: 'totality',
                startTime: totalityStart,
                duration: Math.min(totalityDuration * 0.3, 60),
                filter: this.filterSettings.corona.filter,
                filterName: this.filterSettings.corona.filterName,
                exposures: prefs.coronaExposures.slice(0, 7), // Esposizioni medie-brevi
                iso: prefs.iso,
                shots: prefs.shotsPerExposure,
                priority: 'critical',
                description: 'Corona interna luminosa',
                autoRemoveFilter: false
            });
            
            // Metà totalità - Corona media
            const midTotality = new Date((eclipseData.c2.getTime() + eclipseData.c3.getTime()) / 2);
            
            sequences.push({
                id: 'totality-mid-corona',
                name: 'Totalità - Corona Media',
                phase: 'totality',
                startTime: midTotality,
                duration: Math.min(totalityDuration * 0.4, 90),
                filter: this.filterSettings.corona.filter,
                filterName: this.filterSettings.corona.filterName,
                exposures: prefs.totalityExposures,
                iso: prefs.iso,
                shots: prefs.shotsPerExposure,
                priority: 'critical',
                description: 'Corona media - HDR completo',
                autoRemoveFilter: false
            });
        }
        
        // 5. TERZO CONTATTO (C3) - Fine totalità + Rimetti Filtro
        if (eclipseData.c3) {
            // Cromosfera uscita (-3 secondi da C3)
            const chromosphereEnd = new Date(eclipseData.c3.getTime() - 3000);
            
            sequences.push({
                id: 'c3-chromosphere',
                name: 'C3 - Cromosfera Uscita',
                phase: 'chromosphere',
                startTime: chromosphereEnd,
                duration: 3,
                filter: this.filterSettings.chromosphere.filter,
                filterName: this.filterSettings.chromosphere.filterName,
                exposures: [prefs.chromosphereExposure],
                iso: prefs.iso,
                shots: 3,
                priority: 'high',
                description: 'Cromosfera lato opposto',
                autoRemoveFilter: false
            });
            
            // Perle di Baily uscita
            const bailyEnd = new Date(eclipseData.c3.getTime());
            
            sequences.push({
                id: 'c3-baily',
                name: 'C3 - Perle di Baily Uscita',
                phase: 'baily',
                startTime: bailyEnd,
                duration: 10,
                filter: this.filterSettings.baily.filter,
                filterName: this.filterSettings.baily.filterName,
                exposures: prefs.bailyExposures,
                iso: prefs.iso,
                shots: 5,
                priority: 'critical',
                description: 'Perle di Baily lato uscita',
                autoRemoveFilter: false
            });
            
            // Avviso rimetti filtro (+5 secondi da C3)
            const filterReplace = new Date(eclipseData.c3.getTime() + 5000);
            
            sequences.push({
                id: 'c3-filter-warning',
                name: '⚠️ RIMETTI FILTRO SOLARE',
                phase: 'filter_warning',
                startTime: filterReplace,
                duration: 10,
                filter: 'REQUIRED',
                filterName: 'RIMETTI FILTRO ADESSO!',
                exposures: [],
                shots: 0,
                priority: 'critical',
                description: 'ATTENZIONE: Rimetti filtro solare immediatamente!',
                autoRemoveFilter: false,
                alertSound: 'critical',
                alertMessage: 'RIMETTI FILTRO SOLARE ADESSO!'
            });
        }
        
        // 6. QUARTO CONTATTO (C4) - Fine eclissi
        if (eclipseData.c4) {
            const c4Start = new Date(eclipseData.c4.getTime() - 60000);
            
            sequences.push({
                id: 'c4',
                name: 'C4 - Quarto Contatto',
                phase: 'partial',
                startTime: c4Start,
                duration: 120,
                filter: this.filterSettings.partial.filter,
                filterName: this.filterSettings.partial.filterName,
                exposures: prefs.partialExposures,
                iso: prefs.iso,
                shots: prefs.shotsPerExposure,
                priority: 'low',
                description: 'Fine eclissi - Luna si allontana',
                autoRemoveFilter: false
            });
        }
        
        this.sequences = sequences;
        return sequences;
    }
    
    /**
     * Esporta sequenze per NINA
     */
    exportForNINA(sequences, equipment) {
        const ninaSequences = [];
        
        sequences.forEach(seq => {
            if (seq.exposures && seq.exposures.length > 0) {
                seq.exposures.forEach(exposure => {
                    ninaSequences.push({
                        Name: seq.name,
                        ExposureTime: exposure > 1 ? exposure : (1 / Math.abs(exposure)),
                        ISO: seq.iso,
                        Gain: this.isoToGain(seq.iso),
                        Count: seq.shots,
                        Filter: seq.filter,
                        Binning: 1,
                        Priority: seq.priority === 'critical' ? 1 : seq.priority === 'high' ? 2 : 3,
                        StartTime: seq.startTime.toISOString(),
                        Description: seq.description
                    });
                });
            }
        });
        
        return {
            SequenceTitle: `Eclissi ${sequences[0].startTime.toLocaleDateString()}`,
            Equipment: {
                Camera: equipment.camera?.name || 'Unknown',
                Telescope: `${equipment.telescope?.diameter}mm f/${equipment.telescope?.focalRatio}`,
                Mount: 'Generic'
            },
            Sequences: ninaSequences,
            Generated: new Date().toISOString(),
            Generator: 'Eclipse Commander v4.0'
        };
    }
    
    /**
     * Esporta sequenze per Ekos
     */
    exportForEkos(sequences, equipment) {
        const ekosSequences = [];
        
        sequences.forEach(seq => {
            if (seq.exposures && seq.exposures.length > 0) {
                seq.exposures.forEach(exposure => {
                    ekosSequences.push({
                        name: seq.name,
                        exposure: exposure > 1 ? exposure : (1 / Math.abs(exposure)),
                        iso: seq.iso,
                        count: seq.shots,
                        filter: seq.filter,
                        binning: '1x1',
                        priority: seq.priority === 'critical' ? 'high' : 'normal',
                        start_time: seq.startTime.toISOString(),
                        description: seq.description
                    });
                });
            }
        });
        
        return {
            sequence_name: `Eclissi_${sequences[0].startTime.toLocaleDateString()}`,
            equipment: {
                camera: equipment.camera?.name || 'Unknown',
                telescope: `${equipment.telescope?.diameter}mm`,
                focal_length: equipment.telescope?.focalLength || 0
            },
            jobs: ekosSequences,
            generated: new Date().toISOString(),
            generator: 'Eclipse Commander v4.0'
        };
    }
    
    /**
     * Converti ISO in Gain per CMOS
     */
    isoToGain(iso) {
        // Conversione approssimativa ISO → Gain per camere CMOS
        const isoToGainMap = {
            100: 0,
            200: 50,
            400: 100,
            800: 150,
            1600: 200,
            3200: 250
        };
        
        return isoToGainMap[iso] || Math.round((iso / 100) * 50);
    }
    
    /**
     * Ottieni tutte le sequenze
     */
    getSequences() {
        return this.sequences;
    }
    
    /**
     * Ottieni sequenza per ID
     */
    getSequence(id) {
        return this.sequences.find(seq => seq.id === id);
    }
    
    /**
     * Modifica sequenza esistente
     */
    updateSequence(id, updates) {
        const seq = this.getSequence(id);
        if (seq) {
            Object.assign(seq, updates);
            return true;
        }
        return false;
    }
    
    /**
     * Elimina sequenza
     */
    deleteSequence(id) {
        const index = this.sequences.findIndex(seq => seq.id === id);
        if (index !== -1) {
            this.sequences.splice(index, 1);
            return true;
        }
        return false;
    }
}

const eclipseSequenceGenerator = new EclipseSequenceGenerator();
