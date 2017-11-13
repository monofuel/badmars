export interface UnitDetails {
	type: UnitType,
	size: number,
	buildTime: number,
	cost: number,
	health: number,
	maxHealth: number,
	tick: number,
	lastTick: number,
	ghosting: boolean,
	owner: string,
}

export interface UnitLocation {
	hash: Array<string>,
	x: number,
	y: number,
	chunkHash: Array<string>,
	chunkX: number,
	chunkY: number,
	map: string,
}

export interface UnitMovable {
	layer: MovementLayer,
	speed: number,
	movementCooldown: number,
	path: Array<TileHash>,
	pathAttempts: number,
	pathAttemptAttempts: number,
	isPathing: boolean,
	pathUpdate: number,
	destination: null | TileHash,
	transferGoal: null | {
		uuid: string,
		iron?: number,
		fuel?: number,
	}
}

export interface UnitAttack {
	layers: Array<MovementLayer>,
	range: number,
	damage: number,
	fireRate: number,
	fireCooldown: number,
}

export interface UnitStorage {
	iron: number,
	fuel: number,
	maxIron: number,
	maxFuel: number,
	transferRange: number,
	resourceCooldown: number
}

export interface UnitGraphical {
	model: string,
	scale: number,
}

export interface UnitStationary {
	layer: MovementLayer,
}

export interface UnitConstruct {
	types: Array<string>,
	constructing: number,
}