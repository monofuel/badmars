/* @flow */
'use strict';

// monofuel
// 4-2-2016

import React from 'react';
import { Button,Modal,Alert } from 'react-bootstrap';

export var LoginModal = React.createClass({
  getInitialState() {
    return { showModal: true,
              loginError: ""};
  },

  close() {
    this.setState({ showModal: false });
  },
  login() {
    window.login();
  },

  setError(msg) {
    this.setState({ loginError: msg});
  },

  open() {
    this.setState({ showModal: true });
  },

  render() {
    var errorMessage;
    if (this.state.loginError) {
      errorMessage = (
        <Alert bsStyle="danger" if>
          {this.state.loginError}
        </Alert>
      )
    }

    return (
      <div>
        <Modal show={this.state.showModal}>
          <Modal.Header>
            <Modal.Title>BadMars v1 alpha</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <ul>
  						<li>
                <label for="usernameField">Username:</label>
  						  <input type="text" id="usernameField"/>
                {errorMessage}
              </li>
              <li>
  						  <label for="usernameField">html color:</label>
  						  <input type="text" id="colorField"/>
              </li>
              <li>
                <p>Controls: WASD to move, Q and E rotate, R and F zoom in and out</p>
                <p>You can click units to select them, and right click them to move around. You can only move your own units</p>
                <p>Your color is determined only the first time you log in, and will stay the same every time you reload.</p>
  			        <p>The game might put your view at the opposite side of the map from your units. this is a bug relating to how the map loops around</p>
                <p>Expect things to be buggy. If everything freezes, reload the page.</p>
                <p>press Home to zoom and cycle units</p>
                <p>Accounts are not secure (yet) all you can do is move tanks around based on your username.</p>
              </li>
            </ul>
          </Modal.Body>
          <Modal.Footer>
            <Button onClick={this.login}>Login</Button>
          </Modal.Footer>
        </Modal>
      </div>
    );
  }
});
