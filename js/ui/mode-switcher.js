/**
 * MODE SWITCHER MODULE
 * Gestisce switch tra modalità ECLISSI e SOLARE
 */

class ModeSwitcher {
    constructor() {
        this.initialized = false;
        this.currentMode = null;
        this.btnEclipse = null;
        this.btnSolar = null;
    }
    
    /**
     * Inizializza mode switcher
     */
    initialize() {
        if (this.initialized) return;
        
        // Ottieni riferimenti button
        this.btnEclipse = document.getElementById('btnEclipseMode');
        this.btnSolar = document.getElementById('btnSolarMode');
        
        if (!this.btnEclipse || !this.btnSolar) {
            Utils.log('Mode switcher buttons non trovati', 'warn');
            return;
        }
        
        // Setup event listeners
        this.btnEclipse.addEventListener('click', () => {
            this.selectMode('eclipse');
        });
        
        this.btnSolar.addEventListener('click', () => {
            this.selectMode('solar');
        });
        
        // Carica modalità salvata
        const settings = Storage.loadSettings();
        this.selectMode(settings.mode || 'eclipse', false);
        
        this.initialized = true;
        
        Utils.log('Mode switcher inizializzato');
    }
    
    /**
     * Seleziona modalità
     */
    selectMode(mode, dispatchEvent = true) {
        if (this.currentMode === mode) return;
        
        Utils.log(`Selezione modalità: ${mode}`);
        
        // Update button states
        if (mode === 'eclipse') {
            this.btnEclipse.classList.add('active');
            this.btnSolar.classList.remove('active');
        } else {
            this.btnSolar.classList.add('active');
            this.btnEclipse.classList.remove('active');
        }
        
        this.currentMode = mode;
        
        // Dispatch evento se richiesto
        if (dispatchEvent) {
            window.dispatchEvent(new CustomEvent('mode:changed', {
                detail: { mode: mode }
            }));
        }
    }
    
    /**
     * Ottieni modalità corrente
     */
    getCurrentMode() {
        return this.currentMode;
    }
}

// Export singleton
const modeSwitcher = new ModeSwitcher();
