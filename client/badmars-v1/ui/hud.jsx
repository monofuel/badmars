/* @flow */
'use strict';

// monofuel
// 6-18-2016

import React from 'react';
import LoginModal from './login.jsx';
import ErrorAlert from './errorAlert.jsx';
import MenuButtons from './menuButtons.jsx';
import AboutModal from './about.jsx';
import SelectedUnitWell from './selectedUnit.jsx';
import Transfer from './transfer.jsx';

import {
	setHudClick,
	construct,
	factoryOrder,
	performTransfer
} from '../client.js';
import {Entity} from '../units/entity.js';
import {
	registerBusListener,
	deleteBusListener,
	fireBusEvent
} from '../eventBus.js';

/*import {Button, Modal, Alert, Well} from 'react-bootstrap';
import {AboutModal} from './about.js';
import {SelectedUnit} from './selectedUnit.js';
import {TransferModal} from './transfer.js';
import ReactDOM from 'react-dom';
import {
	setButtonMode,
	setMouseActions,
	map,
	display,
	selectedUnit,
	setHudClick,
	hilight
} from '../client.js';
import {Entity} from "../units/entity.js";
*/

type Props = {}
type State = {
	login: boolean,
	selectedUnit: ?Entity,
	transferUnit: ?Entity,
	errorMessage: ?string,
	aboutOpen: boolean,
	transfering: boolean
}

export default class HUD extends React.Component {
	state : State;
	props : Props;

	constructor(props: Props) {
		super(props);
		this.state = {
			login: false,
			selectedUnit: null,
			transferUnit: null,
			errorMessage: null,
			aboutOpen: false,
			transfering: false
		};
		let self = this;
		registerBusListener('selectedUnit',(unit: Entity) => {
			self.selectedUnitHandler(unit);
		});
		registerBusListener('unit',(unit: Entity) => {
			self.updateUnitsHandler(unit);
		});
		registerBusListener('transfer',(unit: Entity) => {
			self.unitTransferHandler(unit);
		})

	}

	render() {
		const {login,selectedUnit,transferUnit,errorMessage,aboutOpen,transfering} = this.state;

		if (login) {
			return (<LoginModal/>)
		} else {
			return (
				<div id="primaryHUD" onMouseUpCapture={this.handleMenuClick}>
					{
						errorMessage ?
						<ErrorAlert
							errorMessage={errorMessage}
							onClose={() => {
								this.clearErrorMessage();
							}}
						/>
						:
						null
					}
					{
						aboutOpen ?
						<AboutModal
							onClose={() => {
								this.setState({aboutOpen: false});
							}}
						/>
						:
						null
					}
					{
						transfering && selectedUnit && transferUnit ?
						<Transfer
							onMouseUpCapture={this.handleMenuClick}
							selectedUnit={selectedUnit}
							transferUnit={transferUnit}
							onClose={() => {
								this.setState({transfering: false});
							}}
							onTransfer={performTransfer}
						/>
						:
						null
					}
					{
						selectedUnit ?
						<SelectedUnitWell selectedUnit={selectedUnit}/>
						:
						null
					}
					<MenuButtons
						selectedUnitType={selectedUnit ? selectedUnit.type : null}
						openAboutClicked={() => {this._openAboutClicked()}}
						constructClicked={construct}
						factoryConstructClicked={factoryOrder}
					/>
				</div>
			)
		}
	}

	selectedUnitHandler(unit: Entity) {
		this.setState({selectedUnit: unit});
	}
	updateUnitsHandler(unit: Entity) {
		if (this.state.selectedUnit && this.state.selectedUnit.uuid === unit.uuid) {
			this.forceUpdate();
		}
	}

	unitTransferHandler(transferUnit: Entity) {
		console.log('unit transfering');
		console.log(transferUnit);
		this.setState({
			transfering: true,
			transferUnit: transferUnit
		});
	}

	updateErrorMessage(msg: string, vanish: ?boolean) : void {
		this.setState({
			errorMessage: msg
		});

		if (vanish) {
			setTimeout(() => {
				this.clearErrorMessage();
			},2000);
		}
	}

	clearErrorMessage() {
		this.setState({errorMessage: null});
	}

	setLoginState(bool: boolean) {
		this.setState({
			login: bool
		});
	}

	handleMenuClick(e: any): boolean {
		console.log('hud blocking click');
		setHudClick();

		return false;
	}

	_openAboutClicked() {
		this.setState({aboutOpen: true});
	}
};
