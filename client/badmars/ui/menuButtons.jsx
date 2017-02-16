/* @flow */
// monofuel
// 6-18-2016

import React from 'react';

import {Button, Well} from 'react-bootstrap';
import {Entity} from '../units/entity.js';

type Props = {
	selectedUnit: Entity,
	openAboutClicked: () => void,
	constructClicked: (type: string) => void,
	factoryConstructClicked: (type: string) => void
}

const constructButtonStyle = {
	width: '100px',
	paddingRight: '10px'
};

const aboutButtonStyle = {
	position: 'absolute',
	left: '190px',
	top: '10px',
	width: '60px'
};

const buildButtonStyle = {
	position: 'absolute',
	width: '50%',
	top: 0,
	left: 0,
	right: 0,
	marginTop: '80%',
	marginLeft: 'auto',
	marginRight: 'auto',
	height: '100px',
	padding: '5px',
	zIndex: '5'
};

export default class MenuButtons extends React.Component{

	render() {
		const {selectedUnit,openAboutClicked,constructClicked,factoryConstructClicked} = this.props;
		const selectedUnitType = selectedUnit ? selectedUnit.details.type : null

		let buttons;
		let queuePane = <div>Nothing queued</div>;
		// TODO refactor all of this using construct.types listing the constructable types
		if (selectedUnitType === 'factory' && selectedUnit && selectedUnit.construct && selectedUnit.construct.factoryQueue.length > 0) {
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
					<Button style={constructButtonStyle} onClick={() => constructClicked('storage')}>Storage</Button>
					<Button style={constructButtonStyle} onClick={() => constructClicked('mine')}>Mine</Button>
					<Button style={constructButtonStyle} onClick={() => constructClicked('factory')}>Factory</Button>
					<Button style={constructButtonStyle} onClick={() => constructClicked('wall')}>Wall</Button>
					<Button style={constructButtonStyle} onClick={() => constructClicked('cancel')}>Cancel</Button>
				</div>
			);
		} else {
			buttons = (
				<div style={{display: 'flex'}}>
					{queuePane}
					<div>
						<Button style={constructButtonStyle} onClick={() => factoryConstructClicked('tank')}>Tank</Button>
						<Button style={constructButtonStyle} onClick={() => factoryConstructClicked('builder')}>Builder</Button>
						<Button style={constructButtonStyle} onClick={() => factoryConstructClicked('transport')}>Transport</Button>
						<Button style={constructButtonStyle} onClick={() => factoryConstructClicked('cancel')}>Cancel</Button>
					</div>
				</div>
			);
		}

		return (
			<div>
				<Button
					onClick={openAboutClicked}
					style={aboutButtonStyle}
				>
					About
				</Button>

				<Well
					id="buttons"
					style={buildButtonStyle}
				>
					{buttons}
				</Well>
			</div>
		);
	}
};
