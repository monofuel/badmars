
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import User from '../user';
import Map from '../map/map';

type UUID = string;

export function sanitizeUnit(unit: Unit, owner: UUID) {

	const {
		uuid,
		awake,
		details,
	} = unit;
	const owned: boolean = details.owner === owner;
	const optional: any = {};
	if (unit.graphical) {
		optional.graphical = sanitizeUnitGraphical(unit.graphical);
	}
	if (unit.storage) {
		optional.storage = owned ? sanitizeOwnedUnitStorage(unit.storage) : sanitizeUnitStorage(unit.storage);
	}
	if (unit.stationary) {
		optional.stationary = owned ? sanitizeOwnedUnitStationary(unit.stationary) : sanitizeUnitStationary(unit.stationary);
	}
	if (unit.construct) {
		optional.construct = owned ? sanitizeOwnedUnitConstruct(unit.construct) : sanitizeUnitConstruct(unit.construct);
	}
	if (unit.movable) {
		optional.movable = owned ? sanitizeOwnedUnitMovable(unit.movable) : sanitizeUnitMovable(unit.movable);
	}
	if (unit.attack) {
		optional.attack = owned ? sanitizeOwnedUnitAttack(unit.attack) : sanitizeUnitAttack(unit.attack);
	}

	return {
		uuid,
		awake,
		details: owned ? sanitizeOwnedUnitDetails(unit.details) :
			sanitizeUnitDetails(unit.details),
		location: owned ? sanitizeOwnedUnitLocation(unit.location) :
			sanitizeUnitLocation(unit.location),
		...optional,
	};
}

function sanitizeUnitDetails(details: UnitDetails) {
	const {
		type,
		health,
		ghosting,
		owner
	} = details;
	return {
		type,
		health,
		ghosting,
		owner
	};
}

function sanitizeUnitLocation(location: UnitLocation) {
	const {
		hash,
		x,
		y,
		chunkHash,
		chunkX,
		chunkY,
	} = location;
	return {
		hash,
		x,
		y,
		chunkHash,
		chunkX,
		chunkY,
	};
}
function sanitizeUnitMovable(movable: UnitMovable) {
	const {
		layer,
		speed,
	} = movable;
	return {
		layer,
		speed
	};
}

function sanitizeUnitAttack(attack: UnitAttack) {
	return {};
}

function sanitizeUnitStorage(storage: UnitStorage) {
	return {};
}
function sanitizeUnitGraphical(graphical: UnitGraphical) {
	const {
		model,
		scale
	} = graphical;
	return {
		model,
		scale,
	};
}

function sanitizeUnitStationary(stationary: UnitStationary) {
	return stationary;
}

function sanitizeUnitConstruct(construct: UnitConstruct) {
	const {
		types
	} = construct;
	return {
		types
	};
}

function sanitizeOwnedUnitDetails(details: UnitDetails) {
	return sanitizeUnitDetails(details);
}

function sanitizeOwnedUnitLocation(location: UnitLocation) {
	return sanitizeUnitLocation(location);
}
function sanitizeOwnedUnitMovable(movable: UnitMovable) {
	const {
		layer,
		speed,
		movementCooldown,
		destination,
		transferGoal,
		path,
	} = movable;
	return {
		layer,
		speed,
		movementCooldown,
		destination,
		transferGoal,
		path,
	};
}

function sanitizeOwnedUnitAttack(attack: UnitAttack) {
	return attack;
}

function sanitizeOwnedUnitStorage(storage: UnitStorage) {
	return storage;
}

function sanitizeOwnedUnitStationary(stationary: UnitStationary) {
	return stationary;
}

function sanitizeOwnedUnitConstruct(construct: UnitConstruct) {
	return construct;
}

export function sanitizeUser(user: User) {
	const {
		uuid,
		username,
	} = user;
	return {
		uuid,
		username,
	};
}

export function sanitizeChunk(chunk: Chunk) {

	const {
		x,
		y,
		hash,
		chunkSize,
		map,
		grid,
		navGrid,
	} = chunk;

	return {
		x,
		y,
		hash,
		chunkSize,
		map,
		grid,
		navGrid,
	}
};

export function sanitizePlanet(map: Map) {
	const {
		name,
		seed,
		settings,
		paused,
		users,
		tps,
	} = map;
	return {
		name,
		seed,
		settings,
		paused,
		users,
		tps,
	}
}