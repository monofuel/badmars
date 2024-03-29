// monofuel

import { autobind } from 'core-decorators';
import PlanetLoc from './map/planetLoc';
import GameState from './state';
import config from './config';
import { log } from './logger';
import * as THREE from 'three';

export default class Display {
	private lightAngle: number;
	private d: number;
	public camera: THREE.OrthographicCamera | THREE.PerspectiveCamera;
	private light: THREE.DirectionalLight;
	private moonLight: THREE.DirectionalLight;
	private hemLight: THREE.HemisphereLight;
	private scene: THREE.Scene;
	public renderer: THREE.WebGLRenderer;
	private panel: HTMLCanvasElement;
	private HUDPanel: HTMLCanvasElement;
	private HUDContext: CanvasRenderingContext2D;
	private clippingPlane: THREE.Plane;

	private T: any;

	constructor() {

		this.scene = new THREE.Scene();

		// for debugging
		this.T = THREE;

		const aspectRatio = window.innerWidth / window.innerHeight;
		this.lightAngle = 1.5 * Math.PI;
		this.d = 15;

		if (config.orthographic) {
			this.camera = new THREE.OrthographicCamera(-this.d * aspectRatio, this.d * aspectRatio, this.d, -this.d, 1, 1000);
		} else {
			this.camera = new THREE.PerspectiveCamera(45, aspectRatio, 0.1, 1000);
		}

		this.panel = document.getElementById('threePanel') as HTMLCanvasElement;
		this.HUDPanel = document.getElementById('HUDPanel') as HTMLCanvasElement;
		this.HUDContext = this.HUDPanel.getContext('2d');
		this.HUDPanel.width = window.innerWidth;
		this.HUDPanel.height = window.innerHeight;

		this.hemLight = new THREE.HemisphereLight(0xffffff, 0xFFBF00, 0.3);
		this.scene.add(this.hemLight);
		this.moonLight = new THREE.DirectionalLight(gameState.moonColor, 0.2);
		this.scene.add(this.moonLight);
		this.light = new THREE.DirectionalLight(gameState.sunColor, 1);
		this.light.target = this.camera;
		this.light.castShadow = config.shadows;
		this.light.shadow.bias = -0.0003;
		this.light.shadow.mapSize.width = 2048;
		this.light.shadow.mapSize.height = 2048;
		this.light.shadow.camera.top = 50;
		this.light.shadow.camera.bottom = -50;
		this.light.shadow.camera.left = 50;
		this.light.shadow.camera.right = -50;
		this.light.shadow.camera.far = 500;
		this.light.shadow.camera.updateProjectionMatrix();

		this.clippingPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 40);

		this.updateRenderer();

		this.updateSunPosition(0);
		this.scene.add(this.light);
		// this.scene.add(new THREE.CameraHelper(this.light.shadow.camera));
		// this.scene.fog = new THREE.Fog( 0x111111, 40, 130 );

		if (config.orthographic) {
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

		window.onresize = this.resize;
	}
	updateRenderer() {

		this.renderer = new THREE.WebGLRenderer({
			antialias: config.antiAlias,
			canvas: this.panel
		});
		this.renderer.shadowMap.enabled = config.shadows;
		this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

		this.renderer.setSize(window.innerWidth, window.innerHeight);
		this.renderer.clippingPlanes = [this.clippingPlane];
	}

	viewTile(tile: PlanetLoc) {
		log('debug', 'viewing tile', { x: tile.x, y: tile.y });
		if (config.orthographic) {
			this.camera.position.x = tile.real_x - 45.5;
			this.camera.position.z = tile.real_y + 50;
		} else {
			this.camera.position.copy(tile.getLoc());
			this.camera.position.x -= 23;
			this.camera.position.y += 36;
			this.camera.position.z -= 23;
			this.camera.rotation.set(-1, -2.3708363267948984, 0);
		}
	}

	updateSunPosition(delta: number) {

		this.lightAngle += Math.PI * delta * gameState.sunSpeed;
		if (this.lightAngle > 2 * Math.PI) {
			// this.lightAngle -= 2 * Math.PI;
		}
		if (this.lightAngle > 1.6 * Math.PI || this.lightAngle < 0.4 * Math.PI) {
			// during day
			this.light.castShadow = config.shadows;
		} else {
			this.light.castShadow = false;
		}
		// keeping the light near the camera for shadows
		this.light.position.copy(this.camera.position);
		this.light.position.y += Math.cos(this.lightAngle) * 100;
		this.light.position.z += Math.sin(this.lightAngle) * 100;
		this.moonLight.position.y = -(Math.cos(this.lightAngle) * 50);
		this.moonLight.position.z = -(Math.sin(this.lightAngle) * 50);
	}

	// TODO should refactor cameraUp and cameraDown to be one function
	cameraUp(delta: number, speed: number = 1) {
		if (config.orthographic) {
			this.d *= 1 - (1 * delta * speed * config.cameraSpeed);
			this.resize();
		} else {
			this.camera.position.y += config.cameraSpeed * delta * speed;
			/*if (this.camera.position.y > 75) {
				this.camera.position.y = 75;
			}*/
		}
		this.setChunkRange();
	}

	cameraDown(delta: number, speed: number = 1) {

		if (config.orthographic) {
			this.d *= 1 + (1 * delta * speed * config.cameraSpeed);
			this.resize();
		} else {
			this.camera.position.y -= config.cameraSpeed * delta * speed;
			const loc = gameState.map.getLoc(this.camera.position.x, -this.camera.position.z);
			if (this.camera.position.y < 20) {
				this.camera.position.y = 20;
			}
		}
		this.setChunkRange();
	}

	setChunkRange() {
		const height = this.camera.position.y;
		if (height < 30) {
			config.loadDistance = 4;
		} else if (height < 50) {
			config.loadDistance = 5;
		} else if (height < 75) {
			config.loadDistance = 7;
		}
	}

	cameraForward(delta: number) {
		this.camera.translateZ(Math.cos(this.camera.rotation.x + Math.PI) * config.cameraSpeed * delta);
		this.camera.translateY(Math.sin(this.camera.rotation.x + Math.PI) * config.cameraSpeed * delta)
	}

	cameraBackward(delta: number) {
		this.camera.translateZ(Math.cos(this.camera.rotation.x) * config.cameraSpeed * delta)
		this.camera.translateY(Math.sin(this.camera.rotation.x) * config.cameraSpeed * delta)
	}
	cameraLeft(delta: number) {
		this.camera.translateX(Math.cos(this.camera.rotation.x + Math.PI) * config.cameraSpeed * delta);
	}

	cameraRight(delta: number) {
		this.camera.translateX(Math.cos(this.camera.rotation.x) * config.cameraSpeed * delta);
	}

	cameraRotateRight(delta: number) {
		if (config.orthographic) {
			this.camera.rotation.y += config.cameraSpeed * delta / 20;
			this.camera.translateX(-Math.cos(this.camera.rotation.x + Math.PI) * config.cameraSpeed * delta * 5.2);
		} else {
			this.camera.rotation.y += config.cameraSpeed * delta / 10;
		}
	}
	cameraRotateLeft(delta: number) {
		if (config.orthographic) {
			this.camera.rotation.y -= config.cameraSpeed * delta / 20;
			this.camera.translateX(Math.cos(this.camera.rotation.x + Math.PI) * config.cameraSpeed * delta * 5.2);
		} else {
			this.camera.rotation.y -= config.cameraSpeed * delta / 10;
		}
	}

	@autobind
	resize() {
		const aspectRatio = window.innerWidth / window.innerHeight;
		if (config.orthographic) {
			const ortho = this.camera as THREE.OrthographicCamera;
			ortho.left = -this.d * aspectRatio;
			ortho.right = this.d * aspectRatio;
			ortho.top = this.d;
			ortho.bottom = -this.d;
			ortho.updateProjectionMatrix();
		} else {
			const perspective = this.camera as THREE.PerspectiveCamera;
			perspective.aspect = aspectRatio;
			perspective.updateProjectionMatrix();
		}
		this.HUDPanel.width = window.innerWidth;
		this.HUDPanel.height = window.innerHeight;
		this.renderer.setSize(window.innerWidth, window.innerHeight);
	}


	addMesh(mesh: THREE.Object3D | THREE.Object3D[]) {
		if (Array.isArray(mesh)) {
			mesh.forEach((m) => this.scene.add(m));
		} else {
			this.scene.add(mesh);
		}
	}

	removeMesh(mesh: THREE.Object3D | THREE.Object3D[]) {
		if (Array.isArray(mesh)) {
			mesh.forEach((m) => this.scene.remove(m));
		} else {
			this.scene.remove(mesh);
		}
	}

	private drawSelectionBox() {
		const { isMouseDown, mouseMode, dragStart, dragCurrent } = gameState.input;
		if (!isMouseDown) {
			return;
		}

		// draw from dragStart to dragCurrent
		// convert from vector back to x and y
		// dragCurrent.x = (event.clientX / display.renderer.domElement.clientWidth) * 2 - 1;
		// dragCurrent.y = -(event.clientY / display.renderer.domElement.clientHeight) * 2 + 1;
		var widthHalf = 0.5 * this.HUDPanel.width;
		var heightHalf = 0.5 * this.HUDPanel.height;

		var startVec = new THREE.Vector2();
		startVec.x = (dragStart.x * widthHalf) + widthHalf;
		startVec.y = - (dragStart.y * heightHalf) + heightHalf;

		var curVec = new THREE.Vector2();
		curVec.x = (dragCurrent.x * widthHalf) + widthHalf;
		curVec.y = - (dragCurrent.y * heightHalf) + heightHalf;
		var maxX = Math.round(Math.max(startVec.x, curVec.x));
		var minX = Math.round(Math.min(startVec.x, curVec.x));
		var maxY = Math.round(Math.max(startVec.y, curVec.y));
		var minY = Math.round(Math.min(startVec.y, curVec.y));


		this.HUDContext.strokeStyle = '#7CFC00';
		this.HUDContext.lineWidth = 1;
		this.HUDContext.strokeRect(minX, minY, maxX - minX, maxY - minY);
	}

	public render() {
		if (this.renderer.getPixelRatio() !== config.pixelRatio) {
			this.renderer.setPixelRatio(config.pixelRatio);
		}
		this.renderer.shadowMap.enabled = config.shadows;

		this.HUDContext.clearRect(0, 0, this.HUDPanel.width, this.HUDPanel.height);
		this.renderer.render(this.scene, this.camera);
		this.drawSelectionBox();
	}
}
