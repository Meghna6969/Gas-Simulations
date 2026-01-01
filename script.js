import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Constants
const R = 8.314; // Ideal Gas Constant
const Moles_Per_Particle = 1.66e-23;
const nmToMeters = 1e-9;
const ROOM_TEMP = 293;
const boxSize = 3;
const baseSpeed = 0.015;
const particleRadiusH = 0.05;
const particleRadiusL = 0.03;
const speedTransitionRate = 0.0009;
const maxPressure = 200;

// Global Variables
let scene, renderer, camera, controls;
let allParticlesH = [];
let allParticlesL = [];
let allParticles = [];
let isPaused = false;
let elaspedTime = 0;
let containerPressureIntensityIndicator = 0;
let containerGlowIntensity = 0;
let currentBoxBounds = boxSize / 2;
let wallCollisionCount = 0;
let isCountingCollisions = false;
let collisionTimer = 0;
let timeSpeed = 1;
let container;
let tempMode = "relative";
let targetSpeedMultiplier = 1;
let currentSpeedMultiplier = 1.0;
let targetSpecificTemp = ROOM_TEMP;
let currentTemp = ROOM_TEMP;
let currentPressure;
let letCollisions = true;
let isExploded = false;

const amountParticlesSliderH = document.getElementById('amountOfParticlesH');
const amountParticlesSliderL = document.getElementById('amountOfParticlesL');
const tempSlider = document.getElementById('temperatureChange');
const volumeSlider = document.getElementById('volume');
const collisionsCheckBox = document.getElementById('collisionCounter');
const collisionPanel = document.querySelector('.collision-controls-panel');
const wallCollisionCounterText = document.querySelector('.collision-controls-panel h3');
const wallCollisionTimer = document.getElementById('time-elapsed-coll');
const collisionReset = document.getElementById('resetCollBtn');
const collisionStop = document.getElementById('stopCounting');
const pauseButton = document.getElementById('pauseBtn');
const stepButton = document.getElementById('stepBtn');
const resetButton = document.getElementById('resetBtn');
const tempSpecificSlider = document.getElementById('specificTempSlider');
const tempSpecificInput = document.getElementById('specificTempInput');
const resetTempSpecificButton = document.getElementById('resetSpecificTemps');
const startCountingButton = document.getElementById('startCounting');
const stopCountingButton = document.getElementById('stopCounting');
const resetCollButton = document.getElementById('resetCollBtn');
const tempModeSelector = document.querySelectorAll('input[name="tempMode"]');
const relativeSliderGroup = document.getElementById('relative-temp-group');
const specificSliderGroup = document.getElementById('specific-temp-group');
const temperatureUnitSelector = document.getElementById('temperature-unit-select');
const pressureUnitSelector = document.getElementById('pressure-unit-select');
const timeSpeedSlider = document.getElementById('timeSpeed');
const warningPanel = document.getElementById('warning-panel');
const resetPressureBtn = document.getElementById('reset-pressure');
const pressureText = document.getElementById('pressure-display');
const tempText = document.getElementById('temp-display');

tempSlider.addEventListener('mouseup', function () {
    tempSlider.value = 0;
    targetSpeedMultiplier = 1;
    updateHeatOrCold(0);
});
pauseButton.addEventListener('click', () => {
    isPaused = !isPaused;
    pauseButton.textContent = isPaused ? '▶' : '||';
});
resetButton.addEventListener('click', () => {
    elaspedTime = 0;
    updateTimeDisplay();
});
volumeSlider.addEventListener('input', function () {
    const newWidth = parseFloat(volumeSlider.value);
    updateContainer(newWidth);
});
amountParticlesSliderH.addEventListener('input', function () {
    createParticles(parseFloat(amountParticlesSliderH.value), 'heavy');
});
amountParticlesSliderL.addEventListener('input', function () {
    createParticles(parseFloat(amountParticlesSliderL.value), 'light');
});
tempSlider.addEventListener('input', function () {
    const particleVelocity = parseFloat(tempSlider.value);
    targetSpeedMultiplier = Math.pow(2, particleVelocity);
    updateHeatOrCold(particleVelocity);
});
resetTempSpecificButton.addEventListener('click', function () {
    updateSpecificTemp(ROOM_TEMP);
    currentSpeedMultiplier = 1;
    tempSpecificSlider.value = ROOM_TEMP;
    tempSpecificInput.value = ROOM_TEMP;
    clariText.style.color = 'white';
    clariText.textContent = 'No change in temperature!';
    updateHeatOrCold(0);
});
startCountingButton.addEventListener('click', () => {
    isCountingCollisions = true;
    wallCollisionCount = 0;
    collisionTimer = 0;
});
stopCountingButton.addEventListener('click', () => {
    isCountingCollisions = false;
});
resetCollButton.addEventListener('click', () => {
    wallCollisionCount = 0;
    collisionTimer = 0;
});
stepButton.addEventListener('click', () => {
    if (isPaused) {
        updateParticles();
        elaspedTime += 0.01 * timeSpeed;
        updateTimeDisplay();
    }
});
timeSpeedSlider.addEventListener('input', () => {
    timeSpeed = parseFloat(timeSpeedSlider.value);
});
resetPressureBtn.addEventListener('click', () => {
    warningPanel.style.display = 'none';
    isExploded = false;
    letCollisions = true;
    containerPressureIntensityIndicator = 0;
    createParticles(parseFloat(amountParticlesSliderH.value), 'heavy');
    createParticles(parseFloat(amountParticlesSliderL.value), 'light');

    updateHeatOrCold(0);
})
// Temperature slider type
tempModeSelector.forEach(radio => {
    radio.addEventListener('change', (e) => {
        tempMode = e.target.value;
        if (tempMode === 'relative') {
            relativeSliderGroup.style.display = 'flex';
            specificSliderGroup.style.display = 'none';
            targetSpeedMultiplier = Math.pow(2, parseFloat(tempSlider.value));
        }
        else {
            relativeSliderGroup.style.display = 'none';
            specificSliderGroup.style.display = 'flex';
            updateSpecificTemp(tempSpecificSlider.value);
        }
    })
});
function updateSpecificTemp(kelvin) {
    console.log('HERE IN THE SPECIFIC THING');
    targetSpecificTemp = kelvin;
    updateHeatOrCold(kelvin);
    targetSpeedMultiplier = kelvin / ROOM_TEMP; //divide by room temp so that you get the multiplier required to reach a certain temp
}
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
function setupObjects() {
    const boxGeometry = new THREE.BoxGeometry(boxSize, boxSize, boxSize);
    const edgeGeo = new THREE.EdgesGeometry(boxGeometry);
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 5 });
    container = new THREE.LineSegments(edgeGeo, lineMaterial);
    scene.add(container);
}
function setupLights() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    scene.add(ambientLight);
    const directionLight = new THREE.DirectionalLight(0xffffff, 2);
    directionLight.position.set(5, 5, 5);
    scene.add(directionLight);
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
    // change in the velocity and physics logic

    const radius = isHeavy ? particleRadiusH : particleRadiusL;
    const color = isHeavy ? 0xffd300 : 0xff0000;
    const massMultiplier = isHeavy ? 1.0 : 2.5;

    const particleGeometry = new THREE.SphereGeometry(radius, 16, 16);
    const particleMaterial = new THREE.MeshPhongMaterial({ color: color });

    for (let i = 0; i < count; i++) {
        const mesh = new THREE.Mesh(particleGeometry, particleMaterial);
        mesh.position.set((Math.random() - 0.5) * (boxSize - 0.2), (Math.random() - 0.5) * (boxSize - 0.2), (Math.random() - 0.5) * (boxSize - 0.2));
        // New type particle with more information this will be useful when we do the kinetic energy velocity equation thingie
        const particle = {
            mesh: mesh,
            type: type,
            radius: radius,
            velocity: new THREE.Vector3((Math.random() - 0.5) * 0.05 * massMultiplier, (Math.random() - 0.5) * 0.05 * massMultiplier, (Math.random() - 0.5) * 0.05 * massMultiplier),
            massMultiplier: massMultiplier
        };
        if (isHeavy) {
            allParticlesH.push(particle);
        }
        else {
            allParticlesL.push(particle);
        }
        scene.add(mesh);
    }
    // who invented this notation lol what the heck; anyway combining both the arrays
    allParticles = [...allParticlesH, ...allParticlesL];

}
function updateParticles(timeScale = 1) {
    const diff = targetSpeedMultiplier - currentSpeedMultiplier;

    if (Math.abs(diff) > 0.0001) {
        const step = speedTransitionRate * timeScale;
        if (Math.abs(diff) < step) {
            currentSpeedMultiplier = targetSpeedMultiplier;
        } else {
            currentSpeedMultiplier += Math.sign(diff) * step;
        }
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
                const seperateOverlaps = p1.mesh.position.clone().sub(p2.mesh.position).normalize().multiplyScalar(overlap / 2);
                p1.mesh.position.add(seperateOverlaps);
                p2.mesh.position.sub(seperateOverlaps);
            }
        }
    }
    let wallHitsPerFrame = 0;
    let totalImpactForce = 0;

    allParticles.forEach(particle => {
        const massFactor = particle.massMultiplier;
        const direction = particle.velocity.clone().normalize();
        const speed = baseSpeed * currentSpeedMultiplier * massFactor;

        // Normalizing speed we dont need things flying off 
        particle.velocity.normalize().multiplyScalar(speed);
        particle.mesh.position.add(particle.velocity);
        const radius = particle.radius;
        // Kinda improvising here; I know the actual force equation is P*A, but its only for visualization
        const impactForce = speed * massFactor;
        // Hit to the x wall
        if (letCollisions) {
            if (Math.abs(particle.mesh.position.x) > currentBoxBounds - radius) {
                particle.velocity.x *= -1;
                particle.mesh.position.x = Math.sign(particle.mesh.position.x) * (currentBoxBounds - radius);
                wallHitsPerFrame++;
                totalImpactForce += impactForce;
                if (isCountingCollisions) wallCollisionCount++;
            }
            //This to the y wall
            const staticBounds = boxSize / 2;
            if (Math.abs(particle.mesh.position.y) > (staticBounds - radius)) {
                particle.velocity.y *= -1;
                particle.mesh.position.y = Math.sign(particle.mesh.position.y) * (staticBounds - radius);
                wallHitsPerFrame++;
                totalImpactForce += impactForce;
                if (isCountingCollisions) wallCollisionCount++;
            }
            // This to the z wall
            if (Math.abs(particle.mesh.position.z) > staticBounds - radius) {
                particle.velocity.z *= -1;
                particle.mesh.position.z = Math.sign(particle.mesh.position.z) * (staticBounds - radius);
                wallHitsPerFrame++;
                if (isCountingCollisions) wallCollisionCount++;
            }
        }



        // Some visual feedback for pressure so users know how the pressure is drastically increased
        if (wallHitsPerFrame > 0) {
            const wallCollisionIntensity = Math.log10(wallHitsPerFrame + 1) * 0.3;
            const forceIntensity = totalImpactForce * 0.5;
            containerPressureIntensityIndicator = Math.min(1, containerPressureIntensityIndicator + wallCollisionIntensity + forceIntensity);
            containerGlowIntensity = Math.min(1, containerGlowIntensity + containerPressureIntensityIndicator * 2);
        }
    });
}
function updateHeatOrCold(intensity) {
    const vignette = document.getElementById('heat-or-cold');
    const clariText = document.getElementById('clarificationText');
    //radial-gradient(circle at center, transparent 10%, rgba(0, 123, 255, 0.3), transparent 50%);
    //radial-gradient(circle at center, transparent 10%, rgba(255, 0, 0, 0.3), transparent 50%);
    if (tempMode === 'relative') {
        if (targetSpeedMultiplier > 1) {
            vignette.style.background = 'radial-gradient(circle at center, transparent 10%, rgba(255, 0, 0, 0.4), transparent 70%)';
            clariText.style.color = 'red';
            clariText.textContent = 'Heating the container!';
        }
        else if (targetSpeedMultiplier === 1) {
            clariText.style.color = 'white';
            clariText.textContent = 'No change in temperature!';
        }
        else {
            vignette.style.background = 'radial-gradient(circle at center, transparent 10%, rgba(0, 123, 255, 0.4), transparent 70%)';
            clariText.style.color = 'cyan';
            clariText.textContent = 'Cooling the container!';
        }
    }
    else {
        if (targetSpecificTemp > currentTemp) {
            vignette.style.background = 'radial-gradient(circle at center, transparent 10%, rgba(255, 0, 0, 0.4), transparent 70%)';
            clariText.style.color = 'red';
            clariText.textContent = 'Heating the container!';
        }
        else if (targetSpecificTemp === currentTemp) {
            clariText.style.color = 'white';
            clariText.textContent = 'No change in temperature!';
        }
        else {
            vignette.style.background = 'radial-gradient(circle at center, transparent 10%, rgba(0, 123, 255, 0.4), transparent 70%)';
            clariText.style.color = 'cyan';
            clariText.textContent = 'Cooling the container!';
        }
    }

    vignette.style.opacity = Math.abs(intensity) * 0.5;

}
function updateContainer(size) {
    container.scale.x = size / boxSize;
    currentBoxBounds = size / 2;
    allParticles.forEach(particle => {
        if (Math.abs(particle.mesh.position.x) > currentBoxBounds - 0.1) {
            particle.mesh.position.x = Math.sign(particle.mesh.position.x) * (currentBoxBounds - 0.1);
        }
    });
}
function updateUIElements() {
    const n = allParticles.length * Moles_Per_Particle;
    let T = currentSpeedMultiplier * ROOM_TEMP;
    currentTemp = T;
    //const V = parseFloat(volumeSlider.value) * boxSize * boxSize;

    const widthNM = parseFloat(volumeSlider.value) * 5;
    const heightNM = boxSize * 5;
    const depthNM = boxSize * 5;

    const volume = (widthNM * nmToMeters) * (heightNM * nmToMeters) * (depthNM * nmToMeters);

    const pressurePa = (n * R * T) / volume;
    const pressureATM = pressurePa / 101325;
    currentPressure = pressureATM;

    let displayPressure = 0;
    const pUnit = pressureUnitSelector.value;
    if(pUnit === 'atm'){
        displayPressure = pressureATM;
    } else if(pUnit === 'kPa'){
        displayPressure = pressurePa / 1000;
    } else if(pUnit === 'Pa'){
        displayPressure = pressurePa;
    } else if(pUnit === 'psi'){
        displayPressure = pressureATM * 14.696;
    }

    let displayTemperature = 0;
    const tUnit = temperatureUnitSelector.value;
    if(tUnit === 'K'){
        displayTemperature = T;
    } else if(tUnit === 'C'){
        displayTemperature = T - 273.15;
    } else if(tUnit === 'F'){
        displayTemperature = (T - 273.15) * (9 / 5) + 32;
    }
    //console.log(pressure);
    pressureText.textContent = displayPressure.toFixed(3);
    tempText.textContent = displayTemperature.toFixed(0);

    let displayHeavyParticles = allParticlesH.length * Moles_Per_Particle;
    let displayLightParticles = allParticlesL.length * Moles_Per_Particle;
    document.getElementById('heavy-particles-display').textContent = displayHeavyParticles.toExponential(2);
    document.getElementById('light-particles-display').textContent = displayLightParticles.toExponential(2);
}
function updateInputs(sliderId, inputId, callback) {
    const slider = document.getElementById(sliderId);
    const input = document.getElementById(inputId);

    slider.addEventListener('input', () => {
        input.value = slider.value;
        callback(parseFloat(slider.value))
    });
    input.addEventListener('input', () => {
        slider.value = input.value;
        callback(parseFloat(input.value));
    });
}
function updateTimeDisplay() {
    document.getElementById('time-elapsed').textContent = elaspedTime.toFixed(2);
}
function animate() {
    containerPressureIntensityIndicator *= 0.8;
    // Maybe try something pulsing maybe like the more the particles hit the bigger the pulse
    // Like those music visualalizers; <- Work on this tomorrow GN.
    containerGlowIntensity *= 0.90;
    let targetColor;
    if (containerPressureIntensityIndicator < 0.3) {
        targetColor = new THREE.Color(0xffffff).lerp(new THREE.Color(0xffff00), containerPressureIntensityIndicator * 3.33);
    }
    else if (containerPressureIntensityIndicator < 0.6) {
        targetColor = new THREE.Color(0xffff00).lerp(new THREE.Color(0xff8800), (containerPressureIntensityIndicator - 0.3) * 3.33);
    } else {
        targetColor = new THREE.Color(0xff8800).lerp(new THREE.Color(0xff0000), (containerPressureIntensityIndicator - 0.6) * 2.5);
    }
    container.material.color.copy(targetColor);
    container.material.opacity = 0.5 + (containerGlowIntensity * 0.5);

    if (collisionsCheckBox.checked) {
        collisionPanel.style.display = 'flex';
    }
    else {
        collisionPanel.style.display = 'none';
    }
    wallCollisionCounterText.textContent = wallCollisionCount;
    if (isCountingCollisions && !isPaused) {
        collisionTimer += 0.016 * timeSpeed;
    }
    wallCollisionTimer.textContent = collisionTimer.toFixed(2);

    if (isCountingCollisions) {
        collisionReset.disabled = true;
        collisionStop.disabled = false;
    }
    else {
        collisionReset.disabled = false;
        collisionStop.disabled = true;
    }

    if (!isPaused) {
        stepButton.disabled = true;
        const maxStepSize = 1;
        const totalSteps = Math.ceil(timeSpeed / maxStepSize);
        const dtPerStep = timeSpeed / totalSteps;

        for (let i = 0; i < totalSteps; i++) {
            updateParticles(dtPerStep);
            elaspedTime += 0.01 * dtPerStep;

            if (isCountingCollisions) {
                collisionTimer += 0.01 * dtPerStep;
            }
        }
        if (typeof updateTimeDisplay === 'function') {
            updateTimeDisplay();
        }
        if (typeof updateUIElements === 'function') {
            updateUIElements();
        }
        if (isCountingCollisions) {
            wallCollisionCounterText.innerText = `Collisions: ${wallCollisionCount}`;
        }
        if (wallCollisionTimer && isCountingCollisions) {
            wallCollisionTimer.innerText = collisionTimer.toFixed(2) + "s";
        }
    } else {
        stepButton.disabled = false;
    }
    if(currentPressure >= maxPressure && !isExploded){
        isExploded = true;
        letCollisions = false;
        warningPanel.style.display = 'flex';
    }
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

setupThreejs();
setupObjects();
setupLights();
updateInputs('amountOfParticlesH', 'particleNumDisplayH', (val) => {
    createParticles(val, 'heavy');
});
updateInputs('amountOfParticlesL', 'particleNumDisplayL', (val) => {
    createParticles(val, 'light');
});
updateInputs('volume', 'volumeDisplay', (val) => {
    updateContainer(val);
});
updateInputs('specificTempSlider', 'specificTempInput', (val) => {
    updateSpecificTemp(val);
});
updateInputs('timeSpeed', 'timeSpeedDisplay', (val) => {
    timeSpeed = val;
    document.getElementById('speedMultiplierText').textContent = val.toFixed(1);
});
createParticles(parseFloat(amountParticlesSliderH.value), 'heavy');
createParticles(parseFloat(amountParticlesSliderL.value), 'light');
warningPanel.style.display = 'none';
animate();