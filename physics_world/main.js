// Imported like this here but could be done via webpack in larger projects. Just being used as a boilerplate
// Basic JS World https://www.youtube.com/watch?v=PPwR7h5SnOE
import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.module.js';
import {OrbitControls} from 'https://cdn.jsdelivr.net/npm/three@0.118/examples/jsm/controls/OrbitControls.js'

const KEYS = {
    'a': 65,
    's': 83,
    'w': 87,
    'd': 68,
  };

function clamp(x, a, b) {
    return Math.min(Math.max(x, a), b);
}
class InputController {
    constructor(target) {
        this._target = target || document;
        this._initialize();
    }

    _initialize() {
        this._current = {
            leftButton: false,
            rightButton: false,
            mouseXDelta: 0,
            mouseYDelta: 0,
            mouseX: 0,
            mouseY: 0,
        };
        this._previous = null;
        this._keys = {};
        this._previousKeys = {};
        this._target.addEventListener('mousedown', (e) => this._onMouseDown(e), false);
        this._target.addEventListener('click', (e) => this._onMouseDown(e), false);
        this._target.addEventListener('mousemove', (e) => this._onMouseMove(e), false);
        this._target.addEventListener('mouseup', (e) => this._onMouseUp(e), false);
        this._target.addEventListener('keydown', (e) => this._onKeyDown(e), false);
        this._target.addEventListener('keyup', (e) => this._onKeyUp(e), false);
    }

    _onMouseMove(e) {
        
        if (this._previous === null) {
            this._previous = {...this._current};
        }

        this._current.mouseXDelta = e.movementX || e.mozMovementX || e.webkitMovementX || 0;
        this._current.mouseYDelta = e.movementY || e.mozMovementY || e.webkitMovementY || 0;

    }

    _onMouseDown(e) {
        this._onMouseMove(e);
        switch(e.button) {
            case 0:
                this._current.leftButton = true;
                break;
            case 2:
                this._current.rightButton = true;
                break;
        }
    }

    _onMouseUp(e) {
        this._onMouseMove(e);
        switch(e.button) {
            case 0:
                this._current.leftButton = false;
                break;
            case 2:
                this._current.rightButton = false;
                break;
        }
    }

    _onKeyDown(e) {
        this._keys[e.keyCode] = true;
    }

    _onKeyUp(e) {
        this._keys[e.keyCode] = false;
    }

    key(keyCode) {
        return !!this._keys[keyCode];
    }

    isReady() {
        return this._previous !== null;
    }

    update(_) {
        if (this.isReady()) {
            this._current.mouseXDelta = this._current.mouseX - this._previous.mouseX;
            this._current.mouseYDelta = this._current.mouseY - this._previous.mouseY;
            
            this._previous = {...this._current};
        }
    }
}

class FirstPersonCamera {
    constructor(camera, objects) {
        this._camera = camera;
        this._input = new InputController();
        this._rotation = new THREE.Quaternion();
        this._translation = new THREE.Vector3(0, 2, 0);
        this._phi = 0;
        this._phiSpeed = 6;
        this._theta = 0;
        this._thetaSpeed = 3;
        this._headBobActive = false;
        this._headBobTimer = 0;
        this._objects = objects;
    }

    inputController() {
        return this._input;
    }

    update(timeElapsedS) {
        this._updateRotation(timeElapsedS);
        this._updateCamera(timeElapsedS);
        this._updateTranslation(timeElapsedS);
        this._updateHeadBob(timeElapsedS);
        this._input.update(timeElapsedS);
    }

    _updateCamera(_) {
        this._camera.quaternion.copy(this._rotation);
        this._camera.position.copy(this._translation);
        this._camera.position.y += Math.sin(this._headBobTimer * 10) / 4;

        const forward = new THREE.Vector3(0, 0, -1);
        forward.applyQuaternion(this._rotation);

        const dir = forward.clone();

        forward.multiplyScalar(100);
        forward.add(this._translation);

        let closest = forward;
        const result = new THREE.Vector3();
        const ray = new THREE.Ray(this._translation, dir);
        for (let i=0; i < this._objects.length; i++) {
            if (ray.intersectBox(this._objects[i], result)) {
                if (result.distanceTo(ray.origin) < closest.distanceTo(ray.origin)) {
                    closest = result.clone();
                }
            }
        }

        this._camera.lookAt(closest);
    }

    _updateHeadBob(timeElapsedS) {
        if (this._headBobActive) {
            const wavelength = Math.PI;
            const nextStep = 1 + Math.floor(((this._headBobTimer + 0.000001) * 10) / wavelength);
            const nextStepTime = nextStep * wavelength / 10;
            this._headBobTimer = Math.min(this._headBobTimer + timeElapsedS, nextStepTime);
            
            if (this._headBobTimer == nextStepTime) {
                this._headBobActive = false;
            }
        }
    }

    _updateTranslation(timeElapsedS) {
        const forwardVelocity = (this._input.key(KEYS.w) ? 1 : 0) + (this._input.key(KEYS.s) ? -1 : 0);
        const strafeVelocity = (this._input.key(KEYS.a) ? 1 : 0) + (this._input.key(KEYS.d) ? -1 : 0);
    
        const qx = new THREE.Quaternion();
        qx.setFromAxisAngle(new THREE.Vector3(0, 1, 0), this._phi);

        const forward = new THREE.Vector3(0, 0, -1);
        forward.applyQuaternion(qx);
        forward.multiplyScalar(forwardVelocity * timeElapsedS * 10);

        const left = new THREE.Vector3(-1, 0, 0);
        left.applyQuaternion(qx);
        left.multiplyScalar(strafeVelocity * timeElapsedS * 10);

        this._translation.add(forward);
        this._translation.add(left);

        if (forwardVelocity != 0 || strafeVelocity != 0) {
            this._headBobActive = true;
        }
    }

    _updateRotation(timeElapsedS) {
        const xh = this._input._current.mouseXDelta / window.innerWidth;
        const yh = this._input._current.mouseYDelta / window.innerHeight;

        this._phi += -xh * this._phiSpeed;
        this._theta = clamp(this._theta + -yh * this._thetaSpeed, -Math.PI / 3, Math.PI / 3);

        const qx = new THREE.Quaternion();
        qx.setFromAxisAngle(new THREE.Vector3(0, 1, 0), this._phi);
        const qz = new THREE.Quaternion();
        qz.setFromAxisAngle(new THREE.Vector3(1, 0, 0), this._theta);

        const q = new THREE.Quaternion();
        q.multiply(qx);
        q.multiply(qz);

        this._rotation.copy(q);
    }
}

class PhysicsObject3D {
    constructor(tag, physicsWorld, scene, rigidBodies) {
        this.tag = tag;
        this._physicsWorld = physicsWorld;
        this._scene = scene;
        this._rigidBodies = rigidBodies;
    }

    createBox(mass, pos, rotation, size, color) {
        // ThreeJS section
        this._objThree = new THREE.Mesh(
            new THREE.BoxGeometry(size[0], size[1], size[2]),
            new THREE.MeshPhongMaterial({color})
        );
        
        this._objThree.position.set(pos[0], pos[1], pos[2]);
        this._objThree.rotation.set(rotation[0], rotation[1], rotation[2])
        this._objThree.castShadow = true;
        this._objThree.receiveShadow = true;
        this._objThree.userData.tag = this.tag;
        this._scene.add(this._objThree);

        // Ammo.js section
        this._objAmmo = new RigidBody();
        this._objAmmo.createBox(mass, new THREE.Vector3(pos[0], pos[1], pos[2]), this._objThree.quaternion, new THREE.Vector3(size[0], size[1], size[2]));
        this._physicsWorld.addRigidBody(this._objAmmo._body);
    }

    setFriction(friction, rollingFriction) {
        this._objAmmo._body.setFriction(friction);
        this._objAmmo._body.setRollingFriction(rollingFriction);
        this._objAmmo._body.setActivationState(4);
    }

    createBall(mass, pos, radius, color) {
        this._objThree = new THREE.Mesh(
            new THREE.SphereBufferGeometry(radius),
            new THREE.MeshPhongMaterial({color})
        );

        this._objThree.position.set(pos[0], pos[1], pos[2]);
        this._objThree.castShadow = true;
        this._objThree.receiveShadow = true;
        this._objThree.userData.tag = this.tag;
        this._scene.add(this._objThree);

        // Ammo.js section
        this._objAmmo = new RigidBody();
        this._objAmmo.createBall(mass, this._objThree.position, this._objThree.quaternion, radius);
        this._physicsWorld.addRigidBody(this._objAmmo._body);
    }

    ground(isOnGround) {
        this._grounded = isOnGround;
    }

    addToRigidBodies() {
        this._rigidBodies.push(this);
    }
}

class RigidBody {
    constructor() {
    }

    createBox(mass, pos, quat, size) {
        this._transform = new Ammo.btTransform();
        this._transform.setIdentity();
        this._transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
        this._transform.setRotation(new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w));
        this._motionState = new Ammo.btDefaultMotionState(this._transform);

        const btSize = new Ammo.btVector3(size.x * 0.5, size.y * 0.5, size.z * 0.5);
        this._shape = new Ammo.btBoxShape(btSize);
        this._shape.setMargin(0.05);

        this._inertia = new Ammo.btVector3(0, 0, 0);
        if (mass > 0) {
            this._shape.calculateLocalInertia(mass, this._inertia);
        }

        this._info = new Ammo.btRigidBodyConstructionInfo(
            mass, this._motionState, this._shape, this._inertia
        );
        this._body = new Ammo.btRigidBody(this._info);
        // Ammo.destroy(btSize);
    }

    createBall(mass, pos, quat, radius) {
        this._transform = new Ammo.btTransform();
        this._transform.setIdentity();
        this._transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
        this._transform.setRotation(new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w));
        this._motionState = new Ammo.btDefaultMotionState(this._transform);

        this._shape = new Ammo.btSphereShape(radius);
        this._shape.setMargin(0.05);

        this._inertia = new Ammo.btVector3(0, 0, 0);
        this._shape.calculateLocalInertia(mass, this._inertia);

        this._info = new Ammo.btRigidBodyConstructionInfo(
            mass, this._motionState, this._shape, this._inertia
        );
        this._body = new Ammo.btRigidBody(this._info);
    }
}

class BasicWorldDemo {
    constructor() {
    }

    _Initialize() {
        // TODO: Set up Dat.Gui for debug stuff
        // TODO: jump()
        // TODO: 
        // Ammo.JS config
        this._collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
        this._dispatcher = new Ammo.btCollisionDispatcher(this._collisionConfiguration);
        this._broadphase = new Ammo.btDbvtBroadphase();
        this._solver = new Ammo.btSequentialImpulseConstraintSolver();
        this._physicsWorld = new Ammo.btDiscreteDynamicsWorld(
            this._dispatcher, this._broadphase, this._solver, this._collisionConfiguration
            );
            
            this._physicsWorld.setGravity(new Ammo.btVector3(0, -20, 0));
            
            // ThreeJS init with the canvas from HTML
            this._canvas = document.querySelector('canvas.webgl');
            this._threejs = new THREE.WebGLRenderer({
                canvas: this._canvas
            });
            this._threejs.shadowMap.enabled = true;
            this._threejs.shadowMap.type = THREE.PCFSoftShadowMap;
            this._threejs.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            this._threejs.setSize(window.innerWidth, window.innerHeight);
            
        document.body.appendChild(this._threejs.domElement);
        
        window.addEventListener('resize', () => {
            this._OnWindowResize();
        }, false);
        
        window.addEventListener('click', () => {
            // this._threejs.domElement.requestPointerLock();
        }, false);
        
        

        // Camera setup
        const fov = 70;
        const aspect = window.innerWidth / window.innerHeight;
        const near = 1.0;
        const far = 1000.0;
        this._camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
        this._camera.position.set(-200, 100, 10);
        this._camera.lookAt(new THREE.Vector3(0, 0, 0));
        
        // FPS Camera
        this._objects = [];
        this._fpsCamera = new FirstPersonCamera(this._camera, this._objects);

        // Input
        this._input = this._fpsCamera.inputController();
        
        // Scene
        this._scene = new THREE.Scene();

        this._controls = new OrbitControls(this._camera, this._threejs.domElement);
        this._controls.target.set(0, 20, 0)
        this._controls.update()

        // Raycaster
        this._raycaster = new THREE.Raycaster()
        this._arrowHelper = new THREE.ArrowHelper(
            new THREE.Vector3(),
            new THREE.Vector3(),
            30,
            0x000000
        )
        this._scene.add(this._arrowHelper)

        // Light setup

        //Add hemisphere light
        let hemiLight = new THREE.HemisphereLight( 0xffffff, 0xffffff, 0.1 );
        hemiLight.color.setHSL( 0.6, 0.6, 0.6 );
        hemiLight.groundColor.setHSL( 0.1, 1, 0.4 );
        hemiLight.position.set( 0, 50, 0 );
        this._scene.add( hemiLight );

        //Add directional light
        let dirLight = new THREE.DirectionalLight( 0xffffff , 1);
        dirLight.color.setHSL( 0.1, 1, 0.95 );
        dirLight.position.set( 1, 1.75, 1 );
        dirLight.position.multiplyScalar( 100 );
        this._scene.add( dirLight );

        dirLight.castShadow = true;

        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;

        let d = 50;

        dirLight.shadow.camera.left = -d;
        dirLight.shadow.camera.right = d;
        dirLight.shadow.camera.top = d;
        dirLight.shadow.camera.bottom = -d;

        dirLight.shadow.camera.near = 100;
        dirLight.shadow.camera.far = 600;
        

        // Skybox
        const loader = new THREE.CubeTextureLoader();
        const texture = loader.load([
            './resources/skyboxes/water/humble_ft.jpg',
            './resources/skyboxes/water/humble_bk.jpg',
            './resources/skyboxes/water/humble_up.jpg',
            './resources/skyboxes/water/humble_dn.jpg',
            './resources/skyboxes/water/humble_rt.jpg',
            './resources/skyboxes/water/humble_lf.jpg',
        ]);

        this._scene.background = texture;
        this._rigidBodies = []

        // Ground Plane
        const newGround = new PhysicsObject3D("ground", this._physicsWorld, this._scene, this._rigidBodies);
        newGround.createBox(0, [0, 0, 0], [0, 0, 0], [100, 1, 100], 0xe5e5e5);
        newGround.addToRigidBodies();
        const ball1 = new PhysicsObject3D("ball1", this._physicsWorld, this._scene, this._rigidBodies);
        ball1.createBall(20, [1, 100, 0], 2, 0xfb8500);
        ball1.addToRigidBodies();
        ball1.setFriction(4, 10)
        
        const box1 = new PhysicsObject3D("box1", this._physicsWorld, this._scene, this._rigidBodies);
        box1.createBox(0, [-10, 3, -12], [0, -Math.PI / 2, Math.PI / 5], [1, 6, 15], 0x8ecae6);
        box1.addToRigidBodies();

        this._tmpTransform = new Ammo.btTransform();
        this._previousRAF = null;
        
        // const axesHelper = new THREE.AxesHelper( 100 );
        // this._scene.add( axesHelper );
        this._RAF();
    }

    _OnWindowResize() {
        this._camera.aspect = window.innerWidth / window.innerHeight;
        this._camera.updateProjectionMatrix();
        this._threejs.setSize(window.innerWidth, window.innerHeight);
    }

    _RAF() {
        requestAnimationFrame((t) => {
            if (this._previousRAF === null) {
                this._previousRAF = t;
            }

            // Step the simulation on a new frame
            this._Step(t - this._previousRAF);

            // Render the new frame, then trigger next frame update
            this._threejs.render(this._scene, this._camera);
            this._RAF();
            this._moveBall(t - this._previousRAF);
            
            this._previousRAF = t;
        });
    }

    _Step(timeElapsed) {
        const timeElapsedS = timeElapsed * 0.001;

        // this._fpsCamera.update(timeElapsedS);
        let ground = this._rigidBodies[0];
        let ball = this._rigidBodies[1];
        this._physicsWorld.stepSimulation(timeElapsedS, 10);

        for (let i = 0; i < this._rigidBodies.length; i++) {
            let objThree = this._rigidBodies[i]._objThree;
            let objAmmo = this._rigidBodies[i]._objAmmo;
            objAmmo._motionState.getWorldTransform(this._tmpTransform);
            const pos = this._tmpTransform.getOrigin();
            const quat = this._tmpTransform.getRotation();
            const pos3 = new THREE.Vector3(pos.x(), pos.y(), pos.z());
            const quat3 = new THREE.Quaternion(quat.x(), quat.y(), quat.z(), quat.w());

            objThree.position.copy(pos3);
            objThree.quaternion.copy(quat3);
        }
        let ballOnGround = false;
        const collisions = this._detectCollision();
        for (const collision of collisions) {
            if (collision.object0.tag == ground.tag || collision.object1.tag == ground.tag) {
                if (collision.object1.tag == ball.tag || collision.object1.tag == ball.tag) {
                    ballOnGround = true;
                }
            }
        }
        if (ball._grounded != ballOnGround) {
            ball.ground(ballOnGround);
        }
    }

    _moveBall(timeElapsedS) {
        let ball = this._rigidBodies[1]._objAmmo._body;
        let ground = this._rigidBodies[0]._objAmmo._body;

        ground.threeObject = this._rigidBodies[0]._objThree;
        ball.threeObject = this._rigidBodies[1]._objThree;

        let linearVel = ball.getLinearVelocity();
        const strafeDirection = (this._input.key(KEYS.d) ? 1 : 0) + (this._input.key(KEYS.a) ? -1 : 0);
        const forwardDirection = (this._input.key(KEYS.w) ? 1 : 0) + (this._input.key(KEYS.s) ? -1 : 0);

        let direction = new THREE.Vector3(forwardDirection, 0, strafeDirection);
        this._arrowHelper.setDirection(direction)
        this._arrowHelper.position.copy(this._rigidBodies[1]._objThree.position)
        direction.normalize()
        if (strafeDirection == 0 && forwardDirection == 0) {
            console.log(linearVel.x(), linearVel.y(), linearVel.z())
            if (linearVel.y() == 0) {
                linearVel.setX(linearVel.x() * 0.9)   
                linearVel.setZ(linearVel.z() * 0.9)
            }
        }
        const walkAccel = 400
        const maxLinearVel = 400;
        if (this._rigidBodies[1]._grounded) {
            let dv = direction.multiplyScalar(walkAccel * 0.1 * timeElapsedS);
            linearVel.setX(linearVel.x() + dv.x)
            linearVel.setY(dv.y)
            linearVel.setZ(linearVel.z() + dv.z)
            let speed2 = Math.pow(linearVel.x(), 2) + Math.pow(linearVel.z(), 2);
            if (speed2 > maxLinearVel) {
                let correction = Math.sqrt(maxLinearVel / speed2);
                linearVel.setX(linearVel.x() * correction);
                linearVel.setZ(linearVel.z() * correction);
            }
            ball.setLinearVelocity(linearVel);
        }


    }

    _detectCollision() {
        let dispatcher = this._physicsWorld.getDispatcher();
        let numManifolds = dispatcher.getNumManifolds();
        let contactObjects = [];
        for (let i=0; i < numManifolds; i++) {
            let contactManifold = dispatcher.getManifoldByIndexInternal(i);

            let rb0 = Ammo.castObject(contactManifold.getBody0(), Ammo.btRigidBody);
            let rb1 = Ammo.castObject(contactManifold.getBody1(), Ammo.btRigidBody);

            let threeObj0 = rb0.threeObject;
            let threeObj1 = rb1.threeObject;

            if (!threeObj0 && !threeObj1) continue;

            let tag0 = threeObj0 ? threeObj0.userData.tag : null;
            let tag1 = threeObj1 ? threeObj1.userData.tag : null;

            let numContacts = contactManifold.getNumContacts();

            for (let j=0; j < numContacts; j++) {
                let contactPoint = contactManifold.getContactPoint(j);
                let distance = contactPoint.getDistance();
                if (distance > 0.0) continue

                let velocity0 = rb0.getLinearVelocity();
                let velocity1 = rb1.getLinearVelocity();

                let worldPos0 = contactPoint.get_m_positionWorldOnA();
                let worldPos1 = contactPoint.get_m_positionWorldOnB();

                let localPos0 = contactPoint.get_m_localPointA();
                let localPos1 = contactPoint.get_m_localPointB();
                contactObjects.push({
                    manifoldIndex: i, 
                    contactIndex: j, 
                    distance: distance, 
                    object0:{
                     tag: tag0,
                     velocity: {x: velocity0.x(), y: velocity0.y(), z: velocity0.z()},
                     worldPos: {x: worldPos0.x(), y: worldPos0.y(), z: worldPos0.z()},
                     localPos: {x: localPos0.x(), y: localPos0.y(), z: localPos0.z()}
                    },
                    object1:{
                     tag: tag1,
                     velocity: {x: velocity1.x(), y: velocity1.y(), z: velocity1.z()},
                     worldPos: {x: worldPos1.x(), y: worldPos1.y(), z: worldPos1.z()},
                     localPos: {x: localPos1.x(), y: localPos1.y(), z: localPos1.z()}
                    }
                });
            }
        }
        return contactObjects;
    }
}

let _APP = null;

window.addEventListener('DOMContentLoaded', () => {
    Ammo().then((lib) => {
        Ammo = lib;
        _APP = new BasicWorldDemo();
        _APP._Initialize();
    })
})