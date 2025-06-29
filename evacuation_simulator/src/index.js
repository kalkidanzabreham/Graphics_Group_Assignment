import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Building } from './building.js';
import { EvacuationSystem } from './evacuation.js';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb); // Sky blue background

// Camera setup
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(30, 25, 30); // Closer position
camera.lookAt(0, 0, 0);
camera.name = 'camera';  // Add name to camera for easy access
scene.add(camera);  // Add camera to scene

// Add audio listener to camera
const listener = new THREE.AudioListener();
camera.add(listener);

// Renderer setup
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.screenSpacePanning = false;
controls.minDistance = 15;  // Reduced minimum distance to allow closer viewing
controls.maxDistance = 100; // Reduced maximum distance
controls.maxPolarAngle = Math.PI / 2;
controls.target.set(0, 0, 0); // Ensure controls are centered on the building

// Lighting
const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(10, 20, 10);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
scene.add(directionalLight);

// Floor
const floorGeometry = new THREE.PlaneGeometry(50, 50);
const floorMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x808080,
    roughness: 0.8,
    metalness: 0.2
});
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

// Create building
const building = new Building();
building.createRealisticHouse();
scene.add(building.meshes);

// Create evacuation system
const evacuationSystem = new EvacuationSystem(scene, building);

// Create UI
const uiContainer = document.createElement('div');
uiContainer.style.position = 'absolute';
uiContainer.style.top = '7px';
uiContainer.style.left = '7px';
uiContainer.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
uiContainer.style.padding = '7px';
uiContainer.style.borderRadius = '7px';
uiContainer.style.fontFamily = 'Arial, sans-serif';
document.body.appendChild(uiContainer);

// Add loading text
const loadingText = document.createElement('div');
loadingText.textContent = 'Loading models...';
loadingText.style.marginBottom = '6px';
uiContainer.appendChild(loadingText);

// Create scenario buttons
const createButton = (text, onClick) => {
    const button = document.createElement('button');
    button.textContent = text;
    button.style.margin = '5px';
    button.style.padding = '7px 15px';
    button.style.border = 'none';
    button.style.borderRadius = '5px';
    button.style.backgroundColor = '#4CAF50';
    button.style.color = 'white';
    button.style.cursor = 'pointer';
    button.onclick = onClick;
    button.disabled = true; // Initially disabled
    return button;
};

const startEarthquakeButton = createButton('Start Earthquake Evacuation', () => {
    if (evacuationSystem.initialized) {
        evacuationSystem.resetEvacuation();
        evacuationSystem.startEvacuation('earthquake');
    }
});

const startFireButton = createButton('Start Fire Evacuation', () => {
    if (evacuationSystem.initialized) {
        evacuationSystem.resetEvacuation();
        evacuationSystem.startEvacuation('fire');
    }
});

const resetButton = createButton('Reset Evacuation', () => {
    if (evacuationSystem.initialized) {
        evacuationSystem.resetEvacuation();
    }
});

uiContainer.appendChild(startEarthquakeButton);
uiContainer.appendChild(startFireButton);
uiContainer.appendChild(resetButton);

// Enable buttons when models are loaded
const enableButtons = () => {
    loadingText.textContent = 'Models loaded!';
    loadingText.style.color = '#4CAF50';
    startFireButton.disabled = false;
    startEarthquakeButton.disabled = false;
    resetButton.disabled = false;
};

// Check if models are loaded every 100ms
const checkModelsLoaded = setInterval(() => {
    if (evacuationSystem.modelsLoaded && evacuationSystem.initialized) {
        enableButtons();
        clearInterval(checkModelsLoaded);
    }
}, 100);

// Animation loop
const clock = new THREE.Clock();
let frameCount = 0;
function animate() {
    requestAnimationFrame(animate);
    
    const delta = clock.getDelta();
    frameCount++;
    if (frameCount % 2 === 0) { // Update agents every other frame
        evacuationSystem.update(delta * 2); // Compensate for skipped frames
    }
    controls.update();
    renderer.render(scene, camera);
}

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Handle mouse interaction
window.addEventListener('mousemove', (event) => {
    building.onMouseMove(event, camera);
});

window.addEventListener('click', (event) => {
    building.onMouseClick(event, camera);
});

// Start the application
animate(); 