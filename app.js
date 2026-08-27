import * as THREE from
"https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";

import { GLTFLoader } from
"https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js";


// --------------------------------------------------
// GLOBAL VARIABLES
// --------------------------------------------------

let camera;
let scene;
let renderer;

let xrSession = null;

let controller;

let hitTestSource = null;
let hitTestSourceRequested = false;

let reticle;

let loadedObject = null;

let objectPlaced = false;


// --------------------------------------------------
// UI
// --------------------------------------------------

const startScreen =
    document.getElementById("startScreen");

const startButton =
    document.getElementById("startAR");

const status =
    document.getElementById("status");

const arInterface =
    document.getElementById("arInterface");

const exitButton =
    document.getElementById("exitAR");

const placeButton =
    document.getElementById("placeObject");

const instruction =
    document.getElementById("instruction");


// --------------------------------------------------
// CHECK WEBXR
// --------------------------------------------------

async function checkARSupport() {

    if (!navigator.xr) {

        status.textContent =
            "WebXR AR не поддерживается этим браузером.";

        startButton.disabled = true;

        return false;
    }

    try {

        const supported =
            await navigator.xr.isSessionSupported(
                "immersive-ar"
            );

        if (!supported) {

            status.textContent =
                "AR режим недоступен на этом устройстве.";

            startButton.disabled = true;

            return false;
        }

        status.textContent =
            "AR готов.";

        return true;

    } catch (error) {

        console.error(error);

        status.textContent =
            "Не удалось проверить AR.";

        return false;
    }
}


// --------------------------------------------------
// INITIALIZE THREE.JS
// --------------------------------------------------

function initThree() {

    scene = new THREE.Scene();


    // Камера будет управляться XR
    camera = new THREE.PerspectiveCamera();


    renderer = new THREE.WebGLRenderer({

        antialias: true,

        alpha: true,

        preserveDrawingBuffer: false

    });


    renderer.setPixelRatio(
        Math.min(window.devicePixelRatio, 2)
    );


    renderer.setSize(
        window.innerWidth,
        window.innerHeight
    );


    renderer.xr.enabled = true;


    document.body.appendChild(
        renderer.domElement
    );


    // ------------------------------------------------
    // LIGHT
    // ------------------------------------------------

    const ambientLight =
        new THREE.HemisphereLight(
            0xffffff,
            0xbbbbff,
            2
        );

    scene.add(ambientLight);


    const directionalLight =
        new THREE.DirectionalLight(
            0xffffff,
            2
        );

    directionalLight.position.set(
        1,
        3,
        2
    );

    scene.add(directionalLight);


    // ------------------------------------------------
    // RETICLE
    // ------------------------------------------------

    const ringGeometry =
        new THREE.RingGeometry(
            0.08,
            0.1,
            32
        ).rotateX(-Math.PI / 2);


    const ringMaterial =
        new THREE.MeshBasicMaterial({
            color: 0xffffff
        });


    reticle =
        new THREE.Mesh(
            ringGeometry,
            ringMaterial
        );


    reticle.matrixAutoUpdate = false;

    reticle.visible = false;

    scene.add(reticle);


    // ------------------------------------------------
    // CONTROLLER
    // ------------------------------------------------

    controller =
        renderer.xr.getController(0);

    controller.addEventListener(
        "select",
        onSelect
    );

    scene.add(controller);


    // ------------------------------------------------
    // LOAD MODEL
    // ------------------------------------------------

    loadModel();
}


// --------------------------------------------------
// LOAD GLB
// --------------------------------------------------

function loadModel() {

    const loader =
        new GLTFLoader();


    loader.load(

        "./models/scene.glb",

        function(gltf) {

            loadedObject =
                gltf.scene;


            // Начальный размер
            loadedObject.scale.set(
                1,
                1,
                1
            );


            // Пока объект скрыт
            loadedObject.visible = false;


            scene.add(
                loadedObject
            );


            console.log(
                "3D модель загружена"
            );

        },

        function(progress) {

            console.log(
                "Загрузка:",
                progress.loaded
            );

        },

        function(error) {

            console.error(
                "Ошибка загрузки модели:",
                error
            );

            instruction.textContent =
                "Ошибка загрузки 3D модели";
        }
    );
}


// --------------------------------------------------
// START AR
// --------------------------------------------------

async function startAR() {

    if (!navigator.xr) {

        alert(
            "Ваш браузер не поддерживает WebXR."
        );

        return;
    }


    try {

        const session =
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


        xrSession = session;


        renderer.xr.setReferenceSpaceType(
            "local-floor"
        );


        await renderer.xr.setSession(
            session
        );


        startScreen.style.display =
            "none";


        arInterface.style.display =
            "block";


        placeButton.style.display =
            "block";


        instruction.textContent =
            "Наведите камеру на поверхность";


        session.addEventListener(
            "end",
            onSessionEnd
        );


        renderer.setAnimationLoop(
            render
        );


    } catch (error) {

        console.error(
            "Ошибка запуска AR:",
            error
        );

        status.textContent =
            "Не удалось запустить AR.";
    }
}


// --------------------------------------------------
// END AR
// --------------------------------------------------

function onSessionEnd() {

    xrSession = null;

    hitTestSource = null;

    hitTestSourceRequested = false;


    renderer.setAnimationLoop(
        null
    );


    arInterface.style.display =
        "none";


    startScreen.style.display =
        "flex";


    objectPlaced = false;


    if (loadedObject) {

        loadedObject.visible =
            false;
    }
}


// --------------------------------------------------
// PLACE OBJECT
// --------------------------------------------------

function placeObject() {

    if (!loadedObject) {

        instruction.textContent =
            "3D модель ещё загружается";

        return;
    }


    if (!reticle.visible) {

        instruction.textContent =
            "Сначала наведите камеру на поверхность";

        return;
    }


    // Получаем мировую позицию
    // найденной поверхности

    loadedObject.position.setFromMatrixPosition(
        reticle.matrix
    );


    // Поворот относительно поверхности

    const quaternion =
        new THREE.Quaternion();

    quaternion.setFromRotationMatrix(
        reticle.matrix
    );


    loadedObject.quaternion.copy(
        quaternion
    );


    loadedObject.visible =
        true;


    objectPlaced =
        true;


    reticle.visible =
        false;


    instruction.textContent =
        "Объект закреплён в пространстве";


    placeButton.style.display =
        "none";
}


// --------------------------------------------------
// SELECT EVENT
// --------------------------------------------------

function onSelect() {

    if (!objectPlaced) {

        placeObject();
    }
}


// --------------------------------------------------
// HIT TEST
// --------------------------------------------------

async function updateHitTest(
    frame
) {

    const session =
        renderer.xr.getSession();


    if (!session) {
        return;
    }


    const referenceSpace =
        renderer.xr.getReferenceSpace();


    // Создаём источник hit-test
    // только один раз

    if (!hitTestSourceRequested) {

        const viewerSpace =
            await session.requestReferenceSpace(
                "viewer"
            );


        hitTestSource =
            await session.requestHitTestSource({
                space: viewerSpace
            });


        hitTestSourceRequested =
            true;
    }


    if (!hitTestSource) {
        return;
    }


    const hitTestResults =
        frame.getHitTestResults(
            hitTestSource
        );


    if (
        hitTestResults.length > 0 &&
        !objectPlaced
    ) {

        const hit =
            hitTestResults[0];


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


            instruction.textContent =
                "Поверхность найдена — нажмите «Разместить»";
        }

    } else {

        if (!objectPlaced) {

            reticle.visible =
                false;

            instruction.textContent =
                "Наведите камеру на поверхность";
        }
    }
}


// --------------------------------------------------
// RENDER
// --------------------------------------------------

function render(
    timestamp,
    frame
) {

    if (!frame) {
        return;
    }


    updateHitTest(
        frame
    );


    renderer.render(
        scene,
        camera
    );
}


// --------------------------------------------------
// EVENTS
// --------------------------------------------------

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
    async () => {

        if (xrSession) {

            await xrSession.end();
        }
    }
);


// --------------------------------------------------
// RESIZE
// --------------------------------------------------

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


// --------------------------------------------------
// START
// --------------------------------------------------

initThree();

checkARSupport();
