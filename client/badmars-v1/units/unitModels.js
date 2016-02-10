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
	}
}

var modelMap = [
	new ModelInfo('tank', 'tank_mockup.obj')
];

export class ModelLoader {
	static loaded: number;
	static total: number;

	/**
	 * kick off tasks to load all the models and returns a promise
	 */
	loadAllAsync(): Promise {
		ModelLoader.loaded = 0;
		ModelLoader.total = modelMap.length;

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
						ModelLoader.loaded++;
						unitInfo.model = model;

						resolve();
					});
			}));
		}
		return Promise.all(allPromises);
	}

}
