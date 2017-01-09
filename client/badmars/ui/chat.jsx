/* @flow */
'use strict';

// monofuel
// 7-16-2016

import React from 'react';

import {Well, Input, Table, Button} from 'react-bootstrap';

import {
	setChatFocus,
	unsetChatFocus
} from '../client.js';

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

type Props = {
	chatLog: Object[],
	sendChat: (text: string) => void
}

type State = {
	sendText: string,
	minimized: boolean
};

var interval = -1;

export default class Chat extends React.Component {
	props: Props;
	state : State = {
		minimized: true,
		sendText: ""
	};

	render() {
		const {sendText,minimized} = this.state;
		const {chatLog} = this.props;
		let recentChat = [];
		chatLog.map((line) => {
			if (Date.now() - line.timestamp < 1000 * 8 && recentChat.length < 3) {
				recentChat.push(line);
			}
		});

		return (
			<Well id="chatWell" style={chatWellStyle}>
				<span style={{display: 'flex',minHeight:'34px'}}f>
					<Input
						type="text"
						style={{marginBottom: '0px',flex:'1',marginRight:'2px'}}
						value={sendText}
						onChange={(event) => this._inputChange(event)}
						onKeyPress={(event) => this._handleKeyPress(event)}
						onFocus={setChatFocus}
						onBlur={unsetChatFocus}/>
					<Button onClick={() => this.setState({minimized: !minimized})}>{minimized ? '+' : '-'}</Button>
				</span>
				<Table condensed style={chatTableStyle}>
					<tbody style={chatBodyStyle}>
						{ minimized?
							recentChat.map((line) => {
								return (
									<tr style={{display: 'flex'}} key={line.user + line.timestamp}>
									<td>{line.user}</td><td style={{flex:'1'}}>{line.text}</td>
									</tr>
								)
							})
							:
							chatLog.map((line) => {
								return (
									<tr style={{display: 'flex'}} key={line.user + line.timestamp}>
									<td>{line.user}</td><td style={{flex:'1'}}>{line.text}</td>
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
		if (interval === -1) {
			interval = setInterval(() => {
				console.log('force rendering chat');
				this.forceUpdate();
			},1000);
		}
	}

	componentWillUnmount() {
		clearInterval(interval);
		interval = -1;
	}

	_inputChange(event: Object) {
		this.setState({ sendText: event.target.value });
	}

	_handleKeyPress(event: Object) {
		const {sendChat} = this.props;
		const {sendText} = this.state;
		if (event.charCode != 13 || !sendText) {
			return;
		}

		console.log('sending chat');
		sendChat(sendText);
		this.setState({ sendText: ""});

		//for some reason this function gets called twice? questionmark?
		this.state.sendText = "";
	}
}
