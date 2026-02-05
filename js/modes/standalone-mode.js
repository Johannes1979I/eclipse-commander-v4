/**
 * STANDALONE MODE MODULE - COMPLETE GUIDE
 * Modalità standalone con guida completa scatti manuali
 */

class StandaloneMode {
    constructor() {
        this.active = false;
        this.eclipseData = null;
        this.contactTimes = null;
        this.equipment = null;
    }
    
    activate(eclipseData, contactTimes, equipment) {
        this.active = true;
        this.eclipseData = eclipseData;
        this.contactTimes = contactTimes;
        this.equipment = equipment;
        
        this.showGuide();
        
        Utils.log('Modalità Standalone attivata - Guida scatti manuale');
    }
    
    deactivate() {
        this.active = false;
        
        const card = document.getElementById('standaloneCard');
        if (card) card.classList.add('hidden');
        
        Utils.log('Modalità Standalone disattivata');
    }
    
    showGuide() {
        const guideElement = document.getElementById('standaloneGuide');
        if (!guideElement) return;
        
        const html = `
            <h4>🎯 Checklist Pre-Eclissi:</h4>
            <ul>
                <li>✅ Filtro solare montato e verificato</li>
                <li>✅ Fotocamera collegata e testata</li>
                <li>✅ Batterie cariche (+ almeno 1 spare)</li>
                <li>✅ Memoria SD formattata (almeno 32GB)</li>
                <li>✅ Fuoco pre-impostato su infinito</li>
                <li>✅ Esposizione testata (1/1000s filtro ON)</li>
                <li>✅ Treppiede stabile e bloccato</li>
                <li>✅ Telecomando o intervalometro</li>
            </ul>
            
            <h4>⚠️ Allarmi Automatici:</h4>
            <ul>
                <li><strong>🔔 C2 -30s:</strong> PREPARATI A RIMUOVERE FILTRO</li>
                <li><strong>🔔 C2 -10s:</strong> MANO SUL FILTRO, PRONTI</li>
                <li><strong>🚨 C2 0s:</strong> TOGLI FILTRO ORA! (beep 3x)</li>
                <li><em>Indicatore diventa: ⚠️ FILTRO OFF (giallo)</em></li>
                <li><strong>🔔 C3 -10s:</strong> PREPARATI AD APPLICARE FILTRO</li>
                <li><strong>🚨 C3 0s:</strong> METTI FILTRO ORA! (beep 3x)</li>
                <li><em>Indicatore diventa: 🔴 FILTRO ON (rosso)</em></li>
            </ul>
            
            <h4>📸 Parametri Consigliati per Fase:</h4>
            
            <div class="shooting-guide">
                <div class="phase-guide">
                    <h5>🌗 C1 → C2 (Parziale Crescente)</h5>
                    <ul>
                        <li><strong>Filtro:</strong> 🔴 ON (sempre!)</li>
                        <li><strong>ISO:</strong> 100-200</li>
                        <li><strong>Shutter:</strong> 1/1000 - 1/2000s</li>
                        <li><strong>Apertura:</strong> f/8 - f/11</li>
                        <li><strong>Frequenza:</strong> Ogni 5-10 minuti</li>
                        <li><strong>Note:</strong> Controlla framing periodicamente</li>
                    </ul>
                </div>
                
                <div class="phase-guide highlight">
                    <h5>🌑 C2 → C3 (TOTALITÀ)</h5>
                    <ul>
                        <li><strong>Filtro:</strong> ⚠️ OFF (OBBLIGATORIO!)</li>
                        <li><strong>ISO:</strong> 400-800 (CMOS) / 800-1600 (DSLR)</li>
                        <li><strong>Bracketing Corona:</strong>
                            <ul>
                                <li>1/4000s (corona interna)</li>
                                <li>1/1000s (corona media)</li>
                                <li>1/250s (corona esterna)</li>
                                <li>1/60s (corona estesa)</li>
                                <li>1/15s (corona lontana)</li>
                                <li>1/4s (dettagli deboli)</li>
                                <li>1s (massima estensione)</li>
                            </ul>
                        </li>
                        <li><strong>Prominenze:</strong>
                            <ul>
                                <li>1/2000s (luminose)</li>
                                <li>1/500s (medie)</li>
                            </ul>
                        </li>
                        <li><strong>Diamante + Perle Baily:</strong>
                            <ul>
                                <li>Subito dopo C2: 1/4000 - 1/8000s</li>
                                <li>Subito prima C3: 1/4000 - 1/8000s</li>
                            </ul>
                        </li>
                        <li><strong>Strategia:</strong> Ripeti bracketing ogni 20-30s</li>
                        <li><strong>⚠️ IMPORTANTE:</strong> Rimetti filtro SUBITO a C3!</li>
                    </ul>
                </div>
                
                <div class="phase-guide">
                    <h5>🌗 C3 → C4 (Parziale Decrescente)</h5>
                    <ul>
                        <li><strong>Filtro:</strong> 🔴 ON (sempre!)</li>
                        <li><strong>ISO:</strong> 100-200</li>
                        <li><strong>Shutter:</strong> 1/1000 - 1/2000s</li>
                        <li><strong>Apertura:</strong> f/8 - f/11</li>
                        <li><strong>Frequenza:</strong> Ogni 10-15 minuti</li>
                        <li><strong>Note:</strong> Puoi rilassarti, parte critica finita!</li>
                    </ul>
                </div>
            </div>
            
            <h4>🎯 Consigli Equipment-Specific:</h4>
            ${this.getEquipmentAdvice()}
            
            <h4>⏱️ Timing Totalità:</h4>
            ${this.getTotalityDuration()}
            
            <h4>💡 Tips Professionali:</h4>
            <ul>
                <li>🔋 <strong>Batterie:</strong> Al freddo durano meno, tienile al caldo</li>
                <li>🎯 <strong>Focus:</strong> Fai focus su stella luminosa prima dell'eclissi</li>
                <li>📏 <strong>Framing:</strong> Lascia spazio per corona (3-4x diametro sole)</li>
                <li>⚡ <strong>Raffica:</strong> NO durante totalità, perdi tempo prezioso</li>
                <li>👁️ <strong>Osserva:</strong> Dedica almeno 30s a GUARDARE l'eclissi!</li>
                <li>🧘 <strong>Calma:</strong> Respira, hai praticato, andrà bene!</li>
            </ul>
        `;
        
        guideElement.innerHTML = html;
        
        const card = document.getElementById('standaloneCard');
        if (card) card.classList.remove('hidden');
    }
    
    getEquipmentAdvice() {
        if (!this.equipment) {
            return `<p>Configura equipment per consigli personalizzati.</p>`;
        }
        
        const focal = this.equipment.focalLength || 200;
        const diameter = this.equipment.diameter || 55;
        const pixelSize = this.equipment.pixelSize || 4.0;
        
        // Calcola dimensione sole
        const sunSize = (focal / 109) * 0.5; // diametro sole mm
        const pixelsOnSun = sunSize / (pixelSize / 1000);
        
        let advice = `<ul>`;
        advice += `<li><strong>Setup:</strong> ${diameter}mm f/${(focal/diameter).toFixed(1)} (${focal}mm)</li>`;
        advice += `<li><strong>Dimensione sole:</strong> ${sunSize.toFixed(2)}mm sul sensore</li>`;
        advice += `<li><strong>Risoluzione:</strong> ${Math.round(pixelsOnSun)} pixel sul disco solare</li>`;
        
        if (pixelsOnSun < 500) {
            advice += `<li>⚠️ <strong>Focale bassa:</strong> Ottimo per corona estesa, meno dettagli</li>`;
        } else if (pixelsOnSun > 2000) {
            advice += `<li>✅ <strong>Focale alta:</strong> Ottimi dettagli, corona più limitata</li>`;
        } else {
            advice += `<li>✅ <strong>Focale media:</strong> Bilanciamento ottimale dettagli/corona</li>`;
        }
        
        // Suggerimenti ISO specifici
        if (this.equipment.type === 'cmos' && this.equipment.cooled) {
            advice += `<li>📷 <strong>CMOS Raffreddata:</strong> Usa ISO 400-800, noise minimo</li>`;
        } else if (this.equipment.type === 'dslr') {
            advice += `<li>📷 <strong>DSLR:</strong> Usa ISO 800-1600, attento al noise</li>`;
        }
        
        advice += `</ul>`;
        
        return advice;
    }
    
    getTotalityDuration() {
        if (!this.contactTimes || !this.contactTimes.C2 || !this.contactTimes.C3) {
            return `<p>Dati totalità non disponibili.</p>`;
        }
        
        const duration = (this.contactTimes.C3 - this.contactTimes.C2) / 1000;
        const minutes = Math.floor(duration / 60);
        const seconds = Math.floor(duration % 60);
        
        let html = `<p><strong>Durata totalità:</strong> ${minutes}m ${seconds}s</p>`;
        
        if (duration < 60) {
            html += `<p>⚠️ <strong>Totalità brevissima!</strong> Priorità: corona + perle Baily</p>`;
            html += `<ul>`;
            html += `<li>Bracketing veloce: 5 esposizioni (1/4000, 1/1000, 1/250, 1/60, 1/15)</li>`;
            html += `<li>Ripeti 2-3 volte durante totalità</li>`;
            html += `<li>Non perdere tempo a controllare foto!</li>`;
            html += `</ul>`;
        } else if (duration < 120) {
            html += `<p>⏱️ <strong>Totalità breve.</strong> Strategia normale funziona.</p>`;
            html += `<ul>`;
            html += `<li>Bracketing completo: 7 esposizioni</li>`;
            html += `<li>Ripeti ogni 30s</li>`;
            html += `<li>Tempo per osservare: 20-30s</li>`;
            html += `</ul>`;
        } else {
            html += `<p>✅ <strong>Totalità lunga!</strong> Hai tempo per tutto.</p>`;
            html += `<ul>`;
            html += `<li>Bracketing esteso: 9-11 esposizioni</li>`;
            html += `<li>Ripeti ogni 40-60s</li>`;
            html += `<li>Tempo abbondante per osservare e goderti!</li>`;
            html += `</ul>`;
        }
        
        return html;
    }
}

const standaloneMode = new StandaloneMode();
