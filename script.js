// ========================================
// AR CUBE BUILDER - Universal Compatibility Version
// Works on ALL devices with camera (no WebXR required)
// Uses: Webcam + Depth Estimation + Gyroscope
// ========================================

// Debug display helpers
function updateDebug(key, value) {
    const element = document.getElementById(`debug-${key}`);
    if (element) {
        const label = key.charAt(0).toUpperCase() + key.slice(1);
        element.textContent = `${label}: ${value}`;
    }
}

// Three.js Setup
let scene, camera, renderer;
let arCubes = [];
let gridSize = 0.5;
let gridSnapEnabled = true;
let selectedCube = null;

// Hand tracking
let hands = null;
let handLandmarks = null;
let isPinching = false;
let wasPinching = false;
let isFist = false;

// Video and depth
let videoElement = null;
let depthEstimator = null;
let currentDepthMap = null;
let currentStream = null;
let currentFacingMode = 'environment'; // 'environment' = back, 'user' = front
let mediaCamera = null;
let availableCameras = [];
let currentCameraIndex = 0;

// Device orientation tracking
let deviceOrientation = { alpha: 0, beta: 0, gamma: 0 };
let initialOrientation = null;
let orientationPermission = false;

// Reticle for placement
let reticle = null;
let reticlePosition = new THREE.Vector3(0, 0, -2);

// Initialize Three.js
function initThreeJS() {
    const canvas = document.getElementById('canvas');

    // Scene
    scene = new THREE.Scene();

    // Camera
    camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.01,
        100
    );
    camera.position.set(0, 0, 0);

    // Renderer
    renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        alpha: true,
        antialias: true
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // Create reticle
    createReticle();

    window.addEventListener('resize', onWindowResize);

    console.log('Three.js initialized');
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Create reticle for placement indicator
function createReticle() {
    const geometry = new THREE.RingGeometry(0.15, 0.2, 32);
    const material = new THREE.MeshBasicMaterial({
        color: 0x4CAF50,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide
    });

    reticle = new THREE.Mesh(geometry, material);
    reticle.rotation.x = -Math.PI / 2;
    reticle.position.copy(reticlePosition);
    scene.add(reticle);
}

// Request device orientation permission
async function requestOrientationPermission() {
    if (typeof DeviceOrientationEvent !== 'undefined' &&
        typeof DeviceOrientationEvent.requestPermission === 'function') {
        try {
            const permission = await DeviceOrientationEvent.requestPermission();
            orientationPermission = permission === 'granted';
            console.log('Orientation permission:', permission);
        } catch (error) {
            console.warn('Orientation permission error:', error);
            orientationPermission = true; // Try anyway
        }
    } else {
        orientationPermission = true; // Not iOS, assume granted
    }
}

// Initialize device orientation tracking
function initOrientationTracking() {
    window.addEventListener('deviceorientation', (event) => {
        if (!orientationPermission) return;

        deviceOrientation.alpha = event.alpha || 0;
        deviceOrientation.beta = event.beta || 0;
        deviceOrientation.gamma = event.gamma || 0;

        if (!initialOrientation) {
            initialOrientation = { ...deviceOrientation };
        }

        updateCameraOrientation();
    }, true);

    console.log('Orientation tracking initialized');
}

// Update camera based on device orientation
function updateCameraOrientation() {
    if (!initialOrientation) return;

    const alpha = THREE.MathUtils.degToRad(deviceOrientation.alpha - initialOrientation.alpha);
    const beta = THREE.MathUtils.degToRad(deviceOrientation.beta);
    const gamma = THREE.MathUtils.degToRad(deviceOrientation.gamma);

    camera.rotation.set(beta - Math.PI/2, alpha, -gamma, 'YXZ');
}

// Initialize depth estimation
async function initDepthEstimation() {
    try {
        console.log('Loading depth model...');
        const model = depthEstimation.SupportedModels.ARPortraitDepth;
        depthEstimator = await depthEstimation.createEstimator(model);
        console.log('Depth model loaded');
        return true;
    } catch (error) {
        console.warn('Depth estimation unavailable:', error);
        return false;
    }
}

// Get depth at point
async function getDepthAtPoint(x, y) {
    if (!currentDepthMap || !depthEstimator) return 2.0; // Default depth

    try {
        const depthArray = await currentDepthMap.toArray();
        const pixelX = Math.floor(x * depthArray[0].length);
        const pixelY = Math.floor(y * depthArray.length);

        const clampedX = Math.max(0, Math.min(pixelX, depthArray[0].length - 1));
        const clampedY = Math.max(0, Math.min(pixelY, depthArray.length - 1));

        const depth = depthArray[clampedY][clampedX];
        return 0.5 + (depth * 4.5); // Normalize to meters
    } catch (error) {
        return 2.0;
    }
}

// Update depth map
async function updateDepthMap() {
    if (!depthEstimator || !videoElement) return;

    try {
        currentDepthMap = await depthEstimator.estimateDepth(videoElement);
    } catch (error) {
        console.warn('Depth update error:', error);
    }
}

// Convert screen position to 3D world
function screenToWorld(screenX, screenY, depth) {
    screenX = 1 - screenX; // Mirror

    const ndcX = (screenX * 2) - 1;
    const ndcY = -(screenY * 2) + 1;

    const vector = new THREE.Vector3(ndcX, ndcY, -1);
    vector.unproject(camera);

    const dir = vector.sub(camera.position).normalize();
    const position = camera.position.clone().add(dir.multiplyScalar(depth));

    return position;
}

// Create cube
async function createCube(screenX, screenY, handDepth) {
    const geometry = new THREE.BoxGeometry(gridSize, gridSize, gridSize);
    const material = new THREE.MeshStandardMaterial({
        color: Math.random() * 0xffffff,
        roughness: 0.4,
        metalness: 0.2
    });

    const cube = new THREE.Mesh(geometry, material);
    cube.castShadow = true;
    cube.receiveShadow = true;

    // Get depth
    let depth = await getDepthAtPoint(screenX, screenY);
    if (isNaN(depth) || depth === null) {
        depth = 1.0 + (1 - handDepth) * 2.5;
    }

    // Calculate world position
    const worldPos = screenToWorld(screenX, screenY, depth);
    cube.position.copy(worldPos);

    if (gridSnapEnabled) {
        snapToGrid(cube);
    }

    scene.add(cube);

    // Store with camera-relative transform
    const cameraRelativePos = worldPos.clone().sub(camera.position);
    const cameraRotation = camera.quaternion.clone();

    const arCube = {
        mesh: cube,
        worldPosition: cube.position.clone(),
        cameraRelativePosition: cameraRelativePos,
        cameraRotation: cameraRotation.clone(),
        depth: depth,
        locked: false
    };

    arCubes.push(arCube);
    console.log('Cube placed at:', cube.position);

    return cube;
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
        arCubes.splice(index, 1);
    }
    cube.geometry.dispose();
    cube.material.dispose();
    updateDebug('cubes', arCubes.length);
}

function clearAllCubes() {
    arCubes.forEach(arCube => {
        scene.remove(arCube.mesh);
        arCube.mesh.geometry.dispose();
        arCube.mesh.material.dispose();
    });
    arCubes = [];
    updateDebug('cubes', 0);
}

// Update AR anchors
function updateARAnchors() {
    arCubes.forEach(arCube => {
        if (arCube.locked) {
            // Transform camera-relative to world space
            const worldPos = arCube.cameraRelativePosition.clone();
            worldPos.applyQuaternion(camera.quaternion);
            worldPos.add(camera.position);

            arCube.mesh.position.copy(worldPos);
            arCube.worldPosition.copy(worldPos);
        }
    });
}

// Detect pinch
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
        if (Math.sqrt(dx * dx + dy * dy + dz * dz) < 0.15) closeCount++;
    });

    return closeCount >= 4;
}

// Find cube at screen position
function findCubeAtScreenPosition(screenX, screenY) {
    screenX = 1 - screenX;
    const ndcX = (screenX * 2) - 1;
    const ndcY = -(screenY * 2) + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);

    const meshes = arCubes.map(ac => ac.mesh);
    const intersects = raycaster.intersectObjects(meshes);

    return intersects.length > 0 ? intersects[0].object : null;
}

// Handle hand tracking
let lastHandDetectionLog = 0;
async function onHandResults(results) {
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        handLandmarks = results.multiHandLandmarks[0];

        // Update debug display
        updateDebug('hand', 'Detected ✓');

        // Log hand detection periodically
        const now = Date.now();
        if (now - lastHandDetectionLog > 5000) {
            console.log('Hand detected and tracking');
            lastHandDetectionLog = now;
        }

        isPinching = detectPinch(handLandmarks);
        isFist = detectFist(handLandmarks);

        // Update gesture display
        if (isPinching) {
            updateDebug('gesture', 'Pinch 👌');
        } else if (isFist) {
            updateDebug('gesture', 'Fist ✊');
        } else {
            updateDebug('gesture', 'None');
        }

        const indexTip = handLandmarks[8];
        const screenX = indexTip.x;
        const screenY = indexTip.y;
        const handDepth = indexTip.z;

        // Update reticle position
        const depth = await getDepthAtPoint(screenX, screenY) || 2.0;
        reticlePosition = screenToWorld(screenX, screenY, depth);
        reticle.position.copy(reticlePosition);

        // Delete with fist
        if (isFist) {
            const cubeToDelete = findCubeAtScreenPosition(screenX, screenY);
            if (cubeToDelete) {
                deleteCube(cubeToDelete);
                selectedCube = null;
            }
        }
        // Spawn/move with pinch
        else if (isPinching) {
            if (!wasPinching) {
                console.log('Pinch detected, checking for cube at position');
                selectedCube = findCubeAtScreenPosition(screenX, screenY);

                if (!selectedCube) {
                    console.log('Creating new cube');
                    selectedCube = await createCube(screenX, screenY, handDepth);
                    updateDebug('cubes', arCubes.length);
                } else {
                    console.log('Selected existing cube');
                    const arCube = arCubes.find(ac => ac.mesh === selectedCube);
                    if (arCube) arCube.locked = false;
                }
            } else if (selectedCube) {
                const arCube = arCubes.find(ac => ac.mesh === selectedCube);
                if (arCube) {
                    const worldPos = screenToWorld(screenX, screenY, arCube.depth);
                    arCube.mesh.position.copy(worldPos);

                    if (gridSnapEnabled) {
                        snapToGrid(arCube.mesh);
                    }

                    arCube.worldPosition.copy(arCube.mesh.position);
                    arCube.cameraRelativePosition = worldPos.clone().sub(camera.position);
                }
            }
        } else {
            // Released pinch - lock cube
            if (wasPinching && selectedCube) {
                const arCube = arCubes.find(ac => ac.mesh === selectedCube);
                if (arCube) {
                    if (gridSnapEnabled) {
                        snapToGrid(arCube.mesh);
                    }
                    arCube.worldPosition.copy(arCube.mesh.position);
                    arCube.cameraRelativePosition = arCube.worldPosition.clone().sub(camera.position);
                    arCube.cameraRotation = camera.quaternion.clone();
                    arCube.locked = true;
                }
            }
            selectedCube = null;
        }

        wasPinching = isPinching;
    }
}

// Initialize hand tracking
async function initHandTracking() {
    try {
        if (typeof Hands === 'undefined') {
            console.warn('MediaPipe not loaded');
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
        console.warn('Hand tracking error:', error);
    }
}

// Enumerate available cameras
async function enumerateCameras() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        availableCameras = devices.filter(device => device.kind === 'videoinput');
        console.log('Available cameras:', availableCameras);
        updateDebug('camera', `Found ${availableCameras.length} cameras`);
        return availableCameras;
    } catch (error) {
        console.error('Error enumerating cameras:', error);
        updateDebug('camera', 'Error listing cameras');
        return [];
    }
}

// Initialize webcam with device ID or facing mode
async function initWebcam(facingMode = 'environment', deviceId = null) {
    videoElement = document.getElementById('webcam');
    updateDebug('camera', 'Initializing...');

    try {
        // Stop existing MediaPipe camera
        if (mediaCamera) {
            mediaCamera.stop();
            mediaCamera = null;
        }

        // Stop existing stream if any
        if (currentStream) {
            currentStream.getTracks().forEach(track => track.stop());
            currentStream = null;
        }

        currentFacingMode = facingMode;

        console.log(`Requesting camera - facingMode: ${facingMode}, deviceId: ${deviceId}`);
        updateDebug('facing', `Requesting ${facingMode}`);

        // Try to get camera with specified facing mode
        let stream = null;
        let constraints = {
            video: {
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }
        };

        // If we have a specific device ID, use it
        if (deviceId) {
            constraints.video.deviceId = { exact: deviceId };
            console.log('Using deviceId:', deviceId);
        } else {
            // Otherwise try facing mode
            try {
                // Try exact constraint first
                constraints.video.facingMode = { exact: facingMode };
                stream = await navigator.mediaDevices.getUserMedia(constraints);
                console.log(`Got camera with exact facingMode: ${facingMode}`);
            } catch (err) {
                console.warn(`Exact ${facingMode} failed, trying ideal...`, err);
                updateDebug('camera', 'Exact failed, trying ideal');
                // Fallback if exact fails - try with ideal constraint
                try {
                    constraints.video.facingMode = { ideal: facingMode };
                    stream = await navigator.mediaDevices.getUserMedia(constraints);
                    console.log(`Got camera with ideal facingMode: ${facingMode}`);
                } catch (err2) {
                    console.warn(`Ideal ${facingMode} failed, trying without constraint...`, err2);
                    updateDebug('camera', 'Ideal failed, using default');
                    // Last resort - just get any camera
                    delete constraints.video.facingMode;
                    stream = await navigator.mediaDevices.getUserMedia(constraints);
                    console.log('Got camera without facingMode constraint');
                }
            }
        }

        // If using deviceId, try to get the stream
        if (deviceId && !stream) {
            stream = await navigator.mediaDevices.getUserMedia(constraints);
        }

        currentStream = stream;
        videoElement.srcObject = stream;
        await videoElement.play();

        // Log which camera we actually got
        const videoTrack = stream.getVideoTracks()[0];
        const settings = videoTrack.getSettings();
        const label = videoTrack.label || 'Unknown';
        console.log('Camera settings:', settings);
        console.log('Camera label:', label);
        console.log('Actual facingMode:', settings.facingMode);

        updateDebug('camera', label.substring(0, 20));
        updateDebug('facing', settings.facingMode || 'unknown');

        // Setup MediaPipe camera
        if (hands) {
            // Give a small delay to ensure video stream is fully ready
            await new Promise(resolve => setTimeout(resolve, 100));

            mediaCamera = new Camera(videoElement, {
                onFrame: async () => {
                    if (videoElement.readyState === videoElement.HAVE_ENOUGH_DATA) {
                        await hands.send({ image: videoElement });
                    }
                },
                width: 1280,
                height: 720
            });
            await mediaCamera.start();
            console.log('MediaPipe camera started');
        }

        console.log('Webcam initialized successfully');
        updateDebug('camera', 'Ready');
        return true;
    } catch (error) {
        console.error('Webcam error:', error);
        updateDebug('camera', 'ERROR: ' + error.message);
        alert('Camera permission required! Error: ' + error.message);
        return false;
    }
}

// Start AR
async function startAR() {
    document.getElementById('status').textContent = 'Starting AR...';

    // Request orientation permission
    await requestOrientationPermission();

    // Enumerate available cameras
    await enumerateCameras();

    // Initialize webcam with current facing mode
    const webcamOk = await initWebcam(currentFacingMode);
    if (!webcamOk) return;

    // Show video
    document.getElementById('webcam').style.display = 'block';

    // Start render loop
    animate();

    // Update UI
    document.getElementById('start-ar').style.display = 'none';
    document.getElementById('switch-camera').style.display = 'block';
    document.getElementById('status').textContent = '✅ AR Active! Pinch to place cubes';
    document.getElementById('ar-instructions').classList.add('active');

    console.log('AR started successfully');
}

// Switch camera - cycle through all available cameras
async function switchCamera() {
    document.getElementById('status').textContent = 'Switching camera...';
    updateDebug('camera', 'Switching...');

    // If we have enumerated cameras, cycle through them by device ID
    if (availableCameras.length > 1) {
        currentCameraIndex = (currentCameraIndex + 1) % availableCameras.length;
        const nextCamera = availableCameras[currentCameraIndex];
        console.log(`Switching to camera ${currentCameraIndex}:`, nextCamera);

        await initWebcam(currentFacingMode, nextCamera.deviceId);
    } else {
        // Fallback to facing mode toggle
        const newFacingMode = currentFacingMode === 'environment' ? 'user' : 'environment';
        console.log('Switching camera from', currentFacingMode, 'to:', newFacingMode);

        await initWebcam(newFacingMode);
    }

    // Check which camera we actually got
    if (currentStream) {
        const videoTrack = currentStream.getVideoTracks()[0];
        const settings = videoTrack.getSettings();
        const actualFacingMode = settings.facingMode || 'unknown';

        console.log('After switch - actual facingMode:', actualFacingMode);

        const cameraName = actualFacingMode === 'environment' ? 'Back' :
                          actualFacingMode === 'user' ? 'Front' :
                          'Camera ' + (currentCameraIndex + 1);
        document.getElementById('status').textContent = `✅ ${cameraName} Active!`;
    }
}

// Animation loop
let lastDepthUpdate = 0;
function animate() {
    requestAnimationFrame(animate);

    const now = Date.now();
    if (now - lastDepthUpdate > 100) {
        updateDepthMap();
        lastDepthUpdate = now;
    }

    updateARAnchors();

    // Highlight selected cube
    arCubes.forEach(arCube => {
        if (arCube.mesh === selectedCube) {
            arCube.mesh.material.emissive = new THREE.Color(0x444444);
        } else {
            arCube.mesh.material.emissive = new THREE.Color(0x000000);
        }
    });

    renderer.render(scene, camera);
}

// UI Event Listeners
document.getElementById('start-ar').addEventListener('click', startAR);

document.getElementById('switch-camera').addEventListener('click', switchCamera);

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
    console.log('=== AR Cube Builder (Universal) ===');
    console.log('Device:', navigator.userAgent);

    if (typeof THREE === 'undefined') {
        console.error('THREE.js not loaded');
        document.getElementById('status').textContent = '❌ THREE.js failed';
        return;
    }

    initThreeJS();
    initOrientationTracking();
    await initDepthEstimation();
    await initHandTracking();

    document.getElementById('status').textContent = '✅ Ready! Click Start AR';
    console.log('Initialization complete');
}

window.addEventListener('load', init);
