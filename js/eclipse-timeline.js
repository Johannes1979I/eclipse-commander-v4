/**
 * ECLIPSE TIMELINE DISPLAY
 * Mostra timeline delle fasi eclissi con countdown e avvisi
 */

class EclipseTimeline {
    constructor() {
        this.sequences = [];
        this.currentPhase = null;
        this.nextSequence = null;
        this.timerInterval = null;
        this.audioManager = null;
    }
    
    /**
     * Inizializza timeline con sequenze
     */
    initialize(sequences, audioManager) {
        this.sequences = sequences.sort((a, b) => a.startTime - b.startTime);
        this.audioManager = audioManager;
        
        Utils.log(`Timeline inizializzata con ${sequences.length} sequenze`);
        
        this.render();
        this.startTimer();
    }
    
    /**
     * Render timeline HTML
     */
    render() {
        const container = document.getElementById('eclipseTimeline');
        if (!container) return;
        
        let html = `
            <div class="timeline-header">
                <h3>📅 Timeline Eclissi</h3>
                <div id="currentPhaseDisplay" class="current-phase"></div>
            </div>
            
            <div class="timeline-countdown">
                <div class="countdown-main">
                    <div class="countdown-label">Prossima Sequenza:</div>
                    <div id="nextSequenceName" class="sequence-name">--</div>
                    <div id="countdownTimer" class="countdown-timer">--:--:--</div>
                </div>
                
                <div class="filter-status">
                    <div class="filter-indicator" id="filterIndicator">
                        <span class="filter-icon">🔵</span>
                        <span class="filter-text" id="filterText">Filtro: Non Impostato</span>
                    </div>
                </div>
            </div>
            
            <div class="timeline-list">
        `;
        
        this.sequences.forEach(seq => {
            const phaseClass = this.getPhaseClass(seq.phase);
            const timeStr = seq.startTime.toLocaleTimeString('it-IT');
            const priorityIcon = this.getPriorityIcon(seq.priority);
            
            html += `
                <div class="timeline-item ${phaseClass}" data-sequence-id="${seq.id}">
                    <div class="timeline-time">${timeStr}</div>
                    <div class="timeline-content">
                        <div class="timeline-title">
                            ${priorityIcon} ${seq.name}
                        </div>
                        <div class="timeline-details">
                            <span class="timeline-filter">
                                ${this.getFilterIcon(seq.filter)} ${seq.filterName}
                            </span>
                            ${seq.exposures && seq.exposures.length > 0 ? `
                                <span class="timeline-shots">
                                    📸 ${seq.shots}x${seq.exposures.length} scatti
                                </span>
                            ` : ''}
                            ${seq.duration ? `
                                <span class="timeline-duration">
                                    ⏱️ ${seq.duration}s
                                </span>
                            ` : ''}
                        </div>
                        <div class="timeline-description">${seq.description}</div>
                    </div>
                </div>
            `;
        });
        
        html += `
            </div>
            
            <div class="timeline-controls">
                <button class="btn btn-primary" id="btnStartTimeline">
                    ▶️ Avvia Timeline
                </button>
                <button class="btn btn-secondary" id="btnPauseTimeline" disabled>
                    ⏸️ Pausa
                </button>
                <button class="btn btn-secondary" id="btnResetTimeline">
                    🔄 Reset
                </button>
            </div>
        `;
        
        container.innerHTML = html;
        
        this.setupEventListeners();
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        const btnStart = document.getElementById('btnStartTimeline');
        const btnPause = document.getElementById('btnPauseTimeline');
        const btnReset = document.getElementById('btnResetTimeline');
        
        if (btnStart) {
            btnStart.addEventListener('click', () => this.startTimer());
        }
        
        if (btnPause) {
            btnPause.addEventListener('click', () => this.pauseTimer());
        }
        
        if (btnReset) {
            btnReset.addEventListener('click', () => this.resetTimer());
        }
    }
    
    /**
     * Avvia timer countdown
     */
    startTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
        
        this.timerInterval = setInterval(() => {
            this.updateTimer();
        }, 1000);
        
        this.updateTimer(); // Update immediato
        
        const btnStart = document.getElementById('btnStartTimeline');
        const btnPause = document.getElementById('btnPauseTimeline');
        
        if (btnStart) btnStart.disabled = true;
        if (btnPause) btnPause.disabled = false;
        
        Utils.log('Timeline timer avviato');
    }
    
    /**
     * Pausa timer
     */
    pauseTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        
        const btnStart = document.getElementById('btnStartTimeline');
        const btnPause = document.getElementById('btnPauseTimeline');
        
        if (btnStart) {
            btnStart.disabled = false;
            btnStart.textContent = '▶️ Riprendi';
        }
        if (btnPause) btnPause.disabled = true;
        
        Utils.log('Timeline timer in pausa');
    }
    
    /**
     * Reset timer
     */
    resetTimer() {
        this.pauseTimer();
        this.currentPhase = null;
        this.nextSequence = null;
        
        // Reset visual
        document.querySelectorAll('.timeline-item').forEach(item => {
            item.classList.remove('active', 'completed');
        });
        
        const btnStart = document.getElementById('btnStartTimeline');
        if (btnStart) {
            btnStart.disabled = false;
            btnStart.textContent = '▶️ Avvia Timeline';
        }
        
        Utils.log('Timeline resettata');
    }
    
    /**
     * Update timer ogni secondo
     */
    updateTimer() {
        const now = new Date();
        
        // Trova prossima sequenza
        this.nextSequence = this.sequences.find(seq => seq.startTime > now);
        
        // Trova sequenza attuale
        const activeSeq = this.sequences.find(seq => {
            const seqEnd = new Date(seq.startTime.getTime() + (seq.duration * 1000));
            return now >= seq.startTime && now <= seqEnd;
        });
        
        // Update current phase
        if (activeSeq) {
            this.activateSequence(activeSeq);
        }
        
        // Update countdown
        if (this.nextSequence) {
            this.updateCountdown(this.nextSequence, now);
        } else {
            // Tutte le sequenze completate
            this.showCompletedMessage();
        }
        
        // Update filter indicator
        this.updateFilterIndicator(activeSeq);
        
        // Check avvisi critici
        this.checkCriticalAlerts(now);
    }
    
    /**
     * Attiva sequenza corrente
     */
    activateSequence(seq) {
        if (this.currentPhase !== seq.id) {
            this.currentPhase = seq.id;
            
            // Visual update
            document.querySelectorAll('.timeline-item').forEach(item => {
                item.classList.remove('active');
                if (item.dataset.sequenceId === seq.id) {
                    item.classList.add('active');
                }
            });
            
            // Update display
            const phaseDisplay = document.getElementById('currentPhaseDisplay');
            if (phaseDisplay) {
                phaseDisplay.innerHTML = `
                    <div class="phase-active">
                        <span class="phase-icon">${this.getPriorityIcon(seq.priority)}</span>
                        <span class="phase-name">${seq.name}</span>
                        <span class="phase-status">IN CORSO</span>
                    </div>
                `;
            }
            
            // Avviso sonoro cambio fase
            if (this.audioManager && seq.priority === 'critical') {
                this.audioManager.playAlert('phase_change', seq.name);
            }
            
            // Avviso filtro se necessario
            if (seq.autoRemoveFilter && this.audioManager) {
                this.audioManager.playAlert('filter_remove', seq.alertMessage || 'Rimuovi filtro!');
            }
            
            Utils.log(`Fase attiva: ${seq.name}`);
            
            // Trigger evento custom
            window.dispatchEvent(new CustomEvent('sequence:activated', {
                detail: { sequence: seq }
            }));
        }
    }
    
    /**
     * Update countdown prossima sequenza
     */
    updateCountdown(seq, now) {
        const diff = seq.startTime - now;
        const seconds = Math.floor(diff / 1000);
        
        const hours = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        const countdownEl = document.getElementById('countdownTimer');
        const sequenceNameEl = document.getElementById('nextSequenceName');
        
        if (countdownEl) {
            if (seconds < 0) {
                countdownEl.textContent = 'IN CORSO';
                countdownEl.classList.add('active');
            } else {
                countdownEl.textContent = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
                countdownEl.classList.remove('active');
                
                // Warning visual se mancano meno di 60 secondi
                if (seconds <= 60) {
                    countdownEl.classList.add('warning');
                } else {
                    countdownEl.classList.remove('warning');
                }
                
                // Critical visual se mancano meno di 10 secondi
                if (seconds <= 10) {
                    countdownEl.classList.add('critical');
                } else {
                    countdownEl.classList.remove('critical');
                }
            }
        }
        
        if (sequenceNameEl) {
            sequenceNameEl.textContent = seq.name;
        }
    }
    
    /**
     * Update indicatore filtro
     */
    updateFilterIndicator(activeSeq) {
        const indicator = document.getElementById('filterIndicator');
        const filterText = document.getElementById('filterText');
        
        if (!indicator || !filterText) return;
        
        if (activeSeq) {
            const icon = this.getFilterIcon(activeSeq.filter);
            filterText.innerHTML = `${icon} ${activeSeq.filterName}`;
            
            // Colore indicatore
            indicator.className = 'filter-indicator';
            if (activeSeq.filter === 'none') {
                indicator.classList.add('no-filter');
            } else if (activeSeq.filter.includes('ND')) {
                indicator.classList.add('solar-filter');
            } else {
                indicator.classList.add('special-filter');
            }
            
            // Warning se filtro richiesto
            if (activeSeq.phase === 'filter_warning') {
                indicator.classList.add('filter-warning');
            }
        } else {
            filterText.textContent = 'Filtro: Non impostato';
            indicator.className = 'filter-indicator';
        }
    }
    
    /**
     * Check avvisi critici (30s, 10s, 5s prima)
     */
    checkCriticalAlerts(now) {
        if (!this.nextSequence || !this.audioManager) return;
        
        const diff = Math.floor((this.nextSequence.startTime - now) / 1000);
        
        // Avvisi a 30, 10, 5 secondi
        if (diff === 30 && this.nextSequence.priority === 'critical') {
            this.audioManager.playAlert('countdown_30', `30 secondi a ${this.nextSequence.name}`);
        } else if (diff === 10 && this.nextSequence.priority === 'critical') {
            this.audioManager.playAlert('countdown_10', `10 secondi a ${this.nextSequence.name}`);
        } else if (diff === 5) {
            this.audioManager.playAlert('countdown_5', `5 secondi a ${this.nextSequence.name}`);
        } else if (diff === 0) {
            this.audioManager.playAlert('sequence_start', `INIZIO: ${this.nextSequence.name}`);
        }
        
        // Avviso filtro specifico
        if (this.nextSequence.autoRemoveFilter) {
            if (diff === 30) {
                this.audioManager.playAlert('filter_warning', 'Prepara rimozione filtro tra 30 secondi');
            } else if (diff === 10) {
                this.audioManager.playAlert('filter_critical', 'RIMUOVI FILTRO TRA 10 SECONDI');
            }
        }
    }
    
    /**
     * Mostra messaggio completamento
     */
    showCompletedMessage() {
        const phaseDisplay = document.getElementById('currentPhaseDisplay');
        const countdownEl = document.getElementById('countdownTimer');
        const sequenceNameEl = document.getElementById('nextSequenceName');
        
        if (phaseDisplay) {
            phaseDisplay.innerHTML = `
                <div class="phase-completed">
                    <span class="phase-icon">✅</span>
                    <span class="phase-name">Eclissi Completata</span>
                </div>
            `;
        }
        
        if (countdownEl) {
            countdownEl.textContent = 'COMPLETATA';
            countdownEl.className = 'countdown-timer completed';
        }
        
        if (sequenceNameEl) {
            sequenceNameEl.textContent = 'Tutte le sequenze eseguite';
        }
        
        // Mark tutte come completate
        document.querySelectorAll('.timeline-item').forEach(item => {
            item.classList.remove('active');
            item.classList.add('completed');
        });
        
        this.pauseTimer();
    }
    
    /**
     * Helper: ottieni classe CSS fase
     */
    getPhaseClass(phase) {
        const classMap = {
            'partial': 'phase-partial',
            'totality': 'phase-totality',
            'baily': 'phase-baily',
            'chromosphere': 'phase-chromosphere',
            'filter_warning': 'phase-warning'
        };
        return classMap[phase] || 'phase-default';
    }
    
    /**
     * Helper: ottieni icona priorità
     */
    getPriorityIcon(priority) {
        const iconMap = {
            'critical': '🔴',
            'high': '🟠',
            'medium': '🟡',
            'low': '🟢'
        };
        return iconMap[priority] || '⚪';
    }
    
    /**
     * Helper: ottieni icona filtro
     */
    getFilterIcon(filter) {
        if (!filter || filter === 'none') return '⭕';
        if (filter === 'REQUIRED') return '🔴';
        if (filter.includes('ND')) return '🔵';
        if (filter === 'Ha') return '🔴';
        return '🟢';
    }
    
    /**
     * Destroy timeline
     */
    destroy() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        
        this.sequences = [];
        this.currentPhase = null;
        this.nextSequence = null;
    }
}

const eclipseTimeline = new EclipseTimeline();
