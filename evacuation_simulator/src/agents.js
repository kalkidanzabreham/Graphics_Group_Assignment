import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Pathfinding } from 'three-pathfinding';

const MODEL_PATHS = [
    '/models/hot_women_fbx.glb',
    '/models/person2.glb',
    '/models/person3.glb'
];

function createNavMesh() {
    const geometry = new THREE.PlaneGeometry(30, 30);
    geometry.rotateX(-Math.PI / 2);
    return geometry;
}

export async function setupAgents(scene, building, pathfinding) {
    const agents = [];
    const loader = new GLTFLoader();
    const models = await Promise.all(MODEL_PATHS.map(path => loader.loadAsync(path)));

    const zone = 'level1';
    const navMeshGeometry = createNavMesh();

    try {
        const zoneData = Pathfinding.createZone(navMeshGeometry);
        pathfinding.setZoneData(zone, zoneData);
        console.log("Navigation mesh initialized");
    } catch (error) {
        console.error("Failed to initialize navigation mesh:", error);
        throw error;
    }

    for (let i = 0; i < 15; i++) {
        const modelData = models[i % models.length];
        const model = modelData.scene.clone();
        model.scale.set(2.0, 2.0, 2.0);
        model.rotation.y = Math.PI; // ✅ Make agent face forward

        const startPos = new THREE.Vector3(
            (Math.random() - 0.5) * 20,
            0,
            (Math.random() - 0.5) * 20
        );

        model.position.copy(startPos);
        model.traverse(child => {
            if (child.isMesh) {
                child.castShadow = true;
                child.userData.originalColor = child.material.color.clone();
            }
        });

        const mixer = new THREE.AnimationMixer(model);
        const clips = modelData.animations || [];

        console.log('Available animations:', clips.map(c => c.name));

        let idleClip, walkClip;
        if (clips.length > 0) {
            idleClip = clips.find(clip => /idle/i.test(clip.name)) || clips[0];
            walkClip = clips.find(clip => /walk|run/i.test(clip.name)) || clips[0];
        }

        let idleAction = null, walkAction = null;
        if (idleClip) idleAction = mixer.clipAction(idleClip);
        if (walkClip) walkAction = mixer.clipAction(walkClip);

        if (idleAction) idleAction.play();

        scene.add(model);

        agents.push({
            mesh: model,
            mixer,
            walkAction,
            idleAction,
            currentAction: idleAction,
            originalPosition: startPos.clone(),
            path: [],
            currentTargetIndex: 0,
            panic: 0,
            speed: 0.02 + Math.random() * 0.03,
            update: function (delta) {
                if (this.mixer) this.mixer.update(delta);

                const hasPath = this.path.length > 0 && this.currentTargetIndex < this.path.length;

                if (hasPath && this.walkAction && this.currentAction !== this.walkAction) {
                    this.currentAction?.fadeOut(0.3);
                    this.walkAction.reset().fadeIn(0.3).play();
                    this.currentAction = this.walkAction;
                } else if (!hasPath && this.idleAction && this.currentAction !== this.idleAction) {
                    this.currentAction?.fadeOut(0.3);
                    this.idleAction.reset().fadeIn(0.3).play();
                    this.currentAction = this.idleAction;
                }

                if (!hasPath) return;

                const target = this.path[this.currentTargetIndex];
                const direction = new THREE.Vector3().subVectors(target, this.mesh.position);
                const distance = direction.length();
                direction.normalize();

                const moveDistance = this.speed * (1 + this.panic);
                if (distance > moveDistance) {
                    this.mesh.position.addScaledVector(direction, moveDistance);
                    this.mesh.quaternion.slerp(
                        new THREE.Quaternion().setFromRotationMatrix(
                            new THREE.Matrix4().lookAt(
                                this.mesh.position,
                                target,
                                new THREE.Vector3(0, 1, 0)
                            )
                        ),
                        0.1
                    );
                } else {
                    this.mesh.position.copy(target);
                    this.currentTargetIndex++;
                }
            }
        });
    }

    return {
        agents,
        startEvacuation: function (emergencyType, fires = []) {
            this.agents.forEach(agent => {
                agent.panic = {
                    fire: 0.7,
                    earthquake: 0.5,
                    active_shooter: 0.8
                }[emergencyType] || 0;

                const isNearFire = fires.some(fire =>
                    agent.mesh.position.distanceTo(fire.position) < fire.getDangerRadius()
                );
                if (isNearFire) {
                    agent.panic += 0.5;
                }

                const nearestExit = building.exits.reduce((nearest, exit) => {
                    const distance = agent.mesh.position.distanceTo(exit.position);
                    return distance < nearest.distance ? { position: exit.position, distance } : nearest;
                }, { distance: Infinity }).position;

                try {
                    const groupID = pathfinding.getGroup(zone, agent.mesh.position);
                    agent.path = pathfinding.findPath(agent.mesh.position, nearestExit, zone, groupID) || [nearestExit];
                } catch (e) {
                    console.warn("Pathfinding failed, using direct path");
                    agent.path = [nearestExit];
                }

                agent.currentTargetIndex = 0;
            });
        },
        reset: function () {
            this.agents.forEach(agent => {
                agent.mesh.position.copy(agent.originalPosition);
                agent.path = [];
                agent.panic = 0;
                agent.currentTargetIndex = 0;

                if (agent.idleAction) agent.idleAction.reset().fadeIn(0.3).play();
                if (agent.walkAction) agent.walkAction.stop();
                agent.currentAction = agent.idleAction;

                agent.mesh.traverse(child => {
                    if (child.isMesh && child.userData.originalColor) {
                        child.material.color.copy(child.userData.originalColor);
                    }
                });
            });
        },
        update: function (delta, fires = []) {
            this.agents.forEach(agent => {
                agent.update(delta);

                fires.forEach(fire => {
                    if (agent.mesh.position.distanceTo(fire.position) < fire.getDangerRadius()) {
                        const away = new THREE.Vector3()
                            .subVectors(agent.mesh.position, fire.position)
                            .normalize()
                            .multiplyScalar(0.05 + agent.panic * 0.05);
                        agent.mesh.position.add(away);
                    }
                });

                agent.mesh.traverse(child => {
                    if (child.isMesh && child.material && child.userData.originalColor) {
                        if (agent.panic > 0.5) {
                            child.material.color.set(0xff3333);
                        } else {
                            child.material.color.copy(child.userData.originalColor);
                        }
                    }
                });
            });
        },
        updateNavMesh: function (obstacles) {
            this.agents.forEach(agent => {
                obstacles.forEach(obstacle => {
                    if (agent.mesh.position.distanceTo(obstacle.position) < 2) {
                        const avoidDir = new THREE.Vector3()
                            .subVectors(agent.mesh.position, obstacle.position)
                            .normalize();
                        agent.mesh.position.addScaledVector(avoidDir, 0.1);
                    }
                });
            });
        }
    };
}
