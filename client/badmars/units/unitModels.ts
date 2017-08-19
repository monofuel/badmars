// monofuel

import * as _ from 'lodash';
import * as THREE from 'three';
const ColladaLoader = require('three-collada-loader');
// const textureLoader = new THREE.TextureLoader();

import { UnitStatsChange, UnitStatsEvent } from '../net';
import State from '../state';

const modelMap: { [key: string]: any } = {}

let loaded: number;
let total: number;

export function getMesh(name: string): THREE.Geometry {
	return new THREE.Geometry();
}

export function handleModelChanges(state: State) {
	async function updateUnitsListener(data: UnitStatsEvent) {
		for (const unitType of Object.keys(data.units)) {
			await updateModel(unitType, data.units[unitType].graphical);
		}
	}
	UnitStatsChange.attach(updateUnitsListener);
}

async function updateModel(type: string, graphical: any): Promise<void> {
	return new Promise<void>((resolve, reject) => {
		console.log('loading', type);
		const daeLoader = new ColladaLoader();
		daeLoader.setPath('/models/');
		daeLoader.load(graphical.model, (object: any) => {
			console.log('LOADED', type);

			modelMap[type] = object;

			resolve();
		}, _.noop, reject);
	});
}

/*
// TODO figure out why this works and how to type it correctly
export function getMesh(name: string): any {
	const model = _.find(models, (model) => model.name === name);
	if (model) {
		return model.model.children[0].geometry;
	}
	throw new Error(`model ${model.fileName} for ${name} not found`);
}

/**
 * kick off tasks to load all the models and returns a promise
 */
/*
export async function loadAllModelsAsync(): Promise<void> {
	loaded = 0;
	total = models.length;

	const manager = new THREE.LoadingManager();
	/*
	manager.onProgress = function (item: string, loaded: boolean, total: number) {
		console.log(item, loaded, total);
	}
	*//*
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
*/