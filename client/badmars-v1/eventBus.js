/* @flow */
'use strict';

// monofuel
// 4/2-2016

//map of keys to an array of functions to call
var listeners = {};

//TODO flow type event types and their objects


export function registerBusListener(eventType: string, listener: Function) {
	console.log("registering " + eventType + " bus listener");
	if (!listeners[eventType]) {
		listeners[eventType] = [];
	}
	if (listeners[eventType].indexOf(listener) != -1) {
		console.log("duplicate bus listener registered for " + eventType);
		window.track('error',{
			eventType: eventType,
			msg: 'duplicate bus listener'
		})
	}
	listeners[eventType].push(listener);
}

export function deleteBusListener(listener: Function) {
	for (var eventType of Object.keys(listeners)) {
		for (var index in listeners[eventType]) {
			if (listeners[eventType][index] == listener) {
				listeners[eventType].splice(index, 1);
			}
		}
	}
}

export function fireBusEvent(eventType: string, data: any) {
  console.log('firing event ' + eventType);
	if (listeners[eventType]) {
		for (var listener of listeners[eventType]) {
			listener(data);
		}
	}
}
