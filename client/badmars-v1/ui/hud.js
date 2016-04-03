/* @flow */
'use strict';

// monofuel
// 4-2-2016
// DISCLAIMER:
//i have no idea waht i'm doing with react.

import React from 'react';
import { Button,Modal } from 'react-bootstrap';
import { AboutModal } from './about.js';
import { SelectedUnit } from './selectedUnit.js';
import ReactDOM from 'react-dom';

import {registerBusListener, deleteBusListener} from '../eventBus.js';

var MenuButtons = React.createClass({
  openAbout() {
    if (this.aboutModal) {
      this.aboutModal.open();
    }
  },
  render() {
    return (
      <div>
      //"position: absolute; left: 190px; top: 10px; width: 60px"
      <AboutModal ref={(c) => this.aboutModal = c}/>
      <Button onClick={this.openAbout} style={{position: 'absolute',left: '190px', top: '10px', width: '60px'}}>About</Button>
      </div>
    );
  }
});

export var HUD = React.createClass({
  getInitialState() {
    return { selectedUnit: null };
  },
  updateSelectedUnit(unit) {
    this.setState({selectedUnit: unit});
  },
  render() {
    return (
      <div>
      <MenuButtons/>
      <SelectedUnit unit={this.state.selectedUnit}/>
      </div>
    );
  }
});
