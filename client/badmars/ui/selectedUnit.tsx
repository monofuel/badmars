// monofuel

import { autobind } from 'core-decorators';
import * as React from 'react';
import * as PropTypes from 'prop-types';
import GameState, { getPlayerByUUID, UnitDeltaChange, GameFocusChange } from '../state';
import { Paper } from 'material-ui';
import LinearProgress from 'material-ui/LinearProgress';
import UnitEntity from '../units';
import * as _ from 'lodash';
import { RequestChange } from '../net';

const infoStyle = {
	position: 'absolute',
	left: 0,
	top: '100px',
	bottom: 'auto',
	width: '20%',
	height: 'auto',
	padding: '5px'
}

interface SelectedUnitProps {
	selectedUnits: UnitEntity[];
}

export default class SelectedUnitWell extends React.Component<SelectedUnitProps, {}> {

	props: SelectedUnitProps;

	public componentDidMount() {
		UnitDeltaChange.attach(this.onUnitChange);
	}
	public componentWillUnmount() {
		UnitDeltaChange.detach(this.onUnitChange);
	}

	@autobind
	private onUnitChange() {
		this.forceUpdate();
	}

	@autobind
	private setHUDFocus(e: React.MouseEvent<HTMLDivElement>) {
		GameFocusChange.post({ focus: 'hud', prev: gameState.focused });
		e.stopPropagation();
	}

	render() {
		const { state } = this.context;
		const { selectedUnits } = this.props;
		const selectedUnit = selectedUnits[0].unit;
		const storages = _.filter(selectedUnits, (entity) => entity.unit.details.type === 'storage');
		const iron = (selectedUnit.storage ? selectedUnit.storage.iron : 0) || 0;
		const fuel = (selectedUnit.storage ? selectedUnit.storage.fuel : 0) || 0;
		const rate = 1;
		const maxHealth = (selectedUnit.details.maxHealth ? selectedUnit.details.maxHealth : 0);

		const type = selectedUnit.details.type;
		const ironStorage = (selectedUnit.storage ? selectedUnit.storage.maxIron : 0);
		const fuelStorage = (selectedUnit.storage ? selectedUnit.storage.maxFuel : 0);

		let health = (selectedUnit.details.health ? selectedUnit.details.health : 0);;
		let player = getPlayerByUUID(selectedUnit.details.owner);
		let playerName = (player ? player.username : '');

		// checked only if all selected storages are checked
		const receiving = !_.find(storages, (storage) => !storage.unit.storage.receive)

		if (selectedUnit.details.type === 'iron' || selectedUnit.details.type === 'oil') {
			return (
				<div onMouseDown={this.setHUDFocus} id='SelectedUnitWell'>
					<Paper zDepth={3} style={infoStyle as any}>
						<div>Rate: {rate}</div>
					</Paper>
				</div>
			);
		} else {
			return (
				<div onMouseDown={this.setHUDFocus} id='SelectedUnitWell'>
					<Paper zDepth={3} style={infoStyle as any}>
						<ul style={{ listStyle: 'none' }}>
							<li>Unit: {type}</li>
							<li>Owner: {playerName}</li>
							{ironStorage !== 0 ?
								<li>Iron: {iron}<LinearProgress mode="determinate" value={iron} max={ironStorage} /></li>
								:
								null
							}
							{fuelStorage !== 0 ?
								<li>Fuel: {fuel}<LinearProgress mode="determinate" value={fuel} max={fuelStorage} /></li>
								:
								null
							}
							<li>Health: {health}<LinearProgress mode="determinate" value={health} max={maxHealth} /></li>
							<li>FuelCountdown: {selectedUnit.details.fuelBurn}/{selectedUnit.details.fuelBurnLength}</li>
							{storages.length > 0 &&
								<li>
									Receive: <input
										type='checkbox'
										checked={receiving}
										onChange={(e) => {
											RequestChange.post({
												type: 'storageReceiver',
												uuids: storages.map((storage) => storage.unit.uuid),
												receive: !receiving
											})
										}} />
								</li>
							}
						</ul>
					</Paper>
				</div>
			)
		}
	}
}
