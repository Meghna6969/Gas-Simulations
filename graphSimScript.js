import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

//Constants
const R = 8.314; // Ideal Gas Constant
const MOLES_PER_PARTICLE = 1.66e-22;
const nmToMeters = 1e-9;
const ROOM_TEMP = 293;
const stepSize = 0.0009;
const boxSize = 3;
const particleRadiusH = 0.05;
const particleRadiusL = 0.03;
const heavyParticleMass = 3;
const lightParticleMass = 1;
const maxPressure = 300;
const SIMULATION_TO_METERS = (boxSize * 10 * nmToMeters);
const REFERENCE_MAX_SPEED = 0.2;
const REFERENCE_MAX_KE = 0.02;
const GRAVITY = 0.005;
const holeSize = 1;


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
let frameCount = 0;
let simSpeed = 1;
let isPaused = false;
let isGravityStratOn = false;
let isEffusioning = false;
let holeMesh;
let hasExploded = false;

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
const warningPanel = document.getElementById('warning-panel');
const warningResetBtn = document.getElementById('reset-Sim');
const timeSpeedSlider = document.getElementById('timeSpeed');
const timeSpeedInput = document.getElementById('timeSpeedDisplay');
const speedMultiplierText = document.getElementById('speedMultiplierText');
const pauseButton = document.getElementById('pauseBtn');
const stepButton = document.getElementById('stepBtn');
const gravityStratCheckbox = document.getElementById('gravityCheck');
const effusionCheckbox = document.getElementById('effusionCheck');


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
    const safeTemp = Math.max(val, 0.1);

    targetSpeedMultiplier = Math.sqrt(val / ROOM_TEMP);
});
linkInputs(timeSpeedSlider, timeSpeedInput, (val) => {
    simSpeed = val;
    speedMultiplierText.innerText = val.toFixed(1);
});
pauseButton.addEventListener('click', () => {
    isPaused = !isPaused;
    pauseButton.textContent = isPaused ? "▶︎" : "||";
});
stepButton.addEventListener('click', () => {
    if (isPaused) {
        updateParticles();
        updateUIElements();
    }
});
gravityStratCheckbox.addEventListener('change', (e) => {
    isGravityStratOn = e.target.checked;
});
effusionCheckbox.addEventListener('change', (e) => {
    isEffusioning = e.target.checked;
    holeMesh.visible = isEffusioning;
})

warningResetBtn.addEventListener('click', () => {
    heavyParticlesInput.value = 150;
    heavyParticlesSlider.value = 150;
    lightParticlesInput.value = 150;
    lightParticlesSlider.value = 150;
    targetSpeedMultiplier = 1;
    currentSpeedMultiplier = 1;
    createParticles(150, 'heavy');
    createParticles(150, 'light');
    temperatureInput.value = ROOM_TEMP;
    temperatureSlider.value = ROOM_TEMP;

    hasExploded = false;
    warningPanel.style.display

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
    const massMultiplier = isHeavy ? heavyParticleMass : lightParticleMass;

    const particleGeometry = new THREE.SphereGeometry(radius, 16, 16);
    const particleMaterial = new THREE.MeshPhongMaterial({ color: color });

    for (let i = 0; i < count; i++) {
        const mesh = new THREE.Mesh(particleGeometry, particleMaterial);
        mesh.position.set((Math.random() - 0.5) * (boxSize - 0.2), (Math.random() - 0.5) * (boxSize - 0.2), (Math.random() - 0.5) * (boxSize - 0.2));

        const particle = {
            mesh: mesh,
            type: type,
            radius: radius,
            velocity: new THREE.Vector3((Math.random() - 0.5) * 0.05 * Math.sqrt(massMultiplier), (Math.random() - 0.5) * 0.05 * Math.sqrt(massMultiplier), (Math.random() - 0.5) * 0.05 * Math.sqrt(massMultiplier)),
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
    const oldMultiplier = currentSpeedMultiplier;
    if (currentSpeedMultiplier < targetSpeedMultiplier) {
        currentSpeedMultiplier += stepSize;
        if (currentSpeedMultiplier > targetSpeedMultiplier) {
            currentSpeedMultiplier = targetSpeedMultiplier;
        }
    } else if (currentSpeedMultiplier > targetSpeedMultiplier) {
        currentSpeedMultiplier -= stepSize;
        if (currentSpeedMultiplier < targetSpeedMultiplier) {
            currentSpeedMultiplier = targetSpeedMultiplier;
        }
    }
    let scaleFactor = 1;
    if (oldMultiplier !== 0) {
        scaleFactor = currentSpeedMultiplier / oldMultiplier;
    }

    for (let i = 0; i < allParticles.length; i++) {
        for (let j = i + 1; j < allParticles.length; j++) {
            const p1 = allParticles[i];
            const p2 = allParticles[j];
            const minDistance = p1.radius + p2.radius;
            const dist = p1.mesh.position.distanceTo(p2.mesh.position);

            if (dist < minDistance) {
                const normal = p1.mesh.position.clone().sub(p2.mesh.position).normalize();
                const relativeVel = p1.velocity.clone().sub(p2.velocity);
                const velocityAlongNormal = relativeVel.dot(normal);

                if (velocityAlongNormal > 0) continue;
                const m1 = p1.massMultiplier;
                const m2 = p2.massMultiplier;
                const impulse = (2 * velocityAlongNormal) / (m1 + m2);

                p1.velocity.sub(normal.clone().multiplyScalar(impulse * m2));
                p2.velocity.add(normal.clone().multiplyScalar(impulse * m1));

                const overlap = minDistance - dist;
                const seperation = normal.multiplyScalar(overlap / 2);
                p1.mesh.position.add(seperation);
                p2.mesh.position.sub(seperation);
            }
        }
    }
    let wallHitsPerFrame = 0;
    let totalImpactForce = 0;


    allParticles.forEach(particle => {
        //const massFactor = particle.massMultiplier;
        //const direction = particle.velocity.clone().normalize();
        //const speed = baseSpeed * currentSpeedMultiplier * massFactor;

        //particle.velocity.normalize().multiplyScalar(speed);
        particle.velocity.multiplyScalar(scaleFactor);

        if (isGravityStratOn) {
            particle.velocity.y -= GRAVITY * simSpeed;
        }
        const movementStep = particle.velocity.clone().multiplyScalar(simSpeed);
        particle.mesh.position.add(movementStep);

        if (!hasExploded) {
            const radius = particle.radius;
            const currentSpeed = particle.velocity.length();
            const impactForce = currentSpeed * particle.massMultiplier;
            const bound = boxSize / 2;
            const limit = bound - radius;
            if (letCollisions) {
                if (particle.mesh.position.x > limit) {
                    let escaped = false;
                    if (isEffusioning) {
                        const distSquared = (particle.mesh.position.y * particle.mesh.position.y) + (particle.mesh.position.z * particle.mesh.position.z);
                        if (distSquared < (holeSize * holeSize)) {
                            escaped = true;
                        }
                    }
                    if (!escaped) {
                        particle.velocity.x *= -1;
                        particle.mesh.position.x = limit;
                        wallHitsPerFrame++;
                        totalImpactForce += impactForce;
                    }
                }
                else if (particle.mesh.position.x < -limit) {
                    particle.velocity.x *= -1;
                    particle.mesh.position.x = -limit;
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
        }


    });

    // BasicallY deleting particles that escaped the box
    // For Memory you could keep this block but for cool effects you could remove it
    const escapedLimit = (boxSize / 2) + 0.5;
    let needsRebuild = false;
    const isGone = (p) => p.mesh.position.x > escapedLimit;

    // For heavy Particles
    for (let i = allParticlesH.length - 1; i >= 0; i--) {
        if (isGone(allParticlesH[i])) {
            scene.remove(allParticlesH[i].mesh);
            allParticlesH[i].mesh.geometry.dispose();
            allParticlesH[i].mesh.material.dispose();
            allParticlesH.splice(i, 1);
            needsRebuild = true;
        }
    }
    // For Light Particles
    for (let i = allParticlesL.length - 1; i >= 0; i--) {
        if (isGone(allParticlesL[i])) {
            scene.remove(allParticlesL[i].mesh);
            allParticlesL[i].mesh.geometry.dispose();
            allParticlesL[i].mesh.material.dispose();
            allParticlesL.splice(i, 1);
            needsRebuild = true;
        }
    }
    if (needsRebuild) {
        allParticles = [...allParticlesH, ...allParticlesL];
    }
    //allParticles = [...allParticlesH, ...allParticlesL];

}
function updateUIElements() {
    // Average Speed Calculation
    if (allParticlesH.length > 0) {
        const totalSpeedH = allParticlesH.reduce((sum, p) => sum + p.velocity.length(), 0);
        const avgSpeedH = (totalSpeedH / allParticlesH.length) * SIMULATION_TO_METERS * 60;
        avgSpeedHeavyText.innerHTML = `<span style="font-size: 1.15em;">🟡</span> ${avgSpeedH.toExponential(2)} m/s`;
    }
    else {
        avgSpeedHeavyText.innerHTML = `<span style="font-size: 1.15em;">‎🟡</span>‎ ‎  -- m/s`;
    }
    if (allParticlesL.length > 0) {
        const totalSpeedL = allParticlesL.reduce((sum, p) => sum + p.velocity.length(), 0);
        const avgSpeedL = (totalSpeedL / allParticlesL.length) * SIMULATION_TO_METERS * 60;
        avgSpeedLightText.innerHTML = `<span style="font-size: 0.8em;">‎ 🔴</span>‎ ‎ ${avgSpeedL.toExponential(2)} m/s`;
    }
    else {
        avgSpeedLightText.innerHTML = `<span style="font-size: 0.8em;">‎ 🔴</span>‎ ‎ -- m/s`;
    }

    //Pressure Calculation for Explosion
    const n = allParticles.length * MOLES_PER_PARTICLE;
    let T = Math.pow(currentSpeedMultiplier, 2) * ROOM_TEMP;

    const scaleFactor = 10;
    const sideMeters = (boxSize * scaleFactor) * nmToMeters;
    const volume = Math.pow(sideMeters, 3);
    const pressure = (n * R * T) / volume;
    currentPressure = pressure / 101325;
    pressureText.textContent = currentPressure.toFixed(2);
    tempText.textContent = T.toFixed(1);
    frameCount++;
    if (frameCount % 10 === 0) {
        updateSpeedGraph();
        updateKEGraph();
    }
}
function createHistograms(particles, property, numBins, forcedMin, forcedMax) {
    if (particles.length === 0) return { bins: [], counts: [] };

    const values = particles.map(p => {
        if (property === 'speed') {
            return p.velocity.length();
        } else if (property === 'ke') {
            const v = p.velocity.length();
            return 0.5 * p.massMultiplier * v * v;
        }
        else {
            // do nothing
            // intentionally left blank so that any input other than above return an error
        }
    });

    const minVal = forcedMin;
    const maxVal = forcedMax;
    const range = maxVal - minVal;
    const binWidth = range / numBins;

    const bins = [];
    const counts = new Array(numBins).fill(0);

    for (let i = 0; i < numBins; i++) {
        bins.push(minVal + i * binWidth);
    }
    values.forEach(val => {
        const binIndex = Math.floor((val - minVal) / binWidth);
        if (binIndex >= numBins) binIndex = numBins - 1;
        if (binIndex < 0) binIndex = 0;

        counts[binIndex]++;
    });

    return { bins, counts };

}
function drawGraph(canvasId, heavyData, lightData, xlabel) {
    const canvas = document.getElementById(canvasId);

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);
    const maxCount = Math.max(...heavyData.counts, ...lightData.counts, 1);

    const padding = 40;
    const graphWidth = width - 2 * padding;
    const graphHeight = height - 2 * padding;

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();

    // Draw Heavy Particles
    if (heavyData.bins.length > 0) {
        ctx.fillStyle = 'rgba(255, 211, 0, 0.6)';
        const binWidth = graphWidth / heavyData.bins.length;

        heavyData.counts.forEach((count, i) => {
            const barHeight = (count / maxCount) * graphHeight;
            const x = padding + i * binWidth;
            const y = height - padding - barHeight;
            ctx.fillRect(x, y, binWidth * 0.9, barHeight);
        });
    }
    if (lightData.bins.length > 0) {
        ctx.fillStyle = 'rgba(255, 0, 0, 0.6)';
        const binWidth = graphWidth / lightData.bins.length;

        lightData.counts.forEach((count, i) => {
            const barHeight = (count / maxCount) * graphHeight;
            const x = padding + i * binWidth;
            const y = height - padding - barHeight;
            ctx.fillRect(x, y, binWidth * 0.9, barHeight);
        });
    }
    //Draw label
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(xlabel, width / 2, height - 10);

    ctx.save();
    ctx.translate(15, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Count', 0, 0);
    ctx.restore();
}
function updateSpeedGraph() {
    const numBins = 30;
    let maxSpeed = 0;
    allParticles.forEach(p => {
        const s = p.velocity.length();
        if (s > maxSpeed) maxSpeed = s;
    });

    const globalMax = Math.max(maxSpeed * 1.1, REFERENCE_MAX_SPEED);

    const heavyData = createHistograms(allParticlesH, 'speed', numBins, 0, globalMax);
    const lightData = createHistograms(allParticlesL, 'speed', numBins, 0, globalMax);
    drawGraph('speed-canvas', heavyData, lightData, 'Speed');
}
function updateKEGraph() {
    const numBins = 30;
    let maxKE = 0;
    allParticles.forEach(p => {
        const v = p.velocity.length();
        const ke = 0.5 * p.massMultiplier * v * v;
        if (ke > maxKE) maxKE = ke;
    });
    const globalMax = Math.max(maxKE * 1.1, REFERENCE_MAX_KE);
    const heavyData = createHistograms(allParticlesH, 'ke', numBins, 0, globalMax);
    const lightData = createHistograms(allParticlesL, 'ke', numBins, 0, globalMax);
    drawGraph('ke-canvas', heavyData, lightData, 'Kinetic Energy');
}
function createHoleVisual() {
    const geometry = new THREE.EdgesGeometry(new THREE.CircleGeometry(holeSize, 32));
    const material = new THREE.LineBasicMaterial({ color: 0xff0000 });
    holeMesh = new THREE.LineSegments(geometry, material);
    holeMesh.position.set(boxSize / 2, 0, 0);
    holeMesh.rotation.y = Math.PI / 2;
    holeMesh.visible = false;
    scene.add(holeMesh);
}
function animate() {
    if (isEffusioning) {
        console.log(isEffusioning);
        heavyParticlesSlider.value = allParticlesH.length;
        heavyParticlesInput.value = allParticlesH.length;
        lightParticlesInput.value = allParticlesL.length;
        lightParticlesSlider.value = allParticlesL.length;
    }

    if (!isPaused) {
        stepButton.disabled = true;
        updateParticles();
        updateUIElements();
    }
    else {
        stepButton.disabled = false;
    }
    if(currentPressure > maxPressure || hasExploded){
        if(!hasExploded){
            hasExploded = true;
            if(holeMesh) {
                holeMesh.visible = false;
                console.log("Explosion");
            }
            warningPanel.style.display = 'flex';
        }
    }else{
        warningPanel.style.display = 'none';
        if(isEffusioning && holeMesh) {
            holeMesh.visible = true;
        }
    }
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}
setupThreejs();
setupLights();
setupContainer();
createHoleVisual();
createParticles(parseFloat(heavyParticlesInput.value), 'heavy');
createParticles(parseFloat(lightParticlesInput.value), 'light');
animate();