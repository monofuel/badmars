/* @flow */
'use strict';

// monofuel
// 2-7-2016

var SERVER_URL = "http://dev.japura.net"
var SERVER_PORT = 7002

export class Net {
	s: WebSocket;
	self: Net;
	listeners: Object;

	constructor() {
		console.log("connecting..");
		this.s = new WebSocket(SERVER_URL + ":" + SERVER_PORT);

		this.self = this;
		this.listeners = {};

		this.s.onopen = () => {

		}

		this.s.onmessage = (event) => {
			var data = event.data;
			console.log(data);
		}
	}

	send(data: string) {
		this.s.send(data);
	}

	close() {
		this.s.close();
	}

	/*
	 * 0 is not connected
	 * 1 is connected
	 * 2 is closing
	 * 3 is closed
	 */
	getState(): number {
		return this.s.readyState;
	}

}
