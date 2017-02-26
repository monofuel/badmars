/* @flow */
'use strict';

// monofuel
// 6-18-2016

import React from 'react';
import { Button,Modal } from 'react-bootstrap';
import {Entity} from '../units/entity.js';
import { setHudFocus, unsetHudFocus } from '../client.js';

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

	componentDidMount() {
		setHudFocus();
	}

	componentWillUnmount() {
		unsetHudFocus();
	}

	render() {
		const {onClose, onTransfer, selectedUnit, transferUnit} = this.props;
		const {iron, fuel} = this.state;

		const selectedStorage = selectedUnit.storage;
		const transferStorage = transferUnit.storage;

		if (!selectedStorage || !transferStorage) {
			throw new Error('invalid units for transfer');
		}

		return (
			<div id="transfer">
				<Modal
					show={true}
					backdrop='static'>
					<Modal.Header closeButton>
						<Modal.Title>Resource Transfer</Modal.Title>
					</Modal.Header>
					<Modal.Body>
						<div>
							{'transfering from ' + selectedUnit.details.type + ' to ' + transferUnit.details.type}
						</div>
						<div>
							{'Source unit Iron: ' + (parseInt(iron) + selectedStorage.iron) + "/" + selectedStorage.maxIron};
						</div>
						<div>
							{'Source unit Fuel: ' + (parseInt(fuel) + selectedStorage.fuel) + "/" + selectedStorage.maxFuel};
						</div>
						<div>
							{'Destination unit Iron: ' + (transferStorage.iron - parseInt(iron)) + "/" + transferStorage.maxIron};
						</div>
						<div>
							{'Destination unit Fuel: ' + (transferStorage.fuel - parseInt(fuel)) + "/" + transferStorage.maxFuel};
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
								min={-Math.min(transferStorage.maxIron - transferStorage.iron, selectedStorage.iron)}
								max={Math.min(transferStorage.iron, selectedStorage.maxIron - selectedStorage.iron)}
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
								min={-Math.min(transferStorage.maxFuel - transferStorage.fuel, selectedStorage.fuel)}
								max={Math.min(transferStorage.fuel, selectedStorage.maxFuel - selectedStorage.fuel)}
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
