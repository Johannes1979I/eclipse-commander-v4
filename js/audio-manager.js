/**
 * AUDIO MANAGER
 * Gestisce avvisi sonori e sintesi vocale per timeline eclissi
 */

class AudioManager {
    constructor() {
        this.enabled = true;
        this.voiceEnabled = true;
        this.audioContext = null;
        this.lastAlertTime = {};
    }
    
    /**
     * Inizializza Audio Context
     */
    initialize() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            Utils.log('Audio Manager inizializzato');
            
            // Setup auto-resume su prima interazione utente (policy browser)
            this.setupAutoResume();
            
        } catch (error) {
            Utils.log('Audio Context non supportato: ' + error.message, 'warn');
            this.enabled = false;
        }
    }
    
    /**
     * Setup auto-resume AudioContext su prima interazione
     * (richiesto da policy browser Chrome/Safari)
     */
    setupAutoResume() {
        if (!this.audioContext) return;
        
        const resumeAudio = async () => {
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
                Utils.log('✅ Audio Context riattivato', 'success');
            }
            // Rimuovi listener dopo prima attivazione
            document.removeEventListener('click', resumeAudio);
            document.removeEventListener('touchstart', resumeAudio);
            document.removeEventListener('keydown', resumeAudio);
        };
        
        // Aggiungi listener per qualsiasi interazione utente
        document.addEventListener('click', resumeAudio, { once: true });
        document.addEventListener('touchstart', resumeAudio, { once: true });
        document.addEventListener('keydown', resumeAudio, { once: true });
        
        Utils.log('Audio Context in attesa di interazione utente...');
    }
    
    /**
     * Play alert sonoro
     */
    async playAlert(alertType, message) {
        if (!this.enabled) return;
        
        // Evita spam alerts (max 1 dello stesso tipo ogni 2 secondi)
        const now = Date.now();
        if (this.lastAlertTime[alertType] && (now - this.lastAlertTime[alertType] < 2000)) {
            return;
        }
        this.lastAlertTime[alertType] = now;
        
        // Play beep basato su tipo
        await this.playBeep(alertType);
        
        // Sintesi vocale per messaggi importanti
        if (this.voiceEnabled && message) {
            this.speak(message);
        }
        
        // Vibrazione se disponibile
        if (navigator.vibrate && this.shouldVibrate(alertType)) {
            navigator.vibrate(this.getVibrationPattern(alertType));
        }
    }
    
    /**
     * Play beep con frequenza/durata basata su tipo
     */
    async playBeep(alertType) {
        if (!this.audioContext) return;
        
        const config = this.getBeepConfig(alertType);
        
        for (let i = 0; i < config.count; i++) {
            await this.beep(config.frequency, config.duration);
            if (i < config.count - 1) {
                await this.sleep(config.gap);
            }
        }
    }
    
    /**
     * Genera singolo beep
     */
    beep(frequency, duration) {
        return new Promise((resolve) => {
            if (!this.audioContext) {
                resolve();
                return;
            }
            
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.value = frequency;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + duration);
            
            setTimeout(resolve, duration * 1000);
        });
    }
    
    /**
     * Config beep per tipo alert
     */
    getBeepConfig(alertType) {
        const configs = {
            // Timeline alerts
            'countdown_30': { frequency: 800, duration: 0.2, count: 1, gap: 0 },
            'countdown_10': { frequency: 1000, duration: 0.2, count: 2, gap: 0.1 },
            'countdown_5': { frequency: 1200, duration: 0.3, count: 3, gap: 0.1 },
            'sequence_start': { frequency: 1400, duration: 0.4, count: 1, gap: 0 },
            
            // Phase changes
            'phase_change': { frequency: 900, duration: 0.3, count: 2, gap: 0.2 },
            
            // Filter warnings
            'filter_warning': { frequency: 1000, duration: 0.5, count: 2, gap: 0.3 },
            'filter_critical': { frequency: 1500, duration: 0.3, count: 4, gap: 0.2 },
            'filter_remove': { frequency: 1600, duration: 0.4, count: 5, gap: 0.15 },
            
            // Default
            'default': { frequency: 800, duration: 0.2, count: 1, gap: 0 }
        };
        
        return configs[alertType] || configs['default'];
    }
    
    /**
     * Sintesi vocale
     */
    speak(message) {
        if (!this.voiceEnabled || !window.speechSynthesis) return;
        
        // Cancella speech precedenti
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(message);
        utterance.lang = 'it-IT';
        utterance.rate = 1.1;
        utterance.pitch = 1.0;
        utterance.volume = 0.8;
        
        // Cerca voce italiana
        const voices = window.speechSynthesis.getVoices();
        const italianVoice = voices.find(voice => voice.lang.startsWith('it'));
        if (italianVoice) {
            utterance.voice = italianVoice;
        }
        
        window.speechSynthesis.speak(utterance);
    }
    
    /**
     * Verifica se vibrare per questo alert
     */
    shouldVibrate(alertType) {
        const vibrateTypes = [
            'filter_critical',
            'filter_remove',
            'countdown_5',
            'sequence_start'
        ];
        return vibrateTypes.includes(alertType);
    }
    
    /**
     * Pattern vibrazione per tipo
     */
    getVibrationPattern(alertType) {
        const patterns = {
            'filter_critical': [200, 100, 200, 100, 200],
            'filter_remove': [300, 100, 300, 100, 300],
            'countdown_5': [150, 100, 150, 100, 150],
            'sequence_start': [400]
        };
        return patterns[alertType] || [200];
    }
    
    /**
     * Sleep helper
     */
    sleep(seconds) {
        return new Promise(resolve => setTimeout(resolve, seconds * 1000));
    }
    
    /**
     * Abilita/disabilita audio
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        Utils.log(`Audio ${enabled ? 'abilitato' : 'disabilitato'}`);
    }
    
    /**
     * Abilita/disabilita sintesi vocale
     */
    setVoiceEnabled(enabled) {
        this.voiceEnabled = enabled;
        Utils.log(`Sintesi vocale ${enabled ? 'abilitata' : 'disabilitata'}`);
    }
    
    /**
     * Test audio
     */
    async testAudio() {
        Utils.log('Test audio in corso...');
        await this.playAlert('countdown_5', 'Test audio: 5 secondi');
        await this.sleep(1);
        await this.playAlert('filter_warning', 'Test avviso filtro');
    }
}

const audioManager = new AudioManager();
