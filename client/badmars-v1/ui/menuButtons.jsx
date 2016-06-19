/* @flow */
'use strict';

// monofuel
// 6-18-2016

import React from 'react';

import {Button, Well} from 'react-bootstrap';

type Props = {
	selectedUnitType: ?string,
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
	top: '80%',
	width: '50%',
	marginLeft: '25%',
	marginRight: '25%',
	height: '100px',
	padding: '5px',
	zIndex: '5'
};

export default class MenuButtons extends React.Component{

	render() {
		const {selectedUnitType,openAboutClicked,constructClicked,factoryConstructClicked} = this.props;

		let buttons;
		if (!selectedUnitType || selectedUnitType !== 'factory') {
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
				<div>
					<Button style={constructButtonStyle} onClick={() => factoryConstructClicked('tank')}>Tank</Button>
					<Button style={constructButtonStyle} onClick={() => factoryConstructClicked('builder')}>Builder</Button>
					<Button style={constructButtonStyle} onClick={() => factoryConstructClicked('transport')}>Transport</Button>
					<Button style={constructButtonStyle} onClick={() => factoryConstructClicked('cancel')}>Cancel</Button>
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
