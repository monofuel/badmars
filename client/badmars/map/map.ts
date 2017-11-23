// monofuel

import PlanetLoc from './planetLoc';
import { TILE_LAND, TILE_WATER, TILE_CLIFF, TILE_COAST } from './tileTypes';
import State, {
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
import UnitEntity from '../units/index';

// TODO chunk should be a type

export default class Map {
	state: State;
	settings: Settings;
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

	constructor(state: State, planet: any) {
		this.state = state;
		this.planetData = planet;
		this.landMeshes = [];
		this.waterMeshes = [];
		this.planetData = {};
		this.chunkCache = {};
		this.requestedChunks = {};

		this.worldSettings = planet.settings;

		this.chunkInterval = setInterval(async () => {
			await Promise.resolve(this.loadChunksNearCamera());
			await Promise.resolve(() => {
				this.state.playerLocation = this.getTileAtRay(new THREE.Vector2(0, 0));
			})
		}, 750);

		// TODO load units and chunks from state

	}

	destroy() {
		const { display } = this.state;
		clearInterval(this.chunkInterval);
		for (const mesh of this.landMeshes) {
			display.removeMesh(mesh);
		}
		for (const mesh of this.waterMeshes) {
			display.removeMesh(mesh);
		}
	}

	generateChunk(chunkX: number, chunkY: number, chunk: any) {
		const { display } = this.state;
		var chunkArray = chunk.grid;
		var navGrid = chunk.navGrid;
		var gridGeom = new THREE.Geometry();
		var waterGeom = new THREE.PlaneBufferGeometry(this.worldSettings.chunkSize, this.worldSettings.chunkSize);

		var landMaterial = new THREE.MeshPhongMaterial({
			color: config.palette.land
		});
		var cliffMaterial = new THREE.MeshPhongMaterial({
			color: config.palette.cliff
		});
		var waterMaterial = new THREE.MeshLambertMaterial({
			color: config.palette.water
		});

		for (var x = 0; x <= this.worldSettings.chunkSize; x++) {
			for (var y = 0; y <= this.worldSettings.chunkSize; y++) {
				gridGeom.vertices.push(new THREE.Vector3(y, x,
					chunkArray[y][x]));
			}
		}

		for (var y = 0; y < this.worldSettings.chunkSize; y++) {
			for (var x = 0; x < this.worldSettings.chunkSize; x++) {
				var landFace1 = new THREE.Face3(
					y * (this.worldSettings.chunkSize + 1) + x,
					y * (this.worldSettings.chunkSize + 1) + 1 + x,
					(y + 1) * (this.worldSettings.chunkSize + 1) + x);
				landFace1.materialIndex = 0;
				var landFace2 = new THREE.Face3(
					y * (this.worldSettings.chunkSize + 1) + x + 1,
					(y + 1) * (this.worldSettings.chunkSize + 1) + x + 1,
					(y + 1) * (this.worldSettings.chunkSize + 1) + x);

				if (navGrid[x][y] != 1) {
					landFace1.materialIndex = 0;
					landFace2.materialIndex = 0;

				} else {
					landFace1.materialIndex = 1;
					landFace2.materialIndex = 1;
				}

				gridGeom.faces.push(landFace1);
				gridGeom.faces.push(landFace2);
			}
		}

		gridGeom.computeBoundingSphere();
		gridGeom.computeFaceNormals();
		gridGeom.computeVertexNormals();

		waterGeom.computeBoundingSphere();
		// waterGeom.computeFaceNormals();
		waterGeom.computeVertexNormals();

		// fiddle with the normals

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

		var planetMaterials = [landMaterial, cliffMaterial];

		var gridMesh = new THREE.Mesh(gridGeom, (planetMaterials as any) as THREE.Material); // types not updated
		var waterMesh = new THREE.Mesh(waterGeom, waterMaterial);

		var centerMatrix = new THREE.Matrix4()
			.makeTranslation(chunkX * this.worldSettings.chunkSize, chunkY * this.worldSettings.chunkSize, 0);
		gridMesh.geometry.applyMatrix(centerMatrix);
		waterMesh.geometry.applyMatrix(centerMatrix);

		gridMesh.rotation.x = -Math.PI / 2;
		waterMesh.rotation.x = -Math.PI / 2;

		// gridMesh.position.z = (chunkX);
		gridMesh.position.y = 0;
		// gridMesh.position.x = (chunkY);


		waterMesh.position.copy(gridMesh.position)
		waterMesh.position.x += this.worldSettings.chunkSize / 2;
		waterMesh.position.y += this.worldSettings.waterHeight;
		waterMesh.position.z -= this.worldSettings.chunkSize / 2;



		this.landMeshes.push(gridMesh);
		this.waterMeshes.push(waterMesh);

		// TODO this is gross
		this.state.chunks[chunk.hash].landMesh = gridMesh;
		this.state.chunks[chunk.hash].waterMesh = waterMesh;

		display.addMesh(gridMesh);
		display.addMesh(waterMesh);

		// console.log("Generated Geometry");

	}

	nearestStorage(tile: PlanetLoc): UnitEntity | null {
		const { playerInfo } = this.state;
		var storages: UnitEntity[] = [];
		if (!playerInfo || !tile) {
			return;
		}
		for (var entity of Object.values(this.state.unitEntities)) {
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
		const unit = this.state.units[unitId];
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
		delete this.state.units[unit.uuid];
	}

	destroyUnits(units: Array<Entity>) {
		for (let unit of units) {
			unit.destroy();
		}
	}
	*/

	getSelectedUnit(mouse: THREE.Vector2): UnitEntity {
		const { display } = this.state;
		var raycaster = new THREE.Raycaster();

		raycaster.setFromCamera(mouse, display.camera);
		var meshList = [];
		for (var entity of Object.values(this.state.unitEntities)) {
			meshList.push(entity.graphical.mesh);
		}
		var intersects = raycaster.intersectObjects(meshList);
		if (intersects.length > 0) {
			return intersects[0].object.userData;
		}
		return null;
	}

	getSelectedUnits(mouseStart: THREE.Vector2, mouseEnd: THREE.Vector2): UnitEntity[] {
		const { display } = this.state;
		var maxX = Math.max(mouseStart.x, mouseEnd.x);
		var minX = Math.min(mouseStart.x, mouseEnd.x);
		var maxY = Math.max(mouseStart.y, mouseEnd.y);
		var minY = Math.min(mouseStart.y, mouseEnd.y);

		var unitList = [];
		for (var entity of Object.values(this.state.unitEntities)) {
			var vector = this.toScreenPosition(entity.graphical.mesh);
			if (vector.x < maxX && vector.x > minX && vector.y > minY && vector.y < maxY) {
				unitList.push(entity);
			}
		}
		return unitList;
	}

	toScreenPosition(obj: THREE.Object3D): THREE.Vector3 {
		const { display } = this.state;
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
		const { display, playerInfo } = this.state;
		display.camera.updateMatrix(); // make sure camera's local matrix is updated
		display.camera.updateMatrixWorld(false); // make sure camera's world matrix is updated
		display.camera.matrixWorldInverse.getInverse(display.camera.matrixWorld);

		var frustum = new THREE.Frustum();
		var projScreenMatrix = new THREE.Matrix4();
		projScreenMatrix.multiplyMatrices(display.camera.projectionMatrix, display.camera.matrixWorldInverse);

		frustum.setFromMatrix(new THREE.Matrix4().multiplyMatrices(display.camera.projectionMatrix, display.camera.matrixWorldInverse));

		var unitList: UnitEntity[] = [];
		for (var entity of Object.values(this.state.unitEntities)) {
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
			if (!this.state.chunks[chunk]) {
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
				this.state.chunks[chunk] = cacheChunk;
				this.generateChunk(x, y, cacheChunk);
				RequestChange.post({ type: 'getChunk', x: x, y: y, unitsOnly: true });
			} else {
				RequestChange.post({ type: 'getChunk', x: x, y: y });
			}
		}
	}

	getUnitsOnChunk(chunkHash: string): UnitEntity[] {
		let unitsOnChunk: UnitEntity[] = [];
		for (let entity of Object.values(this.state.unitEntities)) {
			let unitChunkHash = entity.unit.location.chunkX + ":" + entity.unit.location.chunkY;
			if (chunkHash === unitChunkHash) {
				unitsOnChunk.push(entity);
			}
		}
		return unitsOnChunk;
	}

	unloadChunksNearTile(tile: PlanetLoc): void {
		const { display } = this.state;
		for (let hash in this.state.chunks) {
			let x = parseInt(hash.split(":")[0]);
			let y = parseInt(hash.split(":")[1]);
			var xdist = Math.abs(tile.chunkX - x);
			var ydist = Math.abs(tile.chunkY - y);
			if (Math.sqrt(xdist * xdist + ydist * ydist) > config.loadDistance + 2) {
				//console.log("removing chunk:" + hash);
				// TODO handle removing units again	
				// this.destroyUnits(this.getUnitsOnChunk(hash));


				var chunk = this.state.chunks[hash];
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
				}
				chunk.landMesh = null;
				chunk.waterMesh = null;
				delete this.state.chunks[hash];
				this.chunkCache[hash] = chunk;
			}
		}
	}

	loadChunksNearCamera() {
		var tile = this.getTileAtRay(new THREE.Vector2(0, 0.25));
		if (!tile) {
			return;
		}
		this.loadChunksNearTile(tile);
		this.unloadChunksNearTile(tile);
	}

	getTileAtRay(mouse: THREE.Vector2): PlanetLoc {
		const { display } = this.state;

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
