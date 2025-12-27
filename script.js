import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Global Variables
let scene, renderer, camera, controls;
let allParticles = [];
const boxSize = 3;
const baseSpeed = 0.015;
let currentBoxBounds = boxSize / 2;
const particleRadius = 0.1;
let container;
let containerVolume;
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
    //radial-gradient(circle at center, transparent 10%, rgba(0, 123, 255, 0.3), transparent 50%);
    //radial-gradient(circle at center, transparent 10%, rgba(255, 0, 0, 0.3), transparent 50%);
    if(intensity > 0){
        vignette.style.background = 'radial-gradient(circle at center, transparent 10%, rgba(255, 0, 0, 0.4), transparent 70%)';
    }
    else{
        vignette.style.background = 'radial-gradient(circle at center, transparent 10%, rgba(0, 123, 255, 0.4), transparent 70%)';
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
    const n = allParticles.length;
    const T = currentSpeedMultiplier;
    const V = parseFloat(volumeSlider.value) * boxSize * boxSize;

    const pressure = (n * T) / V;
}
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    updateParticles();
    renderer.render(scene, camera);
}

setupThreejs();
setupObjects();
setupLights();
createParticles(50);
animate();