export class EarthquakeEffect {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.intensity = 0;
        this.originalCameraPos = null;
        this.originalCameraRot = null;
        this.buildingShakeIntensity = 0.1; // Intensity for building shake
    }
    
    start() {
        this.intensity = 1.0;
        this.originalCameraPos = this.camera.position.clone();
        this.originalCameraRot = this.camera.rotation.clone();
        
        // Store original positions of building elements
        this.scene.traverse((object) => {
            if (object.isMesh && object !== this.camera && !object.userData.isAgent) {
                object.userData.originalPosition = object.position.clone();
                object.userData.originalRotation = object.rotation.clone();
            }
        });
    }
    
    stop() {
        this.intensity = 0;
        if (this.originalCameraPos) {
            this.camera.position.copy(this.originalCameraPos);
        }
        if (this.originalCameraRot) {
            this.camera.rotation.copy(this.originalCameraRot);
        }
        
        // Reset building elements to original positions
        this.scene.traverse((object) => {
            if (object.isMesh && object !== this.camera && !object.userData.isAgent) {
                if (object.userData.originalPosition) {
                    object.position.copy(object.userData.originalPosition);
                }
                if (object.userData.originalRotation) {
                    object.rotation.copy(object.userData.originalRotation);
                }
            }
        });
    }
    
    updateCamera() {
        if (!this.intensity) return;
        
        // Shake the building elements
        this.scene.traverse((object) => {
            if (object.isMesh && object !== this.camera && !object.userData.isAgent) {
                if (object.userData.originalPosition) {
                    // Add random movement to building elements
                    object.position.x = object.userData.originalPosition.x + (Math.random() - 0.5) * this.intensity * this.buildingShakeIntensity;
                    object.position.y = object.userData.originalPosition.y + (Math.random() - 0.5) * this.intensity * this.buildingShakeIntensity;
                    object.position.z = object.userData.originalPosition.z + (Math.random() - 0.5) * this.intensity * this.buildingShakeIntensity;
                }
            }
        });
        
        // Enhanced camera shake
        if (this.originalCameraPos) {
        this.camera.position.x = this.originalCameraPos.x + (Math.random() - 0.5) * this.intensity * 2;
        this.camera.position.y = this.originalCameraPos.y + (Math.random() - 0.5) * this.intensity * 1;
        this.camera.position.z = this.originalCameraPos.z + (Math.random() - 0.5) * this.intensity * 2;
        }
        
        // Add some camera rotation shake
        if (this.originalCameraRot) {
        this.camera.rotation.x = this.originalCameraRot.x + (Math.random() - 0.5) * this.intensity * 0.1;
        this.camera.rotation.z = this.originalCameraRot.z + (Math.random() - 0.5) * this.intensity * 0.1;
        }
        
        // Gradually reduce intensity
        this.intensity *= 0.995;
    }
}