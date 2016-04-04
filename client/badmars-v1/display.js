/* @flow */
'use strict';

// monofuel
// 2-7-2016

import {
	PlanetLoc
} from './map/planetLoc.js';

const CAMERA_SPEED = 30;
const ORTHOGRAPHIC = false;
const SUN_SPEED = 0.025;
const SUN_COLOR = 0xDD9A70;
const MOON_COLOR = 0x9AA09A;

export class Display {
	lightAngle: number;
	d: number;
	camera: THREE.orthographicCamera | THREE.PerspectiveCamera;
	light: THREE.DirectionalLight;
	moonLight: THREE.DirectionalLight;
	hemLight: THREE.HemisphereLight;
	scene: THREE.Scene;
	renderer: THREE.WebGLRenderer;

	constructor() {
		this.scene = new THREE.Scene();

		var aspectRatio = window.innerWidth / window.innerHeight;
		this.lightAngle = 0.0;
		this.d = 15;

		if (ORTHOGRAPHIC) {
			this.camera = new THREE.OrthographicCamera(-this.d * aspectRatio, this.d * aspectRatio, this.d, -this.d, 1, 1000);
		} else {
			this.camera = new THREE.PerspectiveCamera(45, aspectRatio, 0.1, 1000);
		}

		var panel = document.getElementById('threePanel');
		console.log('threePanel is ', panel.offsetWidth, panel.offsetHeight);

		this.renderer = new THREE.WebGLRenderer({
			antialias: false,
			canvas: panel
		});

		this.renderer.setSize(window.innerWidth, window.innerHeight);
		this.hemLight = new THREE.HemisphereLight(0xffffff, 0xFFBF00, 0.3);
		this.scene.add(this.hemLight);
		this.moonLight = new THREE.DirectionalLight(MOON_COLOR, 0.2);
		this.scene.add(this.moonLight);
		this.light = new THREE.DirectionalLight(SUN_COLOR, 1);
		this.updateSunPosition(0);
		this.scene.add(this.light);

		if (ORTHOGRAPHIC) {
			this.camera.position.set(25, 80, -15);
			this.camera.up = new THREE.Vector3(0, 0, 1);
			this.camera.rotation.set(-0.8, -Math.PI / 4, 0);
			this.camera.rotation.order = 'YXZ';
		} else {
			this.camera.position.set(8, 20, -8);
			this.camera.up = new THREE.Vector3(0, 0, 1);
			this.camera.rotation.set(-1, -Math.PI / 2, 0);
			this.camera.rotation.order = 'YXZ';
		}

		this.camera.updateProjectionMatrix();
		window.debug.camera = this.camera;
		console.log('threejs ready');
	}

	viewTile(tile: PlanetLoc) {
		console.log('focusing');
		console.log(tile);
		if (ORTHOGRAPHIC) {
			this.camera.position.x = tile.real_x - 45.5;
			this.camera.position.z = tile.real_y + 50;
		} else {
			console.log(tile.getLoc());
			this.camera.position.copy(tile.getLoc());
			this.camera.position.x -= 13;
			this.camera.position.y += 25;
			this.camera.position.z -= 13;
			this.camera.rotation.set(-1, -2.3708363267948984, 0);
		}
	}

	updateSunPosition(delta: number) {
		this.lightAngle += Math.PI * delta * SUN_SPEED;
		if (this.lightAngle > 2 * Math.PI) {
			this.lightAngle -= 2 * Math.PI;
		}
		this.light.position.y = Math.cos(this.lightAngle) * 50;
		this.light.position.z = Math.sin(this.lightAngle) * 50;
		this.moonLight.position.y = -(Math.cos(this.lightAngle) * 50);
		this.moonLight.position.z = -(Math.sin(this.lightAngle) * 50);
	}

	cameraUp(delta: number) {
		if (ORTHOGRAPHIC) {
			this.d *= 1 - (1 * delta);
			this.resize();
		} else {
			this.camera.position.y += CAMERA_SPEED * delta;
		}
	}

	cameraDown(delta: number) {
		if (ORTHOGRAPHIC) {
			this.d *= 1 + (1 * delta);
			this.resize();
		} else {
			this.camera.position.y -= CAMERA_SPEED * delta;
		}
	}

	cameraForward(delta: number) {
		this.camera.translateZ(Math.cos(this.camera.rotation.x + Math.PI) * CAMERA_SPEED * delta);
		this.camera.translateY(Math.sin(this.camera.rotation.x + Math.PI) * CAMERA_SPEED * delta)
	}

	cameraBackward(delta: number) {
		this.camera.translateZ(Math.cos(this.camera.rotation.x) * CAMERA_SPEED * delta)
		this.camera.translateY(Math.sin(this.camera.rotation.x) * CAMERA_SPEED * delta)
	}
	cameraLeft(delta: number) {
		this.camera.translateX(Math.cos(this.camera.rotation.x + Math.PI) * CAMERA_SPEED * delta);
	}

	cameraRight(delta: number) {
		this.camera.translateX(Math.cos(this.camera.rotation.x) * CAMERA_SPEED * delta);
	}

	cameraRotateRight(delta: number) {
		if (ORTHOGRAPHIC) {
			this.camera.rotation.y += CAMERA_SPEED * delta / 20;
			this.camera.translateX(-Math.cos(this.camera.rotation.x + Math.PI) * CAMERA_SPEED * delta * 5.2);
		} else {
			this.camera.rotation.y += CAMERA_SPEED * delta / 10;
		}
	}
	cameraRotateLeft(delta: number) {
		if (ORTHOGRAPHIC) {
			this.camera.rotation.y -= CAMERA_SPEED * delta / 20;
			this.camera.translateX(Math.cos(this.camera.rotation.x + Math.PI) * CAMERA_SPEED * delta * 5.2);
		} else {
			this.camera.rotation.y -= CAMERA_SPEED * delta / 10;
		}
	}

	resize() {
		var aspectRatio = window.innerWidth / window.innerHeight;
		if (ORTHOGRAPHIC) {
			this.camera.left = -this.d * aspectRatio;
			this.camera.right = this.d * aspectRatio;
			this.camera.top = this.d;
			this.camera.bottom = -this.d;
			this.camera.updateProjectionMatrix();
		} else {
			this.camera.aspect = aspectRatio;
			this.camera.updateProjectionMatrix();
		}
		this.renderer.setSize(window.innerWidth, window.innerHeight);
	}


	addMesh(mesh: THREE.Object3D) {
		this.scene.add(mesh);
	}

	removeMesh(mesh: THREE.Object3D) {
		this.scene.remove(mesh);
	}

	render(delta: number) {
		this.updateSunPosition(delta);
		this.renderer.render(this.scene, this.camera);
	}
}
