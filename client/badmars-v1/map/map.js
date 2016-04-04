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
	Display
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

export class Map {
	settings: Settings;
	grid: Array < Array < number >> ;
	navGrid: Array < Array < Symbol >> ;
	landMeshes: Array < THREE.Object3D > ;
	waterMeshes: Array < THREE.Object3D > ;
	units: Array < Entity > ;
	planetData: Object;
	worldSettings: Object;
	attackListener: Function;
	killListener: Function;

	constructor(planet: ? Object) {
		console.log('loading map');
		this.units = [];
		this.landMeshes = [];
		this.waterMeshes = [];
		this.planetData = {};
		var self = this;
		if (planet) {
			this.planetData = planet;
			this.worldSettings = planet.worldSettings;
			this.navGrid = planet.navGrid;
			this.grid = planet.grid;
			this.generateMesh();
		} else {
			console.log("error: invalid planet.");
		}

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
			if (attackingUnit && attackingUnit.fire) {
				console.log("unit taking damage");
				attackingUnit.fire(unit);
			}
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

		window.addUnit = (unit: Object) => {
			for (var oldUnit of self.units) {
				if (oldUnit.uid == unit._id) {
					console.log('duplicate unit');
					return;
				}
			}

			switch (unit.type) {
				case 'iron':
					var loc = new PlanetLoc(self, unit.location[0], unit.location[1]);

					self.units.push(new Iron(loc, unit.rate, unit._id));
					break;
				case 'oil':
					var loc = new PlanetLoc(this, unit.location[0], unit.location[1]);

					self.units.push(new Oil(loc, unit.rate, unit._id));
					break;
				case 'tank':
					var loc = new PlanetLoc(self, unit.location[0], unit.location[1]);

					self.units.push(new Tank(loc, unit.owner, unit._id));
					break;
			}
		}
	}

	destroy() {

		deleteListener(this.attackListener);
		deleteListener(this.killListener);
		for (var mesh of this.landMeshes) {
			Display.removeMesh(mesh);
		}
		for (var mesh of this.waterMeshes) {
			Display.removeMesh(mesh);
		}
		var unitListCopy = this.units.slice();
		for (var unit of unitListCopy) {
			unit.destroy();
		}
		if (this.units.length != 0) {
			console.log("failed to destroy all units");
		}
	}

	generateMesh() {
		var chunkCount = (this.worldSettings.size - 2) / this.worldSettings.chunkSize;

		console.log("chunk count: " + chunkCount);
		for (var y = 0; y < chunkCount; y++) {
			for (var x = 0; x < chunkCount; x++) {
				this.generateChunk(x, y);
			}
		}
		console.log("generated all chunks");
	}

	generateChunk(chunkX: number, chunkY: number) {
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

		for (var y = 0; y <= this.worldSettings.chunkSize; y++) {
			for (var x = 0; x <= this.worldSettings.chunkSize; x++) {
				gridGeom.vertices.push(new THREE.Vector3(x, y,
					this.grid[(chunkY * this.worldSettings.chunkSize) + y][(chunkX * this.worldSettings.chunkSize) + x]));
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

				if (this.navGrid[(chunkX * this.worldSettings.chunkSize) + x][(chunkY * this.worldSettings.chunkSize) + y] != 1) {
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

		gridMesh.rotation.x = -Math.PI / 2;
		waterMesh.rotation.x = -Math.PI / 2;

		var centerMatrix = new THREE.Matrix4()
			.makeTranslation(chunkX * this.worldSettings.chunkSize, chunkY * this.worldSettings.chunkSize, 0);
		gridMesh.geometry.applyMatrix(centerMatrix);
		waterMesh.geometry.applyMatrix(centerMatrix);

		waterMesh.position.x += this.worldSettings.chunkSize / 2;
		waterMesh.position.y += this.worldSettings.waterHeight;
		waterMesh.position.z -= this.worldSettings.chunkSize / 2;

		this.landMeshes.push(gridMesh);
		this.waterMeshes.push(waterMesh);

		console.log("Generated Geometry");

	}


	addToRender() {
		if (!display) {
			console.log('error: display not initialized when adding map!');
			return;
		}
		for (var mesh of this.landMeshes) {
			display.addMesh(mesh);
		}
		for (var mesh of this.waterMeshes) {
			display.addMesh(mesh);
		}
		console.log('added map to scene');
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

	updateUnitDestination(unitId: string, newLocation: Array < number > , time: number) {
		var unit = this.getUnitById(unitId);
		if (unit && unit.updateNextMove) {
			var tile = new PlanetLoc(unit.location.planet, newLocation[0], newLocation[1]);
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
			if (unit.uid == unitId)
				return unit;
		}
		return null;
	}

	removeUnit(unit: Entity) {
		this.units.splice(this.units.indexOf(unit), 1);
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
			return null;
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

	toScreenPosition(obj){
    var vector = new THREE.Vector3();

    obj.updateMatrixWorld();
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

	getSelectedUnitsInView() {
		if (!display) {
			return null;
		}
		display.camera.updateMatrix(); // make sure camera's local matrix is updated
		display.camera.updateMatrixWorld(); // make sure camera's world matrix is updated
		display.camera.matrixWorldInverse.getInverse( display.camera.matrixWorld );

		var frustum = new THREE.Frustum();
		var projScreenMatrix = new THREE.Matrix4();
		projScreenMatrix.multiplyMatrices( display.camera.projectionMatrix, display.camera.matrixWorldInverse );

		frustum.setFromMatrix( new THREE.Matrix4().multiplyMatrices( display.camera.projectionMatrix, display.camera.matrixWorldInverse ) );

		var unitList = [];
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
