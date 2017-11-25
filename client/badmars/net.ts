// monofuel

import { autobind } from 'core-decorators';
import State, {
	DisplayErrorChange,
	MapChange,
	ConnectedChange,
	PlayersChange,
	SpawnChange,
	UnitChange,
	LoginChange,
	ChunkChange,
	ChatChange,
	UnitStatsChange,
	UnitDeltaChange,
} from './state';
import { log, logError } from './logger';
import { AsyncEvent } from 'ts-events';
import config from './config';
import {
	Planet,
	ServerMapType,
	User,
	UserType,
	UnitType,
	ChunkType,
	UnitStats,
	UnitStatsType
} from './';
const t = require('flow-runtime');

// ------------------------------------------
// server event types

type UUID = string;
type TileHash = string;

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
	map: Planet;
}

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
	players: User[];
}

const PlayersEventType = t.object({
	type: t.string('players'),
	players: t.array(UserType)
});

export interface SpawnEvent extends BaseEvent {
	type: 'spawn';
}

export interface UnitEvent extends BaseEvent {
	type: 'units';
	units: Unit[];
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
	user: string;
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
	chunk: Chunk;
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

export const RequestChange = new AsyncEvent<RequestType>();

// ------------------------------------------
// validator listeners

// TODO

if (config.debug) {
	log('debug', 'mounted runtime server type checkers');

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

		setInterval(async () => {
			if (this.ws && this.getState() > 1) {
				this.connectionError(new Error(`bad connection state: ${this.getState()}`));

				/*
				// horribly breaks things
				this.ws = null;
				log('warn', 'reconnecting');
				await this.connect();
				log('warn', 'reconnected!');
				*/

				// should probably only do this in debug builds
				setTimeout(() => window.location.reload(), 2000);
			}
		}, 1000);
	}

	private async connectionError(err: Error) {
		logError(err);
		if (this.state.connected) {
			DisplayErrorChange.post({ errMsg: 'The connection to the server was lost. You should reload' });
		}
		this.state.connected = false;
	}

	public async connect(): Promise<void> {
		const ws_url = `ws://localhost:7005/net?token=${this.state.token}`;
		log('debug', `connecting to: ${ws_url}`);
		this.ws = new WebSocket(ws_url);

		this.ws.onerror = () => {
			DisplayErrorChange.post({ errMsg: 'The connection to the server was lost. You should reload' });
		};

		this.ws.onmessage = this.onmessage;

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
		log('silly', `recieved message ${data.type}`, { data });

		switch (data.type) {
			case 'map':
				MapEventType.assert(data);
				console.log('GOT MAP')
				MapChange.post({
					map: data.map,
				})
				return;
			case 'connected':
				ConnectedChange.post({});
				return;
			case 'players':
				PlayersEventType.assert(data);
				PlayersChange.post({
					list: data.players,
				});
				return;
			case 'spawn':
				SpawnChange.post({});
				return;
			case 'units':
				UnitChange.post({
					list: data.units,
				});
				return;
			case 'login':
				LoginChange.post({});
				return;
			case 'chunk':
				ChunkChange.post({
					chunk: data.chunk
				});
				return;
			case 'unitStats':
				UnitStatsChange.post({
					stats: data.units
				});
				return;
			case 'unitDelta':
				UnitDeltaChange.post({
					uuid: data.uuid,
					delta: data.delta,
				});
				return;
			case 'chat':
				ChatChange.post({
					uuid: data.uuid,
					user: data.user,
					channel: data.channel,
					text: data.text,
					timestamp: data.timestamp,
				})
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
