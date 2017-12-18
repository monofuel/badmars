// monofuel

import { autobind } from 'core-decorators';
import StatsMonitor from './statsMonitor';
import { log, logError } from './logger';
import * as THREE from 'three';
import State, { MapQueue, UnitQueue, UnitStatsQueue, ChunkQueue } from './state';
import * as tsevents from 'ts-events';
import config from './config';
import { updateUnitEntity } from './units';
import { clearTimeout } from 'timers';

export default function startGameLoops() {
	renderLoop();
	animationLoop();
	gameLogicLoop();
	snowLoop();
	chunkLoadLoop();
}

function renderLoop() {

	const clock = new THREE.Clock();
	const statsMonitor = new StatsMonitor();
	const startTime = Date.now();
	loop(() => {
		statsMonitor.begin();
		// render the current frame
		state.display.render();
		statsMonitor.end();
	}, config.frameLimit)
}

function animationLoop() {

	const clock = new THREE.Clock();
	const startTime = Date.now();
	loop(() => {
		const delta = clock.getDelta();

		Object.values(state.unitEntities)
			.map((unit) => updateUnitEntity(state, unit, delta));

		state.display.updateSunPosition(delta);
	}, 30);
}

function chunkLoadLoop() {

	loop(() => {
		// Do gross stuff to limit queue speed
		const queue: (() => void)[] = (ChunkQueue as any)._queue;
		if (queue.length > 0) {
			queue.pop()();
		}
	}, 40);
}

function gameLogicLoop() {

	const clock = new THREE.Clock();
	const startTime = Date.now();
	loop(() => {

		const delta = clock.getDelta();

		try {
			UnitStatsQueue.flush();
			MapQueue.flush();
			UnitQueue.flush();
			tsevents.flushOnce();
		} catch (err) {
			logError(err);
			debugger;
		}

		state.input.update(delta);
		if (state.map) {
			state.map.processFogUpdate();
		}
	}, 40);
}

function snowLoop() {

	const clock = new THREE.Clock();
	loop(() => {
		const delta = clock.getDelta();

		Object.values(state.snow)
			.map((snow) => {
				(snow.geometry as THREE.Geometry).vertices.forEach((vert: THREE.Vertex) => {
					const dZ = - 0.03;

					vert.add(new THREE.Vector3(0, 0, dZ));
					if (vert.z < 0) {
						vert.z += 20;
					}
				});
				(snow.geometry as THREE.Geometry).verticesNeedUpdate = true;
			});
	}, 40);
}

function loop(fn: () => void, freq: number | 'auto') {
	const loopFn = () => {
		const startTime = Date.now();
		fn();
		if (freq === 'auto') {
			window.requestAnimationFrame(loopFn);
		} else {
			setTimeout(loopFn, (1000 / freq) - (Date.now() - startTime));
		}
	}
	loopFn();
}