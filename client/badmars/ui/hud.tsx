// monofuel

import { autobind } from 'core-decorators';
import * as React from 'react';
import * as PropTypes from 'prop-types';
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import { Button } from 'react-bootstrap';

import LoginModal from './login';
import ErrorAlert from './errorAlert';
import MenuButtons from './menuButtons';
import Chat from './chat';
import AboutModal from './about';
import SelectedUnitWell from './selectedUnit';
import Transfer from './transfer';
import Entity from '../units/entity';
import State from '../state';
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
	UnitChange
} from '../net';

interface HUDProps {
	state: State;
}
interface HUDState {
	login: boolean;
	selectedUnit: Entity | null;
	transferUnit: Entity | null;
	errorMessage: string | null;
	aboutOpen: boolean;
	transfering: boolean;
	chatLog: any[];
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

export default class HUD extends React.Component<HUDProps, HUDState> {
	public static childContextTypes = {
		state: PropTypes.any.isRequired
	};

	public static PropTypes = {
		state: PropTypes.any.isRequired
	};
	public props: HUDProps;

	public state: HUDState = {
		login: false,
		selectedUnit: null,
		transferUnit: null,
		errorMessage: null,
		aboutOpen: false,
		transfering: false,
		chatLog: []
	};

	// passing globals, Deal with it (⌐■_■)
	public getChildContext() {
		const { state } = this.props;
		return { state };
	}

	public componentDidMount() {
		SelectedUnitsChange.attach(({ units }) => this.selectedUnitsHandler(units));
		UnitChange.attach(({ units }) => this.updateUnitsHandler(units));
		TransferChange.attach(({ source, dest }) => this.unitTransferHandler(source));
		ChatChange.attach((msg) => this._addChatMessage(msg));
		GameStageChange.attach(this._gameStateChange);
	}

	public render() {
		const { state } = this.props;
		const { login, selectedUnit, transferUnit, errorMessage, aboutOpen, transfering, chatLog } = this.state;

		return (
			<MuiThemeProvider>
				{login
					? <LoginModal />
					: <div
						id='primaryHUD'
						onClick={this.setGameFocus}
						style={hudStyle as any}>
						{errorMessage
							? <ErrorAlert
								errorMessage={errorMessage}
								onClose={() => {
									this.clearErrorMessage();
								}}
							/>
							: null
						}
						{aboutOpen
							? <AboutModal
								onClose={() => {
									this.setState({ aboutOpen: false });
								}} />
							: null
						}
						{transfering && selectedUnit && transferUnit
							? <Transfer
								selectedUnit={selectedUnit}
								transferUnit={transferUnit}
								onClose={() => {
									this.setState({ transfering: false });
								}} />
							: null
						}
						{selectedUnit
							? <SelectedUnitWell selectedUnit={selectedUnit} />
							: null
						}
						<Chat
							chatLog={chatLog} />
						<Button
							onClick={() => this._openAboutClicked()}
							style={aboutButtonStyle as any}>
							About
					</Button>
						<MenuButtons
							selectedUnit={selectedUnit} />
					</div>
				}
			</MuiThemeProvider>
		)
	}

	@autobind
	private setGameFocus(e: React.MouseEvent<HTMLDivElement>) {
		this.props.state.setFocus('game');
	}

	@autobind
	private selectedUnitsHandler(units: Entity[]) {
		if (units.length === 0) {
			return;
		}
		this.setState({ selectedUnit: units[0], transferUnit: null });
	}
	updateUnitsHandler(units: any[]) {
		// TODO update this
		// if (this.state.selectedUnit && this.state.selectedUnit.uuid === unit.uuid) {
		// 	this.forceUpdate();
		// }
	}

	@autobind
	_gameStateChange(event: GameStageEvent) {
		this.setState({
			login: event.stage === 'login'
		})
	}

	_addChatMessage(message: Object) {
		this.setState({
			chatLog: [message].concat(this.state.chatLog.slice(0, 199))
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
		this.setState({ errorMessage: null });
	}

	setLoginState(bool: boolean) {
		this.setState({
			login: bool
		});
	}

	_openAboutClicked() {
		this.setState({ aboutOpen: true });
	}
}
