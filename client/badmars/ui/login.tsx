// monofuel

import * as React from 'react';
import * as PropTypes from 'prop-types';
import { RequestChange } from '../net';
import GameState from '../state';

export default class LoginModal extends React.Component<{}, {}> {
	usernameField: HTMLInputElement;
	colorField: HTMLInputElement;

	_onLoginClick() {
		// let username = this.usernameField.value;
		//let color = this.colorField.value;
		// state.username = username;

		RequestChange.post({
			type: 'login',
			planet: 'testmap',
		})
	}

	render() {

		// TODO
		return <div />
		//let randomColor = (Math.round(Math.random() * 0xffffff)).toString(16);

		/*
		return (
			<div id='loginModal'>
				<Modal show={true} onHide={_.noop}>
					<Modal.Header>
						<Modal.Title >BadMars v{config.version} alpha</Modal.Title>
					</Modal.Header>
					<Modal.Body>
						<ul>
							<li>
								<label>Username: </label>
								<input ref={(field) => { this.usernameField = field }} type='text' id='usernameField' />
							</li>
							<li>
								<label>html color: </label>
								<input ref={(field) => { this.colorField = field }} type='text' id='colorField' defaultValue={randomColor} />
							</li>
							<li>
								<p>Controls: WASD to move, Q and E rotate, R and F zoom in and out </p>
								<p>Controls suck.they need to get redone soon </p>
								<p>Construction and combat is in-progress</p>
								<p>Expect things to be buggy. If everything freezes, reload the page. </p>
								<p>Accounts are not secure(yet) login via google oauth is ready, but not enabled atm </p>
							</li>
						</ul>
					</Modal.Body>
					<Modal.Footer>
						<Button onClick={() => this._onLoginClick()}> Login </Button>
					</Modal.Footer>
				</Modal>
			</div>
		);
		*/
	}
}
