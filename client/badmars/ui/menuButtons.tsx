// monofuel

import { autobind } from 'core-decorators';
import * as React from 'react';
import * as PropTypes from 'prop-types';

import { Button, Well } from 'react-bootstrap';
import { Paper } from 'material-ui';
import Entity from '../units/entity';
import State from '../state';

type Props = {
	selectedUnit: Entity,
}

const constructButtonStyle = {
	width: '100px',
	paddingRight: '10px'
};

const buildButtonStyle = {
	position: 'absolute',
	width: '50%',
	top: '80%',
	left: 0,
	right: 0,
	marginLeft: 'auto',
	marginRight: 'auto',
	height: '100px',
	padding: '5px',
	zIndex: '5'
};

export default class MenuButtons extends React.Component<Props,{}> {
	public static contextTypes = {
		state: PropTypes.any.isRequired
	};
	context: {
		state: State,
	};

	render() {
		const {selectedUnit } = this.props;
		const selectedUnitType = selectedUnit ? selectedUnit.details.type : null;

		let buttons;
		let queuePane = <div>Nothing queued</div>;
		// TODO refactor all of this using construct.types listing the constructable types
		if (selectedUnitType === 'factory' && selectedUnit && selectedUnit.construct && selectedUnit.construct.factoryQueue && selectedUnit.construct.factoryQueue.length > 0) {
			let buildingUnit = selectedUnit.construct.factoryQueue[0];
			let remaining = buildingUnit.remaining;
			let constructing = buildingUnit.cost === 0;
			queuePane = (
				<div style={{width: '110px'}}>
					<div>
					{constructing?
						'remaining: ' + remaining + 's'
						:
						'need iron'
					}
					</div>
					<ul style={{overflow: 'auto', maxHeight: '60%'}}>
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
					<Button style={constructButtonStyle} onClick={() => this.constructClicked('storage')}>Storage</Button>
					<Button style={constructButtonStyle} onClick={() => this.constructClicked('mine')}>Mine</Button>
					<Button style={constructButtonStyle} onClick={() => this.constructClicked('factory')}>Factory</Button>
					<Button style={constructButtonStyle} onClick={() => this.constructClicked('wall')}>Wall</Button>
					<Button style={constructButtonStyle} onClick={() => this.constructClicked('cancel')}>Cancel</Button>
				</div>
			);
		} else {
			buttons = (
				<div style={{display: 'flex'}}>
					{queuePane}
					<div>
						<Button style={constructButtonStyle} onClick={() => this.factoryConstructClicked('tank')}>Tank</Button>
						<Button style={constructButtonStyle} onClick={() => this.factoryConstructClicked('builder')}>Builder</Button>
						<Button style={constructButtonStyle} onClick={() => this.factoryConstructClicked('transport')}>Transport</Button>
						<Button style={constructButtonStyle} onClick={() => this.factoryConstructClicked('cancel')}>Cancel</Button>
					</div>
				</div>
			);
		}

		return (
			<Paper
				id='buttons'
				style={buildButtonStyle as any}>
				{buttons}
			</Paper>
		);
	}
	@autobind
	private constructClicked(type: string) {
		throw new Error('not implemented');
	}

	@autobind
	private factoryConstructClicked(type: string) {
		throw new Error('not implemented');
	}
};
