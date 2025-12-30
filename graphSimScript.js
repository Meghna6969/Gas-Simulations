import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

//Constants
const R = 8.314; // Ideal Gas Constant
const MOLES_PER_PARTICLE = 1.66e-23;
const nmToMeters = 1e-9;
const ROOM_TEMP = 293.15;
const speedTransitionRate = 0.0009;
const baseSpeed = 0.015;
const boxSize = 3;
const particleRadiusH = 0.05;
const particleRadiusL = 0.03;
const maxPressure = 90;


// Global Variables
let scene, renderer, camera, controls;
let allParticlesH = [];
let allParticlesL = [];
let allParticles = [];
let container; // Holds the box container
let targetSpeedMultiplier = 1;
let currentSpeedMultiplier = 1;
let letCollisions = true;
let currentPressure;

const heavyParticlesInput = document.getElementById('heavyParticles-input');
const heavyParticlesSlider = document.getElementById('heavyParticles-slider');
const lightParticlesInput = document.getElementById('lightParticles-input');
const lightParticlesSlider = document.getElementById('lightParticles-slider');
const temperatureInput = document.getElementById('temperature-input');
const temperatureSlider = document.getElementById('temperature-slider');
const avgSpeedHeavyText = document.getElementById('avgSpeedH-text');
const avgSpeedLightText = document.getElementById('avgSpeedL-text');
const pressureText = document.getElementById('pressure-text');
const tempText = document.getElementById('temperature-text');

function linkInputs(slider, input, callback) {
    //const slider = document.getElementById(sliderId);
    //const input = document.getElementById(inputId);

    slider.addEventListener('input', () => {
        input.value = slider.value;
        callback(parseFloat(slider.value));
    });
    input.addEventListener('input', () => {
        slider.value = input.value;
        callback(parseFloat(input.value));
    });
}
linkInputs(heavyParticlesSlider, heavyParticlesInput, (val) => {
    createParticles(val, 'heavy');
});
linkInputs(lightParticlesSlider, lightParticlesInput, (val) => {
    createParticles(val, 'light');
});
linkInputs(temperatureSlider, temperatureInput, (val) => {
    const particleVelocity = parseFloat(temperatureSlider.value);
    targetSpeedMultiplier = Math.pow(2, particleVelocity);
});

function setupThreejs() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    camera = new THREE.PerspectiveCamera(20, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 17;

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('canvas-container').appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}
function setupLights() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.3);
    directionalLight.position.set(5, 5, 5);
    directionalLight2.position.set(-5, -5, -5);

    scene.add(ambientLight);
    scene.add(directionalLight);
    scene.add(directionalLight2);
}

function setupContainer() {
    // No volume change for this simulation because thats going to make all the stuff complex
    const boxGeometry = new THREE.BoxGeometry(boxSize, boxSize, boxSize);
    const edgeGeo = new THREE.EdgesGeometry(boxGeometry);
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
    container = new THREE.LineSegments(edgeGeo, lineMaterial);
    scene.add(container);
}
function createParticles(count, type) {
    const isHeavy = type === 'heavy';

    if (isHeavy) {
        allParticlesH.forEach(p => scene.remove(p.mesh));
        allParticlesH = [];
    }
    else {
        allParticlesL.forEach(p => scene.remove(p.mesh));
        allParticlesL = [];
    }
    const radius = isHeavy ? particleRadiusH : particleRadiusL;
    const color = isHeavy ? 0xffd300 : 0xff0000;
    const massMultiplier = isHeavy ? 1.0 : 2.5;

    const particleGeometry = new THREE.SphereGeometry(radius, 16, 16);
    const particleMaterial = new THREE.MeshPhongMaterial({ color: color });

    for (let i = 0; i < count; i++) {
        const mesh = new THREE.Mesh(particleGeometry, particleMaterial);
        mesh.position.set((Math.random() - 0.5) * (boxSize - 0.2), (Math.random() - 0.5) * (boxSize - 0.2), (Math.random() - 0.5) * (boxSize - 0.2));

        const particle = {
            mesh: mesh,
            type: type,
            radius: radius,
            velocity: new THREE.Vector3((Math.random() - 0.5) * 0.05 * massMultiplier, (Math.random() - 0.5) * 0.05 * massMultiplier, (Math.random() - 0.5) * 0.05 * massMultiplier),
            massMultiplier: massMultiplier
        };
        if (isHeavy) {
            allParticlesH.push(particle);
        } else {
            allParticlesL.push(particle);
        }
        scene.add(mesh);
    }
    allParticles = [...allParticlesH, ...allParticlesL];
}
function updateParticles() {
    const diff = targetSpeedMultiplier - currentSpeedMultiplier;

    if (Math.abs(diff) > 0.0001) {
        currentSpeedMultiplier += diff * speedTransitionRate;
    }
    else {
        currentSpeedMultiplier = targetSpeedMultiplier;
    }

    for (let i = 0; i < allParticles.length; i++) {
        for (let j = i + 1; j < allParticles.length; j++) {
            const p1 = allParticles[i];
            const p2 = allParticles[j];
            const minDistance = p1.radius + p2.radius;
            const dist = p1.mesh.position.distanceTo(p2.mesh.position);
            if (dist < minDistance) {
                const tempVel = p1.velocity.clone();
                p1.velocity.copy(p2.velocity);
                p2.velocity.copy(tempVel);

                const overlap = minDistance - dist;
                const seperationForce = p1.mesh.position.clone().sub(p2.mesh.position).normalize().multiplyScalar(overlap / 2);
                p1.mesh.position.add(seperationForce);
                p2.mesh.position.sub(seperationForce);
            }
        }
    }
    let wallHitsPerFrame = 0;
    let totalImpactForce = 0;


    allParticles.forEach(particle => {
        const massFactor = particle.massMultiplier;
        const direction = particle.velocity.clone().normalize();
        const speed = baseSpeed * currentSpeedMultiplier * massFactor;

        particle.velocity.normalize().multiplyScalar(speed);
        particle.mesh.position.add(particle.velocity);
        const radius = particle.radius;
        const impactForce = speed * massFactor;
        if (letCollisions) {
            if (Math.abs(particle.mesh.position.x) > (boxSize / 2) - radius) {
                particle.velocity.x *= -1;
                particle.mesh.position.x = Math.sign(particle.mesh.position.x) * ((boxSize / 2) - radius);
                wallHitsPerFrame++;
                totalImpactForce += impactForce;
            }
            const staticBounds = boxSize / 2;
            if (Math.abs(particle.mesh.position.y) > (staticBounds - radius)) {
                particle.velocity.y *= -1;
                particle.mesh.position.y = Math.sign(particle.mesh.position.y) * (staticBounds - radius);
                wallHitsPerFrame++;
                totalImpactForce += impactForce;
            }
            // This to the z wall
            if (Math.abs(particle.mesh.position.z) > staticBounds - radius) {
                particle.velocity.z *= -1;
                particle.mesh.position.z = Math.sign(particle.mesh.position.z) * (staticBounds - radius);
                wallHitsPerFrame++;
            }
        }


    });
}
function updateUIElements() {
    //Pressure Calculation for Explosion
    const n = allParticles.length * MOLES_PER_PARTICLE;
    let T = currentSpeedMultiplier * ROOM_TEMP;

    const widthNM = boxSize * 5;
    const heightNM = boxSize * 5;
    const depthNM = boxSize * 5;

    const volume = (widthNM * nmToMeters) * (heightNM * nmToMeters) * (depthNM * nmToMeters);
    currentPressure = (n * R * T) / volume;
    const pressureATM = currentPressure / 101325;
    pressureText.textContent = pressureATM.toFixed(2);
    tempText.textContent = T.toFixed(1);
}
function animate() {
    updateUIElements();
    if (currentPressure > maxPressure) {
        letCollisions = true;
    }
    else{
        letCollisions = false;
    }
    requestAnimationFrame(animate);
    updateParticles();
    controls.update();
    renderer.render(scene, camera);
}
setupThreejs();
setupLights();
setupContainer();
createParticles(parseFloat(heavyParticlesInput.value), 'heavy');
createParticles(parseFloat(lightParticlesInput.value), 'light');
animate();