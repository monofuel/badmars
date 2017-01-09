/* @flow */
'use strict';

// monofuel
// 4-2-2016

import React from 'react';
import {Button, Modal, Alert} from 'react-bootstrap';
import {version,login} from '../client.js';

export default class LoginModal extends React.Component {

	usernameField: HTMLInputElement;
	colorField: HTMLInputElement;

	_onLoginClick() {
		let username = this.usernameField.value;
		let color = this.colorField.value;

		login(username,color);
	}

    render() {

		let randomColor = (Math.round(Math.random() * 0xffffff)).toString(16);

		//TODO should pull version # from config
		return (
		<div id="loginModal">
			<Modal show={true}>
				<Modal.Header>
					<Modal.Title >BadMars v{version} alpha</Modal.Title>
				</Modal.Header>
			<Modal.Body>
				<ul>
					<li>
						<label for="usernameField" >Username: </label>
						<input ref={(field) => {this.usernameField = field}} type="text" id="usernameField"/>
			        </li>
					<li>
						<label for="colorField">html color: </label>
						<input ref={(field) => {this.colorField = field}} type="text" id="colorField" defaultValue={randomColor}/>
					</li>
					<li>
						<p>WARNING: the current demo does not work on Firefox. Firefox does not trust
						the SSL cert, and refuses the websocket connection</p>
						<p>Controls: WASD to move, Q and E rotate, R and F zoom in and out </p>
						<p>Controls suck.they need to get redone soon </p>
						<p>Construction and combat is in-progress</p>
						<p>Expect things to be buggy. If everything freezes, reload the page. </p>
						<p>Accounts are not secure(yet) login via google oauth is ready, but not enabled atm </p>
					</li>
				</ul>
			</Modal.Body>
			<Modal.Footer>
				<Button onClick = {() => {this._onLoginClick()}}> Login </Button>
			</Modal.Footer>
			</Modal>
		</div>
		);
	}
}
