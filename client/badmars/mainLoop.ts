// monofuel

import { autobind } from 'core-decorators';
import StatsMonitor from './statsMonitor';
import { log, logError } from './logger';
import * as THREE from 'three';
import State, { MapQueue, UnitQueue } from './state';
import * as tsevents from 'ts-events';

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

			MapQueue.flush();
			UnitQueue.flush();
			tsevents.flushOnce();

			const delta = this.clock.getDelta();
			this.state.input.update(delta);
			if (this.state.map) {
				this.state.map.update(delta);
			}
			this.state.display.render(delta);
		} catch (err) {
			console.error(err);
			logError(err);
		}
		this.statsMonitor.end();
		window.requestAnimationFrame(this.logicLoop);
	}
}