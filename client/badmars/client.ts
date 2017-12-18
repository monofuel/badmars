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
import GameState, {
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

async function gameInit(): Promise<void> {
	window.gameState = await newState();
	gameState.display = new Display();
	gameState.net = new Net();
	gameState.input = new Input();

	startGameLoops();

	console.log('setting up UI', new Date());
	ui();

	gameState.net.connect();

	handleBalanceChanges();
	handleModelChanges();
}
console.log('mounting onload', new Date());
window.onload = async (): Promise<void> => {
	console.log('onload started', new Date());
	await gameInit();
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