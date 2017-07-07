// monofuel

import { autobind } from 'core-decorators';
import * as _ from 'lodash';
import * as React from 'react';
import * as PropTypes from 'prop-types';

import RaisedButton from 'material-ui/RaisedButton';
import FloatingActionButton from 'material-ui/FloatingActionButton';
import ContentAdd from 'material-ui/svg-icons/content/add';
import { Paper } from 'material-ui';

import Entity from '../units/entity';
import State from '../state';
import { RequestChange } from '../net';
import { MouseReleaseEvent } from '../input';
import { log } from '../logger';
import { SelectedUnitsChange, SelectedUnitsEvent } from '../gameEvents';

interface Props {
	selectedUnit: Entity
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

const addButtonStyle = {
	position: 'absolute',
	top: '90%',
	right: '5%',
	marginLeft: 'auto',
	marginRight: 'auto',
	zIndex: '5'
}

export default class MenuButtons extends React.Component<Props, MenuButtonsState> {
	public static contextTypes = {
		state: PropTypes.any.isRequired
	};
	context: {
		state: State,
	};

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
		const factories = _.filter(e.units, (unit) => unit.details.type === 'factory');

		this.setState({
			menuMode: factories.length === 0 ? 'factory' : 'builder',
		});
	}

	public render() {
		const { menuMode } = this.state;
		const { selectedUnit } = this.props;
		const selectedUnitType = selectedUnit ? selectedUnit.details.type : null;

		let buttons;
		let queuePane = <div>Nothing queued</div>;
		// TODO refactor all of this using construct.types listing the constructable types
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
		}

		if (selectedUnitType !== 'factory') {
			buttons = (
				<div>
					<RaisedButton style={buttonStyle} primary onTouchTap={() => this.constructClicked('storage')}>Storage</RaisedButton>
					<RaisedButton style={buttonStyle} primary onTouchTap={() => this.constructClicked('mine')}>Mine</RaisedButton>
					<RaisedButton style={buttonStyle} primary onTouchTap={() => this.constructClicked('factory')}>Factory</RaisedButton>
					<RaisedButton style={buttonStyle} primary onTouchTap={() => this.constructClicked('wall')}>Wall</RaisedButton>
					<RaisedButton style={buttonStyle} primary onTouchTap={() => this.constructClicked('cancel')}>Cancel</RaisedButton>
				</div>
			);
		} else {
			buttons = (
				<div style={{ display: 'flex' }}>
					{queuePane}
					<div>
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
				onClick={this.setHUDFocus}
				id='buttons'
				style={buildPanelStyle as any}>
				{buttons}
			</Paper>
		);
	}

	@autobind
	private setHUDFocus(e: React.MouseEvent<HTMLDivElement>) {
		this.context.state.setFocus('hud');
		e.stopPropagation();
	}

	@autobind
	private constructClicked(unitType: string) {
		const { input } = this.context.state;
		log('debug', `construct ${unitType} clicked`);
		input.construct(unitType);
	}

	@autobind
	private factoryConstructClicked(unitType: string) {
		const { selectedUnits } = this.context.state;
		if (selectedUnits.length != 1) {
			throw new Error('multiple unit selected not supported yet');
		}
		if (selectedUnits[0].details.type !== 'factory') {
			throw new Error('invalid unit type');
		}
		RequestChange.post({
			type: 'factoryOrder',
			factory: selectedUnits[0].uuid,
			unitType,
		});
	}
};
