import axios from 'axios';
import * as _ from 'lodash';
import Map from './map/map';
import Display from './display';
import Input, { MouseMoveChanged } from './input';
import PlanetLoc from './map/planetLoc';
import Net, { RequestChange } from './net';
import { log } from './logger';
import Config from './config';
// import config from './config';
import { QueuedEvent, EventQueue } from 'ts-events';
import { Planet, User, UnitStats } from './';
import * as jsonpatch from 'fast-json-patch';
import UnitEntity, { newUnitEntity, updateGraphicalEntity, tileSquareMesh, destroyUnitEntity } from './units';
export type GameStageType = 'login' | 'planet';
export type Focused = 'chat' | 'hud' | 'game';
import * as qs from 'query-string';
import * as dat from 'dat-gui';
import * as THREE from 'three';
import { PreloadHash } from './preload';

declare global {
	interface Window { gameState: GameState }
	const gameState: GameState
}

// ------------------------------------------
// Game State will always be up to date with the current state of the game world
// Anything interested in changes to the state will need to mount listeners

// ------------------------------------------
// game event types
// - typescript types
// - runtime types


export interface SelectedUnitsEvent {
	units: UnitEntity[];
}

export interface StartTransferEvent {
	source: Unit;
	dest: Unit;
}

export interface ChatEvent {
	uuid: UUID;
	user: string;
	channel: string;
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
	stats: { [key: string]: UnitStats }
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
export const ChatChange = new QueuedEvent<ChatEvent>();

export const UnitStatsQueue = new EventQueue();
export const UnitStatsChange = new QueuedEvent<UnitStatsEvent>({ queue: UnitStatsQueue });
export const ChunkQueue = new EventQueue();
export const ChunkChange = new QueuedEvent<ChunkEvent>({ queue: ChunkQueue });
export const UnitDeltaChange = new QueuedEvent<UnitDeltaEvent>();

// ------------------------------
// main game state

export default interface GameState {
	// TODO should be a hash : Player map
	players: User[];
	playerLocation?: PlanetLoc;
	connected: boolean;

	sunSpeed: number;
	sunColor: number;
	moonColor: number;

	focused: Focused;
	playerInfo: User;
	token: string;
	spawned: boolean;

	datgui?: dat.GUI;

	map?: Map;
	net?: Net;
	display?: Display;
	input?: Input;

	// TODO should be a hash : Unit map
	selectedUnits: UnitEntity[];
	stage: GameStageType;

	// Server representations
	units: { [key: string]: Unit };
	chunks: any; // TOOD type this

	// Client representations
	unitEntities: { [key: string]: UnitEntity };

	chatOpen: boolean;
	chatHistory: ChatEvent[];

	// map of chunks to point clouds
	snow: {
		[key: string]: THREE.Points
	}
	mouseHilight?: {
		loc: PlanetLoc,
		mesh: THREE.Mesh[],
	}
	tileTex: THREE.Texture;
}

export async function newState(): Promise<GameState> {
	const token: string | null = window.localStorage.getItem('session-token');
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

	/*
			sunSpeed: 0.025,
		sunColor: 0xDD9A70,
		moonColor: 0x9AA09A,
		*/

	const tileTex = await new Promise<THREE.Texture>((resolve, reject) => {
		new THREE.TextureLoader().load("models/tile.png", resolve, _.noop, reject);
	});

	const state: GameState = {
		token,
		playerInfo,
		players: [],
		connected: false,

		sunSpeed: 0.015,
		sunColor: 0xcccccc,
		moonColor: 0x5e647a,

		focused: 'game',
		spawned: false,

		stage: 'login',
		selectedUnits: [],
		units: {},
		chunks: {},

		unitEntities: {},
		chatOpen: false,
		chatHistory: [],
		snow: {},
		tileTex
	};

	(window as any).state = state;
	if (Config.debug && window.location.hash) {
		loadFromHash(state);
	}

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
			state.map = new Map(event.map);
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

	const gameFocusHandler = async (data: GameFocusEvent) => {
		state.focused = data.focus;
	}

	GameFocusChange.attach(gameFocusHandler);
	const cameraHandler = async ({ list: units }: UnitEvent) => {
		if (units.length == 0) {
			return;
		}
		for (let uuid in state.units) {
			const unit = state.units[uuid];
			const loc = state.map.getLoc(unit.location.x, unit.location.y);
			if (unit.details.owner === state.playerInfo.uuid) {
				state.display.viewTile(loc);
				UnitChange.detach(cameraHandler);
				return;
			}
		}
	}
	UnitChange.attach(cameraHandler);

	const chatHandler = async (e: ChatEvent) => {
		state.chatHistory.push(e);
	}
	ChatChange.attach(chatHandler);

	const updateUnitDeltaListener = async (data: UnitDeltaEvent) => {
		const unit = state.units[data.uuid];
		if (!unit) {
			return;
		}
		try {
			jsonpatch.applyPatch(unit, data.delta, Config.debug);
		} catch (err) {
			// force chunk refresh
			// RequestChange.post({ type: 'getChunk', x: unit.location.chunkX, y: unit.location.chunkY, unitsOnly: true })
			console.error(err);
		}
	};
	UnitDeltaChange.attach(updateUnitDeltaListener);

	const updateUnitsListener = (data: UnitEvent) => {
		for (let updated of data.list) {
			if (state.unitEntities[updated.uuid]) {
				destroyUnitEntity(state.unitEntities[updated.uuid]);
			}
			const entity = newUnitEntity(updated);
			state.unitEntities[updated.uuid] = entity;
			state.units[updated.uuid] = updated;
		}
	};
	UnitChange.attach(updateUnitsListener);

	const chunkListener = (data: ChunkEvent) => {
		// console.log('loading chunk');
		// console.log('got chunk data', data);
		var chunk = data.chunk;
		if (state.chunks[data.chunk.hash]) {
			// console.log('CHUNK ALREADY LOADED');
			return;
		}
		state.chunks[data.chunk.hash] = chunk;
		// HACK this is gross
		if (state.map) {
			state.map.generateChunk(chunk.x, chunk.y, chunk);
		}
		for (let entity of Object.values(state.unitEntities)) {
			if (entity.loc.chunkX === data.chunk.x && entity.loc.chunkY === data.chunk.y) {
				entity.loc = new PlanetLoc(state.map, entity.unit.location.x, entity.unit.location.y);
				updateGraphicalEntity(entity);
			}
		}
	}
	ChunkChange.attach(chunkListener);

	const playerHandler = (data: PlayersEvent) => {
		state.players = data.list;
	}
	PlayersChange.attach(playerHandler);

	return state;
}

function loadFromHash(state: GameState) {
	// disabling this in production mode for #security
	// this could be used to log in a user as another user by overriding self
	if (!Config.debug) {
		throw new Error('only supported in debug mode');
	}

	// type is not enforced, but this is a dangerous dev feature anyway
	const hashObj: Partial<PreloadHash> = qs.parse(window.location.hash.replace('#', ''));
	if (!hashObj.state) {
		return;
	}
	console.log('loading state', hashObj.state);
	_.merge(state, hashObj.state);
}

// ------------------------------
// handy state functions

export function getPlayerByName(username: string): User | undefined {
	return _.find(gameState.players, (p: User) => p.username === username);
}

export function getPlayerByUUID(uuid: UUID): User | undefined {
	return _.find(gameState.players, (p: User) => p.uuid === uuid);
}
export function setFocus(focus: Focused) {

	if (focus === gameState.focused) {
		return;
	}

	log('debug', 'changed focus', { prev: gameState.focused, focus });
	const prev = gameState.focused;
	GameFocusChange.post({ focus, prev });
}

export function clearSelection() {
	if (!gameState.mouseHilight) {
		return;
	}
	gameState.display.removeMesh(gameState.mouseHilight.mesh);
	delete gameState.mouseHilight;
}
export function setSelection(loc: PlanetLoc, size: number, color: THREE.Color) {
	if (gameState.mouseHilight) {
		if (gameState.mouseHilight.loc.equals(loc)) {
			return;
		} else {
			clearSelection();
		}
	}
	const locs = getLocsForSize(loc, size);
	const mesh = locs.map((l) => tileSquareMesh(l, color));
	gameState.display.addMesh(mesh);
	gameState.mouseHilight = {
		mesh,
		loc
	}
}

export function getLocsForSize(loc: PlanetLoc, size: number): PlanetLoc[] {
	switch (size) {
		case 3:
			return [
				loc,
				loc.N(),
				loc.N().E(),
				loc.N().W(),
				loc.E(),
				loc.W(),
				loc.S(),
				loc.S().W(),
				loc.S().E()
			]
		case 2:
			return [
				loc,
				loc.N(),
				loc.E(),
				loc.E().N()
			]
		case 1:
		default:
			return [loc];
	}
}