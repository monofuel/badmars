// monofuel

import { autobind } from 'core-decorators';
import Map from './map/map';
import Entity from './units/entity';
import { DisplayErrorChange } from './gameEvents';
import Player from './player';
import State from './state';
import { log, logError } from './logger';
import { AsyncEvent } from 'ts-events';
import config from './config';
const t = require('flow-runtime');

// ------------------------------------------
// server event types

type UUID = string;

type NetworkEvent = MapEvent |
	ConnectedEvent |
	PlayersEvent |
	SpawnEvent |
	UnitEvent |
	LoginEvent |
	ChunkEvent |
	ChatEvent |
	MapEvent |
	UnitStatsEvent |
	KillEvent |
	UnitStatsEvent |
	UnitDeltaEvent |
	AttackEvent |
	SetDestinationResponse |
	TransferResourceResponse;

interface BaseEvent {
	success: boolean;
	reason?: string;
}

interface MapEvent extends BaseEvent {
	type: 'map';
	map: ServerMap;
}

interface ServerMap {
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

const ServerMapType = t.object({
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


interface SetDestinationResponse extends BaseEvent {
	type: 'setDestination';
}

interface TransferResourceResponse extends BaseEvent {
	type: 'transferResource';
}

const MapEventType = t.object({
	type: t.string('map'),
	map: ServerMapType,
})

export interface ConnectedEvent extends BaseEvent {
	type: 'connected';
}

interface PlayersEvent extends BaseEvent {
	type: 'players';
	players: {
		uuid: UUID,
		name: string,
		color: string,
	}[];
}

const PlayersEventType = t.object({
	type: t.string('players'),
	players: t.array(t.object({
		uuid: t.string(),
		name: t.string(),
		color: t.string(),
	}))
});

interface SpawnEvent extends BaseEvent {
	type: 'spawn';
}

export interface ServerUnit {
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
const UnitType = t.object({
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

export interface UnitEvent extends BaseEvent {
	type: 'units';
	units: ServerUnit[];
}

const UnitEventType = t.object({
	type: t.string('units'),
	units: t.array(UnitType)
});

export interface UnitDeltaEvent extends BaseEvent {
	type: 'unitDelta';
	uuid: UUID;
	delta: any[];
}

const UnitDeltaType = t.object({
	type: t.string('unitDelta'),
	uuid: t.string(),
	delta: t.array(t.object()),
});

export interface UnitStats {
	details: {
		size: number
		buildTime: number
		cost: number
		maxHealth: number
	}
	graphical: {
		model: string
		material: string
		texture: string
		scale: number
	}
}

const UnitStatsType = t.object({
	details: t.object({
		size: t.number(),
		buildTime: t.number(),
		cost: t.number(),
		maxHealth: t.number(),
	}),
	graphical: t.object({
		model: t.string(),
		material: t.mixed(),
		texture: t.mixed(),
		scale: t.number(),
	})
})

const UnitStatsEventType = t.object({
	type: t.string('unitStats'),
	units: t.object(t.indexer('key', t.string(), UnitStatsType)),
});

export interface UnitStatsEvent extends BaseEvent {
	type: 'unitStats';
	units: { [key: string]: UnitStats };
}

interface ChatEvent extends BaseEvent {
	type: 'chat';
	uuid: UUID;
	channel: string;
	text: string;
	timestamp: number;
}

export interface LoginEvent extends BaseEvent {
	type: 'login';
}

const LoginEventType = t.object({
	type: t.string('login'),
})

export interface ChunkEvent extends BaseEvent {
	type: 'chunk';
	hash: string;
	[key: string]: any; // TODO
}

export interface AttackEvent extends BaseEvent {
	type: 'attack';
	[key: string]: any; // TODO
}

export interface KillEvent extends BaseEvent {
	type: 'kill';
	unitId: string;
	[key: string]: any; // TODO
}

// ------------------------------------------
// request event types

type RequestType = UnitStatsEvent |
	SpawnRequest |
	GetUnitsRequest |
	LoginRequest |
	SetDestinationRequest |
	ChatRequest |
	ChunkRequest |
	GhostRequest |
	FactoryOrderRequest |
	TransferRequest |
	GetMapRequest;

interface UnitStatsRequest {
	type: 'unitStats';
}

interface GetUnitsRequest {
	type: 'getUnits';
}

interface GetMapRequest {
	type: 'getMap';
}

interface SpawnRequest {
	type: 'spawn';
}

interface LoginRequest {
	type: 'login';
	planet: string;
}

interface SetDestinationRequest {
	type: 'setDestination';
	unitId: UUID;
	location: number[];
}

interface FactoryOrderRequest {
	type: 'factoryOrder';
	factory: UUID;
	unitType: string;
}

const FactoryOrderRequestType = t.object({
	type: t.string('factoryOrder'),
	factory: t.string(),
	unitType: t.string(),
})

interface ChatRequest {
	type: 'sendChat';
	text: string;
}

interface ChunkRequest {
	type: 'getChunk';
	x: number;
	y: number;
	unitsOnly?: boolean;
}
interface GhostRequest {
	type: 'createGhost';
	unitType: string;
	location: number[];
}

const GhostRequestType = t.object({
	type: t.string('createGhost'),
	unitType: t.string(),
	location: t.tuple(t.number(), t.number()),
})

interface TransferRequest {
	type: 'transferResource';
	source: string;
	dest: string;
	iron: number;
	fuel: number;
}

// ------------------------------------------
// event emitters

export const MapChange = new AsyncEvent<MapEvent>();
export const ConnectedChange = new AsyncEvent<ConnectedEvent>();
export const PlayersChange = new AsyncEvent<PlayersEvent>();
export const SpawnChange = new AsyncEvent<SpawnEvent>();
export const UnitChange = new AsyncEvent<UnitEvent>();
export const UnitDeltaChange = new AsyncEvent<UnitDeltaEvent>();
export const UnitStatsChange = new AsyncEvent<UnitStatsEvent>();
export const ChatChange = new AsyncEvent<ChatEvent>();
export const LoginChange = new AsyncEvent<LoginEvent>();
export const ChunkChange = new AsyncEvent<ChunkEvent>();
export const AttackChange = new AsyncEvent<AttackEvent>();
export const KillChange = new AsyncEvent<KillEvent>();

export const RequestChange = new AsyncEvent<RequestType>();

// ------------------------------------------
// validator listeners

// TODO

if (config.debug) {
	log('debug', 'mounted runtime server type checkers');

	MapChange.attach((event) => {
		MapEventType.assert(event);
	})

	UnitChange.attach((event) => {
		UnitEventType.assert(event);
	});

	UnitDeltaChange.attach((event) => {
		UnitDeltaType.assert(event);
	});

	UnitStatsChange.attach((event) => {
		UnitStatsEventType.assert(event);
	})

	PlayersChange.attach((event) => {
		PlayersEventType.assert(event);
	});

	LoginChange.attach((event) => {
		LoginEventType.assert(event);
	});

	RequestChange.attach((event) => {
		switch (event.type) {
			case 'createGhost':
				GhostRequestType.assert(event);
				break;
			case 'factoryOrder':
				FactoryOrderRequestType.assert(event);
				break;
		}

	})

}

// ------------------------------------------
// network class

export default class Net {
	ws: WebSocket;
	listeners: Object;
	state: State;

	constructor(state: State) {
		this.listeners = {};
		this.state = state;
	}

	private connectionError(err: Error) {
		logError(err);
		if (this.state.connected) {
			DisplayErrorChange.post({ errMsg: 'The connection to the server was lost. You should reload' });
		}
		this.state.connected = false;
	}

	public async connect(): Promise<void> {
		const ws_url = `ws://${window.location.hostname}/net?token=${this.state.token}`;
		log('debug', `connecting to: ${ws_url}`);
		this.ws = new WebSocket(ws_url);

		setInterval(() => {
			if (this.getState() !== 1) {
				this.connectionError(new Error(`bad connection state: ${this.getState()}`));
			}
		}, 1000);


		this.ws.onerror = () => {
			DisplayErrorChange.post({ errMsg: 'The connection to the server was lost. You should reload' });
		};

		this.ws.onmessage = this.onmessage;

		PlayersChange.attach((event: PlayersEvent) => {
			event.players.forEach((player) => {
				this.state.addPlayer(player.uuid, player.name, player.color);
			});
		});

		await new Promise((resolve) => {
			this.ws.onopen = () => {
				log('debug', 'connected!');
				RequestChange.attach(this.send);
				resolve();
			};
		});
	}

	@autobind
	private async onmessage(event: any): Promise<void> {
		const data: NetworkEvent = JSON.parse(event.data);
		if (!data.type) {
			log('error', 'message recieved without type');
			return;
		}
		if (!data.success) {
			log('debug', `message failed: ${data.type} reason: ${data.reason}`);
		}
		log('debug', `recieved message ${data.type}`, { keys: Object.keys(data) });

		// TODO ask for unit stats
		// TODO load planet information for map
		// TODO ask for units
		// TODO ask for spawning
		// TODO get players

		switch (data.type) {
			case 'map':
				MapChange.post(data);
				return;
			case 'connected':
				ConnectedChange.post(data);
				return;
			case 'players':
				PlayersChange.post(data);
				return;
			case 'spawn':
				SpawnChange.post(data);
				return;
			case 'units':
				UnitChange.post(data);
				return;
			case 'login':
				LoginChange.post(data);
				return;
			case 'chunk':
				ChunkChange.post(data);
				return;
			case 'unitStats':
				UnitStatsChange.post(data);
				return;
			case 'unitDelta':
				UnitDeltaChange.post(data);
				return;
			case 'setDestination':
				return;
			case 'transferResource':
				return;
			default:
				log('error', `unknown message type: ${(data as any).type} with fields ${Object.keys(data)}`);
		}
	}

	@autobind
	private send(data: RequestType) {
		if (this.ws.readyState !== 1) {
			return;
		}

		log('debug', `sending message ${data.type}`, { keys: Object.keys(data) });
		try {
			this.ws.send(JSON.stringify(data));
		} catch (err) {
			this.connectionError(err);
		}
	}

	private close() {
		this.ws.close();
	}

	/*
	 * 0 is not connected
	 * 1 is connected
	 * 2 is closing
	 * 3 is closed
	 */
	private getState(): number {
		return this.ws.readyState;
	}

}
