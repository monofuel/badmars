// monofuel

import { autobind } from 'core-decorators';
import StatsMonitor from './statsMonitor';
import { log, logError } from './logger';
import * as THREE from 'three';
import State, { MapQueue, UnitQueue, UnitStatsQueue } from './state';
import * as tsevents from 'ts-events';
import config from './config';

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
			debugger;
		}
		try {

			const delta = this.clock.getDelta();
			this.state.input.update(delta);
			if (this.state.map) {
				this.state.map.update(delta);
			}
			this.state.display.render(delta);

			// in development, trigger the next frame on success
			// If the frame failed, the debugger is started
			if (config.debug) {
				window.requestAnimationFrame(this.logicLoop);
			}
		} catch (err) {
			logError(err);
			debugger;
		}
		this.statsMonitor.end();

		// in production, always render another frame
		if (!config.debug) {
			window.requestAnimationFrame(this.logicLoop);
		}
	}
}