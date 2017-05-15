// monofuel

export class SoundInfo {
	name: string;
	fileName: string;
	sound: THREE.PositionalAudio;
	constructor(name: string, fileName: string) {
		this.name = name;
		this.fileName = fileName;
	}
}

const soundMap: SoundInfo[] = [
	(new SoundInfo('tank', 'cannon.wav'))
];

export function getSound(name: string): SoundInfo {
	return null;
	/*
	for (var sound of soundMap) {
		if (sound.name === name) {
			return sound.sound;
		}
	}
  window.track('error',{msg: 'failed to find sound for '+ name});
	return null;
	*/
}

/**
 * kick off tasks to load all the models and returns a promise
 */
export function loadAllSounds() {
	/*
  console.log("loading sounds");
  var listener = new THREE.AudioListener();
  if (!display) {
	  return;
  }
  display.camera.add(listener);
	for (var unitInfo of soundMap) {
    unitInfo.sound = new THREE.PositionalAudio(listener);
			unitInfo.sound.load('sounds/' + unitInfo.fileName);
      unitInfo.sound.setVolume(100);
	}
	*/
}
