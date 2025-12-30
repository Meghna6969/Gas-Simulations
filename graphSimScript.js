import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';

//Constants
const R = 8.314; // Ideal Gas Constant
const MOLES_PER_PARTICLE = 1.66e-23;
const nmToMeters = 1e-9;
const ROOM_TEMP = 293.15;
const speedTransitionRate = 0.0009;
const baseSpeed = 0.015;

// Global Variables
let scene, renderer, camera, controls;
let allParticlesH = [];
let allParticlesL = [];
let allParticles = [];
let container; // Holds the box container

const heavyParticlesInput = document.getElementById('heavyParticles-input');
const heavyParticlesSlider = document.getElementById('heavyParticles-slider');
const lightParticlesInput = document.getElementById('lightElement-input');
const lightParticlesSlider = document.getElementById('lightElement-slider');
const temperatureInput = document.getElementById('temperature-input');
const temperatureSlider = document.getElementById('temperature-slider');
const avgSpeedHeavyText = document.getElementById('avgSpeedH-text')






