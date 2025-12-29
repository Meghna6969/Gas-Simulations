import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Global Variables
let scene, renderer, camera, controls;
let allParticles = [];
let isPaused = false;
let elaspedTime = 0;
const boxSize = 3;
const baseSpeed = 0.015;
let currentBoxBounds = boxSize / 2;
const particleRadius = 0.05;

// Making everything physically accurate
const R = 8.314; // Ideal Gas Constant
const Moles_Per_Particle = 1.66e-23;
const nmToMeters = 1e-9;
const ROOM_TEMP = 293.15; 


let container;
let tempMode = "relative";
let targetSpecificTemp = ROOM_TEMP; // Room temperature heat

let targetSpeedMultiplier = 1;
let currentSpeedMultiplier = 1.0;
const speedTransitionRate = 0.0009;



const amountParticlesSlider = document.getElementById('amountOfParticles');
const tempSlider = document.getElementById('temperatureChange');
const volumeSlider = document.getElementById('volume');

tempSlider.addEventListener('mouseup', function() {
    tempSlider.value = 0;
    targetSpeedMultiplier = 1;
    updateHeatOrCold(0);
});
document.getElementById('pauseBtn').addEventListener('click', () => {
    isPaused = !isPaused;
    document.getElementById('pauseBtn').textContent = isPaused ? '▶' : '||';
});
document.getElementById('stepBtn').addEventListener('click', () => {
    if(isPaused){
        updateParticles();
        elaspedTime += 0.01;
        updateTimeDisplay();
    }
});
document.getElementById('resetBtn').addEventListener('click', () => {
    elaspedTime = 0;
    updateTimeDisplay();
})
volumeSlider.addEventListener('input', function(){
    const newWidth = parseFloat(volumeSlider.value);
    updateContainer(newWidth);
})
amountParticlesSlider.addEventListener('input', function() {
    createParticles(parseFloat(amountParticlesSlider.value));
});
tempSlider.addEventListener('input', function() {
    const particleVelocity = parseFloat(tempSlider.value);
    targetSpeedMultiplier = Math.pow(2, particleVelocity);
    updateHeatOrCold(particleVelocity);
});
document.getElementById('resetSpecificTemps').addEventListener('input', function(){
    targetSpecificTemp 
})

// Temperature slider type
document.querySelectorAll('input[name="tempMode"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        tempMode = e.target.value;
        const relativeSlider = document.getElementById('relative-temp-group');
        const specificSlider = document.getElementById('specific-temp-group');

        if(tempMode === 'relative'){
            relativeSlider.style.display = 'flex';
            specificSlider.style.display = 'none';
            targetSpeedMultiplier = Math.pow(2, parseFloat(tempSlider.value));
        }
        else{
            relativeSlider.style.display = 'none';
            specificSlider.style.display = 'flex';
            updateSpecificTemp(parseFloat(document.getElementById('specificTempSlider').value));
        }
    })
});
function updateSpecificTemp(kelvin){
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
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
    container = new THREE.LineSegments(edgeGeo, lineMaterial);
    scene.add(container);
}
function setupLights(){
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    const directionLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionLight.position.set(5, 5, 5);
    scene.add(directionLight);
}
function createParticles(count){
    allParticles.forEach(p => scene.remove(p.mesh));
    allParticles = [];
    const particleGeometry = new THREE.SphereGeometry(particleRadius, 16, 16);
    const particleMaterial = new THREE.MeshPhongMaterial({
        color: 0x00ff88
    });
    for(let i = 0; i < count; i++){
        const mesh = new THREE.Mesh(particleGeometry, particleMaterial);
        mesh.position.set((Math.random() - 0.5) * (boxSize - 0.2), (Math.random() - 0.5) * (boxSize - 0.2), (Math.random() - 0.5) * (boxSize - 0.2));
        const particle = {
            mesh: mesh,
            velocity: new THREE.Vector3((Math.random() - 0.5) * 0.05, (Math.random() - 0.5) * 0.05, (Math.random() - 0.5) * 0.05)
        };
        allParticles.push(particle);
        scene.add(mesh);
    }
}
function updateParticles(){
    currentSpeedMultiplier += (targetSpeedMultiplier - currentSpeedMultiplier) * speedTransitionRate;

    for(let i = 0; i < allParticles.length; i++){
        for(let j = i + 1; j < allParticles.length; j++){
            const p1 = allParticles[i];
            const p2 = allParticles[j];

            const dist = p1.mesh.position.distanceTo(p2.mesh.position);
            if(dist < particleRadius * 2){
                const tempVel = p1.velocity.clone();
                p1.velocity.copy(p2.velocity);
                p2.velocity.copy(tempVel);

                const overlap = particleRadius * 2 - dist;
                const seperateOverlaps = p1.mesh.position.clone().sub(p2.mesh.position).normalize().multiplyScalar(overlap / 2);
                p1.mesh.position.add(seperateOverlaps);
                p2.mesh.position.sub(seperateOverlaps);
            }
        }
    }
    allParticles.forEach(particle => {
       const direction = particle.velocity.clone().normalize();
       const speed = baseSpeed * currentSpeedMultiplier;
       particle.velocity.copy(direction.multiplyScalar(speed));

       particle.mesh.position.add(particle.velocity);

        if(Math.abs(particle.mesh.position.x) > currentBoxBounds - 0.1){
            particle.velocity.x *= -1;
            particle.mesh.position.x = Math.sign(particle.mesh.position.x) * (currentBoxBounds - 0.1);
        }
        const staticBounds = boxSize / 2;
        if(Math.abs(particle.mesh.position.y) > staticBounds - 0.1){
            particle.velocity.y *= -1;
            particle.mesh.position.y = Math.sign(particle.mesh.position.y) * (staticBounds - 0.1);
        }
        if(Math.abs(particle.mesh.position.z) > staticBounds - 0.1){
            particle.velocity.z *= -1;
            particle.mesh.position.z = Math.sign(particle.mesh.position.z) * (staticBounds - 0.1);
        }
    });
}
function updateHeatOrCold(intensity){
    const vignette = document.getElementById('heat-or-cold');
    const clariText = document.getElementById('clarificationText');
    //radial-gradient(circle at center, transparent 10%, rgba(0, 123, 255, 0.3), transparent 50%);
    //radial-gradient(circle at center, transparent 10%, rgba(255, 0, 0, 0.3), transparent 50%);
    if(tempMode === 'relative'){
        
    }
    if(targetSpeedMultiplier > 1){
        vignette.style.background = 'radial-gradient(circle at center, transparent 10%, rgba(255, 0, 0, 0.4), transparent 70%)';
        clariText.style.color = 'red';
        clariText.textContent = 'Heating the container!';
    }
    else if(targetSpeedMultiplier === 1){
        clariText.style.color = 'white';
        clariText.textContent = 'No change in temperature!';
    }
    else{
        vignette.style.background = 'radial-gradient(circle at center, transparent 10%, rgba(0, 123, 255, 0.4), transparent 70%)';
        clariText.style.color = 'cyan';
        clariText.textContent = 'Cooling the container!';
    }
    vignette.style.opacity = Math.abs(intensity) * 0.5;
    
}
function updateContainer(size){
    container.scale.x = size / boxSize;
    currentBoxBounds = size / 2;
    allParticles.forEach(particle => {
        if(Math.abs(particle.mesh.position.x) > currentBoxBounds - 0.1){
            particle.mesh.position.x = Math.sign(particle.mesh.position.x) * (currentBoxBounds - 0.1);
        }
    })

}
function updateUIElements(){
    const n = allParticles.length * Moles_Per_Particle;
    let T = currentSpeedMultiplier * ROOM_TEMP;
    //const V = parseFloat(volumeSlider.value) * boxSize * boxSize;

    const widthNM = parseFloat(volumeSlider.value) * 5;
    const heightNM = boxSize * 5;
    const depthNM = boxSize * 5;

    const volume = (widthNM * nmToMeters) * (heightNM *nmToMeters) * (depthNM * nmToMeters);

    const pressure = (n * R * T) / volume;
    const pressureKPA = pressure / 1000;
    const pressureATM = pressure / 101325;
    //console.log(pressure);
    document.getElementById('pressure-display').textContent = pressureATM.toFixed(3);
    document.getElementById('temp-display').textContent = T.toFixed(0);
    document.getElementById('particles-display').textContent = n.toExponential(2);
}
function updateInputs(sliderId, inputId, callback){
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
function updateTimeDisplay(){
    document.getElementById('time-elapsed').textContent = elaspedTime.toFixed(2);
}
function animate() {
    requestAnimationFrame(animate);
    if(!isPaused){
        updateParticles();
        elaspedTime += 0.016;
        updateTimeDisplay();
    }
    updateUIElements();
    controls.update();
    renderer.render(scene, camera);
}

setupThreejs();
setupObjects();
setupLights();
updateInputs('amountOfParticles', 'particleNumDisplay', (val) => {
    createParticles(val);
});
updateInputs('volume', 'volumeDisplay', (val) => {
    updateContainer(val);
});
updateInputs('specificTempSlider', 'specificTempInput', (val) => {
    updateSpecificTemp(val);
});
createParticles(parseFloat(amountParticlesSlider.value));
animate();