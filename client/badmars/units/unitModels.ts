// monofuel

import * as _ from 'lodash';
import * as THREE from 'three';


export class ModelInfo {
	name: string;
	fileName: string;
	model: any;
	constructor(name: string, fileName: string) {
		this.name = name;
		this.fileName = fileName;
		this.model = new THREE.Geometry();
	}
}

const models: ModelInfo[] = [
	(new ModelInfo('tank', 'tank_mockup.obj')),
	(new ModelInfo('iron', 'iron_mockup.obj')),
	(new ModelInfo('oil', 'oil.obj')),
	(new ModelInfo('builder', 'builder.obj')),
	(new ModelInfo('mine', 'mine.obj')),
	(new ModelInfo('storage', 'storage.obj')),
	(new ModelInfo('factory', 'factory.obj')),
	(new ModelInfo('transport', 'transport.obj'))
];

let loaded: number;
let total: number;

// TODO figure out why this works and how to type it correctly
export function getMesh(name: string): any {
	const model = _.find(models, (model) => model.name === name);
	if (model) {
		return model.model.children[0].geometry;
	}
	throw new Error(`no model for ${name}`);
}

/**
 * kick off tasks to load all the models and returns a promise
 */
export async function loadAllModelsAsync(): Promise<void> {
	loaded = 0;
	total = models.length;

	const manager = new THREE.LoadingManager();
	/*
	manager.onProgress = function (item: string, loaded: boolean, total: number) {
		console.log(item, loaded, total);
	}
	*/
	// OBJ loader is provided by another script
	var loader = new (THREE as any).OBJLoader(manager);
	var allPromises = [];
	for (var tmp of models) {
		allPromises.push(new Promise(function (resolve, reject) {
			var unitInfo = tmp; // passing variable into promise finnickery
			loader.load('models/' + unitInfo.fileName,
				function (model: THREE.Mesh) {
					// console.log('loaded model for ', unitInfo.name);
					loaded++;
					unitInfo.model = model;

					resolve();
				});
		}));
	}
	await Promise.all(allPromises);
}
