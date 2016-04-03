/* @flow */
'use strict';

// monofuel
// 4-2-2016

import {
  version
} from '../client.js';

import React from 'react';
import { Button,Modal } from 'react-bootstrap';

export var AboutModal = React.createClass({
  getInitialState() {
      return { showModal: false };
    },

    close() {
      this.setState({ showModal: false });
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
              <h2>BadMars v{version}</h2>
              <p>Creator: Monofuel</p>
              <p><a href="https://github.com/monofuel/badMars-JS/">Github repo</a></p>
            </Modal.Body>
            <Modal.Footer>
              <Button onClick={this.close}>Close</Button>
            </Modal.Footer>
          </Modal>
        </div>
      );
    }
  });
