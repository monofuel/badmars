// monofuel

import { autobind } from 'core-decorators';
import * as _ from 'lodash';
import { SyncEvent } from 'ts-events';
import * as THREE from 'three';

import State from './state';
import Entity from './units/entity';
import PlanetLoc from './map/planetLoc';
import { SelectedUnitsChange, TransferChange } from './gameEvents';
import { RequestChange } from './net';

export type MouseMode = 'select' | 'move' | 'focus';

type MouseButton = number;
const LEFT_MOUSE: MouseButton = 0;
const RIGHT_MOUSE: MouseButton = 2;
const MIDDLE_MOUSE: MouseButton = 1;

interface MouseMoveEvent {
	type: 'mouseMove';
	event: any; // TODO
}

interface MouseReleaseEvent {
	type: 'mouseRelease';
	event: any; // TODO
}

export const MouseMoveChanged = new SyncEvent<MouseMoveEvent>();
export const MouseReleaseChanged = new SyncEvent<MouseReleaseEvent>();

export default class Input {
	state: State;
	keysDown: number[];
	ctrlKey: boolean;
	isMouseDown: boolean;
	dragStart: THREE.Vector2;
	dragCurrent: THREE.Vector2;
	public mouseMode: MouseMode;
	private mouseAction: Function;

	constructor(state: State) {
		this.state = state;
		this.keysDown = [];
		this.isMouseDown = false;
		this.mouseMode = 'focus';
		this.ctrlKey = false;

		document.body.addEventListener('keydown', this.keyDownHandler);
		document.body.addEventListener('keyup', this.keyUpHandler);
		document.body.addEventListener('contextmenu', this.contextMenuHandler);

		document.body.addEventListener('mousemove', this.mouseMoveHandler);
		document.body.addEventListener('mousedown', this.mouseDownHandler);
		document.body.addEventListener('mouseup', this.mouseUpHandler, false);

		MouseReleaseChanged.attach((event: MouseReleaseEvent) => {
			if (this.mouseAction) {
				this.mouseAction(event);
			}
		})
	}

	public update(delta: number) {
		if (this.state.focused === 'chat') {
			return;
		}

		for (const key of this.keysDown) {
			switch (key) {
				case 87: // w
					this.state.display.cameraForward(delta);
					break;
				case 65: // a
					if (this.ctrlKey) {
						this.setMoveHandler(this.state.map.getSelectedUnitsInView());
					} else {
						this.state.display.cameraLeft(delta);
					}
					break;
				case 83: // s
					this.state.display.cameraBackward(delta);
					break;
				case 68: // d
					this.state.display.cameraRight(delta);
					break;
				case 82: // r
					this.state.display.cameraUp(delta);
					break;
				case 70: // f
					this.state.display.cameraDown(delta);
					break;
				case 81: // q
					this.state.display.cameraRotateRight(delta);
					break;
				case 69: // e
					this.state.display.cameraRotateLeft(delta);
					break;
				default:
				// console.log("key press: " + key);
			}
		}
	}

	@autobind
	private keyDownHandler(key: KeyboardEvent): void {
		if (this.state.focused !== 'game') {
			return;
		}
		// ignore alt because alt tab can get funky
		if (key.keyCode === 18) {
			return;
		}
		this.ctrlKey = key.ctrlKey;

		if (this.keysDown.indexOf(key.keyCode) !== -1) {
			return;
		}

		this.keysDown.push(key.keyCode);
		if (key.ctrlKey && key.keyCode === 65) { // block ctrl A
			event.preventDefault();
		}
	}

	@autobind
	private keyUpHandler(key: KeyboardEvent): void {
		if (this.state.focused !== 'game') {
			return;
		}

		this.keysDown = _.remove(this.keysDown, (keyDown) => key.keyCode === keyDown)
	}

	@autobind
	private contextMenuHandler(event: PointerEvent): void {
		if (this.state.focused !== 'game') {
			return;
		}
		event.preventDefault();
	}

	@autobind
	private mouseMoveHandler(event: MouseEvent): void {
		MouseMoveChanged.post({ event });
	}

	@autobind
	private mouseDownHandler(event: MouseEvent): void {
		switch (event.button) {
			case LEFT_MOUSE:
				if (this.state.focused !== 'game') {
					break;
				}
				this.isMouseDown = true;
				this.dragStart = new THREE.Vector2();
				this.dragStart.x = (event.clientX / this.state.display.renderer.domElement.clientWidth) * 2 - 1;
				this.dragStart.y = -(event.clientY / this.state.display.renderer.domElement.clientHeight) * 2 + 1;
				this.dragCurrent = this.dragStart;
				break;
		}
	}

	@autobind
	private setMoveHandler(selectedUnits: Entity[]): void {
		this.state.selectedUnits = selectedUnits;
		SelectedUnitsChange.post({ units: this.state.selectedUnits });
		this.mouseMode = 'move';
		this.mouseAction = (event: MouseReleaseEvent) => {
			if (!this.state.selectedUnits) {
				return;
			}
			const tile = this.getTileUnderCursor(event.event);
			for (const unit of this.state.selectedUnits) {
				RequestChange.post({
					type: 'setDestination',
					unitId: unit.uuid,
					location: [Math.floor(tile.real_x), Math.floor(tile.real_y)]
				});
			}
		};
	}

	@autobind
	private mouseUpHandler(event: MouseEvent): void {
		// event.preventDefault();
		setTimeout(() => { // hacky fix to make sure this always runs after hud onmouseup

			const mouse = new THREE.Vector2();
			mouse.x = (event.clientX / this.state.display.renderer.domElement.clientWidth) * 2 - 1
			mouse.y = -(event.clientY / this.state.display.renderer.domElement.clientHeight) * 2 + 1

			if (this.isMouseDown) { // for dragging actions
				this.isMouseDown = false;
				switch (event.button) {
					case LEFT_MOUSE:
						if (Math.abs(mouse.x - this.dragStart.x) > 1 / 100 && Math.abs(mouse.y - this.dragStart.y) > 1 / 100) {
							this.setMoveHandler(this.state.map.getSelectedUnits(mouse, this.dragStart));
							return;
						}
						break;
				}
			}
			if (this.state.focused = 'hud') {
				return;
			}

			switch (event.button) {
				case LEFT_MOUSE:
					if (this.mouseMode === 'focus') {
						MouseReleaseChanged.post({ event: event })
						break;
					}

					const unit = this.state.map.getSelectedUnit(mouse);
					if (unit) {
						this.setMoveHandler([unit]);
					} else {
						this.state.selectedUnits = [];
						this.mouseMode = 'select';
						SelectedUnitsChange.post({ units: [] });

						// TODO clear buttons highlighted
						// TODO clear hilight on map
					}
					break;
				case RIGHT_MOUSE:
					if (this.mouseMode === 'move') {
						const selectedTile = this.state.map.getTileAtRay(mouse);
						const unit = this.state.map.getSelectedUnit(mouse);
						const selectedUnit = this.state.selectedUnits.length > 0 ? this.state.selectedUnits[0] : null
						if (unit && selectedUnit && this.state.playerInfo && unit.playerId === this.state.playerInfo.uuid && unit.uuid !== selectedUnit.uuid) {
							console.log('right clicked players own unit');
							TransferChange.post({ unit, sender: selectedUnit });
						}
						if (selectedTile) {
							MouseReleaseChanged.post({ event: event })
						}
					} else if (this.mouseMode = 'focus') {
						this.mouseMode = 'move';
					}
					break;
			}
		}, 0);
	}

	private getTileUnderCursor(event: MouseEvent): PlanetLoc {
		const mouse = new THREE.Vector2();
		mouse.x = (event.clientX / this.state.display.renderer.domElement.clientWidth) * 2 - 1;
		mouse.y = -(event.clientY / this.state.display.renderer.domElement.clientHeight) * 2 + 1;
		return this.state.map.getTileAtRay(mouse);
	}

	@autobind
	private construct(unitType: string) {
		console.log('adding mouse click function for ' + unitType);
		setMouseActions((selectedTile) => {
			var type = unitType;
			if (hilight) {
				if (type !== 'cancel') {
					console.log('building ' + unitType);
					hilight.setDeconstruct(false);
				} else {
					hilight.setDeconstruct(true);
				}
			}

			var newLoc = [
				Math.floor(selectedTile.real_x),
				Math.floor(selectedTile.real_y)
			];
			let createGhost = { type: 'createGhost', unitType: unitType, location: newLoc };
			console.log(createGhost);
			window.sendMessage(createGhost);
		});
	}
}