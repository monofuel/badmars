/* @flow */
'use strict';

// monofuel
// 4-2-2016

import React from 'react';
import { Button,Modal,Well,ProgressBar,ListGroup,ListGroupItem } from 'react-bootstrap';
import { AboutModal } from './about.js';
import ReactDOM from 'react-dom';
import { getPlayerById } from '../net.js';

var infoStyle = {
  position: 'absolute',
  left: '10px',
  top: '50px',
  bottom: 'auto',
  width: '300px',
  height: 'auto',
  padding: '5px'
}

export var SelectedUnit = React.createClass({

  getInitialState() {
    return { showInfo: false };
  },

  close() {
    this.setState({ showInfo: false });
  },

  open() {
    this.setState({ showInfo: true });
  },

  render() {
    let unit = this.props.unit;
    if (!unit) {
      return(<div></div>);
    } else if (unit.type != 'oil' && unit.type != 'iron') {
      let iron = unit.storage.iron;
      let oil = unit.storage.oil;
      let maxStorage = unit.maxStorage;
      let freeStorage = maxStorage - (iron + oil);
      let health = unit.health;
      let maxHealth = unit.maxHealth;
      let player = getPlayerById(unit.playerId);
      let playerName = "";
      if (player) {
        playerName = player.username;
      }
      console.log({
        iron: iron,
        oil: oil,
        maxStorage: maxStorage,
        freeStorage: freeStorage,
        health: health,
        maxHealth: maxHealth
      });

      return (
        <div>
          <Well bsSize="small" style={infoStyle}>
            <ListGroup>
              <ListGroupItem>Unit: {unit.type}</ListGroupItem>
              <ListGroupItem>Storage: {iron + oil} / {maxStorage}</ListGroupItem>
              <ListGroupItem>Owner: {playerName}</ListGroupItem>
              <ListGroupItem>Iron: <ProgressBar now={iron} max={iron + freeStorage} label="%(now)s"/></ListGroupItem>
              <ListGroupItem>Oil: <ProgressBar now={oil} max={oil + freeStorage} label="%(now)s"/></ListGroupItem>
              <ListGroupItem>Health: <ProgressBar now={health} max={maxHealth} label="%(now)s"/></ListGroupItem>
            </ListGroup>
          </Well>
        </div>
    )} else {
      let rate = unit.rate;
      return (
        <div>
        <Well bsSize="small" style={infoStyle}>
          <div>Rate: {rate}</div>
        </Well>
      </div>
      )}
    }
});
