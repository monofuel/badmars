/* @flow */
'use strict';

// monofuel
// 4-2-2016
// DISCLAIMER:
//i have no idea waht i'm doing with react.

import React from 'react';
import { Button,Modal,Alert } from 'react-bootstrap';
import { AboutModal } from './about.js';
import { SelectedUnit } from './selectedUnit.js';
import ReactDOM from 'react-dom';

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
