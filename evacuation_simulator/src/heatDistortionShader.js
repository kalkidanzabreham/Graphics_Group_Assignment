export const HeatDistortionShader = {
    uniforms: {
        time: { value: 0 },
        tDiffuse: { value: null }
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform float time;
        uniform sampler2D tDiffuse;
        varying vec2 vUv;

        void main() {
            vec2 uv = vUv;
            float distortion = sin(uv.y * 10.0 + time) * 0.1;
            uv.x += distortion;
            gl_FragColor = texture2D(tDiffuse, uv);
        }
    `
};