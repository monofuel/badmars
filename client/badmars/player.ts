// monofuel

import * as THREE from 'three';

export default class Player {
	public uuid: UUID;
	public username: String;
	public color: THREE.Color;

	constructor(uuid: UUID, username: String, color: string) {
		this.username = username;
		this.uuid = uuid;
		this.color = new THREE.Color();
		this.color.setHex(parseInt(color, 16));
	}

	public setColor(color: string) {
		this.color.setHex(parseInt(color, 16));
	}
}
