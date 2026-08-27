import * as THREE from
"https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";

import { GLTFLoader } from
"https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js";


// ==================================================
// TELEGRAM
// ==================================================

const tg =
    window.Telegram?.WebApp;

if (tg) {

    tg.ready();

    tg.expand();

    tg.disableVerticalSwipes?.();

    tg.setHeaderColor?.("#000000");

    tg.setBackgroundColor?.("#000000");
}


// ==================================================
// VARIABLES
// ==================================================

let renderer;

let scene;

let camera;

let xrSession = null;

let controller;

let reticle;

let model = null;

let hitTestSource = null;

let viewerSpace = null;

let hitTestStarted = false;

let objectPlaced = false;

let worldAnchor = null;


// ==================================================
// UI
// ==================================================

const startScreen =
    document.getElementById(
        "startScreen"
    );

const startButton =
    document.getElementById(
        "startAR"
    );

const status =
    document.getElementById(
        "status"
    );

const arUI =
    document.getElementById(
        "arUI"
    );

const placeButton =
    document.getElementById(
        "placeAR"
    );

const exitButton =
    document.getElementById(
        "exitAR"
    );

const message =
    document.getElementById(
        "message"
    );


// ==================================================
// SENSOR UI
// ==================================================

const orientationElement =
    document.getElementById(
        "orientation"
    );

const gyroElement =
    document.getElementById(
        "gyro"
    );

const accelElement =
    document.getElementById(
        "accel"
    );

const gpsElement =
    document.getElementById(
        "gps"
    );


// ==================================================
// THREE.JS
// ==================================================

function initThree() {

    scene =
        new THREE.Scene();


    camera =
        new THREE.PerspectiveCamera();


    renderer =
        new THREE.WebGLRenderer({

            alpha: true,

            antialias: true,

            powerPreference:
                "high-performance"

        });


    renderer.xr.enabled = true;


    renderer.setPixelRatio(
        Math.min(
            window.devicePixelRatio,
            2
        )
    );


    renderer.setSize(
        innerWidth,
        innerHeight
    );


    document.body.appendChild(
        renderer.domElement
    );


    // ==============================================
    // LIGHT
    // ==============================================

    const hemisphere =
        new THREE.HemisphereLight(
            0xffffff,
            0x444444,
            2
        );

    scene.add(
        hemisphere
    );


    const light =
        new THREE.DirectionalLight(
            0xffffff,
            2
        );

    light.position.set(
        2,
        4,
        2
    );

    scene.add(
        light
    );


    // ==============================================
    // RETICLE
    // ==============================================

    const ring =
        new THREE.RingGeometry(
            0.07,
            0.1,
            32
        );


    ring.rotateX(
        -Math.PI / 2
    );


    reticle =
        new THREE.Mesh(

            ring,

            new THREE.MeshBasicMaterial({
                color: 0xffffff
            })

        );


    reticle.matrixAutoUpdate =
        false;

    reticle.visible =
        false;


    scene.add(
        reticle
    );


    // ==============================================
    // CONTROLLER
    // ==============================================

    controller =
        renderer.xr.getController(0);


    controller.addEventListener(
        "select",
        placeObject
    );


    scene.add(
        controller
    );


    // ==============================================
    // MODEL
    // ==============================================

    loadModel();
}


// ==================================================
// LOAD GLB
// ==================================================

function loadModel() {

    const loader =
        new GLTFLoader();


    loader.load(

        "./models/scene.glb",

        gltf => {

            model =
                gltf.scene;


            model.visible =
                false;


            model.scale.set(
                1,
                1,
                1
            );


            scene.add(
                model
            );


            console.log(
                "3D model loaded"
            );
        },

        undefined,

        error => {

            console.error(
                error
            );

            message.textContent =
                "Ошибка загрузки 3D модели";
        }
    );
}


// ==================================================
// START AR
// ==================================================

async function startAR() {

    status.textContent =
        "Запуск...";


    try {

        // ==========================================
        // TELEGRAM SENSORS
        // ==========================================

        startTelegramSensors();


        // ==========================================
        // LOCK SCREEN
        // ==========================================

        tg?.lockOrientation?.();


        // ==========================================
        // FULLSCREEN
        // ==========================================

        tg?.requestFullscreen?.();


        // ==========================================
        // WEBXR
        // ==========================================

        xrSession =
            await navigator.xr.requestSession(
                "immersive-ar",
                {

                    requiredFeatures: [
                        "local-floor",
                        "hit-test"
                    ],

                    optionalFeatures: [
                        "anchors",
                        "dom-overlay"
                    ],

                    domOverlay: {
                        root: document.body
                    }

                }
            );


        // ==========================================
        // THREE XR
        // ==========================================

        renderer.xr.setReferenceSpaceType(
            "local-floor"
        );


        await renderer.xr.setSession(
            xrSession
        );


        // ==========================================
        // UI
        // ==========================================

        startScreen.style.display =
            "none";


        arUI.style.display =
            "block";


        placeButton.style.display =
            "block";


        message.textContent =
            "Наведите камеру на поверхность";


        // ==========================================
        // HIT TEST
        // ==========================================

        hitTestStarted =
            false;


        hitTestSource =
            null;


        viewerSpace =
            null;


        objectPlaced =
            false;


        xrSession.addEventListener(
            "end",
            endAR
        );


        renderer.setAnimationLoop(
            render
        );


    } catch (error) {

        console.error(
            "AR error:",
            error
        );


        status.textContent =
            "Ошибка запуска AR";


        console.error(
            error
        );
    }
}


// ==================================================
// HIT TEST
// ==================================================

async function initializeHitTest() {

    if (
        hitTestStarted ||
        !xrSession
    ) {
        return;
    }


    try {

        viewerSpace =
            await xrSession.requestReferenceSpace(
                "viewer"
            );


        hitTestSource =
            await xrSession.requestHitTestSource({
                space: viewerSpace
            });


        hitTestStarted =
            true;


    } catch (error) {

        console.error(
            "Hit test:",
            error
        );
    }
}


// ==================================================
// RENDER
// ==================================================

function render(
    timestamp,
    frame
) {

    if (!frame) {
        return;
    }


    if (
        !hitTestStarted
    ) {

        initializeHitTest();
    }


    if (
        hitTestSource
    ) {

        const referenceSpace =
            renderer.xr.getReferenceSpace();


        const results =
            frame.getHitTestResults(
                hitTestSource
            );


        if (
            results.length &&
            !objectPlaced
        ) {

            const pose =
                results[0].getPose(
                    referenceSpace
                );


            if (pose) {

                reticle.visible =
                    true;


                reticle.matrix.fromArray(
                    pose.transform.matrix
                );


                message.textContent =
                    "Поверхность найдена";
            }

        } else if (
            !objectPlaced
        ) {

            reticle.visible =
                false;


            message.textContent =
                "Ищем поверхность...";
        }
    }


    // ==============================================
    // ANCHOR
    // ==============================================

    if (
        worldAnchor
    ) {

        const pose =
            frame.getPose(
                worldAnchor.anchorSpace,
                renderer.xr.getReferenceSpace()
            );


        if (pose && model) {

            model.matrix.fromArray(
                pose.transform.matrix
            );

            model.matrix.decompose(
                model.position,
                model.quaternion,
                model.scale
            );
        }
    }


    renderer.render(
        scene,
        camera
    );
}


// ==================================================
// PLACE
// ==================================================

async function placeObject() {

    if (
        !model ||
        !reticle.visible
    ) {

        return;
    }


    const referenceSpace =
        renderer.xr.getReferenceSpace();


    // ==============================================
    // POSITION
    // ==============================================

    model.position.setFromMatrixPosition(
        reticle.matrix
    );


    // ==============================================
    // ROTATION
    // ==============================================

    const quaternion =
        new THREE.Quaternion();


    quaternion.setFromRotationMatrix(
        reticle.matrix
    );


    model.quaternion.copy(
        quaternion
    );


    model.visible =
        true;


    objectPlaced =
        true;


    reticle.visible =
        false;


    placeButton.style.display =
        "none";


    message.textContent =
        "Объект закреплён";


    // ==============================================
    // NATIVE XR ANCHOR
    // ==============================================

    if (
        xrSession &&
        xrSession.enabledFeatures?.includes(
            "anchors"
        )
    ) {

        try {

            const results =
                currentHitResults;


            if (
                results &&
                results.length
            ) {

                worldAnchor =
                    await results[0]
                        .createAnchor();

            }

        } catch (error) {

            console.log(
                "Anchor unavailable:",
                error
            );
        }
    }
}


// ==================================================
// CURRENT HIT
// ==================================================

let currentHitResults = null;


// заменяем render hit-test
const originalRender =
    render;


// ==================================================
// TELEGRAM DEVICE ORIENTATION
// ==================================================

function startTelegramSensors() {

    if (!tg) {
        return;
    }


    // ==============================================
    // ORIENTATION
    // ==============================================

    if (
        tg.DeviceOrientation
    ) {

        tg.DeviceOrientation.start(
            {
                refresh_rate: 50,
                need_absolute: true
            },

            started => {

                console.log(
                    "DeviceOrientation:",
                    started
                );

            }
        );


        tg.onEvent(
            "deviceOrientationChanged",
            updateOrientation
        );


        tg.onEvent(
            "deviceOrientationFailed",
            error => {

                console.log(
                    "Orientation failed:",
                    error
                );
            }
        );
    }


    // ==============================================
    // GYROSCOPE
    // ==============================================

    if (
        tg.Gyroscope
    ) {

        tg.Gyroscope.start(
            {
                refresh_rate: 50
            },

            started => {

                console.log(
                    "Gyroscope:",
                    started
                );

            }
        );


        tg.onEvent(
            "gyroscopeChanged",
            updateGyroscope
        );


        tg.onEvent(
            "gyroscopeFailed",
            error => {

                console.log(
                    "Gyroscope failed:",
                    error
                );
            }
        );
    }


    // ==============================================
    // ACCELEROMETER
    // ==============================================

    if (
        tg.Accelerometer
    ) {

        tg.Accelerometer.start(
            {
                refresh_rate: 50
            },

            started => {

                console.log(
                    "Accelerometer:",
                    started
                );

            }
        );


        tg.onEvent(
            "accelerometerChanged",
            updateAccelerometer
        );


        tg.onEvent(
            "accelerometerFailed",
            error => {

                console.log(
                    "Accelerometer failed:",
                    error
                );
            }
        );
    }


    // ==============================================
    // GPS
    // ==============================================

    if (
        tg.LocationManager
    ) {

        tg.LocationManager.init(
            () => {

                tg.LocationManager.getLocation(
                    location => {

                        if (
                            location
                        ) {

                            gpsElement.innerHTML =
                                "LAT: " +
                                location.latitude +
                                "<br>" +
                                "LON: " +
                                location.longitude;
                        }
                    }
                );

            }
        );
    }
}


// ==================================================
// ORIENTATION
// ==================================================

function updateOrientation() {

    const d =
        tg.DeviceOrientation;


    if (!d) {
        return;
    }


    orientationElement.innerHTML =

        "α: " +
        d.alpha.toFixed(3) +

        "<br>" +

        "β: " +
        d.beta.toFixed(3) +

        "<br>" +

        "γ: " +
        d.gamma.toFixed(3);
}


// ==================================================
// GYRO
// ==================================================

function updateGyroscope() {

    const g =
        tg.Gyroscope;


    if (!g) {
        return;
    }


    gyroElement.innerHTML =

        "X: " +
        g.x.toFixed(3) +

        "<br>" +

        "Y: " +
        g.y.toFixed(3) +

        "<br>" +

        "Z: " +
        g.z.toFixed(3);
}


// ==================================================
// ACCELEROMETER
// ==================================================

function updateAccelerometer() {

    const a =
        tg.Accelerometer;


    if (!a) {
        return;
    }


    accelElement.innerHTML =

        "X: " +
        a.x.toFixed(3) +

        "<br>" +

        "Y: " +
        a.y.toFixed(3) +

        "<br>" +

        "Z: " +
        a.z.toFixed(3);
}


// ==================================================
// EXIT
// ==================================================

async function exitAR() {

    if (
        xrSession
    ) {

        await xrSession.end();
    }
}


// ==================================================
// END
// ==================================================

function endAR() {

    xrSession =
        null;


    hitTestSource =
        null;


    viewerSpace =
        null;


    hitTestStarted =
        false;


    worldAnchor =
        null;


    objectPlaced =
        false;


    renderer.setAnimationLoop(
        null
    );


    arUI.style.display =
        "none";


    startScreen.style.display =
        "flex";


    if (model) {

        model.visible =
            false;
    }


    tg?.unlockOrientation?.();

    tg?.exitFullscreen?.();


    tg?.DeviceOrientation?.stop?.();

    tg?.Gyroscope?.stop?.();

    tg?.Accelerometer?.stop?.();
}


// ==================================================
// EVENTS
// ==================================================

startButton.addEventListener(
    "click",
    startAR
);


placeButton.addEventListener(
    "click",
    placeObject
);


exitButton.addEventListener(
    "click",
    exitAR
);


// ==================================================
// RESIZE
// ==================================================

window.addEventListener(
    "resize",
    () => {

        renderer.setSize(
            innerWidth,
            innerHeight
        );
    }
);


// ==================================================
// INIT
// ==================================================

initThree();
