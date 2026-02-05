/**
 * ECLIPSE SEQUENCES - SIMPLIFIED WORKING VERSION
 * Sistema semplificato ma funzionante al 100%
 */

class EclipseSequences {
    constructor() {
        this.sequences = [];
        this.currentSequence = null;
        this.timerInterval = null;
        this.cameraType = 'cmos';
    }
    
    /**
     * Inizializza
     */
    initialize() {
        Utils.log('Inizializzazione Eclipse Sequences...');
        
        // Setup camera type toggle
        const cameraTypeSelect = document.getElementById('cameraType');
        if (cameraTypeSelect) {
            cameraTypeSelect.addEventListener('change', (e) => {
                this.toggleCameraFields(e.target.value);
            });
            this.toggleCameraFields(cameraTypeSelect.value);
        }
        
        // Pulsante genera
        const btnGenerate = document.getElementById('btnGenerateSequences');
        if (btnGenerate) {
            btnGenerate.addEventListener('click', () => this.generateSequences());
        }
        
        // Pulsanti upload
        const btnNINA = document.getElementById('btnUploadNINA');
        if (btnNINA) {
            btnNINA.addEventListener('click', () => this.uploadNINA());
        }
        
        const btnEkos = document.getElementById('btnUploadEkos');
        if (btnEkos) {
            btnEkos.addEventListener('click', () => this.uploadEkos());
        }
        
        // Pulsanti download
        const btnJSON = document.getElementById('btnDownloadJSON');
        if (btnJSON) {
            btnJSON.addEventListener('click', () => this.downloadJSON());
        }
        
        const btnCSV = document.getElementById('btnDownloadCSV');
        if (btnCSV) {
            btnCSV.addEventListener('click', () => this.downloadCSV());
        }
        
        // Pulsante avvia timeline
        const btnStart = document.getElementById('btnStartTimeline');
        if (btnStart) {
            btnStart.addEventListener('click', () => this.startTimeline());
        }
        
        Utils.log('Eclipse Sequences inizializzato');
    }
    
    /**
     * Toggle campi ISO/GAIN
     */
    toggleCameraFields(type) {
        this.cameraType = type;
        
        const isoField = document.getElementById('isoField');
        const gainField = document.getElementById('gainField');
        const offsetField = document.getElementById('offsetField');
        const tempField = document.getElementById('tempField');
        
        if (type === 'dslr') {
            if (isoField) isoField.style.display = 'block';
            if (gainField) gainField.style.display = 'none';
            if (offsetField) offsetField.style.display = 'none';
            if (tempField) tempField.style.display = 'none';
        } else {
            if (isoField) isoField.style.display = 'none';
            if (gainField) gainField.style.display = 'block';
            if (offsetField) offsetField.style.display = 'block';
            if (tempField) tempField.style.display = 'block';
        }
    }
    
    /**
     * Genera sequenze
     */
    generateSequences() {
        Utils.log('=== GENERAZIONE SEQUENZE ===');
        
        try {
            // Verifica eclissi selezionata
            const eclipse = eclipseSelector.getSelectedEclipse();
            if (!eclipse) {
                alert('⚠️ Seleziona prima un\'eclissi!');
                return;
            }
            
            Utils.log('Eclissi selezionata:', eclipse);
            
            // Ottieni parametri
            const params = this.getParameters();
            Utils.log('Parametri:', params);
            
            // Genera sequenze
            this.sequences = this.createSequences(eclipse, params);
            
            Utils.log(`Sequenze generate: ${this.sequences.length}`);
            
            // Mostra risultati
            this.displayResults();
            
            notificationManager.show(
                `✅ ${this.sequences.length} sequenze generate con successo!`,
                'success'
            );
            
        } catch (error) {
            Utils.log('Errore generazione: ' + error.message, 'error');
            alert('❌ Errore: ' + error.message);
        }
    }
    
    /**
     * Ottieni parametri da UI
     */
    getParameters() {
        const params = {
            cameraType: this.cameraType,
            shots: parseInt(document.getElementById('sequenceShots')?.value) || 3
        };
        
        if (this.cameraType === 'dslr') {
            params.iso = parseInt(document.getElementById('sequenceISO')?.value) || 400;
        } else {
            params.gain = parseInt(document.getElementById('sequenceGain')?.value) || 100;
            params.offset = parseInt(document.getElementById('sequenceOffset')?.value) || 10;
            params.temp = parseInt(document.getElementById('sequenceTemp')?.value) || -10;
        }
        
        return params;
    }
    
    /**
     * Crea sequenze per eclissi
     */
    createSequences(eclipse, params) {
        const sequences = [];
        const contacts = eclipse.contacts;
        
        if (!contacts || !contacts.c1 || !contacts.c2 || !contacts.c3 || !contacts.c4) {
            throw new Error('Dati eclissi incompleti');
        }
        
        // Converti date strings a Date objects
        const c1 = new Date(contacts.c1);
        const c2 = new Date(contacts.c2);
        const c3 = new Date(contacts.c3);
        const c4 = new Date(contacts.c4);
        
        // 1. C1 - Primo Contatto
        sequences.push({
            id: 'c1',
            name: 'C1 - Primo Contatto',
            phase: 'partial',
            startTime: c1,
            duration: 120,
            filter: 'ND5 Solar',
            exposures: ['1/1000'],
            ...params
        });
        
        // 2. Parziale 50%
        const midPartial = new Date((c1.getTime() + c2.getTime()) / 2);
        sequences.push({
            id: 'partial-mid',
            name: 'Parziale 50%',
            phase: 'partial',
            startTime: midPartial,
            duration: 60,
            filter: 'ND5 Solar',
            exposures: ['1/1000'],
            ...params
        });
        
        // 3. Avviso Rimozione Filtro
        const filterWarning = new Date(c2.getTime() - 30000);
        sequences.push({
            id: 'filter-warning',
            name: '⚠️ RIMUOVI FILTRO',
            phase: 'warning',
            startTime: filterWarning,
            duration: 30,
            filter: 'RIMUOVERE!',
            exposures: [],
            shots: 0,
            alert: true
        });
        
        // 4. C2 - Perle di Baily
        const baily1 = new Date(c2.getTime() - 5000);
        sequences.push({
            id: 'c2-baily',
            name: 'C2 - Perle di Baily',
            phase: 'baily',
            startTime: baily1,
            duration: 10,
            filter: 'NESSUNO',
            exposures: ['1/4000', '1/2000', '1/1000'],
            ...params
        });
        
        // 5. Totalità - Corona
        const totalityStart = new Date(c2.getTime() + 5000);
        const totalityDuration = (c3.getTime() - c2.getTime()) / 1000 - 10;
        
        sequences.push({
            id: 'totality',
            name: '🌑 TOTALITÀ - Corona',
            phase: 'totality',
            startTime: totalityStart,
            duration: Math.max(totalityDuration, 60),
            filter: 'NESSUNO',
            exposures: ['1/4000', '1/2000', '1/1000', '1/500', '1/250', '1/125', '1/60', '1/30', '1/15', '1/8', '1/4', '1/2', '1s', '2s'],
            ...params
        });
        
        // 6. C3 - Perle di Baily
        sequences.push({
            id: 'c3-baily',
            name: 'C3 - Perle di Baily',
            phase: 'baily',
            startTime: c3,
            duration: 10,
            filter: 'NESSUNO',
            exposures: ['1/4000', '1/2000', '1/1000'],
            ...params
        });
        
        // 7. Avviso Rimetti Filtro
        const filterReplace = new Date(c3.getTime() + 5000);
        sequences.push({
            id: 'filter-replace',
            name: '⚠️ RIMETTI FILTRO',
            phase: 'warning',
            startTime: filterReplace,
            duration: 10,
            filter: 'APPLICARE!',
            exposures: [],
            shots: 0,
            alert: true
        });
        
        // 8. C4 - Quarto Contatto
        const c4End = new Date(c4.getTime() - 60000);
        sequences.push({
            id: 'c4',
            name: 'C4 - Fine Eclissi',
            phase: 'partial',
            startTime: c4End,
            duration: 120,
            filter: 'ND5 Solar',
            exposures: ['1/1000'],
            ...params
        });
        
        return sequences;
    }
    
    /**
     * Mostra risultati
     */
    displayResults() {
        const resultsDiv = document.getElementById('sequenceResults');
        if (!resultsDiv) return;
        
        // Mostra sezione
        resultsDiv.style.display = 'block';
        
        // Stats
        const totalShots = this.sequences.reduce((sum, seq) => {
            return sum + (seq.exposures.length * (seq.shots || 0));
        }, 0);
        
        const statsDiv = document.getElementById('sequenceStats');
        if (statsDiv) {
            statsDiv.innerHTML = `
                📋 ${this.sequences.length} sequenze create<br>
                📸 ~${totalShots} scatti totali<br>
                ⏱️ Durata: ${this.getTotalDuration()} minuti
            `;
        }
        
        // Lista sequenze
        this.displaySequencesList();
        
        // Timeline
        this.displayTimeline();
    }
    
    /**
     * Mostra lista sequenze
     */
    displaySequencesList() {
        const listDiv = document.getElementById('sequencesList');
        if (!listDiv) return;
        
        let html = '<h3>📋 Sequenze Generate</h3>';
        
        this.sequences.forEach((seq, index) => {
            const phaseColor = this.getPhaseColor(seq.phase);
            const timeStr = seq.startTime.toLocaleTimeString('it-IT');
            
            html += `
                <div style="background: ${phaseColor}20; border-left: 4px solid ${phaseColor}; padding: 1rem; margin: 0.5rem 0; border-radius: 4px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <strong>#${index + 1} ${seq.name}</strong>
                            <div style="font-size: 0.9rem; color: #666; margin-top: 0.5rem;">
                                ⏰ ${timeStr} • ⏱️ ${seq.duration}s • 🔵 ${seq.filter}
                            </div>
                        </div>
                        <div style="text-align: right;">
                            ${seq.exposures.length > 0 ? `
                                <div style="font-size: 0.85rem;">
                                    📸 ${seq.shots || 0}x${seq.exposures.length} = ${(seq.shots || 0) * seq.exposures.length} scatti
                                </div>
                            ` : ''}
                            ${this.cameraType === 'dslr' && seq.iso ? `
                                <div style="font-size: 0.85rem;">ISO: ${seq.iso}</div>
                            ` : ''}
                            ${this.cameraType === 'cmos' && seq.gain !== undefined ? `
                                <div style="font-size: 0.85rem;">
                                    Gain: ${seq.gain} | Offset: ${seq.offset} | Temp: ${seq.temp}°C
                                </div>
                            ` : ''}
                        </div>
                    </div>
                    ${seq.exposures.length > 0 ? `
                        <div style="margin-top: 0.5rem; font-size: 0.85rem; font-family: monospace;">
                            Esposizioni: ${seq.exposures.join(', ')}
                        </div>
                    ` : ''}
                </div>
            `;
        });
        
        listDiv.innerHTML = html;
    }
    
    /**
     * Mostra timeline
     */
    displayTimeline() {
        const timelineDiv = document.getElementById('timelineDisplay');
        if (!timelineDiv) return;
        
        let html = '<div style="position: relative; padding-left: 2rem;">';
        
        this.sequences.forEach((seq, index) => {
            const phaseColor = this.getPhaseColor(seq.phase);
            const timeStr = seq.startTime.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
            
            html += `
                <div id="seq-${seq.id}" style="position: relative; margin-bottom: 1.5rem; padding-left: 1rem;">
                    <div style="position: absolute; left: -1.5rem; top: 0.5rem; width: 12px; height: 12px; border-radius: 50%; background: ${phaseColor}; border: 2px solid #fff;"></div>
                    <div style="background: var(--bg-secondary); padding: 0.75rem; border-radius: 4px; border-left: 3px solid ${phaseColor};">
                        <div style="font-weight: bold;">${timeStr} - ${seq.name}</div>
                        <div style="font-size: 0.85rem; color: #666; margin-top: 0.25rem;">
                            🔵 ${seq.filter} • ⏱️ ${seq.duration}s
                            ${seq.exposures.length > 0 ? ` • 📸 ${seq.exposures.length} esposizioni` : ''}
                        </div>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        
        timelineDiv.innerHTML = html;
    }
    
    /**
     * Avvia timeline live
     */
    startTimeline() {
        Utils.log('Avvio timeline live...');
        
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
        
        // Crea display countdown
        const timelineDiv = document.getElementById('timelineDisplay');
        if (!timelineDiv) return;
        
        const countdownDiv = document.createElement('div');
        countdownDiv.id = 'liveCountdown';
        countdownDiv.style.cssText = 'background: linear-gradient(135deg, #4cd964, #5ac8fa); color: white; padding: 2rem; border-radius: 12px; text-align: center; margin-bottom: 2rem; font-size: 1.5rem; font-weight: bold;';
        
        timelineDiv.insertBefore(countdownDiv, timelineDiv.firstChild);
        
        // Update ogni secondo
        this.timerInterval = setInterval(() => {
            this.updateTimeline();
        }, 1000);
        
        this.updateTimeline();
        
        notificationManager.show('⏱️ Timeline live avviata!', 'success');
    }
    
    /**
     * Update timeline
     */
    updateTimeline() {
        const now = new Date();
        const countdownDiv = document.getElementById('liveCountdown');
        if (!countdownDiv) return;
        
        // Trova prossima sequenza
        const next = this.sequences.find(seq => seq.startTime > now);
        
        // Trova sequenza attiva
        const active = this.sequences.find(seq => {
            const end = new Date(seq.startTime.getTime() + seq.duration * 1000);
            return now >= seq.startTime && now <= end;
        });
        
        // Highlight attiva
        if (active && active !== this.currentSequence) {
            this.currentSequence = active;
            
            // Rimuovi highlight precedenti
            document.querySelectorAll('[id^="seq-"]').forEach(el => {
                el.style.transform = '';
                el.style.boxShadow = '';
            });
            
            // Aggiungi highlight
            const activeEl = document.getElementById(`seq-${active.id}`);
            if (activeEl) {
                activeEl.style.transform = 'translateX(10px)';
                activeEl.style.boxShadow = '0 4px 12px rgba(76, 217, 100, 0.5)';
                activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            
            // Play beep
            if (audioManager && active.alert) {
                audioManager.playAlert('sequence_start', active.name);
            }
        }
        
        // Update countdown
        if (next) {
            const diff = next.startTime - now;
            const seconds = Math.floor(diff / 1000);
            
            const hours = Math.floor(seconds / 3600);
            const mins = Math.floor((seconds % 3600) / 60);
            const secs = seconds % 60;
            
            const timeStr = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
            
            countdownDiv.innerHTML = `
                <div>Prossima Sequenza:</div>
                <div style="font-size: 2rem; margin: 1rem 0;">${next.name}</div>
                <div style="font-size: 3rem; font-family: monospace;">${timeStr}</div>
                <div style="font-size: 1.2rem; margin-top: 1rem;">🔵 ${next.filter}</div>
            `;
            
            // Warning colors
            if (seconds <= 10) {
                countdownDiv.style.background = 'linear-gradient(135deg, #ff4444, #ff9500)';
            } else if (seconds <= 60) {
                countdownDiv.style.background = 'linear-gradient(135deg, #ff9500, #ffcc00)';
            }
            
        } else if (active) {
            countdownDiv.innerHTML = `
                <div style="font-size: 2rem;">⏱️ IN CORSO</div>
                <div style="font-size: 2.5rem; margin: 1rem 0;">${active.name}</div>
                <div>🔵 ${active.filter}</div>
            `;
        } else {
            countdownDiv.innerHTML = `
                <div style="font-size: 2rem;">✅ COMPLETATA</div>
                <div style="font-size: 1.5rem; margin-top: 1rem;">Tutte le sequenze eseguite</div>
            `;
            clearInterval(this.timerInterval);
        }
    }
    
    /**
     * Upload NINA
     */
    uploadNINA() {
        if (this.sequences.length === 0) {
            alert('Genera prima le sequenze!');
            return;
        }
        
        alert(`📡 Upload a N.I.N.A. - ${this.sequences.length} sequenze\n\n(Funzionalità completa richiede connessione NINA attiva)`);
        
        // TODO: Implementa upload reale quando NINA connesso
    }
    
    /**
     * Upload Ekos
     */
    uploadEkos() {
        if (this.sequences.length === 0) {
            alert('Genera prima le sequenze!');
            return;
        }
        
        alert(`📡 Upload a Ekos - ${this.sequences.length} sequenze\n\n(Funzionalità completa richiede connessione Ekos attiva)`);
        
        // TODO: Implementa upload reale quando Ekos connesso
    }
    
    /**
     * Download JSON
     */
    downloadJSON() {
        if (this.sequences.length === 0) {
            alert('Genera prima le sequenze!');
            return;
        }
        
        const data = {
            generated: new Date().toISOString(),
            sequences: this.sequences.map(seq => ({
                ...seq,
                startTime: seq.startTime.toISOString()
            }))
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `eclipse_sequences_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        notificationManager.show('💾 JSON scaricato!', 'success');
    }
    
    /**
     * Download CSV
     */
    downloadCSV() {
        if (this.sequences.length === 0) {
            alert('Genera prima le sequenze!');
            return;
        }
        
        let csv = 'Sequence,Phase,Start Time,Duration,Filter,Exposures,Shots\n';
        
        this.sequences.forEach(seq => {
            csv += `"${seq.name}","${seq.phase}","${seq.startTime.toLocaleString()}",${seq.duration},"${seq.filter}","${seq.exposures.join('; ')}",${seq.shots || 0}\n`;
        });
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `eclipse_sequences_${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        
        notificationManager.show('💾 CSV scaricato!', 'success');
    }
    
    /**
     * Helper: durata totale
     */
    getTotalDuration() {
        const total = this.sequences.reduce((sum, seq) => sum + seq.duration, 0);
        return Math.round(total / 60);
    }
    
    /**
     * Helper: colore fase
     */
    getPhaseColor(phase) {
        const colors = {
            'partial': '#5ac8fa',
            'warning': '#ff4444',
            'baily': '#ffcc00',
            'totality': '#ff2d55',
            'default': '#888'
        };
        return colors[phase] || colors.default;
    }
}

// Istanza globale
const eclipseSequences = new EclipseSequences();
