// monofuel

import { autobind } from 'core-decorators';
import * as _ from 'lodash';
import * as React from 'react';
import * as PropTypes from 'prop-types';

import RaisedButton from 'material-ui/RaisedButton';
import { Paper } from 'material-ui';

import GameState, { GameFocusChange, SelectedUnitsChange, SelectedUnitsEvent } from '../state';
import { RequestChange } from '../net';
import { log } from '../logger';

import UnitEntity from '../units';

interface Props {
	selectedUnits: UnitEntity[]
}

interface MenuButtonsState {
	menuMode: 'factory' | 'builder'
}

const buttonStyle = {
	margin: '5px',
}

const buildPanelStyle = {
	position: 'absolute',
	width: '60%',
	top: 'auto',
	bottom: 0,
	left: 0,
	right: 0,
	marginLeft: 'auto',
	marginRight: 'auto',
	height: '100px',
	padding: '5px',
	zIndex: '5',
};

export default class MenuButtons extends React.Component<Props, MenuButtonsState> {

	public state: MenuButtonsState = {
		menuMode: 'builder'
	};

	public componentDidMount() {
		SelectedUnitsChange.attach(this.onSelectionChange)
	}

	public componentWillUnmount() {
		SelectedUnitsChange.detach(this.onSelectionChange)
	}

	@autobind
	public onSelectionChange(e: SelectedUnitsEvent) {
		const factories = _.filter(e.units, (e) => e.unit.details.type === 'factory');

		this.setState({
			menuMode: factories.length === 0 ? 'factory' : 'builder',
		});
	}

	public render() {
		const { selectedUnits } = this.props;
		const selectedUnit = selectedUnits && selectedUnits.length > 0 ? selectedUnits[0] : null;
		const selectedUnitType = selectedUnit ? selectedUnit.unit.details.type : null;

		let buttons;
		let queuePane = <div>Nothing queued</div>;
		// TODO refactor all of this using construct.types listing the constructable types
		/*
		// TODO update for new queue system
		if (selectedUnitType === 'factory' && selectedUnit && selectedUnit.construct && selectedUnit.construct.factoryQueue && selectedUnit.construct.factoryQueue.length > 0) {
			let buildingUnit = selectedUnit.construct.factoryQueue[0];
			let remaining = buildingUnit.remaining;
			let constructing = buildingUnit.cost === 0;
			queuePane = (
				<div style={{ width: '110px' }}>
					<div>
						{constructing ?
							'remaining: ' + remaining + 's'
							:
							'need iron'
						}
					</div>
					<ul style={{ overflow: 'auto', maxHeight: '60%' }}>
						{selectedUnit.construct.factoryQueue.map((queueElement) => {
							return <li>{queueElement.type}</li>;
						})}
					</ul>
				</div>
			);
		}*/

		if (selectedUnitType !== 'factory') {
			buttons = (
				<div>
					<RaisedButton style={buttonStyle} primary onTouchTap={() => this.constructClicked('transfer_tower')} label='Transfer Tower' />
					<RaisedButton style={buttonStyle} primary onTouchTap={() => this.constructClicked('storage')} label='Storage' />
					<RaisedButton style={buttonStyle} primary onTouchTap={() => this.constructClicked('mine')} label='Mine' />
					<RaisedButton style={buttonStyle} primary onTouchTap={() => this.constructClicked('factory')} label='Factory' />
					<RaisedButton style={buttonStyle} primary onTouchTap={() => this.constructClicked('wall')} label='Wall' />
					<RaisedButton style={buttonStyle} primary onTouchTap={() => this.constructClicked('cancel')} label='Cancel' />
				</div>
			);
		} else {
			buttons = (
				<div style={{ display: 'flex' }}>
					{queuePane}
					<div>
						<RaisedButton style={buttonStyle} secondary onTouchTap={() => this.factoryConstructClicked('scout')}>Scout</RaisedButton>
						<RaisedButton style={buttonStyle} secondary onTouchTap={() => this.factoryConstructClicked('tank')}>Tank</RaisedButton>
						<RaisedButton style={buttonStyle} secondary onTouchTap={() => this.factoryConstructClicked('builder')}>Builder</RaisedButton>
						<RaisedButton style={buttonStyle} secondary onTouchTap={() => this.factoryConstructClicked('transport')}>Transport</RaisedButton>
						<RaisedButton style={buttonStyle} secondary onTouchTap={() => this.factoryConstructClicked('cancel')}>Cancel</RaisedButton>
					</div>
				</div>
			);
		}
		return (
			<Paper
				zDepth={3}
				onMouseDown={this.setHUDFocus}
				id='buttons'
				style={buildPanelStyle as any}>
				{buttons}
			</Paper>
		);
	}

	@autobind
	private setHUDFocus(e: React.MouseEvent<HTMLDivElement>) {
		GameFocusChange.post({ focus: 'hud', prev: gameState.focused });
		e.stopPropagation();
	}

	@autobind
	private constructClicked(unitType: string) {
		const { input } = gameState;
		log('debug', `construct ${unitType} clicked`);
		input.construct(unitType);
	}

	@autobind
	private factoryConstructClicked(unitType: string) {
		const { selectedUnits } = gameState;
		if (selectedUnits.length != 1) {
			throw new Error('multiple unit selected not supported yet');
		}
		if (selectedUnits[0].unit.details.type !== 'factory') {
			throw new Error('invalid unit type');
		}
		RequestChange.post({
			type: 'factoryOrder',
			factory: selectedUnits[0].unit.uuid,
			unitType,
		});
	}
};
