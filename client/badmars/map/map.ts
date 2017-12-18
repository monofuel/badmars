// monofuel

import PlanetLoc from './planetLoc';
import { TILE_LAND, TILE_WATER, TILE_CLIFF, TILE_COAST } from './tileTypes';
import GameState, {
	ChunkEvent,
	ChunkChange,
	UnitEvent,
	UnitChange,
	UnitDeltaEvent,
	UnitDeltaChange,

} from '../state';
import { updateUnit } from '../units/unitBalance';
import { N, S, E, W, C } from '../units/directions';
import { log } from '../logger';
import config from '../config';
import * as jsonpatch from 'fast-json-patch';
import * as THREE from 'three';
import * as _ from 'lodash';
import { RequestChange } from '../net';
import UnitEntity, { destroyUnitEntity, isTileVisible } from '../units/index';
import { Planet } from '../';

// TODO chunk should be a type

export default class Map {
	settings: Settings;
	tps: number;
	landMeshes: Array<THREE.Object3D>;
	waterMeshes: Array<THREE.Object3D>;
	planetData: any;
	worldSettings: any;
	// TODO
	// attackListener: (data: AttackEvent) => void;
	// killListener: (data: KillEvent) => void;
	chunkCache: any;
	requestedChunks: any;

	chunkInterval: any;

	fogChunksToUpdate: string[] = []

	constructor(planet: Planet) {
		this.planetData = planet;
		this.landMeshes = [];
		this.waterMeshes = [];
		this.planetData = {};
		this.chunkCache = {};
		this.requestedChunks = {};
		this.tps = planet.tps;

		this.worldSettings = planet.settings;

		this.chunkInterval = setInterval(async () => {
			await Promise.resolve(this.loadChunksNearCamera());
			await Promise.resolve(() => {
				gameState.playerLocation = this.getTileAtRay(new THREE.Vector2(0, 0));
			})
		}, 750);

		// TODO load units and chunks from state

	}

	destroy() {
		const { display } = gameState;
		clearInterval(this.chunkInterval);
		for (const mesh of this.landMeshes) {
			display.removeMesh(mesh);
		}
		for (const mesh of this.waterMeshes) {
			display.removeMesh(mesh);
		}
	}

	generateChunk(chunkX: number, chunkY: number, chunk: any) {
		const { display } = gameState;
		var chunkArray = chunk.grid;
		var navGrid = chunk.navGrid;
		var gridGeom = new THREE.Geometry();
		var waterGeom = new THREE.Geometry();

		var landMaterial = new THREE.MeshPhongMaterial({
			color: config.palette.land
		});
		var cliffMaterial = new THREE.MeshPhongMaterial({
			color: config.palette.cliff
		});
		var waterMaterial = new THREE.MeshLambertMaterial({
			color: config.palette.water
		});

		waterMaterial.transparent = true;
		waterMaterial.opacity = 0.9;

		const tint = new THREE.Color('#888888');
		var landFogMaterial = landMaterial.clone()
		landFogMaterial.color.sub(tint);
		var cliffFogMaterial = cliffMaterial.clone()
		cliffFogMaterial.color.sub(tint);
		var waterFogMaterial = waterMaterial.clone()
		waterFogMaterial.color.sub(tint);

		for (var x = 0; x <= this.worldSettings.chunkSize; x++) {
			for (var y = 0; y <= this.worldSettings.chunkSize; y++) {
				gridGeom.vertices.push(new THREE.Vector3(y, x,
					chunkArray[y][x]));
				waterGeom.vertices.push(new THREE.Vector3(y, x, 0));
			}
		}

		for (var y = 0; y < this.worldSettings.chunkSize; y++) {
			for (var x = 0; x < this.worldSettings.chunkSize; x++) {
				var landFace1 = new THREE.Face3(
					y * (this.worldSettings.chunkSize + 1) + x,
					y * (this.worldSettings.chunkSize + 1) + 1 + x,
					(y + 1) * (this.worldSettings.chunkSize + 1) + x);
				var landFace2 = new THREE.Face3(
					y * (this.worldSettings.chunkSize + 1) + x + 1,
					(y + 1) * (this.worldSettings.chunkSize + 1) + x + 1,
					(y + 1) * (this.worldSettings.chunkSize + 1) + x);

				var waterFace1 = new THREE.Face3(
					y * (this.worldSettings.chunkSize + 1) + x,
					y * (this.worldSettings.chunkSize + 1) + 1 + x,
					(y + 1) * (this.worldSettings.chunkSize + 1) + x);
				var waterFace2 = new THREE.Face3(
					y * (this.worldSettings.chunkSize + 1) + x + 1,
					(y + 1) * (this.worldSettings.chunkSize + 1) + x + 1,
					(y + 1) * (this.worldSettings.chunkSize + 1) + x);


				const visible = isTileVisible(gameState,
					x + (this.worldSettings.chunkSize * chunkX),
					y + (this.worldSettings.chunkSize * chunkY));
				if (visible) {
					waterFace1.materialIndex = 0;
					waterFace2.materialIndex = 0;
				} else {
					waterFace1.materialIndex = 1;
					waterFace2.materialIndex = 1;
				}
				if (chunk.navGrid[x][y] != 1) {
					if (visible) {
						landFace1.materialIndex = 0;
						landFace2.materialIndex = 0;
					} else {
						landFace1.materialIndex = 2;
						landFace2.materialIndex = 2;
					}

				} else {
					if (visible) {
						landFace1.materialIndex = 1;
						landFace2.materialIndex = 1;
					} else {

						landFace1.materialIndex = 3;
						landFace2.materialIndex = 3;
					}
				}

				gridGeom.faces.push(landFace1);
				gridGeom.faces.push(landFace2);
				waterGeom.faces.push(waterFace1);
				waterGeom.faces.push(waterFace2);
			}
		}

		gridGeom.computeBoundingSphere();
		gridGeom.computeFaceNormals();
		gridGeom.computeVertexNormals();

		waterGeom.computeBoundingSphere();
		waterGeom.computeFaceNormals();
		waterGeom.computeVertexNormals();

		// fiddle with the normals to give a nice 'tiled' look
		for (var index = 0; index < gridGeom.faces.length; index += 2) {
			var landVector1 = gridGeom.faces[index].normal;
			var landVector2 = gridGeom.faces[index + 1].normal;
			var newVec = landVector1.clone();
			newVec.add(landVector2);
			newVec = newVec.divideScalar(2);


			// these 2 lines don't really change the visuals
			// but let's keep them anyway
			gridGeom.faces[index].normal.copy(newVec);
			gridGeom.faces[index + 1].normal.copy(newVec);

			// this gives the cool square effect and make
			// shading look good between tiles
			for (var i = 0; i <= 2; i++) {
				gridGeom.faces[index].vertexNormals[i].copy(newVec);
				gridGeom.faces[index + 1].vertexNormals[i].copy(newVec);
			}
		}


		gridGeom.normalsNeedUpdate = true;

		var planetMaterials = [landMaterial, cliffMaterial, landFogMaterial, cliffFogMaterial];

		var gridMesh = new THREE.Mesh(gridGeom, planetMaterials);
		var waterMesh = new THREE.Mesh(waterGeom, [waterMaterial, waterFogMaterial]);
		const hash = `${chunkX}:${chunkY}`;
		gridMesh.name = `${hash} land`;
		waterMesh.name = `${hash} water`;

		var centerMatrix = new THREE.Matrix4()
			.makeTranslation(chunkX * this.worldSettings.chunkSize, chunkY * this.worldSettings.chunkSize, 0);
		gridMesh.geometry.applyMatrix(centerMatrix);
		waterMesh.geometry.applyMatrix(centerMatrix);

		gridMesh.rotation.x = -Math.PI / 2;
		gridMesh.position.y = 0;


		waterMesh.position.copy(gridMesh.position);
		waterMesh.rotation.copy(gridMesh.rotation);
		// waterMesh.position.x += this.worldSettings.chunkSize / 2;
		waterMesh.position.y += this.worldSettings.waterHeight;
		//waterMesh.position.z -= this.worldSettings.chunkSize / 2;



		this.landMeshes.push(gridMesh);
		this.waterMeshes.push(waterMesh);

		// TODO this is gross
		gameState.chunks[chunk.hash].landMesh = gridMesh;
		gameState.chunks[chunk.hash].waterMesh = waterMesh;

		display.addMesh(gridMesh);
		display.addMesh(waterMesh);

		// console.log("Generated Geometry");

		// add snow
		const snowMat = new THREE.PointsMaterial({
			color: 0x9b9b9b,
			size: 0.25
		});

		const snowGeom = new THREE.Geometry();

		_.times(50, (n) => {
			const x = (Math.random() * this.worldSettings.chunkSize);
			const y = (Math.random() * 20);
			const z = (Math.random() * this.worldSettings.chunkSize);

			snowGeom.vertices.push(new THREE.Vector3(x, y, z));
		});

		const cloud = new THREE.Points(snowGeom, snowMat);
		cloud.name = `${hash} snow`;
		cloud.geometry.applyMatrix(centerMatrix);
		cloud.position.copy(gridMesh.position);
		cloud.rotation.copy(gridMesh.rotation);

		gameState.display.addMesh(cloud);
		gameState.snow[chunk.hash] = cloud;


	}

	updateFogOfWar(tile: PlanetLoc, vision: number) {
		const chunkRadius = Math.ceil(vision / this.worldSettings.chunkSize);
		for (let i = tile.chunkX - chunkRadius; i < tile.chunkX + chunkRadius; i++) {
			for (let k = tile.chunkY - chunkRadius; k < tile.chunkY + chunkRadius; k++) {
				const hash = `${i}:${k}`
				if (!gameState.chunks[hash]) {
					continue;
				}
				this.fogChunksToUpdate.push(hash);
			}
		}
	}

	processFogUpdate() {
		const chunks = this.fogChunksToUpdate;
		this.fogChunksToUpdate = [];
		if (chunks.length > 0) {
			console.log('updating fog on chunks', chunks.length);
		}
		chunks.forEach((hash) => this.updateFog(hash));
	}

	async updateFog(hash: string) {
		const chunk = gameState.chunks[hash];
		const landMesh: THREE.Mesh = gameState.chunks[hash].landMesh;
		const waterMesh: THREE.Mesh = gameState.chunks[hash].waterMesh;

		// I'm sure someone more clever than i could iterate over this
		const landFaces = [...(landMesh.geometry as THREE.Geometry).faces];
		const waterFaces = [...(waterMesh.geometry as THREE.Geometry).faces];
		for (var y1 = 0; y1 < this.worldSettings.chunkSize; y1++) {
			for (var x1 = 0; x1 < this.worldSettings.chunkSize; x1++) {
				const x = this.worldSettings.chunkSize * chunk.x + x1;
				const y = this.worldSettings.chunkSize * chunk.y + y1;
				const landFace1 = landFaces.shift();
				const landFace2 = landFaces.shift();
				const waterFace1 = waterFaces.shift();
				const waterFace2 = waterFaces.shift();
				const visible = isTileVisible(gameState, x, y);
				if (visible) {
					waterFace1.materialIndex = 0;
					waterFace2.materialIndex = 0;
				} else {
					waterFace1.materialIndex = 1;
					waterFace2.materialIndex = 1;
				}
				if (chunk.navGrid[x1][y1] != 1) {
					if (visible) {
						landFace1.materialIndex = 0;
						landFace2.materialIndex = 0;
					} else {
						landFace1.materialIndex = 2;
						landFace2.materialIndex = 2;
					}

				} else {
					if (visible) {
						landFace1.materialIndex = 1;
						landFace2.materialIndex = 1;
					} else {

						landFace1.materialIndex = 3;
						landFace2.materialIndex = 3;
					}
				}
			}
		}
		(landMesh.geometry as THREE.Geometry).groupsNeedUpdate = true;
		(waterMesh.geometry as THREE.Geometry).groupsNeedUpdate = true;
	}

	nearestStorage(tile: PlanetLoc): UnitEntity | null {
		const { playerInfo } = gameState;
		var storages: UnitEntity[] = [];
		if (!playerInfo || !tile) {
			return;
		}
		for (var entity of Object.values(gameState.unitEntities)) {
			if (entity.unit.details.type === 'storage' && entity.unit.details.owner === playerInfo.uuid) {
				storages.push(entity);
			}
		}
		storages.sort((a, b) => {
			return a.loc.distance(tile) - b.loc.distance(tile);
		});
		if (storages.length > 0) {
			return storages[0];
		}
		return null;
	}

	/*
	updateUnitDestination(unitId: string, newLocation: Array<number>, time: number) {
		const unit = state.units[unitId];
		const x = newLocation[0];
		const y = newLocation[1];
		if (unit && unit instanceof GroundUnit) {
			const tile = new PlanetLoc(unit.loc.planet, x, y);
			// $FlowFixMe better flowtyping for entities
			return unit.updateNextMove(tile, time);
		}
		return;
	}

	removeUnit(unit: Entity) {
		// TODO why is this function here
		delete state.units[unit.uuid];
	}

	destroyUnits(units: Array<Entity>) {
		for (let unit of units) {
			unit.destroy();
		}
	}
	*/

	destroyUnits(units: Array<UnitEntity>) {
		for (const unit of units) {
			destroyUnitEntity(gameState, unit);
		}
	}

	getLoc(x: number, y: number) {
		return new PlanetLoc(this, x, y);
	}

	getSelectedUnit(mouse: THREE.Vector2): UnitEntity | null {
		const { display } = gameState;
		var raycaster = new THREE.Raycaster();

		raycaster.setFromCamera(mouse, display.camera);
		var meshList = [];
		for (var entity of Object.values(gameState.unitEntities)) {
			meshList.push(entity.graphical.mesh);
		}
		var intersects = raycaster.intersectObjects(meshList, true);
		if (intersects.length > 0) {
			return intersects[0].object.userData;
		}
		return null;
	}

	getSelectedUnits(mouseStart: THREE.Vector2, mouseEnd: THREE.Vector2): UnitEntity[] {
		const { display } = gameState;
		var maxX = Math.max(mouseStart.x, mouseEnd.x);
		var minX = Math.min(mouseStart.x, mouseEnd.x);
		var maxY = Math.max(mouseStart.y, mouseEnd.y);
		var minY = Math.min(mouseStart.y, mouseEnd.y);

		var unitList = [];
		for (var entity of Object.values(gameState.unitEntities)) {
			var vector = this.toScreenPosition(entity.graphical.mesh);
			if (vector.x < maxX && vector.x > minX && vector.y > minY && vector.y < maxY) {
				unitList.push(entity);
			}
		}
		return unitList;
	}

	toScreenPosition(obj: THREE.Object3D): THREE.Vector3 {
		const { display } = gameState;
		var vector = new THREE.Vector3();

		obj.updateMatrixWorld(false);
		vector.setFromMatrixPosition(obj.matrixWorld);
		vector.project(display.camera);

		return vector;

	};

	/*
	//get units between 2 squares
	var startTile = this.getTileAtRay(mouseStart);
	var endTile = this.getTileAtRay(mouseEnd)
	var startVec = startTile.getVec();
	var endVec = endTile.getVec();
	endVec.y -= 50;
	startVec.y += 50;
	var boundingBox = new THREE.Box3(endVec,startVec);
	console.log(boundingBox);
		
	var unitList = [];
	for (var unit of this.units)  {
		if (boundingBox.containsPoint(unit.location.getVec())) {
			console.log("contains ",unit);
		}
		if (boundingBox.containsPoint(unit.location.getVec()) && unit.playerId == playerInfo.id) {
			unitList.push(unit);
		}
	}
	*/

	getSelectedUnitsInView(): UnitEntity[] {
		const { display, playerInfo } = gameState;
		display.camera.updateMatrix(); // make sure camera's local matrix is updated
		display.camera.updateMatrixWorld(false); // make sure camera's world matrix is updated
		display.camera.matrixWorldInverse.getInverse(display.camera.matrixWorld);

		var frustum = new THREE.Frustum();
		var projScreenMatrix = new THREE.Matrix4();
		projScreenMatrix.multiplyMatrices(display.camera.projectionMatrix, display.camera.matrixWorldInverse);

		frustum.setFromMatrix(new THREE.Matrix4().multiplyMatrices(display.camera.projectionMatrix, display.camera.matrixWorldInverse));

		var unitList: UnitEntity[] = [];
		for (var entity of Object.values(gameState.unitEntities)) {
			if (frustum.containsPoint(entity.loc.getVec()) && entity.unit.details.owner === playerInfo.uuid) {
				unitList.push(entity);
			}
		}
		return unitList;
	}

	requestChunk(x: number, y: number): void {
		let chunkHash = x + ":" + y;
		// console.log('requesting chunk', {type:"getChunk",x:x,y:y});
		if (this.requestedChunks[chunkHash] &&
			Date.now() - this.requestedChunks[chunkHash] < 5000) {
			// console.log('HALTING DUPLICATE CHUNK REQUEST');
			return;
		}

		if (!this.requestedChunks[chunkHash]) {
			this.requestedChunks[chunkHash] = Date.now();
		}
		RequestChange.post({
			type: 'getChunk', x: x, y: y
		});
	}

	getChunksAroundTile(tile: PlanetLoc): Array<string> {
		var chunks: Array<string> = [];
		for (var i = -config.loadDistance; i < config.loadDistance; i++) {
			for (var j = -config.loadDistance; j < config.loadDistance; j++) {
				if (Math.sqrt(i * i + j * j) < config.loadDistance) {
					let chunkX = tile.chunkX + i;
					let chunkY = tile.chunkY + j;
					chunks.push(chunkX + ":" + chunkY);
				}
			}
		}
		return chunks;
	}

	getUnloadedChunks(chunks: Array<string>) {
		var notLoaded: Array<string> = [];
		for (var chunk of chunks) {
			if (!gameState.chunks[chunk]) {
				notLoaded.push(chunk);
			}
		}
		return notLoaded;
	}

	loadChunksNearTile(tile: PlanetLoc): void {
		var chunks = this.getUnloadedChunks(this.getChunksAroundTile(tile));
		for (let chunk of chunks) {
			let x = parseInt(chunk.split(":")[0]);
			let y = parseInt(chunk.split(":")[1]);
			let cacheChunk = this.chunkCache[chunk];
			if (cacheChunk) {
				gameState.chunks[chunk] = cacheChunk;
				this.generateChunk(x, y, cacheChunk);
				RequestChange.post({ type: 'getChunk', x: x, y: y, unitsOnly: true });
			} else {
				RequestChange.post({ type: 'getChunk', x: x, y: y });
			}
		}
	}

	getUnitsOnChunk(chunkHash: string): UnitEntity[] {
		let unitsOnChunk: UnitEntity[] = [];
		for (let entity of Object.values(gameState.unitEntities)) {
			let unitChunkHash = entity.unit.location.chunkX + ":" + entity.unit.location.chunkY;
			if (chunkHash === unitChunkHash) {
				unitsOnChunk.push(entity);
			}
		}
		return unitsOnChunk;
	}

	unloadChunksNearTile(tile: PlanetLoc): void {
		const { display } = gameState;
		for (let hash in gameState.chunks) {
			let x = parseInt(hash.split(":")[0]);
			let y = parseInt(hash.split(":")[1]);
			var xdist = Math.abs(tile.chunkX - x);
			var ydist = Math.abs(tile.chunkY - y);
			if (Math.sqrt(xdist * xdist + ydist * ydist) > config.loadDistance + 2) {
				//console.log("removing chunk:" + hash);
				// TODO handle removing units again	
				this.destroyUnits(this.getUnitsOnChunk(hash));


				var chunk = gameState.chunks[hash];
				if (!chunk) {
					continue;
				}
				var index = this.landMeshes.indexOf(chunk.landMesh)
				if (index != -1) {
					this.landMeshes.splice(index, 1);
				}
				index = this.waterMeshes.indexOf(chunk.waterMesh)
				if (index != -1) {
					this.waterMeshes.splice(index, 1);
				}
				if (display) {
					display.removeMesh(chunk.landMesh);
					display.removeMesh(chunk.waterMesh);
					display.removeMesh(gameState.snow[chunk.hash]);
					delete gameState.snow[chunk.hash];
				}
				chunk.landMesh = null;
				chunk.waterMesh = null;
				delete gameState.chunks[hash];
				this.chunkCache[hash] = chunk;
			}
		}
	}

	loadChunksNearCamera() {
		const tile = this.getLoc(gameState.display.camera.position.x + 13,
			- gameState.display.camera.position.z - 13);

		this.loadChunksNearTile(tile);
		this.unloadChunksNearTile(tile);
	}

	getTileAtRay(mouse: THREE.Vector2): PlanetLoc {
		const { display } = gameState;

		var raycaster = new THREE.Raycaster();
		raycaster.setFromCamera(mouse, display.camera);

		var AllPlanetMeshes = this.landMeshes.concat(this.waterMeshes);
		var intersects = raycaster.intersectObjects(AllPlanetMeshes);
		if (intersects.length > 0) {
			var vec = intersects[0].point;
			var x = Math.floor(vec.x);
			var y = -(Math.floor(vec.z) + 1);
			return new PlanetLoc(this, x, y);
		}
		return null;
	}

}

class Settings {
	size: number;
	name: string;
}
