// monofuel

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as injectTapEventPlugin from 'react-tap-event-plugin';

import HUD from './hud';
import GameState from '../state';

// Needed for onTouchTap
// http://stackoverflow.com/a/34015469/988941
injectTapEventPlugin();

let hud: any;

export default function ui() {
  hud = ReactDOM.render(<HUD />, document.getElementById('content'));
}

export function forceUIUpdate() {

  hud.forceUpdate();
}