// monofuel

import * as React from 'react';
import * as PropTypes from 'prop-types';
import State, { GameFocusChange } from '../state';
import { RequestChange } from '../net';
import Dialog from 'material-ui/Dialog';
import FlatButton from 'material-ui/FlatButton';

interface TransferProps {
	onClose: () => void;
	transferUnit: Unit;
	transferDestUnit: Unit;
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
		GameFocusChange.post({ focus: 'hud', prev: this.context.state.focused })
	}

	componentWillUnmount() {
		GameFocusChange.post({ focus: 'game', prev: this.context.state.focused })
	}

	render() {
		const { onClose, transferUnit, transferDestUnit } = this.props;
		const { iron, fuel } = this.state;

		const selectedStorage = transferUnit.storage;
		const transferStorage = transferDestUnit.storage;

		if (!selectedStorage || !transferStorage) {
			throw new Error('invalid units for transfer');
		}

		const actions = [
			<FlatButton onTouchTap={() => {
				this.onTransfer(transferUnit, transferDestUnit, iron, fuel);
				onClose();
			}}
			>Transfer</FlatButton>,
			<FlatButton onTouchTap={onClose}>Cancel</FlatButton>
		];

		return (
			<div id='transfer'>
				<Dialog
					open={true}
					title='Resource Transfer'
					modal={true}
					actions={actions}>
					<div>
						{'transfering from ' + transferUnit.details.type + ' to ' + transferDestUnit.details.type}
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
				</Dialog>
			</div>
		)
	}
	private onTransfer(selectedUnit: Unit, transferDestUnit: Unit, iron: number, fuel: number) {
		RequestChange.post({
			type: 'transferResource',
			source: selectedUnit.uuid,
			dest: transferDestUnit.uuid,
			iron,
			fuel,
		})
	}
}
