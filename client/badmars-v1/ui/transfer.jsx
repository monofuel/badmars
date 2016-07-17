/* @flow */
'use strict';

// monofuel
// 6-18-2016

import React from 'react';
import { Button,Modal } from 'react-bootstrap';
import {Entity} from '../units/entity.js';

type Props = {
	onClose: () => void,
	onTransfer: (selectedUnit: Entity,transferUnit: Entity,iron: number,fuel: number) => void,
	selectedUnit: Entity,
	transferUnit: Entity,
}
type State = {
	iron: number,
	fuel: number
}

export default class Transfer extends React.Component {
	props: Props;
	state: State = {
		iron: 0,
		fuel: 0
	};

	render() {
		const {onClose,onTransfer,selectedUnit,transferUnit} = this.props;
		const {iron,fuel} = this.state;

		return (
			<div id="transfer">
				<Modal show={true} backdrop='static'>
					<Modal.Header closeButton>
						<Modal.Title>Resource Transfer</Modal.Title>
					</Modal.Header>
					<Modal.Body>
						<div>
							{'transfering from ' + selectedUnit.type + ' to ' + transferUnit.type}
						</div>
						<div>
							{'Source unit Iron: ' + (parseInt(iron) + selectedUnit.iron) + "/" + selectedUnit.ironStorage};
						</div>
						<div>
							{'Source unit Fuel: ' + (parseInt(fuel) + selectedUnit.fuel) + "/" + selectedUnit.fuelStorage};
						</div>
						<div>
							{'Destination unit Iron: ' + (transferUnit.iron - parseInt(iron)) + "/" + transferUnit.ironStorage};
						</div>
						<div>
							{'Destination unit Fuel: ' + (transferUnit.fuel - parseInt(fuel)) + "/" + transferUnit.fuelStorage};
						</div>
						<div>
							{'Iron: ' + iron}
						</div>
						<div>
							<input
								type='range'
								value={iron}
								onChange={(event) => {
									this.setState({iron: event.target.value});
								}}
								min={-Math.min(transferUnit.ironStorage - transferUnit.iron,selectedUnit.iron)}
								max={Math.min(transferUnit.iron,selectedUnit.ironStorage - selectedUnit.iron)}
							/>
						</div>
						<div>
							{'Fuel: ' + fuel}
						</div>
						<div>
							<input
								type='range'
								value={fuel}
								onChange={(event) => {
									this.setState({fuel: event.target.value});
								}}
								min={-Math.min(transferUnit.fuelStorage - transferUnit.fuel,selectedUnit.fuel)}
								max={Math.min(transferUnit.fuel,selectedUnit.fuelStorage - selectedUnit.fuel)}
							/>
						</div>
					</Modal.Body>
					<Modal.Footer>
						<Button onClick={() => {
								onTransfer(selectedUnit,transferUnit,iron,fuel);
								onClose();
							}}
						>Transfer</Button>
						<Button onClick={onClose}>Cancel</Button>
					</Modal.Footer>
				</Modal>
			</div>
		)
	}
}
