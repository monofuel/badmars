/* @flow */
'use strict';

// monofuel
// 2-7-2016

import {
	PlanetLoc
} from './planetLoc.js';
import {
	TILE_LAND,
	TILE_WATER,
	TILE_CLIFF,
	TILE_COAST
} from './tileTypes.js';
import {
	Entity
} from '../units/entity.js';
import {
	display,
	playerInfo
} from '../client.js';
import {
	Display,
} from '../display.js';
import {
	Iron
} from '../units/iron.js';
import {
	Oil
} from '../units/oil.js';
import {
	Tank
} from '../units/tank.js';
import {
	GroundUnit
} from '../units/groundUnit.js';
import {
	Storage
} from '../units/storage.js'; //oh god so many units so many files dear god why
import {
	Builder
} from '../units/builder.js';
import {
	Transport
} from '../units/transport.js';
import {
	Factory
} from '../units/factory.js';
import {
	Wall
} from '../units/wall.js';
import {
	Mine
} from '../units/mine.js';
import {
	N,
	S,
	E,
	W,
	C
} from '../units/directions.js';

import {
	registerListener,
	deleteListener
} from '../net.js';
import {
	registerBusListener,
	deleteBusListener,
	fireBusEvent
} from '../eventBus.js';

//TODO chunk should be a type

export class Map {
	settings: Settings;
	chunkMap: Object;
	landMeshes: Array < THREE.Object3D > ;
	waterMeshes: Array < THREE.Object3D > ;
	units: Array < Entity > ;
	planetData: Object;
	worldSettings: Object;
	attackListener: Function;
	killListener: Function;
	ghostUnitListener: Function;
	chunkListener: Function;
	updateUnitsListener: Function;
	chunkCache: Object;
	viewRange: number;
	unloadRange: number;

	chunkInterval: number;

	constructor(planet: ? Object) {
		console.log('loading map');
		this.units = [];
		this.landMeshes = [];
		this.waterMeshes = [];
		this.planetData = {};
		this.chunkMap = {};
		this.chunkCache = {};
		this.viewRange = 5;
		this.unloadRange = this.viewRange + 3;
		var self = this;
		if (planet) {
			this.planetData = planet;
			window.debug.planet = planet;

			window.debug.map = self;
			this.worldSettings = planet.settings;
		} else {
			console.log("error: invalid planet.");
		}

		window.debug.loadChunks = () => {
			self.loadChunksNearCamera();
		};

		this.chunkInterval = setInterval(() => {
			self.loadChunksNearCamera();
		},750);

		this.chunkListener = (data) => {
			//console.log('loading chunk');
			var chunk = data.chunk;
			self.chunkMap[data.chunk.hash] = chunk;
			self.generateChunk(chunk.x,chunk.y,chunk);

			//TODO: should force only units at the specific chunk to re-check their location
			//this is to avoid issues when chunks load after units do.
			self.fixAllLocations();
		}
		registerListener('chunk',this.chunkListener);

		this.attackListener = (data) => {
			console.log("handling attack");
			var unit = self.getUnitById(data.enemyId);
			var attackingUnit = self.getUnitById(data.unitId);
			if (unit && unit.takeDamage) {
				unit.takeDamage(attackingUnit);
			}
			if (unit && unit.updateHealth) {
				unit.updateHealth(data.enemyHealth);
			} else {
				window.track("error", {
					message: "tried to attack un-attackable unit",
					data: data
				});
			}
			if (attackingUnit && attackingUnit instanceof GroundUnit) {
				console.log("unit taking damage");
				attackingUnit.fire(unit);
			}
		};
		registerListener('attack', this.attackListener);

		this.killListener = (data) => {
			console.log("handling kill");
			var unit = self.getUnitById(data.enemyId);
			if (unit && unit.destroy) {
				unit.destroy();
			} else {
				window.track("error", {
					message: "tried to kill un-killable unit",
					data: data
				});
			}
		}
		registerListener('kill', this.killListener);

		this.ghostUnitListener = (data) => {
			console.log('create ghost success');
			//window.addUnit(data.unit);
		}
		registerListener('createGhost',this.ghostUnitListener);

		this.updateUnitsListener = (data) => {
			for (let updated of data.units) {
				let unit = window.getUnit(updated.uuid);
				if (unit) {
						window.debug.updateUnit = unit;
						if (unit.updateUnitData) {
							unit.updateUnitData(updated);
						}
				} else {
					console.log('new unit found');
					console.log(updated);
					window.addUnit(updated);
				}
				fireBusEvent('unit',updated);
			}
		}

		window.getUnit = (uuid) => {
			for (var unit of self.units) {
				if (unit.uuid == uuid) {
					return unit;
				}
			}
		}

		registerListener('updateUnits',this.updateUnitsListener);

		window.addUnit = (unit: Object) => {
			for (var oldUnit of self.units) {
				if (oldUnit.uuid === unit.uuid) {

					//update monkeypatch
					//TODO make this more elegant
					for (let key of Object.keys(unit)) {
						oldUnit[key] = unit[key];
						let skipChunk = playerInfo && unit.owner !== playerInfo.id
						let tile = new PlanetLoc(self,unit.x,unit.y,(playerInfo && unit && unit.owner !== playerInfo.id));

						if (oldUnit.updateNextMove && !oldUnit.location.equals(tile)) {
							oldUnit.updateNextMove(tile,oldUnit.speed);
						}
					}
					//console.log('updating unit');
					return;
				}
			}
			if (playerInfo && unit.owner !== playerInfo.id) {
				let tile = new PlanetLoc(self,unit.x,unit.y,true);
				if (!tile.chunk) {
					console.log('ignoring unit update');
					return;
				}
			}

			//console.log(unit);
			if (!playerInfo || !unit) {
				return;
			}

			if (unit.ghosting && unit.owner != playerInfo.id) {
				console.log('can see other players ghost: INVALID');
				return;
			}

			var newUnit;
			switch (unit.type) { //TODO refactor this. refactor it REAL good.
				case 'iron':
					var loc = new PlanetLoc(self, unit.x, unit.y);
					newUnit = new Iron(loc, unit.rate, unit.uuid);
					break;
				case 'oil':
					var loc = new PlanetLoc(this, unit.x, unit.y);
					newUnit = new Oil(loc, unit.rate, unit.uuid);
					break;
				case 'tank':
					var loc = new PlanetLoc(self, unit.x, unit.y);
					newUnit = new Tank(loc, unit.owner, unit.uuid)
					newUnit.ghosting = unit.ghosting;
					break;
				case 'storage':
					var loc = new PlanetLoc(self, unit.x, unit.y);
					newUnit = new Storage(loc, unit.owner, unit.uuid)
					newUnit.ghosting = unit.ghosting;
					break;
				case 'factory':
					var loc = new PlanetLoc(self, unit.x, unit.y);
					newUnit = new Factory(loc, unit.owner, unit.uuid)
					newUnit.ghosting = unit.ghosting;
					break;
				case 'wall':
					var loc = new PlanetLoc(self, unit.x, unit.y);
					newUnit = new Wall(loc, unit.owner, unit.uuid)
					newUnit.ghosting = unit.ghosting;
					break;
				case 'mine':
					var loc = new PlanetLoc(self, unit.x, unit.y);
					newUnit = new Mine(loc, unit.owner, unit.uuid)
					newUnit.ghosting = unit.ghosting;
					break;
				case 'builder':
					var loc = new PlanetLoc(self, unit.x, unit.y);
					newUnit = new Builder(loc, unit.owner, unit.uuid)
					newUnit.ghosting = unit.ghosting;
					break;
				case 'transport':
					var loc = new PlanetLoc(self, unit.x, unit.y);
					newUnit = new Transport(loc, unit.owner, unit.uuid)
					newUnit.ghosting = unit.ghosting;
					break;
				default:
					console.log('unknown type: ', unit);
					return;
			}
			newUnit.storage = {
				oil: unit.oil,
				iron: unit.iron
			}
			if (!newUnit.storage.iron) {
				newUnit.storage.iron = 0;
			}
			if (!newUnit.storage.oil) {
				newUnit.storage.oil = 0;
			}
			newUnit.health = unit.health;
			self.units.push(newUnit);
		}
	}

	destroy() {


		clearInterval(this.chunkInterval);
		deleteListener(this.attackListener);
		deleteListener(this.killListener);
		deleteListener(this.ghostUnitListener);
		deleteListener(this.chunkListener);
		if (display) {
			for (var mesh of this.landMeshes) {
				display.removeMesh(mesh);
			}
			for (var mesh of this.waterMeshes) {
				display.removeMesh(mesh);
			}
		}
		var unitListCopy = this.units.slice();
		for (var unit of unitListCopy) {
			unit.destroy();
		}
		if (this.units.length != 0) {
			console.log("failed to destroy all units");
		}
	}

	generateChunk(chunkX: number, chunkY: number, chunk: Object) {
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
		waterGeom.computeFaceNormals();
		waterGeom.computeVertexNormals();

		//fiddle with the normals

		for (var index = 0; index < gridGeom.faces.length; index += 2) {
			var landVector1 = gridGeom.faces[index].normal;
			var landVector2 = gridGeom.faces[index + 1].normal;
			var newVec = landVector1.clone();
			newVec.add(landVector2);
			newVec = newVec.divideScalar(2);


			//these 2 lines don't really change the visuals
			//but let's keep them anyway
			gridGeom.faces[index].normal.copy(newVec);
			gridGeom.faces[index + 1].normal.copy(newVec);

			//this gives the cool square effect and make
			//shading look good between tiles
			for (var i = 0; i <= 2; i++) {
				gridGeom.faces[index].vertexNormals[i].copy(newVec);
				gridGeom.faces[index + 1].vertexNormals[i].copy(newVec);
			}
		}


		gridGeom.normalsNeedUpdate = true;

		var planetMaterials = new THREE.MeshFaceMaterial([landMaterial, cliffMaterial]);

		var gridMesh = new THREE.Mesh(gridGeom, planetMaterials);
		var waterMesh = new THREE.Mesh(waterGeom, waterMaterial);

		var centerMatrix = new THREE.Matrix4()
			.makeTranslation(chunkX * this.worldSettings.chunkSize, chunkY * this.worldSettings.chunkSize, 0);
		gridMesh.geometry.applyMatrix(centerMatrix);
		waterMesh.geometry.applyMatrix(centerMatrix);

		gridMesh.rotation.x = -Math.PI / 2;
		waterMesh.rotation.x = -Math.PI / 2;

		//gridMesh.position.z = (chunkX);
		gridMesh.position.y = 0;
		//gridMesh.position.x = (chunkY);


		waterMesh.position.copy(gridMesh.position)
		waterMesh.position.x += this.worldSettings.chunkSize / 2;
		waterMesh.position.y += this.worldSettings.waterHeight;
		waterMesh.position.z -= this.worldSettings.chunkSize / 2;



		this.landMeshes.push(gridMesh);
		this.waterMeshes.push(waterMesh);

		this.chunkMap[chunk.hash].landMesh = gridMesh;
		this.chunkMap[chunk.hash].waterMesh = waterMesh;

		if (display) {
			display.addMesh(gridMesh);
			display.addMesh(waterMesh);
		}

		//console.log("Generated Geometry");

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

	nearestStorage(tile: PlanetLoc): ?Storage {
		var storages = [];
		if (!playerInfo || !tile)
			return;
		for (var unit of this.units) {
			if (unit instanceof Storage && unit.playerId == playerInfo.id) {
				storages.push(unit);
			}
		}
		storages.sort((a,b) => {
			return a.location.distance(tile) - b.location.distance(tile);
		});
		if (storages.length > 0) {
			return storages[0];
		}
		return null;
	}


	updateUnitDestination(unitId: string, newLocation: Array < number > , time: number) {
		const unit = this.getUnitById(unitId);
		const x = newLocation[0];
		const y = newLocation[1];
		if (unit && unit.updateNextMove) {
			var tile = new PlanetLoc(unit.location.planet, x, y);
			return unit.updateNextMove(tile, time);
		}
		if (!unit) {
			console.log('unknown unit moving. re-requesting unit list');
			if (window.sendMessage) {
				window.sendMessage({
					type: 'getUnits'
				})
			}

		}
		return;
	}

	getUnitById(unitId: string): ? Entity {
		for (var unit of this.units) {
			if (unit.uuid == unitId)
				return unit;
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

	getSelectedUnit(mouse: THREE.Vector2): ? Entity {
		if (!display) {
			return null;
		}
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
		console.log("no unit selected");
		return null;
	}

	getSelectedUnits(mouseStart: THREE.Vector2, mouseEnd: THREE.Vector2): Array<Entity> {
		if (!display) {
			return [];
		}
		var maxX = Math.max(mouseStart.x,mouseEnd.x);
		var minX = Math.min(mouseStart.x,mouseEnd.x);
		var maxY = Math.max(mouseStart.y,mouseEnd.y);
		var minY = Math.min(mouseStart.y,mouseEnd.y);

		var unitList = [];
		for (var unit of this.units)  {
			var vector = this.toScreenPosition(unit.mesh);
			if (vector.x < maxX && vector.x > minX && vector.y > minY && vector.y < maxY) {
				unitList.push(unit);
			}
		}
		return unitList;
	}

	toScreenPosition(obj: THREE.Mesh): THREE.Vector3{
	    var vector = new THREE.Vector3();

	    obj.updateMatrixWorld();
	    vector.setFromMatrixPosition(obj.matrixWorld);
		if (display) {
		    vector.project(display.camera);
		}

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
		if (!display || !playerInfo) {
			return [];
		}
		display.camera.updateMatrix(); // make sure camera's local matrix is updated
		display.camera.updateMatrixWorld(); // make sure camera's world matrix is updated
		display.camera.matrixWorldInverse.getInverse( display.camera.matrixWorld );

		var frustum = new THREE.Frustum();
		var projScreenMatrix = new THREE.Matrix4();
		projScreenMatrix.multiplyMatrices( display.camera.projectionMatrix, display.camera.matrixWorldInverse );

		frustum.setFromMatrix( new THREE.Matrix4().multiplyMatrices( display.camera.projectionMatrix, display.camera.matrixWorldInverse ) );

		var unitList: Array<Entity> = [];
		for (var unit of this.units)  {
			if (frustum.containsPoint(unit.location.getVec()) && unit.playerId == playerInfo.id) {
				unitList.push(unit);
			}
		}
		return unitList;
	}

	update(delta: number) {
		for (var unit of this.units) {
			unit.update(delta);
		}
	}

	getChunksAroundTile(tile: PlanetLoc): Array<string> {
		var chunks:Array<string> = [];
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

	loadChunksNearTile(tile: PlanetLoc):void {
		var chunks = this.getUnloadedChunks(this.getChunksAroundTile(tile));
		for (let chunk of chunks) {
			let x = parseInt(chunk.split(":")[0]);
			let y = parseInt(chunk.split(":")[1]);
			let cacheChunk = this.chunkCache[chunk];
			if (cacheChunk) {
				this.chunkMap[chunk] = cacheChunk;
				this.generateChunk(x,y,cacheChunk);
			} else {
				window.sendMessage({type:"getChunk",x:x,y:y});
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
				if (index != -1){
					this.landMeshes.splice(index,1);
				}
				index = this.waterMeshes.indexOf(chunk.waterMesh)
				if (index != -1){
					this.waterMeshes.splice(index,1);
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
		var tile = this.getTileAtRay(new THREE.Vector2(0,0));
		if (!tile) {
			console.log('no tile found at camera');
			return;
		}
		this.loadChunksNearTile(tile);
		this.unloadChunksNearTile(tile);
	}

	getTileAtRay(mouse: THREE.Vector2): ? PlanetLoc {
		if (!display) {
			return null;
		}

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
