// monofuel

import { autobind } from 'core-decorators';
import StatsMonitor from './statsMonitor';
import { log, logError } from './logger';
import * as THREE from 'three';
import State, { MapQueue, UnitQueue, UnitStatsQueue } from './state';
import * as tsevents from 'ts-events';
import config from './config';
import { updateUnitEntity } from './units';
import { clearTimeout } from 'timers';

export default function startGameLoops(state: State) {
	renderLoop(state);
	animationLoop(state);
	gameLogicLoop(state);
	snowLoop(state);

}

function renderLoop(state: State) {
	const clock = new THREE.Clock();
	const statsMonitor = new StatsMonitor();
	const render = () => {
		statsMonitor.begin();
		// render the current frame
		state.display.render();

		statsMonitor.end();
		// kick off the next frame
		if (config.frameLimit === 'auto') {
			window.requestAnimationFrame(render);
		} else {
			// just for debugging
			setTimeout(render, 1000 / config.frameLimit);
		}
	}
	// kick off the render loop
	render();
}

function animationLoop(state: State) {
	const clock = new THREE.Clock();
	const loop = () => {
		const delta = clock.getDelta();

		Object.values(state.unitEntities)
			.map((unit) => updateUnitEntity(state, unit, delta));

		state.display.updateSunPosition(delta);

		setTimeout(loop, 30);
	}
	loop();
}

function gameLogicLoop(state: State) {
	const clock = new THREE.Clock();
	const loop = () => {

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

		setTimeout(loop, 30);
	}
	loop();
}

function snowLoop(state: State) {
	const clock = new THREE.Clock();
	const loop = () => {
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

		setTimeout(loop, 10);
	}
	loop();
}