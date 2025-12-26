import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Global Variables
let scene, renderer, camera, controls;
let allParticles = [];
const boxSize = 3;
const baseSpeed = 0.05;
const boxBounds = boxSize / 2;

const amountParticlesSlider = document.getElementById('amountOfParticles');
const tempSlider = document.getElementById('temperatureChange');

amountParticlesSlider.addEventListener('input', function() {
    createParticles(parseFloat(amountParticlesSlider.value));
});
tempSlider.addEventListener('input', function() {
    const particleVelocity = parseFloat(tempSlider.value);
    const speedMultiplier = Math.pow(2, particleVelocity) * 0.2;
    allParticles.forEach(particle => {
        const direction = particle.velocity.clone().normalize();
        particle.velocity.copy(direction.multiplyScalar(baseSpeed * speedMultiplier));
    });
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
    const lineCube = new THREE.LineSegments(edgeGeo, lineMaterial);
    scene.add(lineCube);
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
    const particleGeometry = new THREE.SphereGeometry(0.1, 16, 16);
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
    allParticles.forEach(particle => {
        particle.mesh.position.add(particle.velocity);

        if(Math.abs(particle.mesh.position.x) > boxBounds - 0.1){
            particle.velocity.x *= -1;
            particle.mesh.position.x = Math.sign(particle.mesh.position.x) * (boxBounds - 0.1);
        }
        if(Math.abs(particle.mesh.position.y) > boxBounds - 0.1){
            particle.velocity.y *= -1;
            particle.mesh.position.y = Math.sign(particle.mesh.position.y) * (boxBounds - 0.1);
        }
        if(Math.abs(particle.mesh.position.z) > boxBounds - 0.1){
            particle.velocity.z *= -1;
            particle.mesh.position.z = Math.sign(particle.mesh.position.z) * (boxBounds - 0.1);
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