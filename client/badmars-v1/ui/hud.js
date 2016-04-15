/* @flow */
'use strict';

// monofuel
// 4-2-2016
// DISCLAIMER:
//i have no idea waht i'm doing with react.

import React from 'react';
import { Button,Modal,Alert,Well } from 'react-bootstrap';
import { AboutModal } from './about.js';
import { SelectedUnit } from './selectedUnit.js';
import ReactDOM from 'react-dom';
import {
  setButtonMode,
  setMouseActions,
  map,
  display
} from '../client.js';

var errorStyle = {
  top: '100px',
  position: 'absolute',
  left: '10%',
  width: '80%'
}

var ErrorAlert = React.createClass({
  getInitialState() {
    return {
      alertVisible: false,
      errorMessage: "Looks like there's been an unknown error! Monkeys have been dispatched to fix the issue, but you might want to reload."
    };
  },
  updateErrorMessage(msg,vanish) {
    if (msg) {
      this.setState({
        alertVisible: true,
        errorMessage: msg
      });
    } else {
      this.setState({
        alertVisible: true,
        errorMessage: "Looks like there's been an unknown error! Monkeys have been dispatched to fix the issue, but you might want to reload."
      })
    }
    if (vanish) {
      setTimeout(() => {
        this.setState({alertVisible: false});
      }, 3000);
    }
  },

  render() {
    if (this.state.alertVisible) {
      return (
        <Alert bsStyle="danger" style={errorStyle} onDismiss={this.handleAlertDismiss}>
          <h4>Oops!</h4>
          <p>{this.state.errorMessage}</p>
        </Alert>
      );
    }

    return (
      <Button onClick={this.handleAlertShow}>Show Alert</Button>
    );
  },

  handleAlertReload() {
    console.log('reloading');
    location.reload();
  },

  handleAlertDismiss() {
    this.setState({alertVisible: false});
  },

  handleAlertShow() {
    this.setState({alertVisible: true});
  }
});

var MenuButtons = React.createClass({
  openAbout() {
    if (this.aboutModal) {
      this.aboutModal.open();
    }
  },
  construct(unitType) {
    console.log('adding mouse click function for ' + unitType);
    setMouseActions((selectedTile) => {
      var type = unitType;
      console.log('building ' + unitType);

      var newLoc = [selectedTile.x,selectedTile.y];
      window.sendMessage({type:'createGhost',unitType:unitType,location:newLoc});
    });

  },
  render() {
    var constructButtonStyle = {width: '100%', 'paddingBottom':'10px'};
    return (
      <div>
      //"position: absolute; left: 190px; top: 10px; width: 60px"
      <AboutModal ref={(c) => this.aboutModal = c}/>
      <Button onClick={this.openAbout} style={{position: 'absolute',left: '190px', top: '10px', width: '60px'}}>About</Button>
      <Well id="buttons"  style={{position: 'absolute',right: '0px', top: '200px', width: '100px', padding: '5px', zIndex: '5'}}>
        <Button onClick={() => this.construct('storage')}style={constructButtonStyle}>Storage</Button>
        <Button onClick={() => this.construct('mine')}style={constructButtonStyle}>Mine</Button>
        <Button onClick={() => this.construct('factory')}style={constructButtonStyle}>Factory</Button>
      </Well>
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
  updateErrorMessage(msg,vanish) {
    this.errorAlert.updateErrorMessage(msg,vanish);
  },
  render() {
    return (
      <div>
      <MenuButtons/>
      <SelectedUnit unit={this.state.selectedUnit}/>
      <ErrorAlert ref={(c) => this.errorAlert = c}/>/>
      </div>
    );
  }
});
