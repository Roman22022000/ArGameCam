import * as THREE from
"https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";

import { GLTFLoader } from
"https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js";


// ==================================================
// VARIABLES
// ==================================================

let renderer;
let scene;
let camera;

let xrSession = null;

let controller;

let hitTestSource = null;
let viewerSpace = null;

let hitTestInitialized = false;

let reticle;

let model = null;

let modelPlaced = false;


// ==================================================
// UI
// ==================================================

const startScreen =
    document.getElementById(
        "startScreen"
    );

const startButton =
    document.getElementById(
        "startButton"
    );

const status =
    document.getElementById(
        "status"
    );

const arUI =
    document.getElementById(
        "arUI"
    );

const message =
    document.getElementById(
        "message"
    );

const placeButton =
    document.getElementById(
        "placeButton"
    );

const exitButton =
    document.getElementById(
        "exitButton"
    );

const errorScreen =
    document.getElementById(
        "errorScreen"
    );

const errorText =
    document.getElementById(
        "errorText"
    );

const backButton =
    document.getElementById(
        "backButton"
    );


// ==================================================
// TELEGRAM
// ==================================================

function initTelegram() {

    if (
        window.Telegram &&
        window.Telegram.WebApp
    ) {

        const tg =
            window.Telegram.WebApp;

        tg.ready();

        tg.expand();

        console.log(
            "Telegram WebApp detected"
        );
    }
}


// ==================================================
// THREE
// ==================================================

function initThree() {

    scene =
        new THREE.Scene();


    camera =
        new THREE.PerspectiveCamera();


    renderer =
        new THREE.WebGLRenderer({

            antialias: true,

            alpha: true,

            powerPreference:
                "high-performance"

        });


    renderer.setPixelRatio(
        Math.min(
            window.devicePixelRatio,
            2
        )
    );


    renderer.setSize(
        window.innerWidth,
        window.innerHeight
    );


    renderer.xr.enabled = true;


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


    const directional =
        new THREE.DirectionalLight(
            0xffffff,
            2
        );

    directional.position.set(
        2,
        4,
        2
    );

    scene.add(
        directional
    );


    // ==============================================
    // RETICLE
    // ==============================================

    const geometry =
        new THREE.RingGeometry(
            0.07,
            0.1,
            32
        );


    geometry.rotateX(
        -Math.PI / 2
    );


    const material =
        new THREE.MeshBasicMaterial({
            color: 0xffffff
        });


    reticle =
        new THREE.Mesh(
            geometry,
            material
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
        onControllerSelect
    );


    scene.add(
        controller
    );


    // ==============================================
    // LOAD MODEL
    // ==============================================

    loadModel();
}


// ==================================================
// MODEL
// ==================================================

function loadModel() {

    const loader =
        new GLTFLoader();


    loader.load(

        "./models/scene.glb",

        (gltf) => {

            model =
                gltf.scene;


            model.visible =
                false;


            // Начальный масштаб.
            // При необходимости изменить.

            model.scale.set(
                1,
                1,
                1
            );


            scene.add(
                model
            );


            console.log(
                "GLB loaded"
            );
        },

        (progress) => {

            if (
                progress.total > 0
            ) {

                const percent =
                    Math.round(
                        progress.loaded /
                        progress.total *
                        100
                    );

                console.log(
                    "Model:",
                    percent + "%"
                );
            }
        },

        (error) => {

            console.error(
                "GLB error:",
                error
            );

            message.textContent =
                "Ошибка загрузки scene.glb";
        }
    );
}


// ==================================================
// CHECK AR ONLY WHEN BUTTON PRESSED
// ==================================================

async function startAR() {

    startButton.disabled =
        true;

    status.textContent =
        "Запуск AR...";


    // ----------------------------------------------
    // HTTPS
    // ----------------------------------------------

    if (
        location.protocol !==
        "https:" &&
        location.hostname !==
        "localhost"
    ) {

        showError(
            "AR требует HTTPS. Откройте сайт через GitHub Pages или другой HTTPS-хостинг."
        );

        startButton.disabled =
            false;

        return;
    }


    // ----------------------------------------------
    // WEBXR
    // ----------------------------------------------

    if (
        !navigator.xr
    ) {

        showError(
            "Этот браузер не предоставляет WebXR. Попробуйте открыть Mini App в поддерживаемом AR-браузере."
        );

        startButton.disabled =
            false;

        return;
    }


    try {

        const supported =
            await navigator.xr.isSessionSupported(
                "immersive-ar"
            );


        if (!supported) {

            showError(
                "Устройство или браузер не поддерживает режим immersive AR."
            );

            startButton.disabled =
                false;

            return;
        }


        // ------------------------------------------
        // REQUEST AR
        // ------------------------------------------

        xrSession =
            await navigator.xr.requestSession(

                "immersive-ar",

                {
                    requiredFeatures: [
                        "local-floor",
                        "hit-test"
                    ],

                    optionalFeatures: [
                        "dom-overlay"
                    ],

                    domOverlay: {
                        root: document.body
                    }
                }
            );


        // ------------------------------------------
        // XR REFERENCE SPACE
        // ------------------------------------------

        renderer.xr.setReferenceSpaceType(
            "local-floor"
        );


        await renderer.xr.setSession(
            xrSession
        );


        // ------------------------------------------
        // UI
        // ------------------------------------------

        startScreen.style.display =
            "none";


        errorScreen.classList.add(
            "hidden"
        );


        arUI.style.display =
            "block";


        placeButton.style.display =
            "block";


        message.textContent =
            "Наведите камеру на пол или поверхность";


        // ------------------------------------------
        // SESSION END
        // ------------------------------------------

        xrSession.addEventListener(
            "end",
            endAR
        );


        // ------------------------------------------
        // RESET HIT TEST
        // ------------------------------------------

        hitTestSource =
            null;

        viewerSpace =
            null;

        hitTestInitialized =
            false;

        modelPlaced =
            false;


        // ------------------------------------------
        // RENDER LOOP
        // ------------------------------------------

        renderer.setAnimationLoop(
            render
        );


    } catch (error) {

        console.error(
            "AR START ERROR:",
            error
        );


        showError(
            getReadableError(
                error
            )
        );


        startButton.disabled =
            false;
    }
}


// ==================================================
// HIT TEST INITIALIZATION
// ==================================================

async function initializeHitTest(
    session
) {

    if (
        hitTestInitialized
    ) {
        return;
    }


    try {

        viewerSpace =
            await session.requestReferenceSpace(
                "viewer"
            );


        hitTestSource =
            await session.requestHitTestSource({
                space: viewerSpace
            });


        hitTestInitialized =
            true;


        console.log(
            "Hit Test initialized"
        );


    } catch (error) {

        console.error(
            "Hit Test error:",
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

    if (
        !frame ||
        !xrSession
    ) {

        return;
    }


    if (
        !hitTestInitialized
    ) {

        initializeHitTest(
            xrSession
        );
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
            results.length > 0 &&
            !modelPlaced
        ) {

            const hit =
                results[0];


            const pose =
                hit.getPose(
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

        } else {

            if (
                !modelPlaced
            ) {

                reticle.visible =
                    false;


                message.textContent =
                    "Наведите камеру на поверхность";
            }
        }
    }


    renderer.render(
        scene,
        camera
    );
}


// ==================================================
// PLACE MODEL
// ==================================================

function placeModel() {

    if (!model) {

        message.textContent =
            "3D модель ещё загружается";

        return;
    }


    if (!reticle.visible) {

        message.textContent =
            "Наведите камеру на поверхность";

        return;
    }


    // ==============================================
    // POSITION
    // ==============================================

    const position =
        new THREE.Vector3();


    position.setFromMatrixPosition(
        reticle.matrix
    );


    model.position.copy(
        position
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


    // ==============================================
    // SHOW
    // ==============================================

    model.visible =
        true;


    modelPlaced =
        true;


    reticle.visible =
        false;


    placeButton.style.display =
        "none";


    message.textContent =
        "Объект закреплён в пространстве";
}


// ==================================================
// CONTROLLER SELECT
// ==================================================

function onControllerSelect() {

    if (
        !modelPlaced
    ) {

        placeModel();
    }
}


// ==================================================
// EXIT
// ==================================================

async function exitAR() {

    if (
        xrSession
    ) {

        try {

            await xrSession.end();

        } catch (error) {

            console.error(error);
        }
    }
}


// ==================================================
// SESSION END
// ==================================================

function endAR() {

    xrSession =
        null;


    hitTestSource =
        null;


    viewerSpace =
        null;


    hitTestInitialized =
        false;


    renderer.setAnimationLoop(
        null
    );


    arUI.style.display =
        "none";


    startScreen.style.display =
        "flex";


    startButton.disabled =
        false;


    status.textContent =
        "Готово к запуску";


    if (model) {

        model.visible =
            false;
    }


    modelPlaced =
        false;
}


// ==================================================
// ERROR
// ==================================================

function showError(
    text
) {

    errorText.textContent =
        text;


    errorScreen.classList.remove(
        "hidden"
    );


    startScreen.style.display =
        "none";
}


function getReadableError(
    error
) {

    if (
        error &&
        error.name ===
        "NotAllowedError"
    ) {

        return "Доступ к AR был запрещён. Разрешите доступ к камере и попробуйте снова.";
    }


    if (
        error &&
        error.name ===
        "SecurityError"
    ) {

        return "Браузер заблокировал AR из-за настроек безопасности. Проверьте HTTPS.";
    }


    if (
        error &&
        error.message
    ) {

        return error.message;
    }


    return "Не удалось запустить AR на этом устройстве.";
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
    placeModel
);


exitButton.addEventListener(
    "click",
    exitAR
);


backButton.addEventListener(
    "click",
    () => {

        errorScreen.classList.add(
            "hidden"
        );


        startScreen.style.display =
            "flex";


        startButton.disabled =
            false;


        status.textContent =
            "Готово к запуску";
    }
);


// ==================================================
// RESIZE
// ==================================================

window.addEventListener(
    "resize",
    () => {

        if (!renderer) {
            return;
        }


        renderer.setSize(
            window.innerWidth,
            window.innerHeight
        );
    }
);


// ==================================================
// START
// ==================================================

initTelegram();

initThree();
