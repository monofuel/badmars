/* @flow */
'use strict';

// monofuel
// 2-7-2016
export var loginModal = React.createClass({
  getInitialState() {
      return { showModal: true };
    },

    close() {
      this.setState({ showModal: false });
      window.login();
    },

    open() {
      this.setState({ showModal: true });
    },

    render() {
      return (
        <div>
          <Modal show={this.state.showModal} onHide={this.close}>
            <Modal.Header closeButton>
              <Modal.Title>BadMars v1 alpha</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <ul>
    						<li>
                  <label for="usernameField">Username:</label>
    						  <input type="text" id="usernameField"/>
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
                  <p>Accounts are not secure (yet) all you can do is move tanks around based on your username.</p>
                </li>
              </ul>
            </Modal.Body>
            <Modal.Footer>
              <Button onClick={this.close}>Close</Button>
            </Modal.Footer>
          </Modal>
        </div>
      );
    }
  });
