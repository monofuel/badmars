import { autobind } from 'core-decorators';
import * as React from 'react';
import Paper from 'material-ui/Paper';
import { Card, CardHeader, CardText } from 'material-ui/Card';
import TextField from 'material-ui/TextField';
import RaisedButton from 'material-ui/RaisedButton';
import CircularProgress from 'material-ui/CircularProgress';

declare const grecaptcha: any;

export default class Login extends React.Component<{},{}> {
	render() {
		return (
			<div className='pane-content'>
				<Signin/>
			</div>
		);
	}
}

class Signin extends React.Component<{},{}> {
	render() {
		return (
		<Paper className='login-paper' zDepth={5}>
			<Card>
			<CardHeader title='Login'/>
				<CardText>
					<h1> another form goes here </h1>
				</CardText>
			</Card>
		</Paper>
		);
	}
}

