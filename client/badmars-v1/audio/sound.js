/* @flow */
'use strict';

// monofuel
// 4-3-2016

import {
  display
} from '../client.js';

export class SoundInfo {
	name: string;
	fileName: string;
	sound: THREE.PositionalAudio;
	constructor(name: string, fileName: string) {
		this.name = name;
		this.fileName = fileName;
	}
}

var soundMap: Array < SoundInfo > = [
	(new SoundInfo('tank', 'cannon.wav'))
];

export var loaded: number;
export var total: number;

export function getSound(name: string): ? SoundInfo {
	for (var sound of soundMap) {
		if (sound.name == name) {
			return sound.sound;
		}
	}
  window.track('error',{msg: 'failed to find sound for '+ name});
	return null;
}

/**
 * kick off tasks to load all the models and returns a promise
 */
export function loadAllSounds() {
  console.log("loading sounds");
  var listener = new THREE.AudioListener();
  display.camera.add(listener);
	for (var unitInfo of soundMap) {
    unitInfo.sound = new THREE.PositionalAudio(listener);
			unitInfo.sound.load('sounds/' + unitInfo.fileName);
	}
  window.debug.testSound = () => {
    getSound(tank).sound.play();
  }
}
