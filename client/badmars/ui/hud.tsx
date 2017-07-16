// monofuel

import { autobind } from 'core-decorators';
import * as React from 'react';
import * as PropTypes from 'prop-types';
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import getMuiTheme from 'material-ui/styles/getMuiTheme';
import { Button } from 'react-bootstrap';

import IconButton from 'material-ui/IconButton';
import FontIcon from 'material-ui/FontIcon';
import { Paper } from 'material-ui';

import config from '../config';
import LoginModal from './login';
import ErrorAlert from './errorAlert';
import MenuButtons from './menuButtons';
import Chat from './chat';
import AboutModal from './about';
import SelectedUnitWell from './selectedUnit';
import Transfer from './transfer';
import Entity from '../units/entity';
import State from '../state';
import BMDatGui from './datgui';
import {
	DisplayErrorChange,
	LoginChange,
	SelectedUnitsChange,
	TransferChange,
	TransferEvent,
	GameStageChange,
	GameStageEvent,
} from '../gameEvents';
import {
	ChatChange,
	UnitChange
} from '../net';

const { palette } = config;

interface HUDProps {
	state: State;
}
interface HUDState {
	login: boolean;
	selectedUnits: Entity[];
	transferUnit: Entity | null;
	transferDestUnit: Entity | null;
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
	left: 0,
	top: 0
};

const muiTheme = getMuiTheme({
	palette: {
		primary1Color: palette.uiPrimary,
		primary2Color: palette.uiSecondary,
		primary3Color: palette.uiTertiary,
		textColor: palette.fontColor,
		canvasColor: palette.uiBackground,
		borderColor: palette.fontColor
	}
})

/*
	on default, all clicks go to the 'game' behind the hud.
	to prevent this, all hud components must call
	this.context.state.setFocus('hud');
	and stop propogation in onClick
*/

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
		selectedUnits: null,
		transferUnit: null,
		transferDestUnit: null,
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
		TransferChange.attach(this.unitTransferHandler);
		ChatChange.attach((msg) => this._addChatMessage(msg));
		GameStageChange.attach(this._gameStateChange);
		BMDatGui();
	}

	public render() {
		const { state } = this.props;
		const { login, transferDestUnit, transferUnit, errorMessage, aboutOpen, transfering, chatLog } = this.state;
		const { selectedUnits } = this.props.state;

		return (
			<MuiThemeProvider muiTheme={muiTheme}>
				{login
					? <LoginModal />
					: <div
						id='primaryHUD'
						onMouseDown={(e) => {
							this.setGameFocus(e);
							this.props.state.input.mouseDownHandler(e.nativeEvent);
						}}
						onMouseUp={(e) => this.props.state.input.mouseUpHandler(e.nativeEvent)}
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
									this.props.state.setFocus('game');
									this.setState({ aboutOpen: false });
								}} />
							: null
						}
						{transfering && transferDestUnit && transferUnit
							? <Transfer
								transferDestUnit={transferDestUnit}
								transferUnit={transferUnit}
								onClose={() => {
									this.setState({ transfering: false });
								}} />
							: null
						}
						{selectedUnits && selectedUnits.length > 0
							? <SelectedUnitWell selectedUnits={selectedUnits} />
							: null
						}
						<Chat
							chatLog={chatLog} />
						<Paper
							onMouseDown={this.setHUDFocus}
							style={aboutButtonStyle as any}>
							<IconButton
								onTouchTap={() => this._openAboutClicked()}>
								<FontIcon className="material-icons">info_outline</FontIcon>
							</IconButton>
						</Paper>
						<MenuButtons
							selectedUnits={selectedUnits} />
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
	private setHUDFocus(e: React.MouseEvent<HTMLDivElement>) {
		this.props.state.setFocus('hud');
		e.stopPropagation();
	}

	@autobind
	private selectedUnitsHandler(units: Entity[]) {
		this.setState({ selectedUnits: units, transferUnit: null });
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

	@autobind
	_addChatMessage(message: Object) {
		this.setState({
			chatLog: [message].concat(this.state.chatLog.slice(0, 199))
		});
	}

	@autobind
	unitTransferHandler(e: TransferEvent) {
		console.log('unit transfering');
		this.setState({
			transfering: true,
			transferUnit: e.source,
			transferDestUnit: e.dest,
		});
	}
	
	@autobind
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
