// ========================================
// PREMIUM AR CUBE BUILDER with WebXR
// True AR with plane detection, hit testing, and perfect anchoring
// ========================================

// Three.js + WebXR Setup
let scene, camera, renderer;
let xrSession = null;
let xrRefSpace = null;
let hitTestSource = null;
let hitTestSourceRequested = false;

// AR elements
let reticle; // Visual indicator for surface detection
let arCubes = []; // Cubes with AR anchors
let gridSize = 0.5;
let gridSnapEnabled = true;

// Hand tracking
let hands = null;
let handLandmarks = null;
let isPinching = false;
let wasPinching = false;
let isFist = false;
let selectedCube = null;

// Controllers
let controller;

// Check WebXR support with detailed logging
async function checkARSupport() {
    const statusEl = document.getElementById('status');

    console.log('Checking AR support...');
    console.log('User Agent:', navigator.userAgent);
    console.log('HTTPS:', window.location.protocol === 'https:');
    console.log('navigator.xr exists:', !!navigator.xr);

    if (!navigator.xr) {
        const message = '❌ WebXR not available. Need HTTPS or compatible browser.';
        statusEl.textContent = message;
        statusEl.style.background = 'rgba(244, 67, 54, 0.2)';
        statusEl.style.borderColor = '#f44336';
        console.error(message);
        showInstructions();
        return false;
    }

    try {
        const supported = await navigator.xr.isSessionSupported('immersive-ar');
        console.log('immersive-ar supported:', supported);

        if (supported) {
            statusEl.textContent = '✅ AR Ready! Click Start AR';
            statusEl.style.background = 'rgba(76, 175, 80, 0.2)';
            statusEl.style.borderColor = '#4CAF50';
            return true;
        } else {
            statusEl.textContent = '❌ AR not available on this device';
            statusEl.style.background = 'rgba(244, 67, 54, 0.2)';
            statusEl.style.borderColor = '#f44336';
            showInstructions();
            return false;
        }
    } catch (error) {
        console.error('Error checking AR support:', error);
        statusEl.textContent = '❌ Error checking AR support';
        statusEl.style.background = 'rgba(244, 67, 54, 0.2)';
        statusEl.style.borderColor = '#f44336';
        showInstructions();
        return false;
    }
}

function showInstructions() {
    const statusEl = document.getElementById('status');
    statusEl.innerHTML = `
        <strong>⚠️ WebXR Not Available</strong><br>
        <small>Requirements:</small><br>
        <small>• HTTPS connection (not http://)</small><br>
        <small>• Android Chrome or iOS Safari</small><br>
        <small>• AR-capable device</small>
    `;
}

// Initialize Three.js for WebXR
function initThreeJS() {
    const canvas = document.getElementById('canvas');

    // Scene
    scene = new THREE.Scene();

    // Camera
    camera = new THREE.PerspectiveCamera(
        70,
        window.innerWidth / window.innerHeight,
        0.01,
        20
    );

    // Renderer with WebXR
    renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        alpha: true,
        antialias: true
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;

    // Lighting
    const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
    light.position.set(0.5, 1, 0.25);
    scene.add(light);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(0, 5, 0);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    // Create reticle (surface indicator)
    createReticle();

    // Handle window resize
    window.addEventListener('resize', onWindowResize);

    console.log('Three.js initialized for WebXR');
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Create reticle for surface targeting
function createReticle() {
    const geometry = new THREE.RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2);
    const material = new THREE.MeshBasicMaterial({
        color: 0x4CAF50,
        transparent: true,
        opacity: 0.7
    });

    reticle = new THREE.Mesh(geometry, material);
    reticle.matrixAutoUpdate = false;
    reticle.visible = false;
    scene.add(reticle);
}

// Start AR session
async function startAR() {
    console.log('Starting AR session...');

    const sessionInit = {
        requiredFeatures: ['hit-test'],
        optionalFeatures: ['dom-overlay', 'anchors', 'plane-detection']
    };

    // Add DOM overlay if element exists
    const arContainer = document.getElementById('ar-container');
    if (arContainer) {
        sessionInit.domOverlay = { root: arContainer };
    }

    try {
        xrSession = await navigator.xr.requestSession('immersive-ar', sessionInit);
        console.log('XR session created');

        await renderer.xr.setSession(xrSession);
        console.log('Renderer set to XR session');

        xrRefSpace = await xrSession.requestReferenceSpace('local');
        console.log('Reference space created');

        // Setup controller for touch input
        controller = renderer.xr.getController(0);
        controller.addEventListener('select', onSelect);
        scene.add(controller);

        // Update UI
        document.getElementById('start-ar').style.display = 'none';
        document.getElementById('ar-instructions').classList.add('active');
        document.getElementById('status').textContent = '✅ AR Active!';

        // Start render loop
        renderer.setAnimationLoop(render);

        console.log('AR session started successfully');
    } catch (error) {
        console.error('Failed to start AR:', error);

        let errorMessage = 'Could not start AR. ';

        if (error.message.includes('insecure')) {
            errorMessage += 'Needs HTTPS connection.';
        } else if (error.message.includes('NotSupportedError')) {
            errorMessage += 'Device or browser doesn\'t support WebXR.';
        } else {
            errorMessage += error.message;
        }

        alert(errorMessage);
        document.getElementById('status').textContent = '❌ ' + errorMessage;
    }
}

// Handle touch/tap to place cubes
function onSelect() {
    if (reticle.visible) {
        placeCube(reticle.matrix);
    }
}

// Create cube at reticle position
function placeCube(matrix) {
    const geometry = new THREE.BoxGeometry(gridSize, gridSize, gridSize);
    const material = new THREE.MeshStandardMaterial({
        color: Math.random() * 0xffffff,
        roughness: 0.3,
        metalness: 0.2
    });

    const cube = new THREE.Mesh(geometry, material);
    cube.castShadow = true;
    cube.receiveShadow = true;

    // Apply reticle's matrix (position on detected surface)
    cube.applyMatrix4(matrix);

    // Offset Y to sit on surface
    cube.position.y += gridSize / 2;

    if (gridSnapEnabled) {
        snapToGrid(cube);
    }

    scene.add(cube);

    // Store AR anchor data
    const arCube = {
        mesh: cube,
        anchor: null,
        position: cube.position.clone()
    };

    arCubes.push(arCube);

    // Try to create WebXR anchor
    createAnchor(arCube, cube.position);

    console.log('Cube placed at:', cube.position);
}

// Create WebXR anchor for persistent AR
async function createAnchor(arCube, position) {
    if (!xrRefSpace || !xrSession) return;

    try {
        const anchorPose = new XRRigidTransform(
            { x: position.x, y: position.y, z: position.z },
            { x: 0, y: 0, z: 0, w: 1 }
        );

        if (xrSession.createAnchor) {
            const anchor = await xrSession.createAnchor(anchorPose, xrRefSpace);
            arCube.anchor = anchor;
            console.log('AR anchor created');
        }
    } catch (error) {
        console.warn('Could not create anchor:', error);
    }
}

function snapToGrid(cube) {
    cube.position.x = Math.round(cube.position.x / gridSize) * gridSize;
    cube.position.y = Math.round(cube.position.y / gridSize) * gridSize;
    cube.position.z = Math.round(cube.position.z / gridSize) * gridSize;
}

function deleteCube(cube) {
    scene.remove(cube);

    const index = arCubes.findIndex(ac => ac.mesh === cube);
    if (index > -1) {
        if (arCubes[index].anchor) {
            arCubes[index].anchor.delete();
        }
        arCubes.splice(index, 1);
    }

    cube.geometry.dispose();
    cube.material.dispose();
}

function clearAllCubes() {
    arCubes.forEach(arCube => {
        scene.remove(arCube.mesh);
        if (arCube.anchor) {
            arCube.anchor.delete();
        }
        arCube.mesh.geometry.dispose();
        arCube.mesh.material.dispose();
    });
    arCubes = [];
}

// Update AR anchors each frame
function updateAnchors(frame) {
    if (!frame) return;

    arCubes.forEach(arCube => {
        if (arCube.anchor) {
            const anchorPose = frame.getPose(arCube.anchor.anchorSpace, xrRefSpace);

            if (anchorPose) {
                arCube.mesh.matrix.fromArray(anchorPose.transform.matrix);
                arCube.mesh.matrixAutoUpdate = false;
            }
        }
    });
}

// Main render loop
function render(timestamp, frame) {
    if (frame) {
        // Update hit test for surface detection
        if (!hitTestSourceRequested) {
            requestHitTestSource();
        }

        if (hitTestSource) {
            const hitTestResults = frame.getHitTestResults(hitTestSource);

            if (hitTestResults.length > 0) {
                const hit = hitTestResults[0];
                const pose = hit.getPose(xrRefSpace);

                // Show reticle on detected surface
                reticle.visible = true;
                reticle.matrix.fromArray(pose.transform.matrix);
            } else {
                reticle.visible = false;
            }
        }

        // Update AR anchors
        updateAnchors(frame);
    }

    renderer.render(scene, camera);
}

// Request hit test source for surface detection
async function requestHitTestSource() {
    if (!xrSession) return;

    try {
        const viewerSpace = await xrSession.requestReferenceSpace('viewer');
        hitTestSource = await xrSession.requestHitTestSource({ space: viewerSpace });
        hitTestSourceRequested = true;
        console.log('Hit test source ready - surface detection active');
    } catch (error) {
        console.warn('Hit test not available:', error);
    }
}

// Initialize MediaPipe hand tracking (optional)
async function initHandTracking() {
    try {
        if (typeof Hands === 'undefined') {
            console.warn('MediaPipe Hands not loaded');
            return;
        }

        hands = new Hands({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
            }
        });

        hands.setOptions({
            maxNumHands: 1,
            modelComplexity: 1,
            minDetectionConfidence: 0.7,
            minTrackingConfidence: 0.7
        });

        hands.onResults(onHandResults);

        console.log('Hand tracking initialized');
    } catch (error) {
        console.warn('Hand tracking setup failed:', error);
    }
}

// Detect pinch gesture
function detectPinch(landmarks) {
    const thumb = landmarks[4];
    const index = landmarks[8];

    const dx = thumb.x - index.x;
    const dy = thumb.y - index.y;
    const dz = thumb.z - index.z;

    return Math.sqrt(dx * dx + dy * dy + dz * dz) < 0.05;
}

// Detect fist
function detectFist(landmarks) {
    const palm = landmarks[0];
    const fingertips = [4, 8, 12, 16, 20];

    let closeCount = 0;

    fingertips.forEach(tipIndex => {
        const tip = landmarks[tipIndex];
        const dx = tip.x - palm.x;
        const dy = tip.y - palm.y;
        const dz = tip.z - palm.z;

        if (Math.sqrt(dx * dx + dy * dy + dz * dz) < 0.15) {
            closeCount++;
        }
    });

    return closeCount >= 4;
}

// Handle hand tracking results
function onHandResults(results) {
    if (!xrSession) return;

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        handLandmarks = results.multiHandLandmarks[0];

        isPinching = detectPinch(handLandmarks);
        isFist = detectFist(handLandmarks);

        if (isPinching && !wasPinching && reticle.visible) {
            placeCube(reticle.matrix);
        }

        if (isFist && arCubes.length > 0) {
            deleteCube(arCubes[arCubes.length - 1].mesh);
        }

        wasPinching = isPinching;
    }
}

// UI Event Listeners
document.getElementById('start-ar').addEventListener('click', startAR);

document.getElementById('toggle-grid').addEventListener('click', () => {
    gridSnapEnabled = !gridSnapEnabled;
    document.getElementById('grid-status').textContent = gridSnapEnabled ? 'ON' : 'OFF';
    document.getElementById('grid-status').style.color = gridSnapEnabled ? '#4CAF50' : '#f44336';
});

document.getElementById('clear-all').addEventListener('click', () => {
    if (confirm('Delete all cubes?')) {
        clearAllCubes();
    }
});

// Initialize
async function init() {
    console.log('=== Initializing Premium AR Cube Builder ===');
    console.log('Location:', window.location.href);
    console.log('Protocol:', window.location.protocol);

    // Wait for Three.js to load
    if (typeof THREE === 'undefined') {
        console.error('THREE.js not loaded!');
        document.getElementById('status').textContent = '❌ THREE.js failed to load';
        return;
    }

    console.log('THREE.js version:', THREE.REVISION);

    // Initialize Three.js
    initThreeJS();

    // Check AR support
    const supported = await checkARSupport();

    // Initialize hand tracking (optional)
    await initHandTracking();

    if (supported) {
        console.log('✅ AR is ready! Click "Start AR" button.');
    } else {
        console.warn('⚠️ AR not supported on this device/browser.');
        document.getElementById('start-ar').disabled = true;
    }

    console.log('=== Initialization Complete ===');
}

// Start when page loads
window.addEventListener('load', () => {
    console.log('Page loaded, starting init...');
    init();
});
