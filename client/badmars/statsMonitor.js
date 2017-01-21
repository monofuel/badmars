/* @flow */
'use strict';

// monofuel
// 2-10-2016

export class StatsMonitor {
	fpsStats: Stats;
	msStats: Stats;
	mbStats: Stats;
	constructor() {
		this.fpsStats = new Stats();
		this.msStats = new Stats();
		this.mbStats = new Stats();

		this.fpsStats.setMode(0);
		this.msStats.setMode(1);
		this.mbStats.setMode(2);

		this.fpsStats.domElement.style.position = 'absolute';
		this.fpsStats.domElement.style.left = '0px';
		this.fpsStats.domElement.style.bottom = '0px';

		this.msStats.domElement.style.position = 'absolute';
		this.msStats.domElement.style.left = '80px';
		this.msStats.domElement.style.bottom = '0px';

		this.mbStats.domElement.style.position = 'absolute';
		this.mbStats.domElement.style.left = '160px';
		this.mbStats.domElement.style.bottom = '0px';

		const body = document.body;
		if (body) {
			body.appendChild(this.fpsStats.domElement);
			body.appendChild(this.msStats.domElement);
			body.appendChild(this.mbStats.domElement);
		}

		console.log('stats monitor loaded');
	}

	begin() {
		this.fpsStats.begin();
		this.msStats.begin();
		this.mbStats.begin();
	}

	end() {
		this.fpsStats.end();
		this.msStats.end();
		this.mbStats.end();
	}

}
