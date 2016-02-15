/* @flow */
'use strict';

// monofuel
// 2-7-2016

import {
	Display
} from "./display.js";

import {
	Map
} from "./map/map.js";
import {
	Entity
} from "./units/entity.js";
import {
	PlanetLoc
} from "./map/planetLoc.js";
import {
	StatsMonitor
} from "./statsMonitor.js";
import {
	Net
} from "./net.js";
import {
	loadAllModelsAsync
} from "./units/unitModels.js";

// ---------------------------------------------------------------------
// enumerators

//for when no unit is selected
const MODE_SELECT = Symbol();
//when a unit is selected and we can move it
const MODE_MOVE = Symbol();
//when a button has been clicked and has ownership of the next action
const MODE_FOCUS = Symbol();

const LEFT_MOUSE = 0;
const RIGHT_MOUSE = 2;
const MIDDLE_MOUSE = 1;

// ---------------------------------------------------------------------
// globals

export var display: Display;
export var map: Map;
var net: Net;
var delta = 0;
var clock: THREE.Clock;
var buttonMode: Symbol = MODE_SELECT;
var mouseClick: ? Function;
var mouseMove: ? Function;
var keysDown = [];
export var selectedUnit: ? Entity;
var selectedTile: ? PlanetLoc;
var statsMonitor: StatsMonitor;
var username;

// ---------------------------------------------------------------------
// html5

window.loadPlanet = function (planet: ? Object) {
	map = new Map(planet);
	map.addToRender();
}

window.onload = function () {
	display = new Display();
	map = new Map();
	clock = new THREE.Clock();
	statsMonitor = new StatsMonitor();
	net = new Net();
	loadAllModelsAsync()
		.then(() => {
			console.log('models loaded');

			var userColor = new THREE.Color();
			//i could have sworn three.color was random, but it wasn't when i was testing it
			userColor.setHex(Math.random() * 0xffffff);


			console.log('random color: ', userColor.getHexString());
			window.requestAnimationFrame(logicLoop);
			net.connect()
				.then(() => {
					net.send({
						login: {
							username: "testUser2",
							planet: "testPlanet3",
							color: userColor.getHexString()
						}
					});
				});


			//promptLogin();


		})




	window.onresize = () => {
		display.resize();
	};

	document.body.addEventListener('keydown', (key: any) => {
		if (checkMenuFocus()) {
			return;
		}

		//keysdown is a list of all the keys being held down
		//check if it is a new keypress, but ignore presses for alt (buggy with alt tab)
		if (keysDown.indexOf(key.keyCode) == -1 && key.keyCode != 18) {
			keysDown.push(key.keyCode);
			//console.log('key pressed: ' + key.keyCode);
		}
	});

	document.body.addEventListener('keyup', (key: any) => {
		if (checkMenuFocus()) {
			return;
		}

		var index = keysDown.indexOf(key.keyCode);
		if (index != -1) {
			keysDown.splice(index, 1);
		}
	});

	//block right click menu
	document.body.addEventListener('contextmenu', () => {
		return false;
	});

	document.body.addEventListener('mousemove', (event: any) => {
		switch (buttonMode) {
			case MODE_FOCUS:
				if (mouseMove)
					mouseMove(event);
				return;
		}
	});

	document.body.addEventListener('mousedown', (event: any) => {

	});

	document.body.addEventListener('contextmenu', (event: any) => {
		event.preventDefault();
	});

	document.body.addEventListener('mouseup', (event: any) => {
		event.preventDefault();

		var mouse = new THREE.Vector2();
		mouse.x = (event.clientX / display.renderer.domElement.clientWidth) * 2 - 1
		mouse.y = -(event.clientY / display.renderer.domElement.clientHeight) * 2 + 1

		switch (event.button) {
			case LEFT_MOUSE:
				var unit = map.getSelectedUnit(mouse);
				if (unit) {
					console.log(unit.type + " clicked");
					selectedUnit = unit;
					buttonMode = MODE_MOVE;
					mouseClick = function (tile) {
						if (selectedUnit) {
							net.send({
								type: "setDestination",
								unitId: selectedUnit.uid,
								location: [tile.x, tile.y]
							});
						}
					}
				} else {
					selectedUnit = null;
					buttonMode = MODE_SELECT;
					mouseClick = null;
					//TODO clear buttons highlighted
					//TODO clear hilight on map
				}
				break;
			case RIGHT_MOUSE:
				if (buttonMode = MODE_MOVE) {
					selectedTile = map.getTileAtRay(mouse);
					if (selectedTile && mouseClick)
						mouseClick(selectedTile);
				}
				break;
		}
	});
};

function logicLoop() {
	window.requestAnimationFrame(logicLoop);

	statsMonitor.begin();

	delta = clock.getDelta();
	if (keysDown.length > 0) {
		handleInput(delta);
	}
	map.update(delta);
	display.render(delta);
	statsMonitor.end();
}

function handleInput() {
	for (var key of keysDown) {
		switch (key) {
			case 87: //w
				display.cameraForward(delta);
				break;
			case 65: //a
				display.cameraLeft(delta);
				break;
			case 83: //s
				display.cameraBackward(delta);
				break;
			case 68: //d
				display.cameraRight(delta);
				break;
			case 82: //r
				display.cameraUp(delta);
				break;
			case 70: //f
				display.cameraDown(delta);
				break;
			case 81: //q
				display.cameraRotateRight(delta);
				break;
			case 69: //e
				display.cameraRotateLeft(delta);
				break;
		}
	}
}


function promptLogin() {
	console.log('prompting for login');
	document.body.innerHTML +=
		'<div id="loginModal" class="modal fade" data-keyboard="false" data-backdrop="static" role="dialog">\
			<div class="modal-dialog">\
				<div class="modal-content">\
					<div class="modal-header">\
						<h4 class="modal-title"> BadMars v1 alpha</h4>\
					</div>\
					<div class="modal-body">\
						<label for="usernameField">Username:</label>\
						<input type="text" id="usernameField">\
					</div>\
					<div class="modal-footer">\
						<button onclick="window.login()" type="button" class="btn btn-default">Login</button>\
					</div>\
				</div>\
			</div>\
		</div>\
	';
	//TODO get a list of planets to select from

	//login window takes focus from the game
	buttonMode = MODE_FOCUS;
	$("#loginModal")
		.modal();
}

window.login = function () {
	username = $("#usernameField");
	console.log("username: ", username);
	//when successful
	$("#loginModal")
		.modal("hide");
	buttonMode = MODE_SELECT;
}

/**
 * Allow other functions to perform actions on mouseclick and mousemove
 * @param	{Function}	optional click action
 * @param	{Function}	optional move action
 */
export function setMouseActions(click: Function, move: Function) {
	buttonMode = MODE_FOCUS;
	mouseClick = click;
	mouseMove = move;
}

/**
 * Check if any menus or input fields have window focus and should block
 * input from other parts of the game.
 * @return	{boolean}
 */
function checkMenuFocus(): boolean {

	return false;
}
