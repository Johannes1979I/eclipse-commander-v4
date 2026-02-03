/**
 * NOTIFICATION MANAGER MODULE
 * Gestisce notifiche, allarmi e messaggi toast
 */

class NotificationManager {
    constructor() {
        this.initialized = false;
        this.container = null;
        this.activeNotifications = [];
        this.alarmHistory = [];
    }
    
    /**
     * Inizializza notification manager
     */
    initialize() {
        if (this.initialized) return;
        
        // Crea container per toast notifications
        this.createContainer();
        
        // Richiedi permesso notifiche
        this.requestPermission();
        
        this.initialized = true;
        
        Utils.log('Notification manager inizializzato');
    }
    
    /**
     * Crea container toast
     */
    createContainer() {
        // Verifica se esiste già
        this.container = document.getElementById('toastContainer');
        
        if (!this.container) {
            // Crea container
            this.container = document.createElement('div');
            this.container.id = 'toastContainer';
            this.container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 9999;
                display: flex;
                flex-direction: column;
                gap: 10px;
                max-width: 400px;
            `;
            
            document.body.appendChild(this.container);
        }
    }
    
    /**
     * Richiedi permesso notifiche browser
     */
    async requestPermission() {
        if (!Utils.supports.notifications()) return;
        
        if (Notification.permission === 'default') {
            await Notification.requestPermission();
        }
    }
    
    /**
     * Mostra toast notification
     */
    show(message, type = 'info', duration = 5000) {
        if (!this.container) return;
        
        // Crea toast element
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.style.cssText = `
            padding: 16px;
            background: var(--bg-secondary);
            border-left: 4px solid;
            border-radius: 8px;
            box-shadow: var(--shadow-lg);
            animation: slideIn 0.3s ease;
            display: flex;
            align-items: center;
            gap: 12px;
        `;
        
        // Colore bordo in base a tipo
        const colors = {
            success: '#10b981',
            error: '#ef4444',
            warning: '#f59e0b',
            info: '#3b82f6'
        };
        
        toast.style.borderLeftColor = colors[type] || colors.info;
        
        // Icona
        const icons = {
            success: '✓',
            error: '✗',
            warning: '⚠',
            info: 'ℹ'
        };
        
        const icon = document.createElement('span');
        icon.textContent = icons[type] || icons.info;
        icon.style.cssText = `
            font-size: 20px;
            color: ${colors[type] || colors.info};
        `;
        
        // Messaggio
        const text = document.createElement('span');
        text.textContent = message;
        text.style.flex = '1';
        
        // Button chiudi
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '×';
        closeBtn.style.cssText = `
            background: none;
            border: none;
            color: var(--text-muted);
            font-size: 24px;
            cursor: pointer;
            padding: 0;
            width: 24px;
            height: 24px;
        `;
        
        closeBtn.addEventListener('click', () => {
            this.removeToast(toast);
        });
        
        // Componi toast
        toast.appendChild(icon);
        toast.appendChild(text);
        toast.appendChild(closeBtn);
        
        // Aggiungi al container
        this.container.appendChild(toast);
        this.activeNotifications.push(toast);
        
        // Auto-rimuovi dopo duration
        if (duration > 0) {
            setTimeout(() => {
                this.removeToast(toast);
            }, duration);
        }
        
        return toast;
    }
    
    /**
     * Rimuovi toast
     */
    removeToast(toast) {
        if (!toast || !this.container) return;
        
        // Animazione fade out
        toast.style.animation = 'slideOut 0.3s ease';
        
        setTimeout(() => {
            if (toast.parentNode) {
                this.container.removeChild(toast);
            }
            
            // Rimuovi da array
            const index = this.activeNotifications.indexOf(toast);
            if (index > -1) {
                this.activeNotifications.splice(index, 1);
            }
        }, 300);
    }
    
    /**
     * Mostra allarme critico
     */
    showAlarm(alarm) {
        Utils.log(`🚨 ALLARME: ${alarm.message}`, 'warn');
        
        // Verifica se già mostrato
        const alarmKey = `${alarm.event}-${alarm.seconds}`;
        if (this.alarmHistory.includes(alarmKey)) {
            return;
        }
        
        this.alarmHistory.push(alarmKey);
        
        // Toast persistente per allarmi critici
        const duration = alarm.urgent ? 0 : 10000;
        
        const toast = this.show(
            alarm.message,
            alarm.urgent ? 'error' : 'warning',
            duration
        );
        
        // Stile speciale per allarmi
        if (toast) {
            toast.style.fontSize = '18px';
            toast.style.fontWeight = 'bold';
            
            if (alarm.urgent) {
                toast.style.animation = 'pulse 1s infinite';
            }
        }
        
        // Notifica browser
        if (Utils.supports.notifications() && Notification.permission === 'granted') {
            new Notification('Eclipse Commander', {
                body: alarm.message,
                icon: '/icon.png',
                vibrate: alarm.urgent ? [200, 100, 200] : [200],
                requireInteraction: alarm.urgent,
                tag: alarmKey
            });
        }
        
        // Vibrazione
        if (alarm.urgent) {
            Utils.vibrate([200, 100, 200, 100, 200]);
        } else {
            Utils.vibrate([200]);
        }
        
        // Audio
        this.playAlarmSound(alarm.type);
        
        // Update countdown display
        if (alarm.urgent) {
            countdownDisplay.showCriticalWarning(alarm.message);
            
            // Reset dopo 5s
            setTimeout(() => {
                countdownDisplay.clearCriticalWarning();
            }, 5000);
        }
    }
    
    /**
     * Play allarme sonoro
     */
    playAlarmSound(type = 'warning') {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            if (type === 'critical') {
                // Beep urgente
                osc.frequency.value = 880; // A5
                gain.gain.value = 0.3;
                
                osc.start();
                osc.stop(ctx.currentTime + 0.2);
                
                // Ripeti 3 volte
                setTimeout(() => this.playAlarmSound('critical'), 300);
            } else {
                // Beep normale
                osc.frequency.value = 440; // A4
                gain.gain.value = 0.2;
                
                osc.start();
                osc.stop(ctx.currentTime + 0.15);
            }
            
        } catch (error) {
            Utils.log('Audio non disponibile', 'warn');
        }
    }
    
    /**
     * Pulisci tutte le notifiche
     */
    clearAll() {
        while (this.activeNotifications.length > 0) {
            const toast = this.activeNotifications[0];
            this.removeToast(toast);
        }
    }
    
    /**
     * Reset cronologia allarmi
     */
    resetAlarmHistory() {
        this.alarmHistory = [];
    }
}

// Export singleton
const notificationManager = new NotificationManager();

// Aggiungi animazioni CSS se non esistono
if (!document.getElementById('notificationStyles')) {
    const style = document.createElement('style');
    style.id = 'notificationStyles';
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(400px);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @keyframes slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(400px);
                opacity: 0;
            }
        }
        
        @keyframes pulse {
            0%, 100% {
                opacity: 1;
            }
            50% {
                opacity: 0.7;
            }
        }
    `;
    
    document.head.appendChild(style);
}
