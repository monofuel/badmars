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
	state.display = new Display(state);
	state.net = new Net(state);
	state.input = new Input(state);
	state.mainLoop = new MainLoop(state);

	ui(state);
	attachGlobalListeners(state);

	state.net.connect();

	ConnectedChange.once((event: ConnectedEvent) => {
		if (state.username && state.apiKey) {
			RequestChange.post({
				type: 'login',
				username: state.username,
				apiKey: state.apiKey,
				planet: 'testmap',
			});
		}
	});
	handleBalanceChanges(state);
	handleModelChanges(state);
	window.requestAnimationFrame(state.mainLoop.logicLoop);
	return state;
}

window.onload = async (): Promise<void> => {
	const state = await gameInit();
	if (state.username && state.apiKey) {
		RequestChange.post({
			type: 'login',
			username: state.username,
			apiKey: state.apiKey,
			planet: 'testmap'
		});
	} else {
		// login window takes focus from the game
		state.input.mouseMode = 'focus';
		GameStageChange.post({ stage: 'login' });
	}
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

	function loginListener(data: LoginEvent) {
		if (data.success) {
			if (data.apiKey) {
				$.cookie('username', state.username, {
					expires: 360
				});
				$.cookie('apiKey', data.apiKey, {
					expires: 360
				});
				state.apiKey = data.apiKey;
			}
			RequestChange.post({
				type: 'getMap'
			});

			GameStageChange.post({ stage: 'planet' });
			state.input.mouseMode = 'select';
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