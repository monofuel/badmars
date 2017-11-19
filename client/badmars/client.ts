// monofuel

import Display from './display';
import Map from './map/map';
import Input from './input';
import Entity from './units/entity';
import PlanetLoc from './map/planetLoc';
import MainLoop from './mainLoop';
import Net from './net';
import ui from './ui/index';
import * as THREE from 'three';

import {
	DisplayErrorChange,
	SelectedUnitsChange,
	TransferChange,
	ChatEvent,
	GameStageChange,
} from './gameEvents';
import {
	MapChange,
	ConnectedChange,
	ConnectedEvent,
	PlayersChange,
	SpawnChange,
	UnitChange,
	ChatChange,
	SpawnEvent,
	LoginEvent,
	LoginChange,
	RequestChange,
} from './net';
import { log } from './logger';
import State from './state';

import Hilight from './ui/hilight';
import './units/unitBalance';
import config from './config';
import { handleBalanceChanges } from './units/unitBalance';
import { handleModelChanges } from './units/unitModels';

declare const $: any;

async function gameInit(): Promise<State> {
	const state = new State();
	console.log('requesting self', new Date());
	await state.refreshSelf();
	state.display = new Display(state);
	state.net = new Net(state);
	state.input = new Input(state);
	state.mainLoop = new MainLoop(state);

	console.log('setting up UI', new Date());
	ui(state);
	attachGlobalListeners(state);

	state.net.connect();

	ConnectedChange.once((event: ConnectedEvent) => {
		RequestChange.post({
			type: 'login',
			planet: 'testmap',
		});
	});
	handleBalanceChanges(state);
	handleModelChanges(state);
	console.log('requesting animation frame', new Date());
	window.requestAnimationFrame(state.mainLoop.logicLoop);
	return state;
}
console.log('mounting onload', new Date());
window.onload = async (): Promise<void> => {
	console.log('onload started', new Date());
	const state = await gameInit();
	console.log('requesting map', new Date());
	RequestChange.post({
		type: 'login',
		planet: 'testmap'
	});
	

	// TODO planet selection page
	/*
	state.input.mouseMode = 'focus';
	GameStageChange.post({ stage: 'login' });
	*/
};

function attachGlobalListeners(state: State) {
	function performTransfer(selectedUnit: Entity, transferUnit: Entity, iron: number, fuel: number) {
		RequestChange.post({
			type: 'transferResource',
			source: selectedUnit.uuid,
			dest: transferUnit.uuid,
			iron: iron,
			fuel: fuel
		});
	}

	function spawnListener(data: SpawnEvent) {
		if (data.success) {
			RequestChange.post({
				type: 'getMap'
			});
		}
	}
	SpawnChange.attach(spawnListener);

	function loginListener(data: LoginEvent) {
		if (data.success) {
			RequestChange.post({
				type: 'getMap'
			});

			GameStageChange.post({ stage: 'planet' });
			state.input.mouseMode = 'select';
			state.loggedIn = true;
			LoginChange.detach(loginListener);
		} else {
			GameStageChange.post({ stage: 'login' });
		}
	}
	LoginChange.attach(loginListener);

	MapChange.attach((event) => {
		state.map = new Map(state, event.map);
	});
}