type UUID = string;
type TileHash = string;
type ChunkHash = string;
type Timestamp = number;
type Tick = number;
type UnitType = string;
type TileCode = 0 | 1 | 2 | 3;
type TileType = 'land' | 'cliff' | 'water' | 'coast' | 'unknown';
type Dir = 'N' | 'S' | 'W' | 'E' | 'C';
type ProfileKey = string;
type MovementLayer = 'ground' | 'air' | 'water';
type Resource = 'iron' | 'fuel';
type ChunkLayer = 'air' | 'ground' | 'resource';

type Success = boolean;

type ModuleName = 'chunk';

interface ChunkProto {
	grid: Array<Object>;
	navGrid: Array<Object>;
}

interface EntityMapType {
	[key: string]: UUID
}

interface FactoryOrder {
	uuid: UUID,
	factory: UUID,
	type: UnitType,
	created: number,
}

interface Chunk {
	x: number;
	y: number;
	hash: TileHash;
	map: string;

	grid: Array<Array<number>>;
	navGrid: Array<Array<TileCode>>;
	chunkSize: number;
}

interface Unit {
	uuid: UUID;
	awake: boolean;
	details: UnitDetails;
	location: UnitLocation;
	movable: null | UnitMovable;
	attack: null | UnitAttack;
	storage: null | UnitStorage;
	graphical: null | UnitGraphical;
	stationary: null | UnitStationary;
	construct: null | UnitConstruct;
}

interface UnitPatch {
	uuid: UUID;
	awake: boolean;
	details: Partial<UnitDetails>;
	location: Partial<UnitLocation>;
	movable: null | Partial<UnitMovable>;
	attack: null | Partial<UnitAttack>;
	storage: null | Partial<UnitStorage>;
	graphical: null | Partial<UnitGraphical>;
	stationary: null | Partial<UnitStationary>;
	construct: null | Partial<UnitConstruct>;
}

interface UnitDetails {
	type: UnitType,
	size: number,
	buildTime: number,
	vision: number,
	cost: number,
	health: number,
	maxHealth: number,
	lastTick: number,
	ghosting: boolean,
	owner: string,
	unfueled: boolean,
	ironRate: number,
	fuelRate: number,
	fuelBurn: number,
	fuelBurnLength: number, // ticks to use 1 unit of fuel
}

interface UnitLocation {
	hash: Array<string>,
	x: number,
	y: number,
	chunkHash: Array<string>,
	chunkX: number,
	chunkY: number,
	map: string,
}

interface UnitMovable {
	layer: MovementLayer,
	speed: number,
	movementCooldown: number,
	path: Array<Dir>,
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

interface UnitAttack {
	layers: Array<MovementLayer>,
	range: number,
	damage: number,
	fireRate: number,
	fireCooldown: number,
}

interface UnitStorage {
	iron: number,
	fuel: number,
	maxIron: number,
	maxFuel: number,
	transferRange: number,
	resourceCooldown: number,
	desired?: {
		iron: number,
		fuel: number
	}
}

interface UnitGraphical {
	model: string,
	scale: number,
}

interface UnitStationary {
	layer: MovementLayer,
}

interface UnitConstruct {
	types: Array<string>,
	constructing?: {
		remaining: number,
		type: string,
	}
	// HACK is separately loaded from the factoryQueue table
	queue?: FactoryOrder[],
}