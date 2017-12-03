// monofuel

import { autobind } from 'core-decorators';
import * as _ from 'lodash';
import { SyncEvent } from 'ts-events';

import State, { SelectedUnitsChange, TransferChange, clearSelection, setSelection } from './state';
import PlanetLoc from './map/planetLoc';
import { RequestChange } from './net';
import UnitEntity from './units';
import * as THREE from 'three';

export type MouseMode = 'select' | 'move' | 'focus';

type MouseButton = number;
const LEFT_MOUSE: MouseButton = 0;
const RIGHT_MOUSE: MouseButton = 2;
const MIDDLE_MOUSE: MouseButton = 1;

interface MouseMoveEvent {
	type: 'mouseMove';
	event: any; // TODO
}

export interface MouseReleaseEvent {
	type: 'mouseRelease';
	event: any; // TODO
}

interface MoveCameraEvent {
	dir: 'w' | 'a' | 's' | 'd'
}

export const MouseMoveChanged = new SyncEvent<MouseMoveEvent>();
export const MouseReleaseChanged = new SyncEvent<MouseReleaseEvent>();
export const MoveCameraChange = new SyncEvent<MoveCameraEvent>();

export default class Input {
	state: State;
	keysDown: number[];
	ctrlKey: boolean;
	isMouseDown: boolean;
	dragStart: THREE.Vector2;
	dragCurrent: THREE.Vector2;
	public mouseMode: MouseMode;
	public mouseAction: Function;

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
		// document.body.addEventListener('mousedown', this.mouseDownHandler, false);
		// document.body.addEventListener('mouseup', this.mouseUpHandler, false);

		MouseReleaseChanged.attach((event: MouseReleaseEvent) => {
			if (this.mouseAction) {
				this.mouseAction(event);
			}
		});
	}

	public update(delta: number) {
		if (this.state.focused === 'chat') {
			return;
		}

		for (const key of this.keysDown) {
			switch (key) {
				case 87: // w
					this.state.display.cameraForward(delta);
					MoveCameraChange.post({ dir: 'w' });
					break;
				case 65: // a
					if (this.ctrlKey) {
						this.setMoveHandler(this.state.map.getSelectedUnitsInView());
					} else {
						this.state.display.cameraLeft(delta);
						MoveCameraChange.post({ dir: 'a' });
					}
					break;
				case 83: // s
					this.state.display.cameraBackward(delta);
					MoveCameraChange.post({ dir: 's' });
					break;
				case 68: // d
					this.state.display.cameraRight(delta);
					MoveCameraChange.post({ dir: 'd' });
					break;
				case 82: // r
					this.state.display.cameraUp(delta);
					break;
				case 70: // f
					this.state.display.cameraDown(delta);
					break;
				default:
				// console.log("key press: " + key);
			}
		}
	}

	@autobind
	private keyDownHandler(key: KeyboardEvent): void {
		if (this.state.focused === 'chat') {
			return;
		}
		// ignore alt because alt tab can get funky
		if (key.keyCode === 18) {
			return;
		}
		this.ctrlKey = key.ctrlKey;

		if (_.includes(this.keysDown, key.keyCode)) {
			return;
		}

		this.keysDown.push(key.keyCode);
		if (key.ctrlKey && key.keyCode === 65) { // block ctrl A
			event.preventDefault();
		}
	}

	@autobind
	private keyUpHandler(key: KeyboardEvent): void {
		this.keysDown = _.remove(this.keysDown, (keyDown) => key.keyCode !== keyDown);
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
		this.dragCurrent = new THREE.Vector2();
		this.dragCurrent.x = (event.clientX / this.state.display.renderer.domElement.clientWidth) * 2 - 1;
		this.dragCurrent.y = -(event.clientY / this.state.display.renderer.domElement.clientHeight) * 2 + 1;
		MouseMoveChanged.post({ type: 'mouseMove', event });
	}

	@autobind
	public mouseDownHandler(event: MouseEvent): void {

		switch (event.button) {
			case LEFT_MOUSE:
				console.log('mouse click: ', this.state.focused);
				if (this.state.focused !== 'game') {
					break;
				}
				this.isMouseDown = true;
				this.dragStart = new THREE.Vector2();
				this.dragStart.x = (event.clientX / this.state.display.renderer.domElement.clientWidth) * 2 - 1;
				this.dragStart.y = -(event.clientY / this.state.display.renderer.domElement.clientHeight) * 2 + 1;
				this.dragCurrent = this.dragStart;
				event.preventDefault();
				break;
		}
	}

	@autobind
	private setMoveHandler(selectedUnits: UnitEntity[]): void {
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
					unitId: unit.unit.uuid,
					location: [Math.floor(tile.real_x), Math.floor(tile.real_y)]
				});
			}
		};
	}

	@autobind
	public mouseUpHandler(event: MouseEvent): void {

		const mouse = new THREE.Vector2();
		mouse.x = (event.clientX / this.state.display.renderer.domElement.clientWidth) * 2 - 1;
		mouse.y = -(event.clientY / this.state.display.renderer.domElement.clientHeight) * 2 + 1;

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
		if (this.state.focused === 'hud') {
			return;
		}

		switch (event.button) {
			case LEFT_MOUSE:
				if (this.mouseMode === 'focus') {
					MouseReleaseChanged.post({ type: 'mouseRelease', event: event })
					break;
				}

				const unit = this.state.map.getSelectedUnit(mouse);
				if (unit) {
					this.setMoveHandler([unit]);
				} else {
					if (this.state.selectedUnits.length == 0) {
						break;
					}
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
					const entity = this.state.map.getSelectedUnit(mouse);
					const selected = this.state.selectedUnits.length > 0 ? this.state.selectedUnits[0] : null
					if (entity && selected && this.state.playerInfo && entity.unit.details.owner === this.state.playerInfo.uuid && entity.unit.uuid !== selected.unit.uuid) {
						console.log('right clicked players own unit');
						TransferChange.post({ dest: entity.unit, source: selected.unit });
					}
					if (selectedTile) {
						MouseReleaseChanged.post({ type: 'mouseRelease', event: event })
					}
				} else if (this.mouseMode = 'focus') {
					this.mouseMode = 'move';
				}
				break;
		}
	}

	@autobind
	private getTileUnderCursor(event: MouseEvent): PlanetLoc {
		const mouse = new THREE.Vector2();
		mouse.x = (event.clientX / this.state.display.renderer.domElement.clientWidth) * 2 - 1;
		mouse.y = -(event.clientY / this.state.display.renderer.domElement.clientHeight) * 2 + 1;
		return this.state.map.getTileAtRay(mouse);
	}

	@autobind
	public construct(unitType: string) {
		const state = this.state;
		this.mouseMode = 'focus';
		console.log('adding mouse click function for ' + unitType);
		let color: THREE.Color;
		if (unitType !== 'cancel') {
			console.log('building ' + unitType);
			color = new THREE.Color('#00FF00');
		} else {
			color = new THREE.Color('#FF00FF');
		}
		let lastMousePos: MouseMoveEvent
		// mouse move and camera move should get refactored
		// should also check if the tile is valid for the unit to build
		const mouseMoveHandler = (e: MouseMoveEvent) => {
			if (this.mouseMode !== 'focus') {
				clearSelection(state);
				MouseMoveChanged.detach(mouseMoveHandler);
				MoveCameraChange.detach(cameraMoveHandler);
				return;
			}
			lastMousePos = e;
			const tile = this.getTileUnderCursor(e.event);
			setSelection(state, tile, color);
		}
		MouseMoveChanged.attach(mouseMoveHandler);

		const cameraMoveHandler = (e: MoveCameraEvent) => {
			if (this.mouseMode !== 'focus') {
				clearSelection(state);
				MouseMoveChanged.detach(mouseMoveHandler);
				MoveCameraChange.detach(cameraMoveHandler)
				return;
			}
			if (!lastMousePos) {
				return;
			}
			const tile = this.getTileUnderCursor(lastMousePos.event);
			setSelection(state, tile, color);
		}

		MoveCameraChange.attach(cameraMoveHandler);

		this.mouseAction = (event: MouseReleaseEvent) => {

			clearSelection(state);
			MouseMoveChanged.detach(mouseMoveHandler);
			MoveCameraChange.detach(cameraMoveHandler)
			if (this.mouseMode !== 'focus') {
				return
			}
			const selectedTile = this.getTileUnderCursor(event.event);
			const newLoc = [
				Math.floor(selectedTile.real_x),
				Math.floor(selectedTile.real_y)
			];
			RequestChange.post({ type: 'createGhost', unitType, location: newLoc });
		};
	}
}