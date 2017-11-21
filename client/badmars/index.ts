
const t = require('flow-runtime');

// TODO should unify types between frontend and backend
export interface Planet {
	settings: {
		chunkSize: number,
		waterHeight: number,
		cliffDelta: number,
		water: boolean,
		bigNoise: number,
		medNoise: number,
		smallNoise: number,
		bigNoiseScale: number,
		medNoiseScale: number,
		smallNoiseScale: number,
		ironChance: number,
		oilChance: number,
	};
	seed: number;
	isSpawned: boolean;
	name: string;
	paused: boolean;
	users: UUID[];
}

export const ServerMapType = t.object({
	settings: t.object({
		chunkSize: t.number(),
		waterHeight: t.number(),
		cliffDelta: t.number(),
		water: t.boolean(),
		bigNoise: t.number(),
		medNoise: t.number(),
		smallNoise: t.number(),
		bigNoiseScale: t.number(),
		medNoiseScale: t.number(),
		smallNoiseScale: t.number(),
		ironChance: t.number(),
		oilChance: t.number(),
	}),
	seed: t.number(),
	isSpawned: t.boolean(),
	name: t.string(),
	paused: t.boolean(),
	users: t.array(t.string()),
})

export interface User {
    uuid: string,
    username: string,
    email?: string,
}

export const UserType = t.object({
    uuid: t.string(),
    username: t.string(),
    email: t.optional(t.string()),
});


export interface Unit {
	uuid: string;
	awake: boolean;
	details: {
		type: string;
		health: number;
		ghosting: boolean;
		owner: string;
	};
	location: {
		hash: TileHash[];
		x: number;
		y: number;
		chunkHash: TileHash[];
		chunkX: number;
		chunkY: number;
	};
	movable?: {

	};
	attack?: {

	};

	storage?: {

	};
	graphical?: {
		model: string;
		scale: number;
	};
	stationary?: {

	};
	construct?: {

	};
}
export const UnitType = t.object({
	uuid: t.string(),
	awake: t.boolean(),
	details: t.object({
		type: t.string(),
		health: t.number(),
		ghosting: t.boolean(),
		owner: t.string(),
	}),
	location: t.object({
		hash: t.array(t.string()),
		chunkHash: t.array(t.string()),
		x: t.number(),
		y: t.number(),
		chunkX: t.number(),
		chunkY: t.number(),
	}),
	graphical: t.nullable(t.object({
		model: t.string(),
		scale: t.number(),
	}))
});

export const ChunkType = t.object({
    x: t.number(),
    y: t.number(),
    hash: t.string(),
    map: t.string(),
    grid: t.array(t.array(t.number())),
    navGrid: t.array(t.array(t.number())),
    chunkSize: t.number(),
})