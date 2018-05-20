// monofuel

import { autobind } from 'core-decorators';
import * as React from 'react';
import * as PropTypes from 'prop-types';
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import getMuiTheme from 'material-ui/styles/getMuiTheme';

import IconButton from 'material-ui/IconButton';
import FontIcon from 'material-ui/FontIcon';
import { Paper } from 'material-ui';

import config from '../config';
import LoginModal from './login';
import ErrorAlert from './errorAlert';
import MenuButtons from './menuButtons';
import ChatPane from './chatPane';
import AboutModal from './about';
import SelectedUnitWell from './selectedUnit';
import Transfer from './transfer';
import GameState, {
  SelectedUnitsChange,
  UnitChange,
  TransferChange,
  GameStageChange,
  GameFocusChange,
  GameStageEvent,
  StartTransferEvent
} from '../state';
import BMDatGui from './datgui';
import UnitEntity from '../units';
import ServerStats from './serverStats';

const { palette } = config;

interface HUDState {
  login: boolean;
  selectedUnits: UnitEntity[];
  transferUnit: Unit | null;
  transferDestUnit: Unit | null;
  errorMessage: string | null;
  aboutOpen: boolean;
  transfering: boolean;
}

const hudStyle = {
  position: 'absolute',
  left: 0,
  right: 0,
  top: 0,
  bottom: 0,
  display: 'flex'
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
    borderColor: palette.fontColor,
    secondaryTextColor: palette.fontColor,
    alternateTextColor: palette.fontColor,
  },
  button: {
    textTransform: 'none'
  }
})

/*
	on default, all clicks go to the 'game' behind the hud.
	to prevent this, all hud components must call
	state.setFocus('hud');
	and stop propogation in onClick
*/

export default class HUD extends React.Component<{}, HUDState> {
  public static childContextTypes = {
    state: PropTypes.any.isRequired
  };

  // TODO error messsages are not wired up
  public state: HUDState = {
    login: false,
    selectedUnits: null,
    transferUnit: null,
    transferDestUnit: null,
    errorMessage: null,
    aboutOpen: false,
    transfering: false,
  };

  public componentDidMount() {
    SelectedUnitsChange.attach(({ units }) => this.selectedUnitsHandler(units));
    UnitChange.attach(({ list }) => this.updateUnitsHandler(list));
    TransferChange.attach(this.unitTransferHandler);
    GameStageChange.attach(this._gameStateChange);
    if (config.debug) {
      gameState.datgui = BMDatGui();
    }
  }

  public render() {

    const { login, transferDestUnit, transferUnit, errorMessage, aboutOpen, transfering } = this.state;
    const { selectedUnits, chatOpen } = gameState;

    return (
      <MuiThemeProvider muiTheme={muiTheme}>

        {login
          ? <LoginModal />
          : <div
            id='primaryHUD'
            onMouseLeave={(e) => this.mouseLeaveHandler(e)}
            onMouseDown={(e) => {
              this.setGameFocus(e);
              gameState.input.mouseDownHandler(e.nativeEvent);
            }}
            onMouseUp={(e) => gameState.input.mouseUpHandler(e.nativeEvent)}
            style={hudStyle as any}>
            <div style={{ flex: 1 }}>
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
                    GameFocusChange.post({ focus: 'game', prev: gameState.focused });
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
            {chatOpen &&
              <ChatPane />
            }
            {
              config.profPanel &&
              <ServerStats />
            }

          </div>
        }
      </MuiThemeProvider>
    )
  }

  @autobind
  private setGameFocus(e: React.MouseEvent<HTMLDivElement>) {
    GameFocusChange.post({ focus: 'game', prev: gameState.focused });
  }

  @autobind
  private setHUDFocus(e: React.MouseEvent<HTMLDivElement>) {
    GameFocusChange.post({ focus: 'hud', prev: gameState.focused });
    e.stopPropagation();
  }

  @autobind
  private selectedUnitsHandler(units: UnitEntity[]) {
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
  unitTransferHandler(e: StartTransferEvent) {
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

  private mouseLeaveHandler(e: React.MouseEvent<HTMLDivElement>) {
    console.log('mouse left window');

    gameState.input.keysDown = [];
  }
}
