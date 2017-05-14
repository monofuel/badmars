// monofuel

import { SyncEvent } from 'ts-events';
import config from './config';
import { log } from './logger';
const t = require('flow-runtime');

// ------------------------------------------
// event types
// - typescript types
// - runtime types

interface SelectedUnitsEvent {
	unit: Object;
}

const SelectedUnitsEventType = t.object({
	units: t.array(t.object()), // TODO type this
})

interface TransferEvent {
	source: Object;
	dest: Object;
}

const TransferEventType = t.object({
	unit: t.object(),
	sender: t.object()
})

// TODO properly type this
export interface ChatEvent {
	username: string;
	text: string;
	timestamp: number;
}
interface DisplayErrorEvent {
	errMsg: string;
}

const DisplayErrorEventType = t.object({
	errMsg: t.string(),
})

interface LoginEvent {}

interface SetDestinationEvent {
	loc: Object;
}

type GameStageType = 'login' | 'planet';
export interface GameStageEvent {
	stage: GameStageType;
}

// ------------------------------------------
// frontend event emitters

export const SelectedUnitsChange = new SyncEvent<SelectedUnitsEvent>();
export const TransferChange = new SyncEvent<TransferEvent>();
export const DisplayErrorChange = new SyncEvent<DisplayErrorEvent>();
export const LoginChange = new SyncEvent<LoginEvent>();
export const GameStageChange = new SyncEvent<GameStageEvent>();

// ------------------------------------------
// validator listeners

if (config.debug) {
	SelectedUnitsChange.attach((event: SelectedUnitsEvent) => {
		SelectedUnitsEventType.assert(event);
	})

	TransferChange.attach((event: TransferEvent) => {
		TransferEventType.assert(event);
	})

	DisplayErrorChange.attach((event: DisplayErrorEvent) => {
		DisplayErrorEventType.assert(event);
	});
	log('debug', 'mounted runtime game type checkers');
}

