/* @flow */
'use strict';

// monofuel
// 4-2-2016

import React from 'react';
import { Button, Modal, Well, ProgressBar, ListGroup, ListGroupItem } from 'react-bootstrap';
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
		const iron = (selectedUnit.storage ? selectedUnit.storage.iron : 0);
		const fuel = (selectedUnit.storage ? selectedUnit.storage.fuel : 0);
		const rate = (selectedUnit.rate ? selectedUnit.rate : 0);
		const maxHealth = (selectedUnit.details.maxHealth ? selectedUnit.details.maxHealth : 0);

		const type = selectedUnit.details.type;
    const ironStorage = (selectedUnit.storage ? selectedUnit.storage.maxIron : 0);
		const fuelStorage = (selectedUnit.storage ? selectedUnit.storage.maxFuel : 0);

		let health = (selectedUnit.details.health ? selectedUnit.details.health : 0);;
		let player = getPlayerById(selectedUnit.details.owner);
		let playerName = (player ? player.username : "");

		if (selectedUnit.details.type === 'iron' || selectedUnit.details.type === 'oil') {
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
