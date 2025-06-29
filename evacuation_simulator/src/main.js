import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { setupAgents } from './agents.js';
import { createFire } from './fire.js';
import { GUI } from 'dat.gui';
import { Pathfinding } from 'three-pathfinding';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf0f0f0);

const camera = new THREE.PerspectiveCamera(
    40, // Further reduced FOV from 45 to 40 for an even closer view
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// Enhanced lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);  // Increased intensity
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(10, 20, 10);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
scene.add(directionalLight);

const pathfinding = new Pathfinding();
let building = { exits: [] };
let agents;
let fires = [];
let obstacles = [];

let earthquakeActive = false;
let earthquakeElapsed = 0;

// Audio setup
const listener = new THREE.AudioListener();
camera.add(listener);
const audioLoader = new THREE.AudioLoader();
const emergencySounds = {
    fire: new THREE.Audio(listener),
    earthquake: new THREE.Audio(listener),
    active_shooter: new THREE.Audio(listener)
};
audioLoader.load('/sounds/fire.mp3', buffer => emergencySounds.fire.setBuffer(buffer));
audioLoader.load('/sounds/earthquake.mp3', buffer => emergencySounds.earthquake.setBuffer(buffer));
audioLoader.load('/sounds/shooter.mp3', buffer => emergencySounds.active_shooter.setBuffer(buffer));

const clock = new THREE.Clock();

function buildSimpleHouse() {
    const houseGroup = new THREE.Group();
    const wallColor = 0xa2c3d6;
    const doorColor = 0x6a3e20; // Consistent door color

    const wallMaterial = new THREE.MeshStandardMaterial({ 
        color: wallColor,
        roughness: 0.8
    });
    const doorMaterial = new THREE.MeshStandardMaterial({ 
        color: doorColor,
        metalness: 0.1,
        roughness: 0.7
    });

    // Floor with better shadows
    const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(30, 30),
        new THREE.MeshStandardMaterial({ 
            color: 0x999999,
            roughness: 0.9
        })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    houseGroup.add(floor);

    const wallHeight = 5, wallThickness = 1.5;

    // Outer walls with shadows
    const walls = [
        // Back wall
        new THREE.Mesh(new THREE.BoxGeometry(30, wallHeight, wallThickness), wallMaterial),
        // Left wall
        new THREE.Mesh(new THREE.BoxGeometry(wallThickness, wallHeight, 30), wallMaterial),
        // Right wall
        null, // Will be cloned from left
        // Front left segment
        new THREE.Mesh(new THREE.BoxGeometry(8, wallHeight, wallThickness), wallMaterial),
        // Front right segment
        null, // Will be cloned
        // Divider wall
        new THREE.Mesh(new THREE.BoxGeometry(wallThickness, wallHeight, 30), wallMaterial)
    ];

    walls[0].position.set(0, wallHeight/2, 10);
    walls[1].position.set(-15, wallHeight/2, 0);
    walls[2] = walls[1].clone();
    walls[2].position.set(15, wallHeight/2, 0);
    walls[3].position.set(-6, wallHeight/2, -10);
    walls[4] = walls[3].clone();
    walls[4].position.set(6, wallHeight/2, -10);
    walls[5].position.set(0, wallHeight/2, 0);

    walls.forEach(wall => {
        wall.castShadow = true;
        wall.receiveShadow = true;
        houseGroup.add(wall);
    });

    // Create 6 visible doors
    const doors = [
        // Front door
        new THREE.Mesh(new THREE.BoxGeometry(4, 4, 0.2), doorMaterial),
        // Back door
        null, // will clone front
        // Left door
        new THREE.Mesh(new THREE.BoxGeometry(1.5, 4, 4), doorMaterial),
        // Right door
        null, // will clone left
        // Top door (center, facing forward)
        new THREE.Mesh(new THREE.BoxGeometry(4, 4, 1.5), doorMaterial),
        // Bottom door (center, facing forward)
        null // will clone top
    ];

    doors[0].position.set(0, 2, -9.9);
    doors[1] = doors[0].clone();
    doors[1].position.set(0, 2, 9.9);
    doors[2].position.set(-14.9, 2, 0);
    doors[3] = doors[2].clone();
    doors[3].position.set(14.9, 2, 0);
    doors[4].position.set(0, 2, 5);
    doors[4].rotation.y = Math.PI/2;
    doors[5] = doors[4].clone();
    doors[5].position.set(0, 2, -5);

    doors.forEach(door => {
        door.castShadow = true;
        door.receiveShadow = true;
        door.userData.isDoor = true;
        houseGroup.add(door);
    });

    building.exits = doors.map(door => ({ 
        position: door.position.clone() 
    }));

    scene.add(houseGroup);

    const groundGeometry = new THREE.PlaneGeometry(30, 30);
    groundGeometry.rotateX(-Math.PI / 2);
    const zone = Pathfinding.createZone(groundGeometry);
    pathfinding.setZoneData('level1', zone);
}

async function init() {
    try {
        buildSimpleHouse();
        agents = await setupAgents(scene, building, pathfinding);
        fires = [
            createFire(scene, new THREE.Vector3(8, 0, 8)),
            createFire(scene, new THREE.Vector3(-5, 0, -3))
        ];
        setupGUI();
        setupControls();
        startAnimationLoop();
    } catch (error) {
        console.error("Initialization failed:", error);
    }
}

function setupGUI() {
    const gui = new GUI();
    const params = {
        emergencyType: 'fire',
        startSimulation: () => {
            const type = params.emergencyType;
            if (emergencySounds[type].isPlaying) emergencySounds[type].stop();
            emergencySounds[type].play();

            if (type === 'earthquake') {
                earthquakeActive = true;
                earthquakeElapsed = 0;
            }

            agents.startEvacuation(type);
            createDynamicObstacles();
        },
        reset: () => {
            agents.reset();
            clearObstacles();
        },
        addFire: () => {
            const pos = new THREE.Vector3(
                (Math.random() - 0.5) * 20, 
                0, 
                (Math.random() - 0.5) * 20
            );
            const fire = createFire(scene, pos);
            fires.push(fire);

            const dangerZone = new THREE.Mesh(
                new THREE.CircleGeometry(3, 32),
                new THREE.MeshBasicMaterial({ 
                    color: 0xff0000, 
                    opacity: 0.4, 
                    transparent: true 
                })
            );
            dangerZone.rotation.x = -Math.PI / 2;
            dangerZone.position.copy(pos).setY(0.01);
            scene.add(dangerZone);
        },
        doorVisibility: true,
        toggleDoors: () => {
            scene.traverse(child => {
                if (child.userData.isDoor) {
                    child.visible = params.doorVisibility;
                }
            });
        }
    };

    gui.add(params, 'emergencyType', ['fire', 'earthquake', 'active_shooter']);
    gui.add(params, 'startSimulation').name('Start Evacuation');
    gui.add(params, 'reset').name('Reset Simulation');
    gui.add(params, 'addFire').name('Add Random Fire');
    gui.add(params, 'doorVisibility').name('Show Doors').onChange(params.toggleDoors);
}

function setupControls() {
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 15; // Reduced minimum zoom distance even more
    controls.maxDistance = 80; // Reduced maximum zoom distance
    controls.maxPolarAngle = Math.PI / 2;
    return controls;
}

function startAnimationLoop() {
    function animate() {
        requestAnimationFrame(animate);
        const delta = clock.getDelta();

        if (earthquakeActive) {
            earthquakeElapsed += delta;
            const shakeIntensity = 0.1;
            const shakeSpeed = 50;
            camera.position.x = 20 + Math.sin(earthquakeElapsed * shakeSpeed) * shakeIntensity;
            camera.position.y = 20 + Math.sin(earthquakeElapsed * shakeSpeed * 0.8) * shakeIntensity;
            camera.position.z = 20 + Math.sin(earthquakeElapsed * shakeSpeed * 1.2) * shakeIntensity;

            if (earthquakeElapsed > 5) {
                earthquakeActive = false;
                camera.position.set(20, 20, 20);
            }
        }

        if (agents) agents.update(delta, fires);
        fires.forEach(fire => fire.update());
        renderer.render(scene, camera);
    }
    animate();
}

function createDynamicObstacles() {
    clearObstacles();
    for (let i = 0; i < 5; i++) {
        const size = 1 + Math.random() * 2;
        const obstacle = new THREE.Mesh(
            new THREE.BoxGeometry(size, size, size),
            new THREE.MeshStandardMaterial({ 
                color: 0x8B4513,
                roughness: 0.8
            })
        );
        obstacle.position.set(
            (Math.random() - 0.5) * 25, 
            size / 2, 
            (Math.random() - 0.5) * 25
        );
        obstacle.castShadow = true;
        obstacle.receiveShadow = true;
        scene.add(obstacle);
        obstacles.push(obstacle);
    }
    if (agents.updateNavMesh) {
        agents.updateNavMesh(obstacles);
    }
}

function clearObstacles() {
    obstacles.forEach(o => scene.remove(o));
    obstacles = [];
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

init(); 