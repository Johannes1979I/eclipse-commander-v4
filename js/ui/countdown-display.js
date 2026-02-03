/**
 * COUNTDOWN DISPLAY MODULE - COMPLETE WITH ALARMS
 * Countdown eclissi con allarmi audio, vibrazione, notifiche browser
 */

class CountdownDisplay {
    constructor() {
        this.initialized = false;
        this.countdownElement = null;
        this.labelElement = null;
        this.progressElement = null;
        this.filterElement = null;
        this.phaseElement = null;
        this.active = false;
        this.intervalId = null;
        this.eclipseData = null;
        this.contactTimes = null;
        this.alarmsTriggered = new Set();
        this.audioContext = null;
    }
    
    initialize() {
        if (this.initialized) return;
        
        this.countdownElement = document.getElementById('countdownTime');
        this.labelElement = document.getElementById('countdownLabel');
        this.progressElement = document.getElementById('progressFill');
        this.filterElement = document.getElementById('filterIndicator');
        this.phaseElement = document.getElementById('phaseText');
        
        // Richiedi permesso notifiche
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
        
        this.initialized = true;
        Utils.log('Countdown display inizializzato con allarmi');
    }
    
    start(eclipseData, contactTimes) {
        if (!this.initialized) this.initialize();
        
        this.eclipseData = eclipseData;
        this.contactTimes = contactTimes;
        this.active = true;
        this.alarmsTriggered.clear();
        
        const card = document.getElementById('countdownCard');
        if (card) card.classList.remove('hidden');
        
        const timesCard = document.getElementById('contactTimesCard');
        if (timesCard) timesCard.classList.remove('hidden');
        
        const standaloneCard = document.getElementById('standaloneCard');
        if (standaloneCard) standaloneCard.classList.remove('hidden');
        
        this.update();
        this.intervalId = setInterval(() => this.update(), 1000);
        
        Utils.log('Countdown avviato con allarmi attivi');
    }
    
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.active = false;
    }
    
    update() {
        if (!this.active || !this.contactTimes) return;
        
        const now = new Date();
        const times = this.contactTimes;
        
        let currentPhase = null;
        let timeToNext = null;
        let nextEvent = null;
        let progress = 0;
        let filterOn = true;
        
        if (now < times.C1) {
            currentPhase = 'pre';
            nextEvent = 'C1 - Primo Contatto';
            timeToNext = times.C1 - now;
            progress = 0;
            filterOn = true;
        } else if (now < times.C2) {
            currentPhase = 'partial1';
            nextEvent = 'C2 - Inizio Totalità';
            timeToNext = times.C2 - now;
            const duration = times.C2 - times.C1;
            const elapsed = now - times.C1;
            progress = (elapsed / duration) * 0.25;
            filterOn = true;
            
            // ALLARMI C2
            this.checkAlarm('C2', timeToNext, 'PREPARATI A RIMUOVERE FILTRO', '🚨 TOGLI FILTRO ORA!');
            
        } else if (times.C3 && now < times.C3) {
            currentPhase = 'totality';
            nextEvent = 'C3 - Fine Totalità';
            timeToNext = times.C3 - now;
            const duration = times.C3 - times.C2;
            const elapsed = now - times.C2;
            progress = 0.25 + (elapsed / duration) * 0.5;
            filterOn = false; // FILTRO OFF!
            
            // ALLARMI C3
            this.checkAlarm('C3', timeToNext, 'PREPARATI AD APPLICARE FILTRO', '🚨 METTI FILTRO ORA!');
            
        } else if (now < times.C4) {
            currentPhase = 'partial2';
            nextEvent = 'C4 - Quarto Contatto';
            timeToNext = times.C4 - now;
            const duration = times.C4 - (times.C3 || times.C2);
            const elapsed = now - (times.C3 || times.C2);
            progress = 0.75 + (elapsed / duration) * 0.25;
            filterOn = true;
        } else {
            currentPhase = 'post';
            nextEvent = 'Eclissi Completata';
            timeToNext = 0;
            progress = 1;
            filterOn = true;
            this.showComplete();
            this.stop();
        }
        
        this.updateCountdown(timeToNext);
        this.updateLabel(nextEvent, currentPhase);
        this.updateProgress(progress);
        this.updateFilter(filterOn, currentPhase);
        this.updatePhase(currentPhase);
    }
    
    updateCountdown(milliseconds) {
        if (!this.countdownElement) return;
        
        if (milliseconds <= 0) {
            this.countdownElement.textContent = '00:00:00:00';
            return;
        }
        
        const days = Math.floor(milliseconds / (1000 * 60 * 60 * 24));
        const hours = Math.floor((milliseconds % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000);
        
        this.countdownElement.textContent = 
            `${String(days).padStart(3, '0')}:${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    
    updateLabel(eventName, phase) {
        if (!this.labelElement) return;
        
        const labels = {
            'pre': `⏳ Prossimo: ${eventName}`,
            'partial1': `🌗 Parziale Crescente | Prossimo: ${eventName}`,
            'totality': `🌑 TOTALITÀ | Prossimo: ${eventName}`,
            'partial2': `🌗 Parziale Decrescente | Prossimo: ${eventName}`,
            'post': `✅ ${eventName}`
        };
        
        this.labelElement.textContent = labels[phase] || eventName;
    }
    
    updateProgress(percent) {
        if (!this.progressElement) return;
        
        const percentage = Math.min(100, Math.max(0, percent * 100));
        this.progressElement.style.width = `${percentage}%`;
        
        if (percent < 0.25) {
            this.progressElement.style.backgroundColor = '#3b82f6';
        } else if (percent < 0.75) {
            this.progressElement.style.backgroundColor = '#10b981';
        } else {
            this.progressElement.style.backgroundColor = '#f59e0b';
        }
    }
    
    updateFilter(filterOn, phase) {
        if (!this.filterElement) return;
        
        this.filterElement.classList.remove('hidden');
        
        if (filterOn) {
            this.filterElement.textContent = '🔴 FILTRO SOLARE ON';
            this.filterElement.className = 'filter-indicator filter-on';
            this.filterElement.style.backgroundColor = '#dc2626';
            this.filterElement.style.color = '#ffffff';
            this.filterElement.style.animation = 'none';
        } else {
            this.filterElement.textContent = '⚠️ FILTRO OFF - TOTALITÀ';
            this.filterElement.className = 'filter-indicator filter-off';
            this.filterElement.style.backgroundColor = '#f59e0b';
            this.filterElement.style.color = '#000000';
            this.filterElement.style.animation = 'pulse 1s infinite';
        }
    }
    
    updatePhase(phase) {
        if (!this.phaseElement) return;
        
        const phaseNames = {
            'pre': 'Pre-Eclissi',
            'partial1': 'Parziale Crescente',
            'totality': '🌑 TOTALITÀ',
            'partial2': 'Parziale Decrescente',
            'post': 'Post-Eclissi'
        };
        
        this.phaseElement.textContent = phaseNames[phase] || 'In corso...';
        
        const phaseCard = document.getElementById('currentPhase');
        if (phaseCard) phaseCard.classList.remove('hidden');
    }
    
    checkAlarm(event, timeToNext, warningMsg, criticalMsg) {
        const secondsRemaining = Math.floor(timeToNext / 1000);
        
        if (secondsRemaining === 30) {
            const id = `${event}-30s`;
            if (!this.alarmsTriggered.has(id)) {
                this.triggerAlarm(`⚠️ ${warningMsg} tra 30 secondi!`, false, 1);
                this.alarmsTriggered.add(id);
            }
        } else if (secondsRemaining === 10) {
            const id = `${event}-10s`;
            if (!this.alarmsTriggered.has(id)) {
                this.triggerAlarm(`⚠️ ${warningMsg} tra 10 secondi!`, false, 2);
                this.alarmsTriggered.add(id);
            }
        } else if (secondsRemaining === 0) {
            const id = `${event}-0s`;
            if (!this.alarmsTriggered.has(id)) {
                this.triggerAlarm(criticalMsg, true, 3);
                this.alarmsTriggered.add(id);
            }
        }
    }
    
    triggerAlarm(message, critical = false, beepCount = 1) {
        const type = critical ? 'error' : 'warning';
        const duration = critical ? 0 : 8000;
        notificationManager.show(message, type, duration);
        
        this.playBeep(beepCount);
        
        if (critical) {
            this.vibrate([200, 100, 200, 100, 200]);
        } else {
            this.vibrate([200]);
        }
        
        this.showBrowserNotification(message);
        
        Utils.log(`🔔 ALLARME: ${message}`);
    }
    
    playBeep(count = 1) {
        try {
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
            
            const ctx = this.audioContext;
            const freq = 880;
            const duration = 0.2;
            const gap = 0.3;
            
            for (let i = 0; i < count; i++) {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                
                osc.connect(gain);
                gain.connect(ctx.destination);
                
                osc.frequency.value = freq;
                gain.gain.value = 0.3;
                
                const startTime = ctx.currentTime + (i * gap);
                osc.start(startTime);
                osc.stop(startTime + duration);
            }
        } catch (error) {
            console.warn('Audio beep fallito:', error);
        }
    }
    
    vibrate(pattern) {
        if ('vibrate' in navigator) {
            navigator.vibrate(pattern);
        }
    }
    
    showBrowserNotification(message) {
        if (!('Notification' in window)) return;
        
        if (Notification.permission === 'granted') {
            new Notification('🌑 Eclipse Commander', {
                body: message,
                icon: 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 512 512\'%3E%3Ccircle cx=\'256\' cy=\'256\' r=\'200\' fill=\'%230a0e1a\'/%3E%3Ccircle cx=\'320\' cy=\'256\' r=\'180\' fill=\'%233b82f6\'/%3E%3C/svg%3E',
                vibrate: [200, 100, 200],
                requireInteraction: true,
                tag: 'eclipse-alarm'
            });
        }
    }
    
    showComplete() {
        if (this.countdownElement) {
            this.countdownElement.textContent = '00:00:00:00';
        }
        if (this.labelElement) {
            this.labelElement.textContent = '✅ Eclissi completata! 🎉';
        }
        if (this.progressElement) {
            this.progressElement.style.width = '100%';
            this.progressElement.style.backgroundColor = '#10b981';
        }
        if (this.filterElement) {
            this.filterElement.textContent = '✅ Eclissi Terminata';
            this.filterElement.style.backgroundColor = '#10b981';
            this.filterElement.style.animation = 'none';
        }
        
        this.playBeep(2);
        notificationManager.show('🎉 Eclissi completata! Ottimo lavoro!', 'success');
    }
    
    reset() {
        this.stop();
        
        if (this.countdownElement) this.countdownElement.textContent = '000:00:00:00';
        if (this.labelElement) this.labelElement.textContent = 'In attesa...';
        if (this.progressElement) this.progressElement.style.width = '0%';
        if (this.filterElement) this.filterElement.classList.add('hidden');
        
        const card = document.getElementById('countdownCard');
        if (card) card.classList.add('hidden');
        
        const timesCard = document.getElementById('contactTimesCard');
        if (timesCard) timesCard.classList.add('hidden');
        
        const standaloneCard = document.getElementById('standaloneCard');
        if (standaloneCard) standaloneCard.classList.add('hidden');
        
        this.alarmsTriggered.clear();
    }
}

const countdownDisplay = new CountdownDisplay();
