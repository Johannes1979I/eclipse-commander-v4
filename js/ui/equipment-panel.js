/**
 * EQUIPMENT PANEL - FIXED VERSION
 * Gestisce selezione camera, custom fields, save equipment
 */

class EquipmentPanel {
    constructor() {
        this.initialized = false;
        this.cameraSelect = null;
        this.diameterInput = null;
        this.focalInput = null;
        this.filterSelect = null;  // ✅ Filtro solare
        this.customCameraDiv = null;
        this.btnSave = null;
        this.selectedCamera = null;
        this.currentEquipment = null;
        
        // Modal custom camera ✅
        this.modalCustomCamera = null;
        this.customCameraData = null;
        
        // Inizializza automaticamente quando DOM è pronto
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initialize());
        } else {
            // DOM già pronto
            this.initialize();
        }
    }
    
    initialize() {
        if (this.initialized) return;
        
        try {
            this.cameraSelect = document.getElementById('cameraSelect');
            this.diameterInput = document.getElementById('inputDiameter');
            this.focalInput = document.getElementById('inputFocal');
            this.filterSelect = document.getElementById('filterSelect');  // ✅ Filtro
            this.customCameraDiv = document.getElementById('customCameraDiv');
            this.btnSave = document.getElementById('btnSaveEquipment');
            
            // Modal custom camera ✅
            this.modalCustomCamera = document.getElementById('modalCustomCamera');
            
            // Popola select con TUTTE le camere dal database ✅
            this.populateCameraSelect();
            
            this.setupEventListeners();
            this.setupCustomCameraModal();
            
            // Try to load saved equipment with error handling ✅
            try {
                this.loadSavedEquipment();
            } catch (error) {
                Utils.log('Errore caricamento equipment salvato: ' + error.message, 'error');
                // Pulisci storage corrotto
                Storage.save(CONFIG.STORAGE.EQUIPMENT, null);
            }
            
            this.initialized = true;
            Utils.log('Equipment panel inizializzato');
            
        } catch (error) {
            Utils.log('ERRORE CRITICO inizializzazione equipment panel: ' + error.message, 'error');
            console.error(error);
        }
    }
    
    /**
     * Popola select camere con tutte quelle del database
     */
    populateCameraSelect() {
        if (!this.cameraSelect) return;
        
        // Pulisci select (mantieni solo prima option)
        this.cameraSelect.innerHTML = '<option value="">Seleziona camera...</option>';
        
        // Raggruppa camere per manufacturer
        const grouped = {};
        
        Object.keys(EquipmentDatabase.cameras).forEach(id => {
            const camera = EquipmentDatabase.cameras[id];
            const manufacturer = camera.manufacturer;
            
            if (!grouped[manufacturer]) {
                grouped[manufacturer] = [];
            }
            
            grouped[manufacturer].push({
                id: id,
                name: camera.name,
                pixelSize: camera.pixelSize,
                sensorType: camera.sensorWidth >= 30 ? 'FF' : 
                           camera.sensorWidth >= 20 ? 'APS-C' : 
                           camera.sensorWidth >= 13 ? '4/3"' : '1"'
            });
        });
        
        // Ordine manufacturers
        const manufacturerOrder = ['ZWO', 'QHY', 'Canon', 'Nikon', 'Sony', 'ToupTek', 'Omegon'];
        
        manufacturerOrder.forEach(manufacturer => {
            if (grouped[manufacturer]) {
                const optgroup = document.createElement('optgroup');
                optgroup.label = `📷 ${manufacturer}`;
                
                grouped[manufacturer].forEach(cam => {
                    const option = document.createElement('option');
                    option.value = cam.id;
                    option.textContent = `${cam.name} (${cam.sensorType}, ${cam.pixelSize}µm)`;
                    optgroup.appendChild(option);
                });
                
                this.cameraSelect.appendChild(optgroup);
            }
        });
        
        // Aggiungi opzione Custom
        const customGroup = document.createElement('optgroup');
        customGroup.label = '⚙️ Configurazione Manuale';
        const customOption = document.createElement('option');
        customOption.value = 'custom';
        customOption.textContent = '🔧 Configura Camera Manualmente...';
        customGroup.appendChild(customOption);
        this.cameraSelect.appendChild(customGroup);
        
        Utils.log(`Camera select popolato con ${Object.keys(EquipmentDatabase.cameras).length} camere`);
    }
    
    setupEventListeners() {
        // Camera select handler
        if (this.cameraSelect) {
            this.cameraSelect.addEventListener('change', (e) => {
                this.handleCameraSelection(e.target.value);
            });
        }
        
        // Save button
        if (this.btnSave) {
            this.btnSave.addEventListener('click', () => {
                this.saveEquipment();
            });
        }
    }
    
    handleCameraSelection(cameraId) {
        if (!cameraId) {
            this.selectedCamera = null;
            if (this.customCameraDiv) this.customCameraDiv.classList.add('hidden');
            return;
        }
        
        if (cameraId === 'custom') {
            // Apri modal configurazione custom ✅
            this.showCustomCameraModal();
            this.selectedCamera = null;
            return;
        }
        
        // CARICA CAMERA DA DATABASE ✅
        if (this.customCameraDiv) {
            this.customCameraDiv.classList.add('hidden');
        }
        
        const camera = EquipmentDatabase.cameras[cameraId];
        if (camera) {
            this.selectedCamera = camera;
            Utils.log(`Camera selezionata: ${camera.name}`);
            notificationManager.show(`Camera: ${camera.name}`, 'success');
            
            // Mostra info camera
            this.displayCameraInfo(camera);
        } else {
            Utils.log(`Camera ${cameraId} non trovata in database`, 'warn');
        }
    }
    
    displayCameraInfo(camera) {
        const infoDiv = document.getElementById('equipmentInfo');
        if (!infoDiv) return;
        
        const html = `
            <div class="alert alert-info">
                <strong>📷 ${camera.name}</strong><br>
                <small>
                    Sensore: ${camera.sensorWidth}×${camera.sensorHeight}mm<br>
                    Risoluzione: ${camera.width}×${camera.height}px<br>
                    Pixel: ${camera.pixelSize}µm<br>
                    ${camera.cooling ? '❄️ Raffreddata' : '🌡️ Non raffreddata'}
                </small>
            </div>
        `;
        
        infoDiv.innerHTML = html;
        infoDiv.classList.remove('hidden');
    }
    
    saveEquipment() {
        const diameter = parseFloat(this.diameterInput?.value);
        const focal = parseFloat(this.focalInput?.value);
        
        if (!diameter || !focal) {
            notificationManager.show('Inserisci diametro e focale', 'error');
            return;
        }
        
        let cameraData = null;
        
        // Determina camera
        if (this.selectedCamera) {
            // Camera da database o custom configurata ✅
            cameraData = {
                id: this.selectedCamera.id || this.cameraSelect.value,
                name: this.selectedCamera.name,
                manufacturer: this.selectedCamera.manufacturer || 'Unknown',
                width: this.selectedCamera.width,
                height: this.selectedCamera.height,
                pixelSize: this.selectedCamera.pixelSize,
                sensorWidth: this.selectedCamera.sensorWidth,
                sensorHeight: this.selectedCamera.sensorHeight,
                type: this.selectedCamera.type,
                cooling: this.selectedCamera.cooling || false,
                unityGain: this.selectedCamera.unityGain || 100
            };
        } else if (this.customCameraData) {
            // Usa camera custom se configurata ✅
            cameraData = this.customCameraData;
        } else {
            notificationManager.show('Seleziona o configura una camera', 'error');
            return;
        }
        
        // Crea equipment object
        const equipment = {
            telescope: {
                diameter: diameter,
                focalLength: focal,
                fRatio: (focal / diameter).toFixed(2)
            },
            camera: cameraData,
            filter: this.filterSelect?.value || 'none'  // ✅ Filtro solare
        };
        
        // Calcola FOV
        const fovWidth = (cameraData.sensorWidth / focal) * 206265 / 3600; // gradi
        const fovHeight = (cameraData.sensorHeight / focal) * 206265 / 3600; // gradi
        
        equipment.fov = {
            width: fovWidth,
            height: fovHeight,
            diagonal: Math.sqrt(fovWidth**2 + fovHeight**2)
        };
        
        // Calcola image scale
        equipment.imageScale = (cameraData.pixelSize / focal) * 206.265; // arcsec/pixel
        
        // Salva in storage
        Storage.saveEquipment(equipment);
        this.currentEquipment = equipment;
        
        // Mostra risultati
        this.displayEquipmentResults(equipment);
        
        // Dispatch evento
        window.dispatchEvent(new CustomEvent('equipment:saved', {
            detail: equipment
        }));
        
        notificationManager.show('✅ Equipment salvato!', 'success');
        
        Utils.log('Equipment salvato:', equipment);
    }
    
    displayEquipmentResults(equipment) {
        const infoDiv = document.getElementById('equipmentInfo');
        if (!infoDiv) return;
        
        // Validazione dati ✅
        if (!equipment || !equipment.telescope || !equipment.camera || !equipment.fov) {
            Utils.log('Equipment incompleto, non posso visualizzare', 'error');
            infoDiv.innerHTML = `
                <div class="alert alert-error">
                    <strong>⚠️ Dati Equipment Incompleti</strong><br>
                    <small>Riconfigura telescope e camera</small>
                </div>
            `;
            infoDiv.classList.remove('hidden');
            return;
        }
        
        // Nomi filtri leggibili ✅
        const filterNames = {
            'none': 'Nessuno (solo Totalità)',
            'white-light': 'Luce Bianca (ND5)',
            'h-alpha': 'H-Alpha',
            'calcium-k': 'Calcium-K'
        };
        const filterName = filterNames[equipment.filter] || equipment.filter || 'Non specificato';
        
        const html = `
            <div class="alert alert-success">
                <h4>📊 Configurazione Salvata</h4>
                <p><strong>Telescopio:</strong> ${equipment.telescope.diameter}mm f/${equipment.telescope.fRatio} (${equipment.telescope.focalLength}mm)</p>
                <p><strong>Camera:</strong> ${equipment.camera.name}</p>
                <p><strong>Filtro:</strong> ${filterName}</p>
                <p><strong>FOV:</strong> ${equipment.fov.width.toFixed(2)}° × ${equipment.fov.height.toFixed(2)}° (${equipment.fov.diagonal.toFixed(2)}° diag)</p>
                <p><strong>Image Scale:</strong> ${equipment.imageScale.toFixed(2)}" /pixel</p>
                <hr>
                <p><small><strong>Sensore:</strong> ${equipment.camera.sensorWidth}×${equipment.camera.sensorHeight}mm (${equipment.camera.width}×${equipment.camera.height}px, ${equipment.camera.pixelSize}µm)</small></p>
            </div>
        `;
        
        infoDiv.innerHTML = html;
        infoDiv.classList.remove('hidden');
    }
    
    loadSavedEquipment() {
        const saved = Storage.loadEquipment();
        if (saved) {
            // Verifica integrità dati ✅
            if (!saved.telescope || !saved.camera) {
                Utils.log('Equipment salvato incompleto, lo ignoro', 'warn');
                // Pulisci storage corrotto
                Storage.save(CONFIG.STORAGE.EQUIPMENT, null);
                return;
            }
            
            this.currentEquipment = saved;
            
            // Ripristina valori con controlli null safety ✅
            if (saved.telescope && saved.telescope.diameter && this.diameterInput) {
                this.diameterInput.value = saved.telescope.diameter;
            }
            if (saved.telescope && saved.telescope.focalLength && this.focalInput) {
                this.focalInput.value = saved.telescope.focalLength;
            }
            
            // Ripristina filtro ✅
            if (saved.filter && this.filterSelect) {
                this.filterSelect.value = saved.filter;
            }
            
            if (saved.camera && this.cameraSelect) {
                this.cameraSelect.value = saved.camera.id || '';
                if (saved.camera.id) {
                    this.handleCameraSelection(saved.camera.id);
                }
            }
            
            this.displayEquipmentResults(saved);
            
            Utils.log('Equipment caricato da storage');
        }
    }
    
    /**
     * Setup modal custom camera
     */
    setupCustomCameraModal() {
        // Close button
        const btnClose = document.getElementById('closeCustomCamera');
        if (btnClose) {
            btnClose.addEventListener('click', () => {
                this.hideCustomCameraModal();
            });
        }
        
        // Save button
        const btnSave = document.getElementById('btnSaveCustomCamera');
        if (btnSave) {
            btnSave.addEventListener('click', () => {
                this.handleSaveCustomCamera();
            });
        }
        
        // Close on outside click
        if (this.modalCustomCamera) {
            this.modalCustomCamera.addEventListener('click', (e) => {
                if (e.target === this.modalCustomCamera) {
                    this.hideCustomCameraModal();
                }
            });
        }
    }
    
    /**
     * Mostra modal custom camera
     */
    showCustomCameraModal() {
        if (!this.modalCustomCamera) return;
        
        // Reset form
        document.getElementById('customManufacturer').value = '';
        document.getElementById('customModel').value = '';
        document.getElementById('customPixelSize').value = '';
        document.getElementById('customSensorWidth').value = '';
        document.getElementById('customSensorHeight').value = '';
        document.getElementById('customWidth').value = '';
        document.getElementById('customHeight').value = '';
        
        // Show modal
        this.modalCustomCamera.style.display = 'block';
    }
    
    /**
     * Nascondi modal custom camera
     */
    hideCustomCameraModal() {
        if (!this.modalCustomCamera) return;
        
        this.modalCustomCamera.style.display = 'none';
        
        // Reset camera select to empty
        if (this.cameraSelect) {
            this.cameraSelect.value = '';
        }
    }
    
    /**
     * Salva configurazione custom camera
     */
    handleSaveCustomCamera() {
        // Leggi valori
        const manufacturer = document.getElementById('customManufacturer').value.trim();
        const model = document.getElementById('customModel').value.trim();
        const pixelSize = parseFloat(document.getElementById('customPixelSize').value);
        const sensorWidth = parseFloat(document.getElementById('customSensorWidth').value);
        const sensorHeight = parseFloat(document.getElementById('customSensorHeight').value);
        const width = parseInt(document.getElementById('customWidth').value);
        const height = parseInt(document.getElementById('customHeight').value);
        
        // Valida input
        if (!manufacturer || !model) {
            notificationManager.show('Inserisci marchio e modello camera', 'error');
            return;
        }
        
        if (isNaN(pixelSize) || pixelSize <= 0 || pixelSize > 20) {
            notificationManager.show('Dimensione pixel non valida (0.1-20 µm)', 'error');
            return;
        }
        
        if (isNaN(sensorWidth) || sensorWidth <= 0 || sensorWidth > 50) {
            notificationManager.show('Larghezza sensore non valida (1-50 mm)', 'error');
            return;
        }
        
        if (isNaN(sensorHeight) || sensorHeight <= 0 || sensorHeight > 50) {
            notificationManager.show('Altezza sensore non valida (1-50 mm)', 'error');
            return;
        }
        
        if (isNaN(width) || width < 100 || width > 20000) {
            notificationManager.show('Risoluzione larghezza non valida (100-20000 px)', 'error');
            return;
        }
        
        if (isNaN(height) || height < 100 || height > 20000) {
            notificationManager.show('Risoluzione altezza non valida (100-20000 px)', 'error');
            return;
        }
        
        // Crea oggetto camera custom
        this.customCameraData = {
            id: 'custom',
            name: `${manufacturer} ${model}`,
            manufacturer: manufacturer,
            type: 'custom',
            width: width,
            height: height,
            pixelSize: pixelSize,
            sensorWidth: sensorWidth,
            sensorHeight: sensorHeight,
            bitDepth: 14,
            cooling: false,
            unityGain: 100
        };
        
        this.selectedCamera = this.customCameraData;
        
        // Chiudi modal
        this.hideCustomCameraModal();
        
        // Mostra conferma
        notificationManager.show(`Camera custom salvata: ${this.customCameraData.name}`, 'success');
        
        Utils.log('Camera custom configurata:', this.customCameraData);
    }
    
    getCurrentEquipment() {
        return this.currentEquipment;
    }
}

const equipmentPanel = new EquipmentPanel();

// Rendi disponibile globalmente
if (typeof window !== 'undefined') {
    window.equipmentPanel = equipmentPanel;
}
