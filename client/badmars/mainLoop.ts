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

export default class MainLoop {
	clock: THREE.Clock;
	statsMonitor: StatsMonitor;
	state: State;

	frame: number;
	constructor(state: State) {
		this.clock = new THREE.Clock();
		this.statsMonitor = new StatsMonitor();
		this.state = state;
		this.frame = 0;
	}

	@autobind
	public logicLoop() {
		this.frame = (this.frame + 1) % 2
		this.statsMonitor.begin();
		if (this.frame === 0) {
			try {
				UnitStatsQueue.flush();
				MapQueue.flush();
				UnitQueue.flush();
				tsevents.flushOnce();
			} catch (err) {
				logError(err);
				debugger;
			}
		}
		try {

			const delta = this.clock.getDelta();
			this.state.input.update(delta);
			if (this.frame === 1) {
				Object.values(this.state.unitEntities)
					.map((unit) => updateUnitEntity(this.state, unit, delta));
			}
			Object.values(this.state.snow)
				.map((snow) => {
					(snow.geometry as THREE.Geometry).vertices.forEach((vert: THREE.Vertex) => {
						const v = 0.001;
						const dX = (Math.random() * (v * 2)) - v;
						const dY = (Math.random() * (v * 2)) - v;
						const dZ = - v * 10;

						vert.add(new THREE.Vector3(dX, dY, dZ));
						if (vert.z < 0) {
							vert.z += 20;
						}
					});
					(snow.geometry as THREE.Geometry).verticesNeedUpdate = true;
				});
			this.state.display.render(delta);
		} catch (err) {
			logError(err);
			debugger;
		}
		this.statsMonitor.end();
		window.requestAnimationFrame(this.logicLoop);
	}
}