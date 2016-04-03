/* @flow */
'use strict';

// monofuel
// 4-2-2016

import React from 'react';
import { Button,Modal,Well,ProgressBar } from 'react-bootstrap';
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

var progressBarStyle = {
  padding: '5px',
  align: 'right'
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
      let health = unit.health;
      let player = getPlayerById(unit.playerId);
      let playerName = "";
      if (player) {
        playerName = player.username;
      }

      return (
        <div>
          <Well bsSize="small" style={infoStyle}>
            <div>Unit: {unit.type}</div>
            <div>Storage: {iron + oil} / {maxStorage}</div>
            <div>Owner: {playerName}</div>
            <div>Iron: <ProgressBar now={60} label="%(now)s%" style={progressBarStyle} /></div>
            <div>Oil: <ProgressBar now={60} label="%(now)s%" style={progressBarStyle} /></div>
            <div>Health: <ProgressBar now={500} label="%(now)s%" style={progressBarStyle} /></div>
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
