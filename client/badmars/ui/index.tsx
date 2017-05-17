// monofuel

import * as React from 'react';
import * as ReactDOM from 'react-dom';

import HUD from './hud';
import State from '../state';

export default function ui(state: State) {
	ReactDOM.render(<HUD state={state}/>, document.getElementById('content'));
}