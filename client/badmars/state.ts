import axios from 'axios';
import * as _ from 'lodash';
import Map from './map/map';
import Display from './display';
import Input, { MouseMoveChanged } from './input';
import MainLoop from './mainLoop';
import Entity from './units/entity';
import PlanetLoc from './map/planetLoc';
import Net, { RequestChange } from './net';
import { log } from './logger';
// import config from './config';
import { QueuedEvent, EventQueue } from 'ts-events';
import { Planet, User, Unit, UnitStats } from './';
import * as jsonpatch from 'fast-json-patch';
export type GameStageType = 'login' | 'planet';
export type Focused = 'chat' | 'hud' | 'game';


// ------------------------------------------
// Game State should not be modified directly
// Fire an event to trigger the change to happen on the next frame
// and propagate the update to all listeners

// ------------------------------------------
// game event types
// - typescript types
// - runtime types


export interface SelectedUnitsEvent {
	units: Entity[];
}

export interface StartTransferEvent {
	source: Entity;
	dest: Entity;
}

// TODO properly type this
export interface ChatEvent {
	username: string;
	text: string;
	timestamp: number;
}
interface DisplayErrorEvent {
	errMsg: string;
}

interface LoginEvent { }

export interface GameStageEvent {
	stage: GameStageType;
}

export interface GameFocusEvent {
	focus: Focused
	prev: Focused
}

export interface PlayersEvent {
	list: User[];
}

export interface MapEvent {
	map: Planet
}

export interface ConnectedEvent {

}

export interface SpawnEvent {

}
export interface UnitEvent {
	list: Unit[]
}

export interface ChunkEvent {
	chunk: Chunk
}

export interface UnitStatsEvent {
	stats:{ [key: string]: UnitStats }
}

export interface UnitDeltaEvent {
	uuid: string,
	delta: any[],
}


// ------------------------------------------
// frontend event emitters

export const SelectedUnitsChange = new QueuedEvent<SelectedUnitsEvent>();
export const TransferChange = new QueuedEvent<StartTransferEvent>();
export const DisplayErrorChange = new QueuedEvent<DisplayErrorEvent>();
export const LoginChange = new QueuedEvent<LoginEvent>();
export const GameStageChange = new QueuedEvent<GameStageEvent>();
export const GameFocusChange = new QueuedEvent<GameFocusEvent>();
export const PlayersChange = new QueuedEvent<PlayersEvent>();
export const MapQueue = new EventQueue();
export const MapChange = new QueuedEvent<MapEvent>({ queue: MapQueue });
export const ConnectedChange = new QueuedEvent<ConnectedEvent>();
export const SpawnChange = new QueuedEvent<SpawnEvent>();
export const UnitQueue = new EventQueue();
export const UnitChange = new QueuedEvent<UnitEvent>({ queue: UnitQueue });

export const UnitStatsQueue = new EventQueue();
export const UnitStatsChange = new QueuedEvent<UnitStatsEvent>({ queue: UnitStatsQueue });
export const ChunkChange = new QueuedEvent<ChunkEvent>();
export const UnitDeltaChange = new QueuedEvent<UnitDeltaEvent>();

// ------------------------------
// main game state

export default interface State {
	// TODO should be a hash : Player map
	players: User[];
	connected: boolean;

	sunSpeed: number;
	sunColor: number;
	moonColor: number;

	focused: Focused;
	playerInfo: User;
	token: string;
	spawned: boolean;

	map?: Map;
	net?: Net;
	display?: Display;
	input?: Input;
	mainLoop?: MainLoop;

	// TODO should be a hash : Unit map
	selectedUnits: Entity[];
	stage: GameStageType;

	// TODO should have a map of uuid: ServerUnit
	units: Entity[];
	chunkMap: any; // TOOD type this

	playerLocation?: PlanetLoc;
}

export async function newState(): Promise<State> {
	const token: string | null = window.sessionStorage.getItem('session-token');
	if (!token) {
		console.error('missing session token');
		(window as any).location = '/login';
		throw new Error('unauthorized, redirecting');
	}

	const resp = await axios.get('/auth/self', {
		headers: {
			'Authorization': `Bearer ${token}`
		}
	})
	if (resp.status !== 200) {
		throw new Error("bad response for self")
	}
	const playerInfo = resp.data;

	const state: State = {
		token,
		playerInfo,
		players: [],
		connected: false,

		sunSpeed: 0.025,
		sunColor: 0xDD9A70,
		moonColor: 0x9AA09A,

		focused: 'game',
		spawned: false,

		stage: 'login',
		selectedUnits: [],
		units: [],
		chunkMap: {},
	};

	(window as any).state = state;

	GameStageChange.attach((event) => {
		state.stage = event.stage;
	});

	PlayersChange.attach((event) => {
		const self = _.find(event.list, (player) => player.username === state.playerInfo.username);
		if (self) {
			state.playerInfo = self;
		}
	});

	MapChange.attach(async (event) => {
		if (!state.map) {
			state.map = new Map(state, event.map);
		} else {
			// TODO apply map changes to the map
		}
		if (!event.map.isSpawned) {
			RequestChange.post({ type: 'spawn' });
			return;
		}
	});

	ConnectedChange.once((event: ConnectedEvent) => {
		state.connected = true;
		RequestChange.post({
			type: 'login',
			planet: 'testmap',
		});
	});

	function spawnListener(data: SpawnEvent) {
		RequestChange.post({
			type: 'getMap'
		});
	}
	SpawnChange.once(spawnListener);

	function loginListener() {
		RequestChange.post({
			type: 'getMap'
		});

		GameStageChange.post({ stage: 'planet' });
		
		// TODO why is mouesmode here?
		state.input.mouseMode = 'select';
		LoginChange.detach(loginListener);
	}
	LoginChange.attach(loginListener);

	const cameraHandler = async ({ list: units }: UnitEvent) => {
		if (units.length == 0) {
			return;
		}
		for (let unit of state.units) {
			if (unit.details.owner === state.playerInfo.uuid) {
				state.display.viewTile(unit.loc);
				UnitChange.detach(cameraHandler);
				return;
			}
		}
	}
	UnitChange.attach(cameraHandler);

	const updateUnitDeltaListener = async (data: UnitDeltaEvent) => {
		const unit = _.find(state.units, (unit) => unit.uuid === data.uuid);
		if (!unit) {
			throw new Error(`unit ${data.uuid} does not exist`);
		}
		jsonpatch.applyPatch(unit, data.delta);
	};
	UnitDeltaChange.attach(updateUnitDeltaListener);

	const updateUnitsListener = (data: UnitEvent) => {
		for (let updated of data.list) {
			let unit = getUnitById(state, updated.uuid);
			if (unit) {
				if (unit.updateUnitData) {
					unit.updateUnitData(updated);
				}
			} else {
				// HACK this is gross
				if (state.map) {
					state.map.addUnit(updated);
				}
			}
		}
	};
	UnitChange.attach(updateUnitsListener);

	const chunkListener = (data: ChunkEvent) => {
		// console.log('loading chunk');
		// console.log('got chunk data', data);
		var chunk = data.chunk;
		if (state.chunkMap[data.chunk.hash]) {
			// console.log('CHUNK ALREADY LOADED');
			return;
		}
		state.chunkMap[data.chunk.hash] = chunk;
		// HACK this is gross
		if (state.map) {
			state.map.generateChunk(chunk.x, chunk.y, chunk);

			// TODO: should force only units at the specific chunk to re-check their location
			// this is to avoid issues when chunks load after units do.
			state.map.fixAllLocations();
		}
	}
	ChunkChange.attach(chunkListener);

	return state;
}

// ------------------------------
// handy state functions

export function getPlayerByName(state: State, username: string): User | undefined {
	return _.find(state.players, (p: User) => p.username === username);
}

export function getPlayerByUUID(state: State, uuid: UUID): User | undefined {
	return _.find(state.players, (p: User) => p.uuid === uuid);
}

export function setFocus(state: State, focus: Focused) {
	if (focus === state.focused) {
		return;
	}

	log('debug', 'changed focus', { prev: state.focused, focus });
	const prev = state.focused;
	state.focused = focus;
	GameFocusChange.post({ focus, prev });
}


// TODO this should never be used, units should be stored in a map
export function getUnitById(state: State, unitId: string): Entity | null {
	for (var unit of state.units) {
		if (unit.uuid === unitId) {
			return unit;
		}
	}
	return null;
}