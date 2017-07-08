/* @flow */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import type Unit from '../unit/unit';
import type Map from '../map/map';

export function sanitizeUnit(unit: Unit, owner: UUID): Object {

	const {
		uuid,
		awake,
		details,
		location,
		movable,
		attack,
		storage,
		graphical,
		stationary,
		construct
	} = unit;
	const owned: boolean = details.owner === owner;
	const optional = {};
	if (unit.graphical) {
		optional.graphical = sanitizeUnitGraphical(unit);
		optional.storage = owned ? sanitizeOwnedUnitStorage(unit) : sanitizeUnitStorage(unit);
	}
	return {
		uuid,
		awake,
		details: owned ? sanitizeOwnedUnitDetails(unit) :
			sanitizeUnitDetails(unit),
		location: owned ? sanitizeOwnedUnitLocation(unit) :
			sanitizeUnitLocation(unit),
		...optional,
	};
};

function sanitizeUnitDetails(unit: Unit): Object {
	const {
		type,
		health,
		ghosting,
		owner
	} = unit.details;
	return {
		type,
		health,
		ghosting,
		owner
	};
}

function sanitizeUnitLocation(unit: Unit): Object {
	const {
		hash,
		x,
		y,
		chunkHash,
		chunkX,
		chunkY,
	} = unit.location;
	return {
		hash,
		x,
		y,
		chunkHash,
		chunkX,
		chunkY,
	};
}
function sanitizeUnitMovable(unit: Unit): Object {
	return {};
}

function sanitizeUnitAttack(unit: Unit): Object {
	return {};
}

function sanitizeUnitStorage(unit: Unit): Object {
	return {};
}
function sanitizeUnitGraphical(unit: Unit): Object {
	const {
		model,
		scale
	} = unit.graphical;
	return {
		model,
		scale,
	};
}

function sanitizeUnitStationary(unit: Unit): Object {
	return {};
}

function sanitizeUnitConstruct(unit: Unit): Object {
	return {};
}

function sanitizeOwnedUnitDetails(unit: Unit): Object {
	return sanitizeUnitDetails(unit);
}

function sanitizeOwnedUnitLocation(unit: Unit): Object {
	return sanitizeUnitLocation(unit);
}
function sanitizeOwnedUnitMovable(unit: Unit): Object {
	const {
		movementCooldown,
		destination,
		transferGoal,
	} = unit.movable;
	return {
		movementCooldown,
		destination,
		transferGoal,
	};
}

function sanitizeOwnedUnitAttack(unit: Unit): Object {
	return {};
}

function sanitizeOwnedUnitStorage(unit: Unit): Object {
	return unit.storage;
}
function sanitizeOwnedUnitGraphical(unit: Unit): Object {
	return sanitizeUnitGraphical(unit);
}

function sanitizeOwnedUnitStationary(unit: Unit): Object {
	if (!unit.stationary)
	return {};
}

function sanitizeOwnedUnitConstruct(unit: Unit): Object {
	return {};
}


export function sanitizeChunk(chunk: Object): Object {

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