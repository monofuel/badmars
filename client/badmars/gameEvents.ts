// monofuel

import { SyncEvent, AsyncEvent } from 'ts-events';
import config from './config';
import { log } from './logger';
const t = require('flow-runtime');

// ------------------------------------------
// event types
// - typescript types
// - runtime types

interface SelectedUnitEvent {
	unit: Object;
}

const SelectedUnitEventType = t.object({
	unit: t.object(), // TODO type this
})

interface UnitUpdateEvent {
	unit: Object;
	prev: Object;
}

const UnitUpdateEventType = t.object({
	unit: t.object(),
	prev: t.object(),
})

interface TransferEvent {
	source: Object;
	dest: Object;
}

const TransferEventType = t.object({
	unit: t.object(),
})

// TODO properly type this
interface ChatEvent {
	username: string;
	text: string;
	timestamp: number;
}

const ChatEventType = t.object({
	username: t.string(),
	text: t.string(),
	timestamp: t.number(),
})

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

// ------------------------------------------
// event emitters

export const SelectedUnitChange = new SyncEvent<SelectedUnitEvent>();
export const UnitUpdateChange = new SyncEvent<UnitUpdateEvent>();
export const TransferChange = new SyncEvent<TransferEvent>();
export const ChatChange = new SyncEvent<ChatEvent>();
export const DisplayErrorChange = new SyncEvent<DisplayErrorEvent>();
export const LoginChange = new SyncEvent<LoginEvent>();


// ------------------------------------------
// validator listeners

if (config.debug) {
	// mount runtime type-check listeners
	log('debug', 'mounting runtime type checkers');
	SelectedUnitChange.attach((event: SelectedUnitEvent) => {
		SelectedUnitEventType.assert(event);
	})

	UnitUpdateChange.attach((event: UnitUpdateEvent) => {
		UnitUpdateEventType.assert(event);
	})
	TransferChange.attach((event: TransferEvent) => {
		TransferEventType.assert(event);
	})
	ChatChange.attach((event: ChatEvent) => {
		ChatEventType.assert(event);
	})
	DisplayErrorChange.attach((event: DisplayErrorEvent) => {
		DisplayErrorEventType.assert(event);
	})
}

