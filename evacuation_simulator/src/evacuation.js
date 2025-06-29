import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { createFire } from './fire.js';
import { EarthquakeEffect } from './earthquake.js';

export class EvacuationSystem {
    constructor(scene, building) {
        this.scene = scene;
        this.building = building;
        this.agents = [];
        this.isEvacuating = false;
        this.currentScenario = null;
        this.agentCount = 20;
        this.personModels = [];
        this.loader = new GLTFLoader();
        this.modelsLoaded = false;
        this.initialized = false;
        this.fires = [];
        this.earthquakeShakingEndTime = 0;
        this.earthquakeShakingDuration = 15; // 15 seconds of shaking
        this.earthquakeCoverDuration = 5; // 5 seconds of taking cover before evacuation
        this.dancingPairs = []; // Store dancing pairs
        this.isDancing = true; // Start with dancing
        this.danceStartTime = Date.now();
        this.danceDuration = 30000; // 30 seconds of dancing
        this.danceSpeed = 1.5; // Speed of rotation
        this.danceRadius = 3; // Distance between partners
        this.bounceHeight = 0.3; // Height of bounce
        this.bounceSpeed = 0.008; // Speed of bounce
        
        // Setup nightclub lighting
        // Dim ambient light for club atmosphere
        const ambientLight = new THREE.AmbientLight(0x111111, 0.3);
        this.scene.add(ambientLight);

        // Add colored spotlights
        const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xff00ff, 0xffff00];
        const positions = [
            { x: -10, y: 15, z: -10 },
            { x: 10, y: 15, z: -10 },
            { x: 0, y: 15, z: -10 },
            { x: -10, y: 15, z: 10 },
            { x: 10, y: 15, z: 10 }
        ];

        this.spotlights = [];
        positions.forEach((pos, index) => {
            const spotlight = new THREE.SpotLight(colors[index], 1);
            spotlight.position.set(pos.x, pos.y, pos.z);
            spotlight.angle = Math.PI / 4;
            spotlight.penumbra = 0.2;
            spotlight.decay = 1.5;
            spotlight.distance = 50;
            spotlight.castShadow = true;
            spotlight.shadow.mapSize.width = 1024;
            spotlight.shadow.mapSize.height = 1024;
            this.scene.add(spotlight);
            this.spotlights.push(spotlight);

            // Add visible light cone
            const lightCone = new THREE.Mesh(
                new THREE.ConeGeometry(5, 20, 32),
                new THREE.MeshBasicMaterial({
                    color: colors[index],
                    transparent: true,
                    opacity: 0.2
                })
            );
            lightCone.position.copy(spotlight.position);
            lightCone.rotation.x = Math.PI / 2;
            this.scene.add(lightCone);
        });

        // Add a central disco ball effect
        const discoBall = new THREE.Mesh(
            new THREE.SphereGeometry(2, 32, 32),
            new THREE.MeshPhongMaterial({
                color: 0xffffff,
                shininess: 100,
                specular: 0xffffff
            })
        );
        discoBall.position.set(0, 15, 0);
        this.scene.add(discoBall);
        this.discoBall = discoBall;

        // Add floor reflection effect
        const floorGeometry = new THREE.PlaneGeometry(50, 50);
        const floorMaterial = new THREE.MeshPhongMaterial({
            color: 0x111111,
            shininess: 100,
            specular: 0xffffff,
            side: THREE.DoubleSide
        });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = Math.PI / 2;
        floor.position.y = -0.1;
        this.scene.add(floor);
        
        // Setup audio
        this.listener = new THREE.AudioListener();
        this.earthquakeSound = new THREE.Audio(this.listener);
        this.salsaMusic = new THREE.Audio(this.listener);
        this.audioLoader = new THREE.AudioLoader();
        this.audioLoader.load('sounds/earthquake.mp3', (buffer) => {
            this.earthquakeSound.setBuffer(buffer);
            this.earthquakeSound.setLoop(true);
            this.earthquakeSound.setVolume(0.15);
        });
        
        // Load salsa music
        this.audioLoader.load('sounds/salsa.mp3', (buffer) => {
            this.salsaMusic.setBuffer(buffer);
            this.salsaMusic.setLoop(true);
            this.salsaMusic.setVolume(0.5);
        });
        
        // Setup earthquake effect
        this.earthquakeEffect = new EarthquakeEffect(scene, scene.getObjectByName('camera'));
        
        this.loadModels();
    }

    async loadModels() {
        try {
            // Load all models simultaneously
            const modelPromises = [
                this.loadModel('models/hot_women_fbx.glb'),
                this.loadModel('models/person2.glb'),
                this.loadModel('models/person3.glb')
            ];
            
            const [model1, model2, model3] = await Promise.all(modelPromises);
            
            // Adjust the hot women model's position and scale
            model1.traverse((child) => {
                if (child.isMesh) {
                    child.position.y = 0.5; // Lift the model up slightly
                }
            });
            
            this.personModels = [model1, model2, model3];
            this.modelsLoaded = true;
            this.createAgents(); // Create agents once models are loaded
        } catch (error) {
            console.error('Error loading models:', error);
        }
    }

    loadModel(path) {
        return new Promise((resolve, reject) => {
            this.loader.load(
                path,
                (gltf) => {
                    const model = gltf.scene;
                    // Scale the model appropriately
                    model.scale.set(0.5, 0.5, 0.5);
                    // Make sure the model is centered and standing on the ground
                    model.position.y = 0;
                    resolve(model);
                },
                undefined,
                (error) => reject(error)
            );
        });
    }

    createAgents() {
        if (!this.modelsLoaded) {
            console.log('Models not loaded yet');
            return;
        }

        // Define different roles and their properties
        const roles = [
            {
                name: 'Teacher',
                color: 0x00BFFF, // Bright Sky Blue
                speed: 8.0,
                panicLevel: 0.4,
                initialPosition: () => ({
                    x: 0,
                    z: -10
                })
            },
            {
                name: 'Student 1',
                color: 0xFF69B4, // Hot Pink
                speed: 7.5,
                panicLevel: 0.7,
                initialPosition: () => ({
                    x: -8,
                    z: -8
                })
            },
            {
                name: 'Student 2',
                color: 0x32CD32, // Lime Green
                speed: 7.5,
                panicLevel: 0.7,
                initialPosition: () => ({
                    x: 8,
                    z: -8
                })
            },
            {
                name: 'Student 3',
                color: 0xFFD700, // Gold
                speed: 7.5,
                panicLevel: 0.7,
                initialPosition: () => ({
                    x: -8,
                    z: 8
                })
            },
            {
                name: 'Student 4',
                color: 0xFF4500, // Orange Red
                speed: 7.5,
                panicLevel: 0.7,
                initialPosition: () => ({
                    x: 8,
                    z: 8
                })
            },
            {
                name: 'Student 5',
                color: 0x9370DB, // Medium Purple
                speed: 7.5,
                panicLevel: 0.7,
                initialPosition: () => ({
                    x: -4,
                    z: -4
                })
            },
            {
                name: 'Student 6',
                color: 0x20B2AA, // Light Sea Green
                speed: 7.5,
                panicLevel: 0.7,
                initialPosition: () => ({
                    x: 4,
                    z: -4
                })
            },
            {
                name: 'Student 7',
                color: 0xFF1493, // Deep Pink
                speed: 7.5,
                panicLevel: 0.7,
                initialPosition: () => ({
                    x: -4,
                    z: 4
                })
            },
            {
                name: 'Student 8',
                color: 0x00CED1, // Dark Turquoise
                speed: 7.5,
                panicLevel: 0.7,
                initialPosition: () => ({
                    x: 4,
                    z: 4
                })
            },
            {
                name: 'Student 9',
                color: 0xFFA500, // Orange
                speed: 7.5,
                panicLevel: 0.7,
                initialPosition: () => ({
                    x: 0,
                    z: -6
                })
            },
            {
                name: 'Student 10',
                color: 0xBA55D3, // Medium Orchid
                speed: 7.5,
                panicLevel: 0.7,
                initialPosition: () => ({
                    x: -6,
                    z: 0
                })
            },
            {
                name: 'Student 11',
                color: 0x00FA9A, // Medium Spring Green
                speed: 7.5,
                panicLevel: 0.7,
                initialPosition: () => ({
                    x: 6,
                    z: 0
                })
            }
        ];

        // Create all agents at once
        for (let i = 0; i < 6; i++) {
            const modelIndex = i % this.personModels.length;
            const model = this.personModels[modelIndex].clone();
            const role = roles[i];
            const position = role.initialPosition();
            
            model.position.set(position.x, modelIndex === 0 ? 0.5 : 0, position.z);
            const scale = modelIndex === 0 ? 3.0 : 4.5;
            model.scale.set(scale, scale, scale);
            
            model.userData.isAgent = true;
            model.userData.role = role.name;
            
            // Make all agents visible immediately
            model.visible = true;
            
            // Apply role-specific color
            model.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    if (child.material) {
                        child.material = child.material.clone();
                        child.material.color.setHex(role.color);
                        child.material.roughness = 0.1;
                        child.material.metalness = 0.4;
                        child.material.envMapIntensity = 3.0;
                        child.material.transparent = true;
                        child.material.opacity = 1.0; // Set opacity to 1 immediately
                        child.material.depthWrite = false;
                    }
                }
            });
            
            this.scene.add(model);
            this.agents.push({
                mesh: model,
                role: role.name,
                speed: role.speed,
                panicLevel: role.panicLevel,
                originalPosition: new THREE.Vector3(position.x, modelIndex === 0 ? 0.5 : 0, position.z),
                isEvacuating: false,
                isTakingCover: false,
                coverStartTime: 0,
                currentPath: [],
                currentPathIndex: 0,
                isDancing: true,
                dancePartner: null,
                danceCenter: new THREE.Vector3(
                    (Math.random() - 0.5) * 10,
                    0,
                    (Math.random() - 0.5) * 10
                ),
                danceAngle: Math.random() * Math.PI * 2,
                bounceOffset: 0
            });
        }

        // Create exactly 3 dancing pairs at different positions
        const hotWomen = this.agents.filter(a => a.role === 'Teacher');
        const others = this.agents.filter(a => a.role !== 'Teacher');
        
        // Define different dance centers for each pair
        const danceCenters = [
            new THREE.Vector3(-6, 0, -6),  // First pair
            new THREE.Vector3(6, 0, -6),   // Second pair
            new THREE.Vector3(0, 0, 6)     // Third pair
        ];
        
        // Create 3 pairs at different positions
        for (let i = 0; i < 3; i++) {
            // Clone the hot woman model for each pair
            const hotWomanModel = this.personModels[0].clone();
            hotWomanModel.scale.set(3.0, 3.0, 3.0);
            hotWomanModel.position.copy(danceCenters[i]);
            hotWomanModel.visible = true;
            
            // Apply material properties
            hotWomanModel.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    if (child.material) {
                        child.material = child.material.clone();
                        child.material.color.setHex(0x00BFFF); // Bright Sky Blue
                        child.material.roughness = 0.1;
                        child.material.metalness = 0.4;
                        child.material.envMapIntensity = 3.0;
                        child.material.transparent = true;
                        child.material.opacity = 1.0;
                        child.material.depthWrite = false;
                    }
                }
            });
            
            this.scene.add(hotWomanModel);
            
            // Create hot woman agent
            const hotWoman = {
                mesh: hotWomanModel,
                role: 'Teacher',
                speed: 8.0,
                panicLevel: 0.4,
                originalPosition: danceCenters[i].clone(),
                isEvacuating: false,
                isTakingCover: false,
                coverStartTime: 0,
                currentPath: [],
                currentPathIndex: 0,
                isDancing: true,
                dancePartner: null,
                danceCenter: danceCenters[i],
                danceAngle: Math.random() * Math.PI * 2,
                bounceOffset: 0
            };
            
            // Get partner from others
            const partner = others[i];
            
            // Set dance partners
            hotWoman.dancePartner = partner;
            partner.dancePartner = hotWoman;
            
            // Set dance centers
            partner.danceCenter = danceCenters[i];
            
            // Set initial positions
            partner.mesh.position.copy(danceCenters[i]);
            
            this.agents.push(hotWoman);
            this.dancingPairs.push([hotWoman, partner]);
        }

        // Start salsa music
        if (this.salsaMusic.isPlaying === false) {
            this.salsaMusic.play();
        }
        
        this.initialized = true;
    }

    findSafeSpot(position) {
        let nearestSafeSpot = null;
        let minDistance = Infinity;

        // Look for tables and chairs in the scene
        this.scene.traverse((object) => {
            if (object.isMesh && (object.name.toLowerCase().includes('table') || 
                                object.name.toLowerCase().includes('chair') ||
                                object.name.toLowerCase().includes('desk'))) {
                const distance = position.distanceTo(object.position);
                if (distance < minDistance) {
                    minDistance = distance;
                    nearestSafeSpot = object.position.clone();
                }
            }
        });

        if (nearestSafeSpot) {
            // Return a position slightly offset from the furniture
            return nearestSafeSpot;
        }

        // If no safe spot found, return original position
        return position.clone();
    }

    startEvacuation(type) {
        if (!this.initialized) return;

        this.evacuationActive = true;
        this.evacuationType = type;
        this.evacuationStartTime = Date.now();
        this.evacuationStats = {
            totalAgents: this.agents.length,
            evacuatedAgents: 0,
            startTime: Date.now()
        };

        // Play appropriate sound
        if (type === 'fire') {
            if (this.earthquakeSound.isPlaying) {
                this.earthquakeSound.stop();
            }
        } else if (type === 'earthquake') {
            if (this.earthquakeSound.isPlaying === false) {
                this.earthquakeSound.play();
            }
            // Start earthquake effect
            this.earthquakeEffect.start();
            this.earthquakeShakingEndTime = Date.now() + (this.earthquakeShakingDuration * 1000);
            
            // Make agents move to safe spots first
            this.agents.forEach(agent => {
                const safeSpot = this.findSafeSpot(agent.mesh.position);
                agent.targetPosition = safeSpot;
                agent.isTakingCover = true;
                agent.originalPosition = agent.mesh.position.clone();
                agent.originalRotation = agent.mesh.rotation.clone();
                agent.speed = 2.0; // Moderate speed to reach safe spot
            });
        }

        // Create fires at random positions in the central space
        if (type === 'fire') {
            const centralRoom = this.building.rooms.find(room => room.name === "Central Space");
            if (centralRoom) {
                const numFires = 5;
                for (let i = 0; i < numFires; i++) {
                    const angle = (i / numFires) * Math.PI * 2;
                    const radius = 8;
                    const x = Math.cos(angle) * radius;
                    const z = Math.sin(angle) * radius;
                    this.createFire(x, 0, z);
                }
            }
        }

        // Find nearest exit room for each agent (only for fire scenario)
        if (type === 'fire') {
            this.agents.forEach(agent => {
                const agentPos = agent.mesh.position;
                let nearestExit = null;
                let minDistance = Infinity;

                this.building.exits.forEach(exit => {
                    const distance = agentPos.distanceTo(exit.position);
                    if (distance < minDistance) {
                        minDistance = distance;
                        nearestExit = exit;
                    }
                });

                if (nearestExit) {
                    agent.targetPosition = nearestExit.position.clone();
                    agent.currentExit = nearestExit;
                }
            });
        }
    }

    update(delta) {
        if (!this.initialized) return;

        const currentTime = Date.now();
        const danceTime = Date.now();
        
        // Update nightclub lighting
        if (this.isDancing && this.spotlights) {
            // Rotate disco ball
            if (this.discoBall) {
                this.discoBall.rotation.y += delta * 0.5;
                this.discoBall.rotation.x += delta * 0.2;
            }

            // Animate spotlights
            this.spotlights.forEach((spotlight, index) => {
                const time = currentTime * 0.001;
                const radius = 10;
                const angle = time + (index * Math.PI * 2 / this.spotlights.length);
                
                spotlight.position.x = Math.cos(angle) * radius;
                spotlight.position.z = Math.sin(angle) * radius;
                
                const hue = (time * 0.1 + index * 0.2) % 1;
                spotlight.color.setHSL(hue, 1, 0.5);
            });
        }
        
        // Handle dancing phase
        if (this.isDancing) {
            this.dancingPairs.forEach(([agent1, agent2]) => {
                if (!agent1.mesh.visible || !agent2.mesh.visible) return;
                
                // Update dance positions with more dynamic movement
                agent1.danceAngle += delta * this.danceSpeed;
                agent2.danceAngle = agent1.danceAngle + Math.PI;
                
                // Use the pair's dance center
                const center = agent1.danceCenter;
                const offset1 = Math.sin(danceTime * 0.002) * 0.5;
                const offset2 = Math.sin(danceTime * 0.002 + Math.PI) * 0.5;
                
                agent1.mesh.position.x = center.x + Math.cos(agent1.danceAngle) * (this.danceRadius + offset1);
                agent1.mesh.position.z = center.z + Math.sin(agent1.danceAngle) * (this.danceRadius + offset1);
                agent2.mesh.position.x = center.x + Math.cos(agent2.danceAngle) * (this.danceRadius + offset2);
                agent2.mesh.position.z = center.z + Math.sin(agent2.danceAngle) * (this.danceRadius + offset2);
                
                // Make them face each other with slight tilt
                agent1.mesh.lookAt(agent2.mesh.position);
                agent2.mesh.lookAt(agent1.mesh.position);
                
                // Add more dynamic up and down movement
                const bounce1 = Math.sin(danceTime * this.bounceSpeed) * this.bounceHeight;
                const bounce2 = Math.sin(danceTime * this.bounceSpeed + Math.PI) * this.bounceHeight;
                
                agent1.mesh.position.y = (agent1.role === 'Teacher' ? 0.5 : 0) + bounce1;
                agent2.mesh.position.y = (agent2.role === 'Teacher' ? 0.5 : 0) + bounce2;
                
                // Add slight rotation for more dynamic movement
                agent1.mesh.rotation.y += delta * 0.5;
                agent2.mesh.rotation.y += delta * 0.5;
            });
        }

        // Handle evacuation regardless of dancing state
        if (this.evacuationActive) {
            // If evacuation starts during dance, gradually transition
            if (this.isDancing) {
                this.isDancing = false;
                this.salsaMusic.stop();
                // Make sure all agents are visible before evacuation
                this.agents.forEach(agent => {
                    agent.mesh.visible = true;
                    agent.mesh.traverse((child) => {
                        if (child.isMesh && child.material) {
                            child.material.opacity = 0.85;
                        }
                    });
                });
            }

        // Update earthquake effect
        if (this.evacuationType === 'earthquake') {
            // Update camera shake
            this.earthquakeEffect.updateCamera();
            
            // Check if agents should start evacuating
            if (currentTime >= this.evacuationStartTime + (this.earthquakeCoverDuration * 1000)) {
                // Start evacuation after cover duration
                this.agents.forEach(agent => {
                    if (agent.isTakingCover) {
                        // Check if agent has reached their safe spot
                        if (agent.targetPosition && 
                                agent.mesh.position.distanceTo(agent.targetPosition) < 1) {
                            agent.isTakingCover = false;
                            
                            // Find nearest exit for evacuation
                                const agentPos = agent.mesh.position;
                            let nearestExit = null;
                            let minDistance = Infinity;

                            this.building.exits.forEach(exit => {
                                const distance = agentPos.distanceTo(exit.position);
                                if (distance < minDistance) {
                                    minDistance = distance;
                                    nearestExit = exit;
                                }
                            });

                            if (nearestExit) {
                                agent.targetPosition = nearestExit.position.clone();
                                agent.currentExit = nearestExit;
                                agent.speed = 4.0; // Increased speed for evacuation
                            }
                        }
                    }
                });
            }
        }

        // Update fires
        this.fires.forEach(fire => {
            if (fire.update) {
                fire.update();
            }
        });

        // Update agents
        this.agents.forEach(agent => {
                if (!agent.mesh.visible) return;

                const agentPos = agent.mesh.position;
            const targetPos = agent.targetPosition;

            if (targetPos && !agent.isTakingCover) {
                // Initialize panic state if not exists
                if (!agent.panicState) {
                    agent.panicState = {
                        level: 0,
                        lastUpdate: currentTime,
                        lastDirectionChange: currentTime,
                        lastStumble: currentTime,
                        isStumbling: false,
                        stumbleDirection: new THREE.Vector3(),
                        crowdInfluence: 0,
                        lastScream: currentTime,
                        isScreaming: false,
                        lastFreeze: currentTime,
                        isFrozen: false,
                        freezeDuration: 0,
                        lastCrowdReaction: currentTime,
                        crowdReactionCooldown: 2000,
                        lastLookAround: currentTime,
                        isLookingAround: false,
                        lookAroundDuration: 0,
                        lastPanicSpike: currentTime,
                        panicSpikeCooldown: 3000
                    };
                }

                // Calculate direction to target
                const direction = new THREE.Vector3()
                    .subVectors(targetPos, agentPos)
                    .normalize();

                // Enhanced crowd avoidance
                const crowdAvoidance = new THREE.Vector3();
                let nearbyAgents = 0;

                // Check for nearby agents and calculate avoidance
                this.agents.forEach(otherAgent => {
                    if (otherAgent !== agent) {
                            const distance = agentPos.distanceTo(otherAgent.mesh.position);
                        if (distance < 3) { // Reduced from 5 to 3 for tighter avoidance
                            nearbyAgents++;
                            const awayFromOther = new THREE.Vector3()
                                    .subVectors(agentPos, otherAgent.mesh.position)
                                .normalize();
                            // Stronger avoidance for closer agents
                            const avoidanceStrength = (3 - distance) / 3;
                            crowdAvoidance.add(awayFromOther.multiplyScalar(avoidanceStrength));
                        }
                    }
                });

                // Apply crowd avoidance if needed
                if (crowdAvoidance.length() > 0) {
                    crowdAvoidance.normalize();
                    // Blend between target direction and avoidance
                    direction.add(crowdAvoidance.multiplyScalar(0.7)).normalize();
                }

                // Check for nearby fires
                let nearFire = false;
                this.fires.forEach(fire => {
                    const distance = agentPos.distanceTo(fire.position);
                    if (distance < fire.fire.getDangerRadius()) {
                        nearFire = true;
                        // Move away from fire more aggressively
                        direction.sub(fire.position.clone().sub(agentPos).normalize().multiplyScalar(0.8));
                        direction.normalize();
                    }
                });

                // Calculate speed based on crowd density and panic
                const baseSpeed = agent.speed * 1.5; // Increased base speed
                const crowdSpeedModifier = Math.max(0.5, 1 - (nearbyAgents * 0.1)); // Slow down in crowds
                const panicSpeedModifier = nearFire ? 2.0 : 1.0; // Double speed when near fire
                const speed = baseSpeed * crowdSpeedModifier * panicSpeedModifier;

                // Apply movement with smooth acceleration
                const moveAmount = speed * delta;
                agent.mesh.position.add(direction.multiplyScalar(moveAmount));

                // Clamp agent position to stay within building bounds
                agent.mesh.position.x = Math.max(-15, Math.min(15, agent.mesh.position.x));
                agent.mesh.position.z = Math.max(-15, Math.min(15, agent.mesh.position.z));
                // Keep agents on the floor
                agent.mesh.position.y = (agent.role === 'Teacher' ? 0.5 : 0);

                // Add slight random movement to prevent perfect alignment
                if (nearbyAgents > 0) {
                        agent.mesh.position.x += (Math.random() - 0.5) * 0.1;
                        agent.mesh.position.z += (Math.random() - 0.5) * 0.1;
                }

                // Update agent rotation to face movement direction with slight variation
                if (direction.length() > 0) {
                    const targetAngle = Math.atan2(direction.x, direction.z);
                        const currentAngle = agent.mesh.rotation.y;
                    let angleDiff = targetAngle - currentAngle;
                    
                    // Normalize angle difference
                    if (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                    if (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                    
                    // Smooth rotation with slight variation
                    const rotationSpeed = 10 + (nearbyAgents * 2); // Faster rotation in crowds
                        agent.mesh.rotation.y += angleDiff * rotationSpeed * delta;
                }

                // Check if agent reached the exit
                if (agent.currentExit) {
                    // Calculate a point just outside the door (exit)
                    const exitDir = new THREE.Vector3().subVectors(agent.currentExit.position, this.building.meshes.position).normalize();
                    const outsidePos = agent.currentExit.position.clone().add(exitDir.multiplyScalar(2)); // 2 units outside
                    if (agentPos.distanceTo(outsidePos) < 1) {
                        // Remove agent from scene and mark as evacuated
                        this.scene.remove(agent.mesh);
                        agent.mesh.visible = false;
                        this.evacuationStats.evacuatedAgents = (this.evacuationStats.evacuatedAgents || 0) + 1;
                        agent.targetPosition = null;
                        agent.currentExit = null;
                    } else {
                        // Move toward just outside the door
                        agent.targetPosition = outsidePos;
                    }
                } else if (agentPos.distanceTo(targetPos) < 1) {
                    // Continue moving in current direction
                    const currentDirection = new THREE.Vector3()
                        .subVectors(agentPos, this.building.meshes.position)
                        .normalize();
                    const newTarget = agentPos.clone().add(currentDirection.multiplyScalar(50));
                    agent.targetPosition = newTarget;
                }

                agent.panicState.lastUpdate = currentTime;
            }
        });

        // Check if all agents have evacuated
        if (this.evacuationStats.evacuatedAgents === this.evacuationStats.totalAgents) {
            this.evacuationActive = false;
            if (this.earthquakeSound.isPlaying) {
                this.earthquakeSound.stop();
            }
            if (this.evacuationType === 'earthquake') {
                this.earthquakeEffect.stop();
                }
            }
        }
    }

    resetEvacuation() {
        if (!this.initialized) return;

        // Reset evacuation state
        this.evacuationActive = false;
        this.evacuationType = null;
        this.evacuationStartTime = null;
        this.evacuationStats = null;
        this.earthquakeShakingEndTime = null;
        this.isDancing = true; // Restore dancing state
        this.danceStartTime = Date.now(); // Reset dance start time

        // Stop all sounds
        if (this.earthquakeSound.isPlaying) {
            this.earthquakeSound.stop();
        }

        // Stop earthquake effect
        this.earthquakeEffect.stop();

        // Remove all fires
        this.fires.forEach(fire => {
            if (fire.fire) {
                this.scene.remove(fire.fire);
                if (fire.fire.geometry) fire.fire.geometry.dispose();
                if (fire.fire.material) fire.fire.material.dispose();
            }
            if (fire.light) this.scene.remove(fire.light);
            if (fire.smoke) {
                this.scene.remove(fire.smoke);
                if (fire.smoke.geometry) fire.smoke.geometry.dispose();
                if (fire.smoke.material) fire.smoke.material.dispose();
            }
            if (fire.heatPlane) {
                this.scene.remove(fire.heatPlane);
                if (fire.heatPlane.geometry) fire.heatPlane.geometry.dispose();
                if (fire.heatPlane.material) fire.heatPlane.material.dispose();
            }
            if (fire.fireArea) {
                this.scene.remove(fire.fireArea);
                if (fire.fireArea.geometry) fire.fireArea.geometry.dispose();
                if (fire.fireArea.material) fire.fireArea.material.dispose();
            }
        });
        this.fires = [];

        // Clear existing dancing pairs
        this.dancingPairs = [];

        // Reset all agents and recreate dancing pairs
        const hotWomen = this.agents.filter(a => a.role === 'Teacher');
        const others = this.agents.filter(a => a.role !== 'Teacher');

        // Reset and reposition all agents
        this.agents.forEach((agent) => {
            // Make agent visible
            agent.mesh.visible = true;
            
            // Reset agent state
            agent.isEvacuating = false;
            agent.isTakingCover = false;
            agent.targetPosition = null;
            agent.currentExit = null;
            agent.isDancing = true;
            
            // Reset speed
            agent.speed = agent.role === 'Teacher' ? 8.0 : 7.5;
            
            // Generate random position within the building
            const x = (Math.random() - 0.5) * 20;  // Random x position
            const z = (Math.random() - 0.5) * 20;  // Random z position
            
            // Set new position
            agent.mesh.position.set(x, agent.role === 'Teacher' ? 0.5 : 0, z);
            
            // Set random rotation
            agent.mesh.rotation.set(0, Math.random() * Math.PI * 2, 0);
            
            // Set dance center at current position
            agent.danceCenter = new THREE.Vector3(x, 0, z);
            agent.danceAngle = Math.random() * Math.PI * 2;
            agent.bounceOffset = 0;
            
            // Update original position
            agent.originalPosition = agent.mesh.position.clone();
            agent.originalRotation = agent.mesh.rotation.clone();
        });

        // Create dancing pairs with nearby agents
        for (let i = 0; i < hotWomen.length; i++) {
            const hotWoman = hotWomen[i];
            
            // Find the closest partner that isn't already paired
            let closestPartner = null;
            let minDistance = Infinity;
            
            others.forEach(partner => {
                if (!partner.dancePartner) {
                    const distance = hotWoman.mesh.position.distanceTo(partner.mesh.position);
                    if (distance < minDistance) {
                        minDistance = distance;
                        closestPartner = partner;
                    }
                }
            });
            
            if (closestPartner) {
                // Set dance partners
                hotWoman.dancePartner = closestPartner;
                closestPartner.dancePartner = hotWoman;
                
                // Set dance center between them
                const center = new THREE.Vector3().addVectors(
                    hotWoman.mesh.position,
                    closestPartner.mesh.position
                ).multiplyScalar(0.5);
                
                hotWoman.danceCenter = center;
                closestPartner.danceCenter = center;
                
                this.dancingPairs.push([hotWoman, closestPartner]);
            }
        }

        // Start salsa music
        if (this.salsaMusic.isPlaying === false) {
            this.salsaMusic.play();
        }

        // Reset building state
        this.building.reset();

        // Reset camera
        const camera = this.scene.getObjectByName('camera');
        if (camera) {
            camera.position.set(30, 25, 30);
            camera.lookAt(0, 0, 0);
        }
    }

    createFire(x, y, z) {
        const fire = createFire(this.scene, new THREE.Vector3(x, y, z));
        this.fires.push({
            fire: fire,
            position: fire.position,
            light: fire.light,
            smoke: fire.smoke,
            heatPlane: fire.heatPlane,
            fireArea: fire.fireArea,
            update: fire.update
        });
    }
} 