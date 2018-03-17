// monofuel

import { autobind } from 'core-decorators';
import * as _ from 'lodash';
import { SyncEvent } from 'ts-events';

import GameState, { SelectedUnitsChange, TransferChange, clearSelection, setSelection, getLocsForSize } from './state';
import PlanetLoc from './map/planetLoc';
import { RequestChange } from './net';
import UnitEntity from './units';
import * as THREE from 'three';
import { getUnitInfo } from './units/unitBalance';
import { TILE_LAND } from './map/tileTypes';

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
	keysDown: number[];
	ctrlKey: boolean;
	isMouseDown: boolean;
	dragStart: THREE.Vector2;
	dragCurrent: THREE.Vector2;
	public mouseMode: MouseMode;
	// these handlers are starting to get really cludgy
	public mouseAction: Function;

	// we should have a syncEvent for keypressses instead of this hack
	public escHandler: Function;

	constructor() {
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

		document.body.addEventListener('mousewheel', this.mouseWheelHandler);

		MouseReleaseChanged.attach((event: MouseReleaseEvent) => {
			if (this.mouseAction) {
				this.mouseAction(event);
			}
		});
	}

	public update(delta: number) {

		if (gameState.focused === 'chat') {
			return;
		}

		for (const key of this.keysDown) {
			switch (key) {
				case 87: // w
					gameState.display.cameraForward(delta);
					MoveCameraChange.post({ dir: 'w' });
					break;
				case 65: // a
					if (this.ctrlKey) {
						this.setMoveHandler(gameState.map.getSelectedUnitsInView());
					} else {
						gameState.display.cameraLeft(delta);
						MoveCameraChange.post({ dir: 'a' });
					}
					break;
				case 83: // s
					gameState.display.cameraBackward(delta);
					MoveCameraChange.post({ dir: 's' });
					break;
				case 68: // d
					gameState.display.cameraRight(delta);
					MoveCameraChange.post({ dir: 'd' });
					break;
				case 82: // r
					gameState.display.cameraUp(delta);
					break;
				case 70: // f
					gameState.display.cameraDown(delta);
					break;
				case 27:
					if (this.escHandler) {
						this.escHandler();
					}
					break;
				default:
					console.log("key press: " + key);
			}
		}
	}

	@autobind
	private mouseWheelHandler(e: WheelEvent): void {
		const delta = e.wheelDelta / 3000;
		if (delta > 0) {
			gameState.display.cameraUp(1, delta);
		} else {
			gameState.display.cameraDown(1, -delta);
		}
	}

	@autobind
	private keyDownHandler(key: KeyboardEvent): void {

		if (gameState.focused === 'chat') {
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
		/*if (state.focused !== 'game') {
			return;
		}*/
		event.preventDefault();
	}

	@autobind
	private mouseMoveHandler(event: MouseEvent): void {

		this.dragCurrent = new THREE.Vector2();
		this.dragCurrent.x = (event.clientX / gameState.display.renderer.domElement.clientWidth) * 2 - 1;
		this.dragCurrent.y = -(event.clientY / gameState.display.renderer.domElement.clientHeight) * 2 + 1;
		MouseMoveChanged.post({ type: 'mouseMove', event });
	}

	@autobind
	public mouseDownHandler(event: MouseEvent): void {

		switch (event.button) {
			case LEFT_MOUSE:
				console.log('mouse click: ', gameState.focused);
				if (gameState.focused !== 'game') {
					break;
				}
				this.isMouseDown = true;
				this.dragStart = new THREE.Vector2();
				this.dragStart.x = (event.clientX / gameState.display.renderer.domElement.clientWidth) * 2 - 1;
				this.dragStart.y = -(event.clientY / gameState.display.renderer.domElement.clientHeight) * 2 + 1;
				this.dragCurrent = this.dragStart;
				event.preventDefault();
				break;
		}
	}

	@autobind
	private setMoveHandler(selectedUnits: UnitEntity[]): void {

		gameState.selectedUnits = selectedUnits;
		SelectedUnitsChange.post({ units: gameState.selectedUnits });
		this.mouseMode = 'move';
		this.mouseAction = (event: MouseReleaseEvent) => {
			if (!gameState.selectedUnits) {
				return;
			}
			const tile = this.getTileUnderCursor(event.event);
			for (const unit of gameState.selectedUnits) {
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
		mouse.x = (event.clientX / gameState.display.renderer.domElement.clientWidth) * 2 - 1;
		mouse.y = -(event.clientY / gameState.display.renderer.domElement.clientHeight) * 2 + 1;

		if (this.isMouseDown) { // for dragging actions
			this.isMouseDown = false;
			switch (event.button) {
				case LEFT_MOUSE:
					if (Math.abs(mouse.x - this.dragStart.x) > 1 / 100 && Math.abs(mouse.y - this.dragStart.y) > 1 / 100) {
						this.setMoveHandler(gameState.map.getSelectedUnits(mouse, this.dragStart));
						return;
					}
					break;
			}
		}
		if (gameState.focused === 'hud') {
			return;
		}

		switch (event.button) {
			case LEFT_MOUSE:
				if (this.mouseMode === 'focus') {
					MouseReleaseChanged.post({ type: 'mouseRelease', event: event })
					break;
				}

				const unit = gameState.map.getSelectedUnit(mouse);
				if (unit) {
					this.setMoveHandler([unit]);
				} else {
					if (gameState.selectedUnits.length == 0) {
						break;
					}
					gameState.selectedUnits = [];
					this.mouseMode = 'select';
					SelectedUnitsChange.post({ units: [] });

					// TODO clear buttons highlighted
					// TODO clear hilight on map
				}
				break;
			case RIGHT_MOUSE:
				if (this.mouseMode === 'move') {
					const selectedTile = gameState.map.getTileAtRay(mouse);
					const entity = gameState.map.getSelectedUnit(mouse);
					const selected = gameState.selectedUnits.length > 0 ? gameState.selectedUnits[0] : null
					if (entity && selected && gameState.playerInfo && entity.unit.details.owner === gameState.playerInfo.uuid && entity.unit.uuid !== selected.unit.uuid) {
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
		mouse.x = (event.clientX / gameState.display.renderer.domElement.clientWidth) * 2 - 1;
		mouse.y = -(event.clientY / gameState.display.renderer.domElement.clientHeight) * 2 + 1;
		return gameState.map.getTileAtRay(mouse);
	}

	@autobind
	public construct(unitType: string) {

		this.mouseMode = 'focus';
		let lastMousePos: MouseMoveEvent;
		const info = getUnitInfo(unitType);

		const getConstructColor = (tile: PlanetLoc): THREE.Color => {
			const locs = getLocsForSize(tile, info.details.size);
			const openLand = !_.find(locs, (l) => l.tileType !== TILE_LAND)
			return openLand ? new THREE.Color(0x00ff00) : new THREE.Color(0xff0000);
		}

		const clearSelect = () => {
			clearSelection();
			MouseMoveChanged.detach(selectionMoveHandler);
			MoveCameraChange.detach(cameraMoveHandler);
			this.escHandler = null;
		}
		this.escHandler = () => {
			clearSelect();
		}
		// mouse move and camera move should get refactored
		// should also check if the tile is valid for the unit to build
		const selectionMoveHandler = (e: MouseMoveEvent) => {
			if (this.mouseMode !== 'focus') {
				clearSelect();
				return;
			}
			lastMousePos = e;
			const tile = this.getTileUnderCursor(e.event);
			setSelection(tile, info.details.size, getConstructColor(tile));
		}
		MouseMoveChanged.attach(selectionMoveHandler);

		const cameraMoveHandler = (e: MoveCameraEvent) => {
			if (this.mouseMode !== 'focus') {
				clearSelect();
				return;
			}
			if (!lastMousePos) {
				return;
			}
			const tile = this.getTileUnderCursor(lastMousePos.event);
			setSelection(tile, info.details.size, getConstructColor(tile));
		}

		MoveCameraChange.attach(cameraMoveHandler);

		this.mouseAction = (event: MouseReleaseEvent) => {

			clearSelect();
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
