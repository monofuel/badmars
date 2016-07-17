/* @flow */
'use strict';

// monofuel
// 6-18-2016

import React from 'react';
import LoginModal from './login.jsx';
import ErrorAlert from './errorAlert.jsx';
import MenuButtons from './menuButtons.jsx';
import Chat from './chat.jsx';
import AboutModal from './about.jsx';
import SelectedUnitWell from './selectedUnit.jsx';
import Transfer from './transfer.jsx';

import {
	setHudFocus,
	unsetHudFocus,
	construct,
	factoryOrder,
	performTransfer,
	sendChat
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
	transfering: boolean,
	chatLog: Object[]
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
			transfering: false,
			chatLog: []
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
		});
		registerBusListener('chat',(message: Object) => {
			self._addChatMessage(message);
		});

	}

	render() {
		const {login,selectedUnit,transferUnit,errorMessage,aboutOpen,transfering,chatLog} = this.state;

		if (login) {
			return (<LoginModal/>)
		} else {
			return (
				<div
				id="primaryHUD"
				onFocus={setHudFocus}
				onBlur={unsetHudFocus}
				>
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
					<Chat
						chatLog={chatLog}
						sendChat={sendChat}
					/>
					<MenuButtons
						selectedUnit={selectedUnit}
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

	_addChatMessage(message: Object) {
		this.setState({
			chatLog: [message].concat(this.state.chatLog.slice(0,199))
		});
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

	_openAboutClicked() {
		this.setState({aboutOpen: true});
	}
};
