/**
 * SEQUENCE UPLOADER
 * Carica sequenze generate verso NINA o Ekos
 */

class SequenceUploader {
    constructor() {
        this.ninaConnector = null;
        this.ekosConnector = null;
    }
    
    /**
     * Imposta connettori
     */
    setConnectors(nina, ekos) {
        this.ninaConnector = nina;
        this.ekosConnector = ekos;
    }
    
    /**
     * Verifica se è possibile uploadare
     */
    canUpload() {
        return {
            nina: this.ninaConnector && this.ninaConnector.connected,
            ekos: this.ekosConnector && this.ekosConnector.connected
        };
    }
    
    /**
     * Upload a NINA (VERO!)
     */
    async uploadToNINA(sequences) {
        if (!this.ninaConnector || !this.ninaConnector.connected) {
            throw new Error('N.I.N.A. non connessa');
        }
        
        try {
            Utils.log(`📤 Invio ${sequences.length} sequenze a N.I.N.A.`, 'info');
            
            // USA IL NUOVO METODO REALE! 🚀
            const result = await this.ninaConnector.uploadSequences(sequences);
            
            if (!result.success) {
                throw new Error(result.error || 'Upload fallito');
            }
            
            Utils.log('✅ Sequenze inviate a N.I.N.A. con successo!', 'success');
            
            return {
                success: true,
                platform: 'NINA',
                sequencesUploaded: result.uploaded || sequences.length,
                message: result.message,
                response: result.apiResponse
            };
            
        } catch (error) {
            Utils.log(`❌ Errore upload N.I.N.A.: ${error.message}`, 'error');
            throw error;
        }
    }
    
    /**
     * Upload a Ekos
     */
    async uploadToEkos(sequences) {
        if (!this.ekosConnector || !this.ekosConnector.connected) {
            throw new Error('Ekos non connesso');
        }
        
        try {
            Utils.log(`Invio ${sequences.length} sequenze a Ekos`);
            
            const ekosFormat = eclipseSequenceGenerator.exportForEkos(sequences, equipmentPanel.getCurrentEquipment());
            
            // Ekos API: /api/capture/sequence/add
            const response = await fetch(`${this.ekosConnector.baseUrl}/api/capture/sequence/add`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(ekosFormat)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            Utils.log('Sequenze inviate a Ekos con successo');
            
            return {
                success: true,
                platform: 'Ekos',
                sequencesUploaded: sequences.length,
                response: result
            };
            
        } catch (error) {
            Utils.log(`Errore upload Ekos: ${error.message}`, 'error');
            throw error;
        }
    }
    
    /**
     * Upload automatico alla piattaforma connessa
     */
    async uploadToConnected(sequences) {
        const canUpload = this.canUpload();
        
        if (canUpload.nina) {
            return await this.uploadToNINA(sequences);
        } else if (canUpload.ekos) {
            return await this.uploadToEkos(sequences);
        } else {
            throw new Error('Nessuna piattaforma connessa. Connetti prima NINA o Ekos.');
        }
    }
    
    /**
     * Scarica sequenze come file JSON
     */
    downloadSequencesJSON(sequences, equipment) {
        const data = {
            title: 'Eclipse Commander Sequences',
            generated: new Date().toISOString(),
            generator: 'Eclipse Commander v4.0',
            equipment: {
                camera: equipment.camera?.name || 'Unknown',
                telescope: equipment.telescope ? 
                    `${equipment.telescope.diameter}mm f/${equipment.telescope.focalRatio}` : 
                    'Unknown'
            },
            sequences: sequences.map(seq => ({
                id: seq.id,
                name: seq.name,
                phase: seq.phase,
                startTime: seq.startTime.toISOString(),
                duration: seq.duration,
                filter: seq.filter,
                filterName: seq.filterName,
                exposures: seq.exposures,
                iso: seq.iso,
                shots: seq.shots,
                priority: seq.priority,
                description: seq.description
            }))
        };
        
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `eclipse_sequences_${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        Utils.log('Sequenze scaricate come JSON (formato Eclipse Commander)');
    }
    
    /**
     * Scarica sequenze in formato N.I.N.A. Advanced Sequencer
     */
    downloadSequencesNINA(sequences) {
        try {
            Utils.log('🚀 Export sequenze in formato N.I.N.A...', 'info');
            
            // USA LA CONVERSIONE NINA!
            if (!this.ninaConnector) {
                throw new Error('Nina connector non disponibile. Inizializza prima ninaConnector.');
            }
            
            const ninaJSON = this.ninaConnector.convertToNINAFormat(sequences);
            
            const json = JSON.stringify(ninaJSON, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `nina_eclipse_sequence_${Date.now()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            Utils.log('✅ Sequenze esportate in formato N.I.N.A.!', 'success');
            
            return {
                success: true,
                filename: a.download,
                size: json.length
            };
            
        } catch (error) {
            Utils.log('❌ Errore export N.I.N.A.: ' + error.message, 'error');
            
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Scarica sequenze come CSV
     */
    downloadSequencesCSV(sequences) {
        let csv = 'Sequence,Phase,Start Time,Duration (s),Filter,Exposures,ISO,Shots,Priority,Description\n';
        
        sequences.forEach(seq => {
            const exposuresStr = seq.exposures ? seq.exposures.map(e => {
                return e > 1 ? `${e}s` : `1/${Math.abs(1/e)}s`;
            }).join('; ') : '';
            
            csv += `"${seq.name}","${seq.phase}","${seq.startTime.toLocaleString('it-IT')}",${seq.duration},"${seq.filterName}","${exposuresStr}",${seq.iso},${seq.shots},"${seq.priority}","${seq.description}"\n`;
        });
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `eclipse_sequences_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        Utils.log('Sequenze scaricate come CSV');
    }
}

const sequenceUploader = new SequenceUploader();
