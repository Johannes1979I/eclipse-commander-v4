/**
 * SOLAR MODE - COMPLETE WORKING VERSION
 * Modalità foto solare con calcolo posizione e timing ottimale
 */

class SolarMode {
    constructor() {
        this.active = false;
        this.updateInterval = null;
        this.timelapseInterval = null;
        this.timelapseRunning = false;
    }
    
    activate() {
        this.active = true;
        
        // Auto-calcola posizione se location disponibile
        const location = locationManager.getCurrentLocation();
        if (location) {
            this.calculateSolarPosition();
            
            // Auto-update ogni 10 secondi
            this.updateInterval = setInterval(() => {
                this.calculateSolarPosition();
            }, 10000);
        }
        
        Utils.log('Solar Mode attivato');
    }
    
    deactivate() {
        this.active = false;
        
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        
        this.stopTimelapse();
        
        Utils.log('Solar Mode disattivato');
    }
    
    calculateSolarPosition() {
        const location = locationManager.getCurrentLocation();
        if (!location) {
            notificationManager.show('Imposta prima la località', 'warning');
            return;
        }
        
        const now = new Date();
        
        // Calcola posizione sole usando AstronomyCalculator
        const sunPos = AstronomyCalculator.calculateSunPosition(
            now,
            location.lat,
            location.lon
        );
        
        // Update UI
        this.updateSolarDisplay(sunPos, now);
        this.updateTimingAdvice(sunPos);
        
        return sunPos;
    }
    
    updateSolarDisplay(sunPos, time) {
        const altElement = document.getElementById('solarAltitude');
        const azElement = document.getElementById('solarAzimuth');
        const timeElement = document.getElementById('solarTime');
        
        if (altElement) {
            altElement.textContent = `${sunPos.altitude.toFixed(1)}°`;
        }
        
        if (azElement) {
            azElement.textContent = `${sunPos.azimuth.toFixed(1)}°`;
        }
        
        if (timeElement) {
            timeElement.textContent = Utils.formatTime(time);
        }
    }
    
    updateTimingAdvice(sunPos) {
        const adviceDiv = document.getElementById('solarTimingAdvice');
        if (!adviceDiv) return;
        
        adviceDiv.classList.remove('hidden');
        
        const alt = sunPos.altitude;
        let seeingQuality = '';
        let seeingClass = '';
        let recommendation = '';
        
        if (alt > 50) {
            seeingQuality = '✅ OTTIMO';
            seeingClass = 'alert-success';
            recommendation = 'Questo è il MIGLIOR MOMENTO per scattare! Seeing eccellente, turbolenza minima.';
        } else if (alt > 30) {
            seeingQuality = '⚠️ DISCRETO';
            seeingClass = 'alert-warning';
            recommendation = 'Condizioni accettabili. Puoi scattare, ma qualità non ottimale. Meglio aspettare altitudine >50°.';
        } else if (alt > 0) {
            seeingQuality = '❌ SCARSO';
            seeingClass = 'alert-error';
            recommendation = 'Seeing scarso, troppa turbolenza atmosferica. SCONSIGLIATO scattare ora. Aspetta che sole sia più alto.';
        } else {
            seeingQuality = '🌙 SOLE SOTTO ORIZZONTE';
            seeingClass = 'alert-info';
            recommendation = 'Il sole non è visibile. Torna quando sarà sopra l\'orizzonte.';
        }
        
        const titleEl = document.getElementById('timingTitle');
        const messageEl = document.getElementById('timingMessage');
        const recommendEl = document.getElementById('timingRecommendation');
        
        if (titleEl) titleEl.textContent = `📊 Seeing: ${seeingQuality}`;
        if (messageEl) messageEl.textContent = `Altitudine: ${alt.toFixed(1)}°`;
        if (recommendEl) recommendEl.textContent = recommendation;
        
        const alertDiv = adviceDiv.querySelector('.alert');
        if (alertDiv) {
            alertDiv.className = `alert ${seeingClass}`;
        }
    }
    
    startTimelapse() {
        if (this.timelapseRunning) {
            this.stopTimelapse();
            return;
        }
        
        const intervalSeconds = parseInt(document.getElementById('inputInterval')?.value) || 60;
        const durationMinutes = parseInt(document.getElementById('inputDuration')?.value) || 30;
        
        const totalFrames = Math.floor((durationMinutes * 60) / intervalSeconds);
        
        if (!confirm(`Avvio time-lapse: ${totalFrames} scatti ogni ${intervalSeconds}s per ${durationMinutes} minuti. Confermi?`)) {
            return;
        }
        
        this.timelapseRunning = true;
        let frameCount = 0;
        
        const statusDiv = document.getElementById('timelapseStatus');
        const btnTimelapse = document.getElementById('btnStartTimelapse');
        
        if (btnTimelapse) btnTimelapse.textContent = '⏸️ Ferma Time-lapse';
        
        // Primo frame immediato
        this.captureFrame(frameCount + 1, totalFrames, statusDiv);
        frameCount++;
        
        // Frames successivi
        this.timelapseInterval = setInterval(() => {
            if (frameCount >= totalFrames) {
                this.stopTimelapse();
                notificationManager.show(`Time-lapse completato! ${totalFrames} frames catturati.`, 'success');
                return;
            }
            
            this.captureFrame(frameCount + 1, totalFrames, statusDiv);
            frameCount++;
            
        }, intervalSeconds * 1000);
        
        notificationManager.show(`Time-lapse avviato: ${totalFrames} frames`, 'success');
        Utils.log(`Time-lapse avviato: ${intervalSeconds}s × ${durationMinutes}min = ${totalFrames} frames`);
    }
    
    stopTimelapse() {
        if (this.timelapseInterval) {
            clearInterval(this.timelapseInterval);
            this.timelapseInterval = null;
        }
        
        this.timelapseRunning = false;
        
        const btnTimelapse = document.getElementById('btnStartTimelapse');
        if (btnTimelapse) btnTimelapse.textContent = '▶️ Avvia Time-lapse';
        
        const statusDiv = document.getElementById('timelapseStatus');
        if (statusDiv) statusDiv.classList.add('hidden');
        
        Utils.log('Time-lapse fermato');
    }
    
    captureFrame(current, total, statusDiv) {
        // Beep per notificare frame
        if (countdownDisplay && countdownDisplay.playBeep) {
            countdownDisplay.playBeep(1);
        }
        
        // Update status
        if (statusDiv) {
            const percent = (current / total) * 100;
            const eta = Math.floor(((total - current) * parseInt(document.getElementById('inputInterval')?.value || 60)) / 60);
            
            statusDiv.innerHTML = `
                <div class="alert alert-info">
                    <strong>🎬 Time-lapse in corso...</strong><br>
                    Frame: ${current} / ${total} (${percent.toFixed(0)}%)<br>
                    ETA: ${eta} minuti
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${percent}%; background: #3b82f6;"></div>
                    </div>
                </div>
            `;
            statusDiv.classList.remove('hidden');
        }
        
        Utils.log(`Time-lapse frame ${current}/${total} catturato`);
    }
}

const solarMode = new SolarMode();
