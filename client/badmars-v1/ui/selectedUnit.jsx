/* @flow */
'use strict';

// monofuel
// 4-2-2016

import React from 'react';
import { Button,Modal,Well,ProgressBar,ListGroup,ListGroupItem } from 'react-bootstrap';
import { getPlayerById } from '../net.js';
import {Entity} from '../units/entity.js';


const infoStyle = {
  position: 'absolute',
  left: '10px',
  top: '50px',
  bottom: 'auto',
  width: '300px',
  height: 'auto',
  padding: '5px'
}

type Props = {
	selectedUnit: Entity
}

export default class SelectedUnitWell extends React.Component {
	props: Props;

	render() {
		const {selectedUnit} = this.props;
		let iron = (selectedUnit.iron ? selectedUnit.iron : 0);
		let fuel = (selectedUnit.fuel ? selectedUnit.fuel : 0);
		let rate = (selectedUnit.rate ? selectedUnit.rate : 0);
		let maxHealth = (selectedUnit.maxHealth ? selectedUnit.maxHealth : 0);

		let type = selectedUnit.type;
		let maxStorage = selectedUnit.maxStorage;
		let freeStorage = maxStorage - (iron + fuel);
		let health = selectedUnit.health;
		let player = getPlayerById(selectedUnit.playerId);
		let playerName = "";
		if (player) {
			playerName = player.username;
		}
		if (selectedUnit.type === 'iron' || selectedUnit.type === 'oil') {
			return (
				<div id="SelectedUnitWell">
			        <Well bsSize="small" style={infoStyle}>
			          <div>Rate: {rate}</div>
			        </Well>
		      </div>
		  );
		} else {
			return (
				<div id="SelectedUnitWell">
					<Well bsSize="small" style={infoStyle}>
					  <ListGroup>
						<ListGroupItem>Unit: {type}</ListGroupItem>
						<ListGroupItem>Storage: {iron + fuel} / {maxStorage}</ListGroupItem>
						<ListGroupItem>Owner: {playerName}</ListGroupItem>
						<ListGroupItem>Iron: <ProgressBar now={iron} max={iron + freeStorage} label="%(now)%"/></ListGroupItem>
						<ListGroupItem>Fuel: <ProgressBar now={fuel} max={fuel + freeStorage} label="%(now)%"/></ListGroupItem>
						<ListGroupItem>Health: <ProgressBar now={health} max={maxHealth} label="%(now)%"/></ListGroupItem>
					  </ListGroup>
					</Well>
				</div>
			)
		}
	}
}
