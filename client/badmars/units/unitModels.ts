// monofuel

import * as _ from 'lodash';
import * as THREE from 'three';
import { log } from '../logger';
const ColladaLoader = require('three-collada-loader');
// const textureLoader = new THREE.TextureLoader();

import State,{ UnitStatsChange, UnitStatsEvent } from '../state';

const modelMap: { [key: string]: THREE.Group } = {}

let loaded: number;
let total: number;

export function getMesh(name: string): THREE.Group {
	return modelMap[name] || new THREE.Group();
}

export function handleModelChanges(state: State) {
	async function updateUnitsListener(data: UnitStatsEvent) {
		log('debug', 'loading models');
		await Promise.all(Object.keys(data.stats).map(async (unitType) => {
			await updateModel(unitType, data.stats[unitType].graphical);
			
			// update all models of that type
			state.units
				.filter((unit) => unit.details.type === unitType)
				.map((unit) => unit.refreshMesh());
		}));
		log('debug', 'done loading models');
	}
	UnitStatsChange.attach(updateUnitsListener);
}

async function updateModel(type: string, graphical: any): Promise<void> {
	return new Promise<void>((resolve, reject) => {
		log('debug', 'loading model', { type, graphical });
		const daeLoader = new ColladaLoader();
		daeLoader.load(`models/${graphical.model}`, (collada: any) => {
			log('debug', 'loaded model', { type });

			modelMap[type] = collada.scene;
			console.log(collada)

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