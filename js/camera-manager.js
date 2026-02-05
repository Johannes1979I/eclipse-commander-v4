/**
 * CAMERA MANAGER - Gestione equipment e ottimizzazione
 */
class CameraManager {
    constructor() {
        this.telescope = null;
        this.camera = null;
    }
    
    setTelescope(diameter, focalLength) {
        this.telescope = {
            diameter: parseFloat(diameter),
            focalLength: parseFloat(focalLength),
            fRatio: parseFloat(focalLength) / parseFloat(diameter)
        };
        this.calculate();
    }
    
    setCamera(params) {
        this.camera = {
            name: params.name,
            pixelSize: parseFloat(params.pixelSize) || 4.63,
            width: parseInt(params.width) || 4144,
            height: parseInt(params.height) || 2822,
            type: this.detectType(params.name),
            gainUnity: parseInt(params.gainUnity) || 120
        };
        this.calculate();
    }
    
    detectType(name) {
        if (!name) return 'generic';
        const n = name.toLowerCase();
        if (n.includes('asi') || n.includes('qhy')) return 'cmos';
        if (n.includes('canon') || n.includes('nikon')) return 'dslr';
        return 'generic';
    }
    
    calculate() {
        if (!this.telescope || !this.camera) return;
        
        // Sensor size
        this.camera.sensorWidth = (this.camera.width * this.camera.pixelSize) / 1000;
        this.camera.sensorHeight = (this.camera.height * this.camera.pixelSize) / 1000;
        
        // FOV
        this.camera.fovWidth = 2 * Math.atan(this.camera.sensorWidth / (2 * this.telescope.focalLength)) * 180 / Math.PI;
        this.camera.fovHeight = 2 * Math.atan(this.camera.sensorHeight / (2 * this.telescope.focalLength)) * 180 / Math.PI;
        
        // Sampling
        this.camera.sampling = (this.camera.pixelSize / this.telescope.focalLength) * 206.265;
    }
    
    optimizeExposures() {
        if (!this.telescope || !this.camera) return this.getDefaultSequences();
        
        const focalFactor = this.telescope.focalLength / CONFIG.OPTIMIZATION.baseFocal;
        const fRatioFactor = this.telescope.fRatio / CONFIG.OPTIMIZATION.baseFratio;
        const factor = focalFactor * fRatioFactor;
        
        return {
            chromosphere: this.scaleSequence([0.5, 1, 2, 4, 8], factor),
            innerCorona: this.scaleSequence([4, 8, 16, 32, 63], factor),
            midCorona: this.scaleSequence([63, 125, 250, 500, 1000], factor),
            outerCorona: this.scaleSequence([1000, 2000, 4000, 8000], factor),
            gain: this.camera.type === 'cmos' ? this.camera.gainUnity : null,
            iso: this.camera.type === 'dslr' ? 400 : null
        };
    }
    
    scaleSequence(base, factor) {
        return base.map(exp => Math.round(exp * factor * 10) / 10);
    }
    
    getDefaultSequences() {
        return {
            chromosphere: [0.5, 1, 2, 4, 8],
            innerCorona: [4, 8, 16, 32, 63],
            midCorona: [63, 125, 250, 500, 1000],
            outerCorona: [1000, 2000, 4000, 8000]
        };
    }
}

const cameraManager = new CameraManager();
