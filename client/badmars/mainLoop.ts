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
	constructor(state: State) {
		this.clock = new THREE.Clock();
		this.statsMonitor = new StatsMonitor();
		this.state = state;
	}

	@autobind
	public logicLoop() {
		this.statsMonitor.begin();
		try {

			UnitStatsQueue.flush();
			MapQueue.flush();
			UnitQueue.flush();
			tsevents.flushOnce();
		} catch (err) {
			logError(err);
			// debugger;
		}
		try {

			const delta = this.clock.getDelta();
			this.state.input.update(delta);
			Object.values(this.state.unitEntities)
				.map((unit) => updateUnitEntity(this.state, unit, delta));
			this.state.display.render(delta);
		} catch (err) {
			logError(err);
			debugger;
		}
		this.statsMonitor.end();
		window.requestAnimationFrame(this.logicLoop);		
	}
}