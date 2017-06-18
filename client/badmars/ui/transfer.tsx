// monofuel

import * as React from 'react';
import * as PropTypes from 'prop-types';
import * as _ from 'lodash';
import { Button, Modal } from 'react-bootstrap';
import Entity from '../units/entity';
import State from '../state';

interface TransferProps {
	onClose: () => void;
	selectedUnit: Entity;
	transferUnit: Entity;
}
interface TransferState {
	iron: number;
	fuel: number;
}

export default class Transfer extends React.Component<TransferProps, TransferState> {
	public static contextTypes = {
		state: PropTypes.any.isRequired
	};
	context: {
		state: State,
	};

	props: TransferProps;
	state: TransferState = {
		iron: 0,
		fuel: 0
	};

	componentDidMount() {
		this.context.state.setFocus('hud');
	}

	componentWillUnmount() {
		this.context.state.setFocus('game');
	}

	render() {
		const { onClose, selectedUnit, transferUnit } = this.props;
		const { iron, fuel } = this.state;

		const selectedStorage = selectedUnit.storage;
		const transferStorage = transferUnit.storage;

		if (!selectedStorage || !transferStorage) {
			throw new Error('invalid units for transfer');
		}

		return (
			<div id='transfer'>
				<Modal
					show={true}
					backdrop='static'
					onHide={_.noop}>
					<Modal.Header closeButton>
						<Modal.Title>Resource Transfer</Modal.Title>
					</Modal.Header>
					<Modal.Body>
						<div>
							{'transfering from ' + selectedUnit.details.type + ' to ' + transferUnit.details.type}
						</div>
						<div>
							{'Source unit Iron: ' + (iron + selectedStorage.iron) + '/' + selectedStorage.maxIron};
						</div>
						<div>
							{'Source unit Fuel: ' + (fuel + selectedStorage.fuel) + '/' + selectedStorage.maxFuel};
						</div>
						<div>
							{'Destination unit Iron: ' + (transferStorage.iron - iron) + '/' + transferStorage.maxIron};
						</div>
						<div>
							{'Destination unit Fuel: ' + (transferStorage.fuel - fuel) + '/' + transferStorage.maxFuel};
						</div>
						<div>
							{'Iron: ' + iron}
						</div>
						<div>
							<input
								type='range'
								value={iron}
								onChange={(event) => {
									this.setState({ iron: parseInt(event.target.value) });
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
									this.setState({ fuel: parseInt(event.target.value) });
								}}
								min={-Math.min(transferStorage.maxFuel - transferStorage.fuel, selectedStorage.fuel)}
								max={Math.min(transferStorage.fuel, selectedStorage.maxFuel - selectedStorage.fuel)}
							/>
						</div>
					</Modal.Body>
					<Modal.Footer>
						<Button onClick={() => {
							this.onTransfer(selectedUnit, transferUnit, iron, fuel);
							onClose();
						}}
						>Transfer</Button>
						<Button onClick={onClose}>Cancel</Button>
					</Modal.Footer>
				</Modal>
			</div>
		)
	}
	private onTransfer(selectedUnit: Entity, transferUnit: Entity, iron: number, fuel: number) {
		// TODO
	}
}
