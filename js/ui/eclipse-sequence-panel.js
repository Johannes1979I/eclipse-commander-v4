/**
 * ECLIPSE SEQUENCE PANEL
 * UI per generare, modificare e caricare sequenze
 */

class EclipseSequencePanel {
    constructor() {
        this.initialized = false;
        this.sequences = [];
        this.selectedEclipse = null;
        
        // Inizializza automaticamente quando DOM è pronto
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initialize());
        } else {
            // DOM già pronto
            this.initialize();
        }
    }
    
    /**
     * Inizializza panel
     */
    initialize() {
        if (this.initialized) return;
        
        this.setupEventListeners();
        this.initialized = true;
        
        Utils.log('Eclipse Sequence Panel inizializzato');
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Genera sequenze
        const btnGenerate = document.getElementById('btnGenerateSequences');
        if (btnGenerate) {
            btnGenerate.addEventListener('click', () => this.generateSequences());
        }
        
        // Upload a NINA
        const btnUploadNINA = document.getElementById('btnUploadNINA');
        if (btnUploadNINA) {
            btnUploadNINA.addEventListener('click', () => this.uploadToNINA());
        }
        
        // Upload a Ekos
        const btnUploadEkos = document.getElementById('btnUploadEkos');
        if (btnUploadEkos) {
            btnUploadEkos.addEventListener('click', () => this.uploadToEkos());
        }
        
        // Download JSON (backup interno)
        const btnDownloadJSON = document.getElementById('btnDownloadJSON');
        if (btnDownloadJSON) {
            btnDownloadJSON.addEventListener('click', () => this.downloadJSON());
        }
        
        // Export NINA format
        const btnDownloadNINA = document.getElementById('btnDownloadNINA');
        if (btnDownloadNINA) {
            btnDownloadNINA.addEventListener('click', () => this.downloadNINA());
        }
        
        // Export EKOS format
        const btnDownloadEKOS = document.getElementById('btnDownloadEKOS');
        if (btnDownloadEKOS) {
            btnDownloadEKOS.addEventListener('click', () => this.downloadEKOS());
        }
        
        // Download CSV
        const btnDownloadCSV = document.getElementById('btnDownloadCSV');
        if (btnDownloadCSV) {
            btnDownloadCSV.addEventListener('click', () => this.downloadCSV());
        }
        
        // Configurazione filtri
        const btnConfigFilters = document.getElementById('btnConfigFilters');
        if (btnConfigFilters) {
            btnConfigFilters.addEventListener('click', () => this.showFilterConfig());
        }
        
        // Personalizza sequenze
        const btnCustomize = document.getElementById('btnCustomizeSequences');
        if (btnCustomize) {
            btnCustomize.addEventListener('click', () => this.showSequenceEditor());
        }
    }
    
    /**
     * Genera sequenze automaticamente
     */
    async generateSequences() {
        try {
            // Verifica eclipse selezionata
            const eclipse = eclipseSelector.getSelectedEclipse();
            if (!eclipse) {
                notificationManager.show('Seleziona prima un\'eclissi', 'error');
                return;
            }
            
            // Verifica equipment
            const equipment = equipmentPanel.getCurrentEquipment();
            if (!equipment || !equipment.camera) {
                notificationManager.show('Configura prima l\'equipment (camera + telescopio)', 'error');
                return;
            }
            
            // Ottieni preferenze utente
            const preferences = this.getSequencePreferences();
            
            Utils.log('Generazione sequenze in corso...');
            notificationManager.show('Generazione sequenze...', 'info');
            
            // Genera sequenze
            const sequences = eclipseSequenceGenerator.generateSequences(
                eclipse.contacts,
                equipment,
                preferences
            );
            
            this.sequences = sequences;
            this.selectedEclipse = eclipse;
            
            // Mostra sequenze
            this.displaySequences(sequences);
            
            // Inizializza timeline
            eclipseTimeline.initialize(sequences, audioManager);
            
            // Mostra sezione upload ✅
            const uploadSection = document.getElementById('sequenceUploadSection');
            if (uploadSection) {
                uploadSection.style.display = 'block';
            }
            
            notificationManager.show(
                `${sequences.length} sequenze generate con successo!`,
                'success'
            );
            
            Utils.log(`Sequenze generate: ${sequences.length}`);
            
            // Abilita pulsanti
            this.enableUploadButtons();
            
        } catch (error) {
            Utils.log('Errore generazione sequenze: ' + error.message, 'error');
            notificationManager.show('Errore generazione sequenze: ' + error.message, 'error');
        }
    }
    
    /**
     * Ottieni preferenze sequenze da UI
     */
    getSequencePreferences() {
        const preferences = {};
        
        // ISO
        const isoInput = document.getElementById('sequenceISO');
        if (isoInput && isoInput.value) {
            preferences.iso = parseInt(isoInput.value);
        }
        
        // Shots per exposure
        const shotsInput = document.getElementById('sequenceShots');
        if (shotsInput && shotsInput.value) {
            preferences.shotsPerExposure = parseInt(shotsInput.value);
        }
        
        // Bracketing
        const bracketingCheck = document.getElementById('sequenceBracketing');
        if (bracketingCheck) {
            preferences.enableBracketing = bracketingCheck.checked;
        }
        
        return preferences;
    }
    
    /**
     * Mostra sequenze generate
     */
    displaySequences(sequences) {
        const container = document.getElementById('sequencesDisplay');
        if (!container) return;
        
        let html = `
            <div class="sequences-header">
                <h3>📋 Sequenze Generate (${sequences.length})</h3>
                <div class="sequences-stats">
                    <span>📸 Totale scatti: ${this.calculateTotalShots(sequences)}</span>
                    <span>⏱️ Durata totale: ${this.calculateTotalDuration(sequences)}s</span>
                </div>
            </div>
            
            <div class="sequences-list">
        `;
        
        sequences.forEach((seq, index) => {
            const priorityClass = `priority-${seq.priority}`;
            const exposuresText = seq.exposures ? seq.exposures.map(e => {
                return e >= 1 ? `${e}s` : `1/${Math.abs(1/e)}s`;
            }).join(', ') : 'N/A';
            
            html += `
                <div class="sequence-card ${priorityClass}" data-seq-id="${seq.id}">
                    <div class="sequence-header">
                        <span class="sequence-number">#${index + 1}</span>
                        <span class="sequence-priority">${this.getPriorityBadge(seq.priority)}</span>
                        <h4 class="sequence-name">${seq.name}</h4>
                        <button class="btn-icon" onclick="eclipseSequencePanel.editSequence('${seq.id}')">
                            ✏️
                        </button>
                        <button class="btn-icon" onclick="eclipseSequencePanel.deleteSequence('${seq.id}')">
                            🗑️
                        </button>
                    </div>
                    
                    <div class="sequence-body">
                        <div class="sequence-info">
                            <span><strong>Ora Inizio:</strong> ${seq.startTime.toLocaleTimeString('it-IT')}</span>
                            <span><strong>Durata:</strong> ${seq.duration}s</span>
                            <span><strong>Filtro:</strong> ${seq.filterName}</span>
                        </div>
                        
                        <div class="sequence-exposures">
                            <strong>Esposizioni:</strong> ${exposuresText}
                        </div>
                        
                        <div class="sequence-params">
                            <span><strong>ISO:</strong> ${seq.iso}</span>
                            <span><strong>Scatti/esposizione:</strong> ${seq.shots}</span>
                            <span><strong>Totale scatti:</strong> ${(seq.exposures?.length || 0) * seq.shots}</span>
                        </div>
                        
                        <div class="sequence-description">
                            ${seq.description}
                        </div>
                        
                        ${seq.autoRemoveFilter ? `
                            <div class="sequence-alert">
                                ⚠️ ${seq.alertMessage || 'Azione richiesta'}
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        
        container.innerHTML = html;
    }
    
    /**
     * Calcola totale scatti
     */
    calculateTotalShots(sequences) {
        return sequences.reduce((total, seq) => {
            return total + ((seq.exposures?.length || 0) * seq.shots);
        }, 0);
    }
    
    /**
     * Calcola durata totale
     */
    calculateTotalDuration(sequences) {
        return sequences.reduce((total, seq) => total + (seq.duration || 0), 0);
    }
    
    /**
     * Get priority badge
     */
    getPriorityBadge(priority) {
        const badges = {
            'critical': '<span class="badge badge-critical">CRITICO</span>',
            'high': '<span class="badge badge-high">ALTO</span>',
            'medium': '<span class="badge badge-medium">MEDIO</span>',
            'low': '<span class="badge badge-low">BASSO</span>'
        };
        return badges[priority] || '';
    }
    
    /**
     * Upload sequenze a NINA
     */
    async uploadToNINA() {
        if (this.sequences.length === 0) {
            notificationManager.show('Genera prima le sequenze', 'error');
            return;
        }
        
        try {
            notificationManager.show('Invio sequenze a N.I.N.A...', 'info');
            
            const result = await sequenceUploader.uploadToNINA(this.sequences);
            
            notificationManager.show(
                `${result.sequencesUploaded} sequenze inviate a N.I.N.A. con successo!`,
                'success'
            );
            
            Utils.log('Upload N.I.N.A. completato');
            
        } catch (error) {
            Utils.log('Errore upload N.I.N.A.: ' + error.message, 'error');
            notificationManager.show('Errore upload N.I.N.A.: ' + error.message, 'error');
        }
    }
    
    /**
     * Upload sequenze a Ekos
     */
    async uploadToEkos() {
        if (this.sequences.length === 0) {
            notificationManager.show('Genera prima le sequenze', 'error');
            return;
        }
        
        try {
            notificationManager.show('Invio sequenze a Ekos...', 'info');
            
            const result = await sequenceUploader.uploadToEkos(this.sequences);
            
            notificationManager.show(
                `${result.sequencesUploaded} sequenze inviate a Ekos con successo!`,
                'success'
            );
            
            Utils.log('Upload Ekos completato');
            
        } catch (error) {
            Utils.log('Errore upload Ekos: ' + error.message, 'error');
            notificationManager.show('Errore upload Ekos: ' + error.message, 'error');
        }
    }
    
    /**
     * Download JSON
     */
    downloadJSON() {
        if (this.sequences.length === 0) {
            notificationManager.show('Genera prima le sequenze', 'error');
            return;
        }
        
        const equipment = equipmentPanel.getCurrentEquipment();
        sequenceUploader.downloadSequencesJSON(this.sequences, equipment);
        notificationManager.show('Sequenze scaricate in formato JSON', 'success');
    }
    
    /**
     * Download CSV
     */
    downloadCSV() {
        if (this.sequences.length === 0) {
            notificationManager.show('Genera prima le sequenze', 'error');
            return;
        }
        
        sequenceUploader.downloadSequencesCSV(this.sequences);
        notificationManager.show('Sequenze scaricate in formato CSV', 'success');
    }
    
    /**
     * Download NINA format
     */
    downloadNINA() {
        if (this.sequences.length === 0) {
            notificationManager.show('Genera prima le sequenze', 'error');
            return;
        }
        
        const result = sequenceUploader.downloadSequencesNINA(this.sequences);
        
        if (result.success) {
            notificationManager.show(
                `✅ Sequenze esportate in formato N.I.N.A.!\n` +
                `File: ${result.filename}\n` +
                `Dimensione: ${(result.size / 1024).toFixed(1)} KB\n\n` +
                `Importa in N.I.N.A.: Sequencer → Load → Seleziona file`,
                'success'
            );
        } else {
            notificationManager.show('Errore export N.I.N.A.: ' + result.error, 'error');
        }
    }
    
    /**
     * Download sequenze formato EKOS/KStars (.esq)
     */
    downloadEKOS() {
        console.log('=== DEBUG downloadEKOS ===');
        console.log('this:', this);
        console.log('this.sequences:', this.sequences);
        console.log('window.eclipseSequencePanel.sequences:', window.eclipseSequencePanel ? window.eclipseSequencePanel.sequences : 'undefined');
        
        // Usa window.eclipseSequencePanel.sequences per sicurezza
        const sequences = window.eclipseSequencePanel ? window.eclipseSequencePanel.sequences : this.sequences;
        
        console.log('sequences da usare:', sequences);
        console.log('sequences.length:', sequences ? sequences.length : 0);
        
        if (!sequences || sequences.length === 0) {
            console.log('❌ Sequenze vuote!');
            notificationManager.show('Genera prima le sequenze', 'error');
            return;
        }
        
        try {
            // Verifica che ekosConnector sia disponibile
            if (!window.ekosConnector) {
                throw new Error('EKOS Connector non disponibile');
            }
            
            console.log('✅ Chiamo ekosConnector.exportToFile con', sequences.length, 'sequenze');
            const result = window.ekosConnector.exportToFile(sequences);
            
            if (result.success) {
                notificationManager.show(
                    `✅ Sequenze esportate in formato EKOS/KStars!\n` +
                    `File: ${result.filename}\n` +
                    `Dimensione: ${(result.size / 1024).toFixed(1)} KB\n\n` +
                    `Importa in EKOS/KStars: Capture Module → Load Sequence Queue → Seleziona file .esq`,
                    'success'
                );
            } else {
                notificationManager.show('Errore export EKOS: ' + (result.error || 'Unknown'), 'error');
            }
        } catch (error) {
            notificationManager.show('Errore export EKOS: ' + error.message, 'error');
        }
    }
    
    /**
     * Abilita pulsanti upload
     */
    enableUploadButtons() {
        const canUpload = sequenceUploader.canUpload();
        
        const btnNINA = document.getElementById('btnUploadNINA');
        const btnEkos = document.getElementById('btnUploadEkos');
        
        if (btnNINA) {
            btnNINA.disabled = !canUpload.nina;
        }
        
        if (btnEkos) {
            btnEkos.disabled = !canUpload.ekos;
        }
    }
    
    /**
     * Mostra config filtri (placeholder)
     */
    showFilterConfig() {
        notificationManager.show('Configurazione filtri in sviluppo', 'info');
        // TODO: Implementare modal config filtri
    }
    
    /**
     * Mostra editor sequenze (placeholder)
     */
    showSequenceEditor() {
        notificationManager.show('Editor sequenze in sviluppo', 'info');
        // TODO: Implementare editor completo
    }
    
    /**
     * Edit sequenza
     */
    editSequence(id) {
        const seq = this.sequences.find(s => s.id === id);
        if (seq) {
            notificationManager.show(`Modifica ${seq.name} - In sviluppo`, 'info');
            // TODO: Aprire modal di modifica
        }
    }
    
    /**
     * Delete sequenza
     */
    deleteSequence(id) {
        if (confirm('Sei sicuro di voler eliminare questa sequenza?')) {
            const index = this.sequences.findIndex(s => s.id === id);
            if (index !== -1) {
                this.sequences.splice(index, 1);
                this.displaySequences(this.sequences);
                notificationManager.show('Sequenza eliminata', 'success');
            }
        }
    }
}

const eclipseSequencePanel = new EclipseSequencePanel();

// Rendi disponibile globalmente
if (typeof window !== 'undefined') {
    window.eclipseSequencePanel = eclipseSequencePanel;
}
