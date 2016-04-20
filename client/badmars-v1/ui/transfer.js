/* @flow */
'use strict';

// monofuel
// 4-20-2016

import React from 'react';
import { Button,Modal } from 'react-bootstrap';
import {
  setHudClick
} from '../client.js';

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
    handleMenuClick(e) {
      console.log('hud blocking click');
      setHudClick();

      return false;
    },
    onChange() {
      var source = this.props.source;
      var dest = this.props.dest;

      console.log('handling change');

    },

    render() {
      var source = this.props.source || {storage:{}};
      var dest = this.props.dest || {storage:{}};
      return (
        <div>
          <Modal show={this.state.showModal} onHide={this.close} onMouseUpCapture={this.handleMenuClick}>
            <Modal.Header closeButton>
              <Modal.Title>Resource Transfer</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <h2>{source.type}</h2>
              <p>Iron: Current: {source.storage.iron} Desired: {source.storage.iron} Maximum: {source.maxStorage - source.storage.oil}</p>
              <p><input type="range" name="source" min="0" max={source.maxStorage - source.storage.oil} onMouseMove={this.onChange} onMouseUp={this.onChange} ref={(c) => this.sourceIron = c}/></p>
              <p>Oil: Current: {source.storage.oil} Desired: {source.storage.oil} Maximum: {source.maxStorage - source.storage.iron}</p>
              <p><input type="range" name="source" min="0" max={source.maxStorage - source.storage.iron} onMouseMove={this.onChange} onMouseUp={this.onChange} ref={(c) => this.sourceOil = c}/></p>
              <h2>{dest.type}</h2>
              <p>Iron: Current: {dest.storage.iron} Desired: {dest.storage.iron} Maximum: {dest.maxStorage - dest.storage.oil}</p>
              <p><input type="range" name="source" min="0" max={dest.maxStorage - dest.storage.oil} onMouseMove={this.onChange} onMouseUp={this.onChange} ref={(c) => this.destIron = c}/></p>
              <p>Oil: Current: {dest.storage.oil} Desired: {dest.storage.oil} Maximum: {dest.maxStorage - dest.storage.iron}</p>
              <p><input type="range" name="source" min="0" max={dest.maxStorage - dest.storage.iron} onMouseMove={this.onChange} onMouseUp={this.onChange} ref={(c) => this.destOil = c}/></p>
            </Modal.Body>
            <Modal.Footer>
              <Button onClick={this.transfer}>Transfer</Button> <Button onClick={this.close}>Cancel</Button>
            </Modal.Footer>
          </Modal>
        </div>
      );
    }
  });
