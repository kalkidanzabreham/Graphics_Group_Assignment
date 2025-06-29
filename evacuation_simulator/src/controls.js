import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export function setupControls(camera, domElement) {
    const controls = new OrbitControls(camera, domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    return controls;
}