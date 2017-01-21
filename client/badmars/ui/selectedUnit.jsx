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
		let ironStorage = (selectedUnit.ironStorage ? selectedUnit.ironStorage : 0);
		ironStorage = Math.max(iron,ironStorage);
		let fuelStorage = (selectedUnit.fuelStorage ? selectedUnit.fuelStorage : 0);
		fuelStorage = Math.max(fuel,fuelStorage);
		let freeStorage = maxStorage - (iron + fuel);
		let health = (selectedUnit.health ? selectedUnit.health : 0);;
		let player = getPlayerById(selectedUnit.playerId);
		let playerName = (player ? player.username : "");

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
						<ListGroupItem>Owner: {playerName}</ListGroupItem>
						{ ironStorage !== 0 ?
							<ListGroupItem>Iron: <ProgressBar now={iron} max={ironStorage} label={iron}/></ListGroupItem>
							:
							null
						}
						{ fuelStorage !== 0 ?
							<ListGroupItem>Fuel: <ProgressBar now={fuel} max={fuelStorage} label={fuel}/></ListGroupItem>
							:
							null
						}
						<ListGroupItem>Health: <ProgressBar now={health} max={maxHealth} label={health}/></ListGroupItem>
					  </ListGroup>
					</Well>
				</div>
			)
		}
	}
}