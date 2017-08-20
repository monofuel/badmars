/* @flow */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import type Unit from '../unit/unit';
import type User from '../user/user';
import type Chunk from '../map/chunk';
import type Map from '../map/map';

import { 
	UnitDetails,
	UnitLocation,
	UnitMovable,
	UnitAttack,
	UnitStorage,
	UnitGraphical,
	UnitStationary,
	UnitConstruct
 } from '../unit/components';

export function sanitizeUnit(unit: Unit, owner: UUID): Object {

	const {
		uuid,
		awake,
		details,
	} = unit;
	const owned: boolean = details.owner === owner;
	const optional = {};
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

function sanitizeUnitDetails(details: UnitDetails): Object {
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

function sanitizeUnitLocation(location: UnitLocation): Object {
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
function sanitizeUnitMovable(movable: UnitMovable): Object {
	const {
		layer,
		speed,
	} = movable;
	return {
		layer,
		speed
	};
}

function sanitizeUnitAttack(attack: UnitAttack): Object {
	return {};
}

function sanitizeUnitStorage(storage: UnitStorage): Object {
	return {};
}
function sanitizeUnitGraphical(graphical: UnitGraphical): Object {
	const {
		model,
		scale
	} = graphical;
	return {
		model,
		scale,
	};
}

function sanitizeUnitStationary(stationary: UnitStationary): Object {
	return stationary;
}

function sanitizeUnitConstruct(construct: UnitConstruct): Object {
	const { 
		types
	} = construct;
	return {
		types
	};
}

function sanitizeOwnedUnitDetails(details: UnitDetails): Object {
	return sanitizeUnitDetails(details);
}

function sanitizeOwnedUnitLocation(location: UnitLocation): Object {
	return sanitizeUnitLocation(location);
}
function sanitizeOwnedUnitMovable(movable: UnitMovable): Object {
	const {
		layer,
		speed,
		movementCooldown,
		destination,
		transferGoal,
	} = movable;
	return {
		layer,
		speed,
		movementCooldown,
		destination,
		transferGoal,
	};
}

function sanitizeOwnedUnitAttack(attack: UnitAttack): Object {
	return attack;
}

function sanitizeOwnedUnitStorage(storage: UnitStorage): Object {
	return storage;
}

function sanitizeOwnedUnitStationary(stationary: UnitStationary): Object {
	return stationary;
}

function sanitizeOwnedUnitConstruct(construct: UnitConstruct): Object {
	return construct;
}

export function sanitizeUser(user: User): Object {
	const {
		uuid,
		name,
		color
	} = user;
	return {
		uuid,
		name,
		color
	};
}

export function sanitizeChunk(chunk: Chunk): Object {

	const {
		x,
		y,
		hash,
		chunkSize,
		map,
		grid,
		navGrid,
		units,
		resources,
	} = chunk;

	return {
		x,
		y,
		hash,
		chunkSize,
		map,
		grid,
		navGrid,
		units,
		resources,
	}
};

export function sanitizePlanet(map: Map): Object {
	const {
		name,
		seed,
		settings,
		paused,
		users,
	} = map;
	return {
		name,
		seed,
		settings,
		paused,
		users,
	}
}