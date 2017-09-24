
'use strict';

// monofuel
// 7-22-2016

import React from 'react';
import ReactDOM from 'react-dom';

import injectTapEventPlugin from 'react-tap-event-plugin';

// Needed for onTouchTap
// http://stackoverflow.com/a/34015469/988941
injectTapEventPlugin();

import Layout from './layout.jsx';

window.onload = function () {
	ReactDOM.render(<Layout/>,document.getElementById("content"));
}
