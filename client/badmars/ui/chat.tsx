// monofuel

import { autobind } from 'core-decorators';
import * as React from 'react';
import * as PropTypes from 'prop-types';

import IconButton from 'material-ui/IconButton';
import FontIcon from 'material-ui/FontIcon';

import TextField from 'material-ui/TextField';
import { Paper } from 'material-ui';
import { Table, TableBody, TableRow, TableRowColumn } from 'material-ui/Table';

import State from '../state';
import { RequestChange } from '../net';
import { GameFocusChange, GameFocusEvent } from '../gameEvents';

const chatWellStyle = {
	position: 'absolute',
	width: '50%',
	marginLeft: '25%',
	marginRight: '25%',
	maxHeight: '150px',
	padding: '5px',
	zIndex: '5',
	display: 'flex',
	flexDirection: 'column'
};

const chatTableStyle = {
	display: 'flex',
	overflow: 'auto',
	marginBottom: '0',
	marginTop: '0'
}

const chatBodyStyle = {
	flex: '1'
}

interface ChatPropsType {
	chatLog: any[]; // TODO type this
}

interface ChatStateType {
	sendText: string;
	minimized: boolean;
};

export default class Chat extends React.Component<ChatPropsType, ChatStateType> {
	public static contextTypes = {
		state: PropTypes.any.isRequired
	};
	context: {
		state: State,
	};

	props: ChatPropsType;
	state: ChatStateType = {
		minimized: true,
		sendText: ''
	};
	textField: TextField | null;
	interval: NodeJS.Timer;

	render() {
		const { sendText, minimized } = this.state;
		const { chatLog } = this.props;
		let recentChat: any[] = [];
		chatLog.map((line: any) => {
			if (Date.now() - line.timestamp < 1000 * 8 && recentChat.length < 3) {
				recentChat.push(line);
			}
		});
		return (
			<Paper
				zDepth={3}
				style={chatWellStyle as any}
				onMouseDown={this.setChatFocus}>
				<span style={{ display: 'flex', minHeight: '34px' }}>
					<TextField
						ref={(r) => this.textField = r}
						style={{ marginBottom: '0px', flex: '1', marginRight: '2px' }}
						value={sendText}
						hintText='Chat'
						onChange={this.inputChange}
						onKeyPress={this.handleKeyPress}
						onBlur={this.setGameFocus} />
					<IconButton onTouchTap={() => this.setState({ minimized: !minimized })}>
						{minimized
							? <FontIcon className="material-icons">keyboard_arrow_down</FontIcon>
							: <FontIcon className="material-icons">keyboard_arrow_up</FontIcon>
						}
					</IconButton>
				</span>
				<Table style={chatTableStyle as any}>
					<TableBody style={chatBodyStyle}>
						{minimized ?
							recentChat.map((line) => {
								return (
									<TableRow style={{ display: 'flex' }} key={line.user + line.timestamp}>
										<TableRowColumn>{line.user}</TableRowColumn>
										<TableRowColumn style={{ flex: '1' }}>{line.text}</TableRowColumn>
									</TableRow>
								)
							})
							:
							chatLog.map((line) => {
								return (
									<TableRow style={{ display: 'flex' }} key={line.user + line.timestamp}>
										<TableRowColumn>{line.user}</TableRowColumn>
										<TableRowColumn style={{ flex: '1' }}>{line.text}</TableRowColumn>
									</TableRow>
								)
							})
						}
					</TableBody>
				</Table>
			</Paper>
		)
	}

	@autobind
	private onFocusChange(e: GameFocusEvent) {
		if (e.prev === 'chat' && e.focus !== 'chat' && this.textField) {
			this.textField.blur();
		}
	}

	@autobind
	private setGameFocus() {
		this.context.state.setFocus('game');
	}

	@autobind
	private setChatFocus(e: React.MouseEvent<HTMLDivElement>) {
		this.context.state.setFocus('chat');
		e.stopPropagation();
	}


	componentDidMount() {
		if (!this.interval) {
			this.interval = setInterval(() => {
				this.forceUpdate();
			}, 1000);
		}
		GameFocusChange.attach(this.onFocusChange);
	}

	componentWillUnmount() {
		clearInterval(this.interval);
		GameFocusChange.detach(this.onFocusChange);
		delete this.interval;
	}

	@autobind
	private inputChange(event: React.FormEvent<{}>) {
		this.setState({ sendText: (event.target as any).value });
	}
	@autobind
	private handleKeyPress(event: React.KeyboardEvent<{}>) {
		const { sendText } = this.state;
		if (event.charCode !== 13 || !sendText) {
			return;
		}

		RequestChange.post({ type: 'sendChat', text: sendText });

		this.setState({ sendText: '' });

		// for some reason this function gets called twice? questionmark?
		this.state.sendText = '';
	}
}
