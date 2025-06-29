import * as THREE from 'three'; 
import { HeatDistortionShader } from './heatDistortionShader.js';

export function createFire(scene, position) {
    const particleCount = 2000;
    const fireGeometry = new THREE.BufferGeometry();
    const firePositions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
        firePositions[i * 3] = (Math.random() - 0.5) * 4;
        firePositions[i * 3 + 1] = Math.random() * 2;
        firePositions[i * 3 + 2] = (Math.random() - 0.5) * 4;

        const t = Math.random();
        if (t < 0.33) {
            colors[i * 3] = 1.0;
            colors[i * 3 + 1] = 0.8 + Math.random() * 0.2;
            colors[i * 3 + 2] = 0.0;
        } else if (t < 0.66) {
            colors[i * 3] = 1.0;
            colors[i * 3 + 1] = 0.4 + Math.random() * 0.2;
            colors[i * 3 + 2] = 0.0;
        } else {
            colors[i * 3] = 0.8 + Math.random() * 0.2;
            colors[i * 3 + 1] = 0.1 + Math.random() * 0.2;
            colors[i * 3 + 2] = 0.0;
        }

        sizes[i] = 0.1 + Math.random() * 0.3;
    }

    fireGeometry.setAttribute('position', new THREE.BufferAttribute(firePositions, 3));
    fireGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    fireGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const fireMaterial = new THREE.PointsMaterial({
        size: 0.2,
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true
    });

    const fire = new THREE.Points(fireGeometry, fireMaterial);
    fire.position.copy(position);
    scene.add(fire);

    // 🔥 Light source
    const fireLight = new THREE.PointLight(0xffa500, 3, 12);
    fireLight.position.copy(position);
    scene.add(fireLight);

    // 🚨 Fire collision zone
    const fireArea = new THREE.Mesh(
        new THREE.SphereGeometry(3, 8, 8),
        new THREE.MeshBasicMaterial({ 
            color: 0xff0000, 
            transparent: true, 
            opacity: 0.2,
            visible: false
        })
    );
    fireArea.position.copy(position);
    scene.add(fireArea);

    // 💨 Smoke particles
    const smokeCount = 200;
    const smokeGeometry = new THREE.BufferGeometry();
    const smokePositions = new Float32Array(smokeCount * 3);
    const smokeOpacities = new Float32Array(smokeCount);

    for (let i = 0; i < smokeCount; i++) {
        smokePositions[i * 3] = (Math.random() - 0.5) * 2;
        smokePositions[i * 3 + 1] = Math.random() * 2;
        smokePositions[i * 3 + 2] = (Math.random() - 0.5) * 2;

        smokeOpacities[i] = 0.2 + Math.random() * 0.3;
    }

    smokeGeometry.setAttribute('position', new THREE.BufferAttribute(smokePositions, 3));
    smokeGeometry.setAttribute('opacity', new THREE.BufferAttribute(smokeOpacities, 1));

    const smokeMaterial = new THREE.PointsMaterial({
        color: 0x444444,
        size: 1.5,
        transparent: true,
        opacity: 0.3,
        depthWrite: false
    });

    const smoke = new THREE.Points(smokeGeometry, smokeMaterial);
    smoke.position.copy(position);
    scene.add(smoke);

    // 🔥 Heat Distortion Plane
    const heatUniforms = THREE.UniformsUtils.clone(HeatDistortionShader.uniforms);
    const heatMaterial = new THREE.ShaderMaterial({
        uniforms: heatUniforms,
        vertexShader: HeatDistortionShader.vertexShader,
        fragmentShader: HeatDistortionShader.fragmentShader,
        transparent: true,
        depthWrite: false
    });

    const heatPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(3, 3),
        heatMaterial
    );
    heatPlane.position.copy(position.clone().add(new THREE.Vector3(0, 2.5, 0)));
    heatPlane.rotation.x = -Math.PI / 2;
    scene.add(heatPlane);

    // ✅ Return object with update
    return {
        position: fire.position,
        update: () => {
            // 🔥 Animate fire
            const firePos = fireGeometry.attributes.position.array;
            for (let i = 1; i < firePos.length; i += 3) {
                firePos[i] += 0.03 + Math.random() * 0.02;
                if (firePos[i] > 3) {
                    firePos[i] = 0;
                    firePos[i - 1] = (Math.random() - 0.5) * 4;
                    firePos[i + 1] = (Math.random() - 0.5) * 4;
                }
            }
            fireGeometry.attributes.position.needsUpdate = true;

            // 💨 Animate smoke
            const smokePos = smokeGeometry.attributes.position.array;
            const opacities = smokeGeometry.attributes.opacity.array;
            for (let i = 0; i < smokeCount; i++) {
                let yIndex = i * 3 + 1;
                smokePos[yIndex] += 0.01;
                smokePos[i * 3] += (Math.random() - 0.5) * 0.005;
                smokePos[i * 3 + 2] += (Math.random() - 0.5) * 0.005;

                opacities[i] -= 0.002;
                if (opacities[i] <= 0) {
                    smokePos[i * 3] = (Math.random() - 0.5) * 2;
                    smokePos[i * 3 + 1] = 0;
                    smokePos[i * 3 + 2] = (Math.random() - 0.5) * 2;
                    opacities[i] = 0.2 + Math.random() * 0.3;
                }
            }
            smokeGeometry.attributes.position.needsUpdate = true;
            smokeGeometry.attributes.opacity.needsUpdate = true;

            // 🔆 Flicker
            fireLight.intensity = 2.5 + Math.sin(Date.now() * 0.02 + Math.random() * 2) * 1.2;

            // 🔥 Animate heat shimmer
            heatUniforms.time.value += 0.05;
        },
        getDangerRadius: () => 3,
        fireArea: fireArea
    };
}