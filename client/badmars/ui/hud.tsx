/* @flow */
'use strict';

// monofuel
// 6-18-2016

import { autobind } from 'core-decorators';
import * as React from 'react';
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import { Button } from 'react-bootstrap';

import LoginModal from './login.jsx';
import ErrorAlert from './errorAlert.jsx';
import MenuButtons from './menuButtons.jsx';
import Chat from './chat.jsx';
import AboutModal from './about.jsx';
import SelectedUnitWell from './selectedUnit.jsx';
import Transfer from './transfer.jsx';

import {
	construct,
	factoryOrder,
	performTransfer,
	sendChat
} from '../client.js';
import Entity from '../units/entity.js';

import {
	DisplayErrorChange,
	LoginChange,
	SelectedUnitsChange,
	TransferChange,
	GameStageChange,
	GameStageEvent,
 } from '../gameEvents';
 import {
	 ChatChange,
	 UnitUpdateChange
 } from '../net';

interface Props {}
interface State {
	login: boolean;
	selectedUnit: Entity | null;
	transferUnit: Entity | null;
	errorMessage: string | null;
	aboutOpen: boolean;
	transfering: boolean;
	chatLog: Object[];
}

const hudStyle = {
	position: 'absolute',
	left: 0,
	right: 0,
	top: 0,
	bottom: 0
}

const aboutButtonStyle = {
	position: 'absolute',
	left: '100px',
	top: '10px',
	width: '60px'
};

export default class HUD extends React.Component<Props, State> {
	state: State;
	props: Props;

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

		SelectedUnitsChange.attach(({ units }) => this.selectedUnitHandler(units));
		UnitUpdateChange.attach(({ unit }) => this.updateUnitsHandler(unit));
		TransferChange.attach(({ unit }) => this.unitTransferHandler(unit));
		ChatChange.attach((msg) => this._addChatMessage(msg));
		GameStageChange.attach(this._gameStateChange);
	}

	render() {
		const {login,selectedUnit,transferUnit,errorMessage,aboutOpen,transfering,chatLog} = this.state;


		return (
			<MuiThemeProvider>
				{ login
				? <LoginModal/>
				: <div
					id="primaryHUD"
					style={hudStyle}
					onFocus={setHudFocus}
					onBlur={unsetHudFocus}>
					{ errorMessage
						? <ErrorAlert
							errorMessage={errorMessage}
							onClose={() => {
								this.clearErrorMessage();
							}}
						/>
						: null
					}
					{ aboutOpen
						? <AboutModal
							onClose={() => {
								this.setState({aboutOpen: false});
							}}/>
						: null
					}
					{ transfering && selectedUnit && transferUnit
						? <Transfer
							selectedUnit={selectedUnit}
							transferUnit={transferUnit}
							onClose={() => {
								this.setState({transfering: false});
							}}
							onTransfer={performTransfer}/>
						: null
					}
					{ selectedUnit
						? <SelectedUnitWell selectedUnit={selectedUnit}/>
						: null
					}
					<Chat
						chatLog={chatLog}
						sendChat={sendChat}/>
					<Button
						onClick={() => this._openAboutClicked()}
						style={aboutButtonStyle}>
						About
					</Button>
					<MenuButtons
						selectedUnit={selectedUnit}
						constructClicked={construct}
						factoryConstructClicked={factoryOrder}/>
				</div>
			}
			</MuiThemeProvider>
		)
	}

	selectedUnitHandler(unit: Entity) {
		this.setState({selectedUnit: unit,transferUnit: null});
	}
	updateUnitsHandler(unit: Entity) {
		if (this.state.selectedUnit && this.state.selectedUnit.uuid === unit.uuid) {
			this.forceUpdate();
		}
	}

	@autobind
	_gameStateChange(event: GameStateEvent) {
		this.setState({
			login: event.stage === 'login'
		})
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

	updateErrorMessage(msg: string, vanish?: boolean): void {
		this.setState({
			errorMessage: msg
		});

		if (vanish) {
			setTimeout(() => {
				this.clearErrorMessage();
			}, 2000);
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
