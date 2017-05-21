/* @flow */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import type Unit from '../unit/unit';

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
	return {};
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
	if (!unit.movable) {
		return {};
	}
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
	return {};
}
function sanitizeOwnedUnitGraphical(unit: Unit): Object {
	return {};
}

function sanitizeOwnedUnitStationary(unit: Unit): Object {
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
