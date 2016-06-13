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
import { TransferModal } from './transfer.js';
import ReactDOM from 'react-dom';
import {
  setButtonMode,
  setMouseActions,
  map,
  display,
  selectedUnit,
  setHudClick,
  hilight
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
      if (type != 'cancel') {
        console.log('building ' + unitType);
        hilight.setDeconstruct(false);
      } else {
        hilight.setDeconstruct(true);
      }

      var newLoc = [Math.floor(selectedTile.real_x),Math.floor(selectedTile.real_y)];
      window.sendMessage({type:'createGhost',unitType:unitType,location:newLoc});
    });

  },
  factoryOrder(unitType) {
    console.log('factoryOrder ' + unitType);
    window.sendMessage({type:'factoryOrder',factory:selectedUnit.uuid, unitType:unitType});

  },
  render() {
    var constructButtonStyle = {width: '100px', 'paddingRight':'10px'};

    var buttons;
    if (!selectedUnit || selectedUnit.type != 'factory') {
      buttons = (
        <div>
          <Button onClick={() => this.construct('storage')}style={constructButtonStyle}>Storage</Button>
          <Button onClick={() => this.construct('mine')}style={constructButtonStyle}>Mine</Button>
          <Button onClick={() => this.construct('factory')}style={constructButtonStyle}>Factory</Button>
          <Button onClick={() => this.construct('wall')}style={constructButtonStyle}>Wall</Button>
          <Button onClick={() => this.construct('cancel')}style={constructButtonStyle}>Cancel</Button>
        </div>
      );
    } else {
      buttons = (
        <div>
          <Button onClick={() => this.factoryOrder('tank')}style={constructButtonStyle}>Tank</Button>
          <Button onClick={() => this.factoryOrder('builder')}style={constructButtonStyle}>Builder</Button>
          <Button onClick={() => this.factoryOrder('transport')}style={constructButtonStyle}>Transport</Button>
          <Button onClick={() => this.factoryOrder('cancel')}style={constructButtonStyle}>Cancel</Button>
        </div>
      );
    }

    return (
      <div>
      //"position: absolute; left: 190px; top: 10px; width: 60px"
      <AboutModal ref={(c) => this.aboutModal = c}/>
      <Button onClick={this.openAbout} style={{position: 'absolute',left: '190px', top: '10px', width: '60px'}}>About</Button>
      //OH MY GOD I SUCK AT CSS
      <Well id="buttons"  style={{position: 'absolute', top: '80%', width: '50%', marginLeft: '25%', marginRight: '25%', height: '100px', padding: '5px', zIndex: '5'}}>
        {buttons}
      </Well>

      </div>
    );
  }
});

export var HUD = React.createClass({
  getInitialState() {
    var self = this;
    var interval = setInterval(() => {
      self.updateSelectedUnit(selectedUnit);
    },200);

    return { selectedUnit: null };
  },
  updateSelectedUnit(unit) {
    if (!unit) {
      if (map) {
        var tile = map.getTileAtRay(new THREE.Vector2(0,0));
        unit = map.nearestStorage(tile);
      }
    }
    this.setState({selectedUnit: unit});
  },
  updateTransferUnit(unit) {
    this.setState({transferUnit: unit});
    this.transferModal.open();

  },
  updateErrorMessage(msg,vanish) {
    this.errorAlert.updateErrorMessage(msg,vanish);
  },
  handleMenuClick(e) {
    console.log('hud blocking click');
    setHudClick();

    return false;
  },
  render() {
    return (
      <div onMouseUpCapture={this.handleMenuClick}>
        <MenuButtons/>
        <TransferModal source={this.state.selectedUnit} dest={this.state.transferUnit} ref={(c) => this.transferModal = c}/>
        <SelectedUnit unit={this.state.selectedUnit}/>
        <ErrorAlert ref={(c) => this.errorAlert = c}/>
      </div>
    );
  }
});
