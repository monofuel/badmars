// monofuel

import { autobind } from 'core-decorators';
import * as React from 'react';
import * as PropTypes from 'prop-types';

import { Well, FormControl, Table, Button } from 'react-bootstrap';

import State from '../state';
import { RequestChange } from '../net';

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
	chatLog: any[];
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
			<Well id='chatWell' style={chatWellStyle as any}>
				<span style={{ display: 'flex', minHeight: '34px' }}>
					<FormControl
						style={{ marginBottom: '0px', flex: '1', marginRight: '2px' }}
						value={sendText}
						onChange={this.inputChange}
						onKeyPress={this.handleKeyPress}
						onFocus={() => this.context.state.focused = 'chat'}
						onBlur={() => this.context.state.focused = 'game'} />
					<Button onClick={() => this.setState({ minimized: !minimized })}>{minimized ? '+' : '-'}</Button>
				</span>
				<Table condensed style={chatTableStyle as any}>
					<tbody style={chatBodyStyle}>
						{minimized ?
							recentChat.map((line) => {
								return (
									<tr style={{ display: 'flex' }} key={line.user + line.timestamp}>
										<td>{line.user}</td><td style={{ flex: '1' }}>{line.text}</td>
									</tr>
								)
							})
							:
							chatLog.map((line) => {
								return (
									<tr style={{ display: 'flex' }} key={line.user + line.timestamp}>
										<td>{line.user}</td><td style={{ flex: '1' }}>{line.text}</td>
									</tr>
								)
							})
						}
					</tbody>
				</Table>
			</Well>
		)
	}

	componentDidMount() {
		if (!this.interval) {
			this.interval = setInterval(() => {
				this.forceUpdate();
			}, 1000);
		}
	}

	componentWillUnmount() {
		clearInterval(this.interval);
		delete this.interval;
	}

	@autobind
	private inputChange(event: React.FormEvent<React.Component<ReactBootstrap.FormControlProps,{}>>) {
		this.setState({ sendText: (event.target as any).value });
	}
	@autobind
	private handleKeyPress(event: React.KeyboardEvent<React.Component<ReactBootstrap.FormControlProps,{}>>) {
		const { sendChat } = this.props;
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
