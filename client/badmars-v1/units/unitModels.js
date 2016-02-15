/* @flow */
'use strict';

// monofuel
// 2-7-2016

export class ModelInfo {
	name: string;
	fileName: string;
	model: THREE.Mesh3D;
	constructor(name: string, fileName: string) {
		this.name = name;
		this.fileName = fileName;
		this.model = THREE.geometry;
	}
}

var modelMap: Array < ModelInfo > = [
	(new ModelInfo('tank', 'tank_mockup.obj'))
];

export var loaded: number;
export var total: number;

export function getMesh(name: string): ? ModelInfo {
	for (var model of modelMap) {
		if (model.name == name) {
			return model.model;
		}
	}
	return null;
}

/**
 * kick off tasks to load all the models and returns a promise
 */
export function loadAllModelsAsync() : Promise {
	loaded = 0;
	total = modelMap.length;

	var manager = new THREE.LoadingManager();
	manager.onProgress = function (item: string, loaded: boolean, total: number) {
		console.log(item, loaded, total);
	}
	var loader = new THREE.OBJLoader(manager);
	var allPromises = [];
	for (var unitInfo of modelMap) {
		allPromises.push(new Promise(function (resolve, reject) {
			loader.load('models/' + unitInfo.fileName,
				function (model: THREE.Mesh3D) {
					loaded++;
					unitInfo.model = model;

					resolve();
				});
		}));
	}
	return Promise.all(allPromises);
}
