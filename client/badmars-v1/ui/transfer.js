/* @flow */
'use strict';

// monofuel
// 4-20-2016

import React from 'react';
import { Button,Modal } from 'react-bootstrap';

export var TransferModal = React.createClass({
  getInitialState() {
      return { showModal: false };
    },

    close() {
      this.setState({ showModal: false });
    },

    open() {
      this.setState({ showModal: true });
    },

    transfer() {
      var source = this.props.source;
      var dest = this.props.dest;

      console.log('NOT IMPLIMENTED');
      this.close();
    },

    render() {
      var source = this.props.source;
      var dest = this.props.dest;
      return (
        <div>
          <Modal show={this.state.showModal} onHide={this.close}>
            <Modal.Header closeButton>
              <Modal.Title>Resource Transfer</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <h2>source.type</h2>
              <p><input type="range" name="points" min="0" max="10"/></p>
              <h2>dest.type</h2>
              <p><input type="range" name="points" min="0" max="10"/></p>
            </Modal.Body>
            <Modal.Footer>
              <Button onClick={this.transfer}>Transfer</Button> <Button onClick={this.close}>Cancel</Button>
            </Modal.Footer>
          </Modal>
        </div>
      );
    }
  });
