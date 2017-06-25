// monofuel

import PlanetLoc from './planetLoc';
import { TILE_LAND, TILE_WATER, TILE_CLIFF, TILE_COAST } from './tileTypes';
import Entity from '../units/entity';
import State from '../state';
import Iron from '../units/iron';
import Oil from '../units/oil';
import PlayerUnit from '../units/playerUnit';
import GroundUnit from '../units/groundUnit';
import { updateUnit } from '../units/unitBalance';
import { N, S, E, W, C } from '../units/directions';
import { log } from '../logger';
import jsonpatch from 'fast-json-patch';
import * as THREE from 'three';
import * as _ from 'lodash';

import {
	ChunkEvent,
	ChunkChange,
	AttackEvent,
	AttackChange,
	KillEvent,
	KillChange,
	UnitEvent,
	UnitChange,
	UnitDeltaEvent,
	UnitDeltaChange,
	RequestChange,
	ServerUnit,
} from '../net';

// TODO chunk should be a type

export default class Map {
	state: State;
	settings: Settings;
	chunkMap: any;
	landMeshes: Array<THREE.Object3D>;
	waterMeshes: Array<THREE.Object3D>;
	units: Array<Entity>;
	planetData: any;
	worldSettings: any;
	attackListener: (data: AttackEvent) => void;
	killListener: (data: KillEvent) => void;
	chunkListener: (data: ChunkEvent) => void;
	updateUnitsListener: (data: UnitEvent) => void;
	updateUnitDeltaListener: (data: UnitDeltaEvent) => void;
	chunkCache: any;
	viewRange: number;
	unloadRange: number;
	requestedChunks: any;

	chunkInterval: NodeJS.Timer;

	constructor(state: State, planet: any) {
		this.state = state;
		this.planetData = planet;
		this.units = [];
		this.landMeshes = [];
		this.waterMeshes = [];
		this.planetData = {};
		this.chunkMap = {};
		this.chunkCache = {};
		this.requestedChunks = {};
		this.viewRange = 5;
		this.unloadRange = this.viewRange + 3;

		this.worldSettings = planet.settings;

		this.chunkInterval = setInterval(async () => {
			await Promise.resolve(this.fixAllLocations());
			await Promise.resolve(this.loadChunksNearCamera());
			await Promise.resolve(() => {
				this.state.playerLocation = this.getTileAtRay(new THREE.Vector2(0, 0));
			})
		}, 750);

		this.chunkListener = (data: ChunkEvent) => {
			// console.log('loading chunk');
			// console.log('got chunk data', data);
			var chunk = data.chunk;
			if (this.chunkMap[data.chunk.hash]) {
				// console.log('CHUNK ALREADY LOADED');
				return;
			}
			this.chunkMap[data.chunk.hash] = chunk;
			this.generateChunk(chunk.x, chunk.y, chunk);

			// TODO: should force only units at the specific chunk to re-check their location
			// this is to avoid issues when chunks load after units do.
			this.fixAllLocations();
		}
		ChunkChange.attach(this.chunkListener);

		this.attackListener = (data: AttackEvent) => {
			var unit = this.getUnitById(data.enemyId);
			var attackingUnit = this.getUnitById(data.unitId);
			if (unit && unit.takeDamage) {
				unit.takeDamage();
			}

			if (attackingUnit && attackingUnit instanceof GroundUnit) {
				attackingUnit.fire(unit);
			}
		};
		AttackChange.attach(this.attackListener);

		this.killListener = (data: KillEvent) => {
			const unit = this.getUnitById(data.unitId);
			unit.destroy();
		};
		KillChange.attach(this.killListener);

		this.updateUnitsListener = (data: UnitEvent) => {
			for (let updated of data.units) {
				let unit = this.getUnitById(updated.uuid);
				if (unit) {
					if (unit.updateUnitData) {
						unit.updateUnitData(updated);
					}
				} else {
					this.addUnit(updated);
				}
			}
		};
		UnitChange.attach(this.updateUnitsListener);

		this.updateUnitDeltaListener = (data: UnitDeltaEvent) => {
			const unit = _.find(this.units, (unit) => unit.uuid === data.uuid);
			if (!unit) {
				throw new Error(`unit ${data.uuid} does not exist`);
			}
			jsonpatch.apply(unit, data.delta);
		};
		UnitDeltaChange.attach(this.updateUnitDeltaListener);

	}
	private addUnit(unit: ServerUnit) {
		if (!unit.graphical) {
			log('debug', 'unit without graphical component added');
			return;
		}
		const { playerInfo } = this.state;
		if (playerInfo && unit.details.owner !== playerInfo.uuid) {
			let tile = new PlanetLoc(this, unit.location.x, unit.location.y, true);
			if (!tile.chunk) {
				console.log('ignoring unit update, not on loaded chunk', tile);
				return;
			}
		}

		// console.log(unit);
		if (!playerInfo || !unit) {
			console.log('player info or unit missing', { playerInfo, unit });
			return;
		}

		if (unit.details.ghosting && unit.details.owner !== playerInfo.uuid) {
			console.log('can see other players ghost: INVALID');
			return;
		}

		// console.log('checking unit type');
		const loc = new PlanetLoc(this, unit.location.x, unit.location.y);
		let newUnit;
		if (unit.details.owner) {
			newUnit = new PlayerUnit(this.state, loc, unit.details.owner, unit.uuid, unit.details.type, unit.graphical.scale);
		} else {
			switch (unit.details.type) {
				case 'iron':
					newUnit = new Iron(this.state, loc, 0, unit.uuid, unit.graphical.scale);
					break;
				case 'oil':
					newUnit = new Oil(this.state, loc, 0, unit.uuid, unit.graphical.scale);
					break;
				default:
					console.log('unknown type: ', unit);
					return;
			}
		}
		_.merge(newUnit, unit);
		updateUnit(newUnit);
		this.units.push(newUnit);
	}

	destroy() {
		const { display } = this.state;
		clearInterval(this.chunkInterval);
		AttackChange.detach(this.attackListener);
		KillChange.detach(this.killListener);
		ChunkChange.detach(this.chunkListener);
		for (const mesh of this.landMeshes) {
			display.removeMesh(mesh);
		}
		for (const mesh of this.waterMeshes) {
			display.removeMesh(mesh);
		}
		const unitListCopy = this.units.slice();
		for (var unit of unitListCopy) {
			unit.destroy();
		}
	}

	generateChunk(chunkX: number, chunkY: number, chunk: any) {
		const { display } = this.state;
		var chunkArray = chunk.grid;
		var navGrid = chunk.navGrid;
		var gridGeom = new THREE.Geometry();
		var waterGeom = new THREE.PlaneBufferGeometry(this.worldSettings.chunkSize, this.worldSettings.chunkSize);

		var landMaterial = new THREE.MeshPhongMaterial({
			color: 0x37DB67
		});
		var cliffMaterial = new THREE.MeshPhongMaterial({
			color: 0x2C3A4E
		});
		var waterMaterial = new THREE.MeshLambertMaterial({
			color: 0x54958A
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

		this.chunkMap[chunk.hash].landMesh = gridMesh;
		this.chunkMap[chunk.hash].waterMesh = waterMesh;

		display.addMesh(gridMesh);
		display.addMesh(waterMesh);

		// console.log("Generated Geometry");

	}

	fixAllLocations() {
		for (let unit of this.units) {
			if (unit.updateLoc) {
				unit.updateLoc();
			}
		}
	}

	/**
	 * @param	{PlanetLoc}	location to check
	 * @return	{Entity}	Unit at the location
	 */
	unitTileCheck(tile: PlanetLoc): Entity | null {
		//TODO this could be optimized
		for (var unit of this.units) {
			if (unit.checkGroundTile(tile)) {
				return unit;
			}
		}
		return null;
	}

	nearestStorage(tile: PlanetLoc): PlayerUnit {
		const { playerInfo } = this.state;
		var storages = [];
		if (!playerInfo || !tile) {
			return;
		}
		for (var unit of this.units) {
			if (unit instanceof PlayerUnit && unit.details.type === 'storage' && unit.details.owner === playerInfo.uuid) {
				storages.push(unit);
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


	updateUnitDestination(unitId: string, newLocation: Array<number>, time: number) {
		const unit = this.getUnitById(unitId);
		const x = newLocation[0];
		const y = newLocation[1];
		if (unit && unit instanceof GroundUnit) {
			const tile = new PlanetLoc(unit.loc.planet, x, y);
			// $FlowFixMe better flowtyping for entities
			return unit.updateNextMove(tile, time);
		}
		return;
	}

	getUnitById(unitId: string): Entity {
		for (var unit of this.units) {
			if (unit.uuid === unitId) {
				return unit;
			}
		}
		return null;
	}

	removeUnit(unit: Entity) {
		this.units.splice(this.units.indexOf(unit), 1);
	}

	destroyUnits(units: Array<Entity>) {
		for (let unit of units) {
			unit.destroy();
		}
	}

	getSelectedUnit(mouse: THREE.Vector2): Entity {
		const { display } = this.state;
		var raycaster = new THREE.Raycaster();

		raycaster.setFromCamera(mouse, display.camera);
		var meshList = [];
		for (var unit of this.units) {
			meshList.push(unit.mesh);
		}
		var intersects = raycaster.intersectObjects(meshList);
		if (intersects.length > 0) {
			return intersects[0].object.userData;
		}
		return null;
	}

	getSelectedUnits(mouseStart: THREE.Vector2, mouseEnd: THREE.Vector2): Array<Entity> {
		const { display } = this.state;
		var maxX = Math.max(mouseStart.x, mouseEnd.x);
		var minX = Math.min(mouseStart.x, mouseEnd.x);
		var maxY = Math.max(mouseStart.y, mouseEnd.y);
		var minY = Math.min(mouseStart.y, mouseEnd.y);

		var unitList = [];
		for (var unit of this.units) {
			var vector = this.toScreenPosition(unit.mesh);
			if (vector.x < maxX && vector.x > minX && vector.y > minY && vector.y < maxY) {
				unitList.push(unit);
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

	getSelectedUnitsInView(): Array<Entity> {
		const { display, playerInfo } = this.state;
		display.camera.updateMatrix(); // make sure camera's local matrix is updated
		display.camera.updateMatrixWorld(false); // make sure camera's world matrix is updated
		display.camera.matrixWorldInverse.getInverse(display.camera.matrixWorld);

		var frustum = new THREE.Frustum();
		var projScreenMatrix = new THREE.Matrix4();
		projScreenMatrix.multiplyMatrices(display.camera.projectionMatrix, display.camera.matrixWorldInverse);

		frustum.setFromMatrix(new THREE.Matrix4().multiplyMatrices(display.camera.projectionMatrix, display.camera.matrixWorldInverse));

		var unitList: Array<Entity> = [];
		for (var unit of this.units) {
			if (frustum.containsPoint(unit.loc.getVec()) && unit.details.owner === playerInfo.uuid) {
				unitList.push(unit);
			}
		}
		return unitList;
	}

	update(delta: number) {
		this.units.forEach((unit) => unit.update(delta));
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
		for (var i = -this.viewRange; i < this.viewRange; i++) {
			for (var j = -this.viewRange; j < this.viewRange; j++) {
				if (Math.sqrt(i * i + j * j) < this.viewRange) {
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
			if (!this.chunkMap[chunk]) {
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
				this.chunkMap[chunk] = cacheChunk;
				this.generateChunk(x, y, cacheChunk);
				RequestChange.post({ type: 'getChunk', x: x, y: y, unitsOnly: true });
			} else {
				RequestChange.post({ type: 'getChunk', x: x, y: y });
			}
		}
	}

	getUnitsOnChunk(chunkHash: string): Array<Entity> {
		let unitsOnChunk: Array<Entity> = [];
		for (let unit of this.units) {
			let unitChunkHash = unit.location.chunkX + ":" + unit.location.chunkY;
			if (chunkHash === unitChunkHash) {
				unitsOnChunk.push(unit);
			}
		}
		return unitsOnChunk;
	}

	unloadChunksNearTile(tile: PlanetLoc): void {
		const { display } = this.state;
		for (let hash in this.chunkMap) {
			let x = parseInt(hash.split(":")[0]);
			let y = parseInt(hash.split(":")[1]);
			var xdist = Math.abs(tile.chunkX - x);
			var ydist = Math.abs(tile.chunkY - y);
			if (Math.sqrt(xdist * xdist + ydist * ydist) > this.unloadRange) {
				//console.log("removing chunk:" + hash);
				this.destroyUnits(this.getUnitsOnChunk(hash));


				var chunk = this.chunkMap[hash];
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
				delete this.chunkMap[hash];
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
