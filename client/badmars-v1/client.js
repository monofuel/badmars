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


// ---------------------------------------------------------------------
// enumerators

const MODE_SELECT = Symbol();
const MODE_MOVE = Symbol();
const MODE_FOCUS = Symbol();

// ---------------------------------------------------------------------
// globals

var display: Display;
var map: Map;
var delta = 0;
var clock = null;
var buttonMode = MODE_SELECT;
var keysDown = [];
var selectedUnit = null;

// ---------------------------------------------------------------------
// html5

window.onload = function () {
	display = new Display();


	window.onresize = function () {
		display.resize();
	};


};
