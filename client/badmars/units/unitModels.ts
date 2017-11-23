// monofuel

import * as _ from 'lodash';
import * as THREE from 'three';
import { log } from '../logger';
const ColladaLoader = require('three-collada-loader');
import State,{ UnitStatsChange, UnitStatsEvent } from '../state';
import { updateGraphicalEntity } from '../units';

const modelMap: { [key: string]: THREE.Group } = {}

export function getMesh(name: string): THREE.Group {
	const model = modelMap[name];
	if (!model) {
		return new THREE.Group();
	}
	return model;
}

export function handleModelChanges(state: State) {
	async function updateUnitsListener(data: UnitStatsEvent) {
		log('debug', 'loading models');
		await Promise.all(Object.keys(data.stats).map(async (unitType) => {
			await updateModel(unitType, data.stats[unitType].graphical);
			for (let entity of Object.values(state.unitEntities)) {
				if (entity.unit.details.type === unitType) {
					updateGraphicalEntity(state, entity);
				}
			}
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
