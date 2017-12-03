import config from './config';
declare interface StatsType {
	setMode(num: number): void;
	domElement: any;
	begin(): void;
	end(): void;
}

const Stats = require('stats.js');

export default class StatsMonitor {
	fpsStats: StatsType;
	msStats: StatsType;
	mbStats: StatsType;

	constructor() {
		if (!config.debug) {
			return;
		}
		this.fpsStats = new Stats();
		this.msStats = new Stats();
		this.mbStats = new Stats();

		const { fpsStats, msStats, mbStats } = this;

		fpsStats.setMode(0);
		msStats.setMode(1);
		mbStats.setMode(2);

		fpsStats.domElement.style.position = 'absolute';
		fpsStats.domElement.style.left = '0px';
		fpsStats.domElement.style.bottom = '0px';

		msStats.domElement.style.position = 'absolute';
		msStats.domElement.style.left = '80px';
		msStats.domElement.style.bottom = '0px';

		mbStats.domElement.style.position = 'absolute';
		mbStats.domElement.style.left = '160px';
		mbStats.domElement.style.bottom = '0px';

		const div = document.getElementById('stats');
		div.appendChild(fpsStats.domElement);
		div.appendChild(msStats.domElement);
		div.appendChild(mbStats.domElement);

		console.log('stats monitor loaded');
	}

	begin() {
		if (!config.debug) {
			return;
		}
		this.fpsStats.begin();
		this.msStats.begin();
		this.mbStats.begin();
	}

	end() {
		if (!config.debug) {
			return;
		}
		this.fpsStats.end();
		this.msStats.end();
		this.mbStats.end();
	}

}
