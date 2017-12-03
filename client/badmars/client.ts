// monofuel

import Display from './display';
import Map from './map/map';
import Input from './input';
import PlanetLoc from './map/planetLoc';
import startGameLoops from './mainLoop';
import Net from './net';
import ui from './ui/index';
import * as THREE from 'three';

import {
	RequestChange,
} from './net';
import { log } from './logger';
import State, {
	newState,
	DisplayErrorChange,
	SelectedUnitsChange,
	TransferChange,
	ChatEvent,
	GameStageChange,
} from './state';
import './units/unitBalance';
import config from './config';
import { handleBalanceChanges } from './units/unitBalance';
import { handleModelChanges } from './units/unitModels';

declare const $: any;

async function gameInit(): Promise<State> {
	const state: State = await newState();
	state.display = new Display(state);
	state.net = new Net(state);
	state.input = new Input(state);

	startGameLoops(state);

	console.log('setting up UI', new Date());
	ui(state);

	state.net.connect();

	handleBalanceChanges(state);
	handleModelChanges(state);
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

/*
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
}
*/