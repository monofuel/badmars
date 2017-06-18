// monofuel

import Player from './player';
import * as _ from 'lodash';
import Map from './map/map';
import Net from './net';
import Display from './display';
import Input from './input';
import MainLoop from './mainLoop';
import Entity from './units/entity';
import Hilight from './ui/hilight';
import PlanetLoc from './map/planetLoc';
import { GameStageChange } from './gameEvents';
import { MapChange, RequestChange, PlayersChange } from './net';
import sleep from './util/sleep';
import { log } from './logger';

export type GameStageType = 'login' | 'planet';
export type Focused = 'chat' | 'hud' | 'game';

declare const $: any;

export default class State {
	public players: Player[];
	public connected: boolean;

	public sunSpeed: number;
	public sunColor: number;
	public moonColor: number;

	public focused: Focused;

	public username: string;
	public playerInfo: Player;
	public apiKey: string;
	public loggedIn: boolean;

	public map: Map;
	public net: Net;
	public display: Display;
	public input: Input;
	public mainLoop: MainLoop;

	public selectedUnits: Entity[];
	public hilight: Hilight;
	public stage: GameStageType;

	public playerLocation: PlanetLoc;

	constructor() {
		this.players = [];
		this.connected = false;

		this.sunSpeed = 0.025;
		this.sunColor = 0xDD9A70;
		this.moonColor = 0x9AA09A;

		this.focused = 'game';
		this.username = $.cookie('username');
		this.apiKey = $.cookie('apiKey');
		this.loggedIn = false;

		this.hilight = new Hilight(this);

		this.stage = 'login';
		this.selectedUnits = [];
		(window as any).state = this;
		GameStageChange.attach((event) => {
			this.stage = event.stage;
		});
		PlayersChange.attach((event) => {
			const self = _.find(event.players, (player) => player.name === this.username);
			this.playerInfo = new Player(self.uuid, self.name, self.color);
		});

		MapChange.attach(async (event) => {
			if (!event.map.isSpawned) {
				RequestChange.post({ type: 'spawn' });
				return;
			}

			// wait for units to load
			await sleep(5000);
			for (let unit of this.map.units) {
				if (unit.details.owner === this.playerInfo.uuid) {
					this.display.viewTile(unit.loc);
					return;
				}
			}
		});

	}

	public getPlayerByName(username: string): Player | null {
		return _.find(this.players, (p: Player) => p.username === username);
	}

	public getPlayerByUUID(uuid: UUID): Player | null {
		return _.find(this.players, (p: Player) => p.uuid === uuid);
	}

	public addPlayer(uuid: UUID, username: string, color: string) {
		const player = _.find(this.players, (p: Player) => p.uuid === uuid);
		if (!player) {
			this.players.push(new Player(uuid, username, color));
		} else {
			player.username = username;
			player.setColor(color);
		}
	}

	public setFocus(focus: Focused) {
		log('info', 'changed state', { prev: this.focused, focus });
		this.focused = focus;
	}
}