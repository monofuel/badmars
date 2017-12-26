// monofuel

import { autobind } from 'core-decorators';
import StatsMonitor from './statsMonitor';
import { log, logError } from './logger';
import * as THREE from 'three';
import GameState, { MapQueue, UnitQueue, UnitStatsQueue, ChunkQueue } from './state';
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
		gameState.display.render();
		statsMonitor.end();
	}, config.frameLimit)
}

function animationLoop() {

	const clock = new THREE.Clock();
	const startTime = Date.now();
	loop(() => {
		const delta = clock.getDelta();

		Object.values(gameState.unitEntities)
			.map((unit) => updateUnitEntity(gameState, unit, delta));

		gameState.display.updateSunPosition(delta);
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

		gameState.input.update(delta);
		if (gameState.map) {
			gameState.map.processFogUpdate();
		}
	}, 40);
}

function snowLoop() {

	const clock = new THREE.Clock();
	loop(() => {
		const delta = clock.getDelta();

		Object.values(gameState.snow)
			.map((snow) => {
				snow.position.y -= 0.03;
				if (snow.position.y < 0) {
					snow.position.y += 40;
				}
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