import { autobind } from 'core-decorators';
import * as React from 'react';
import Paper from 'material-ui/Paper';
import { Card, CardHeader, CardText } from 'material-ui/Card';
import TextField from 'material-ui/TextField';
import RaisedButton from 'material-ui/RaisedButton';
import CircularProgress from 'material-ui/CircularProgress';

export default class Login extends React.Component<{},{}> {
	render() {
		return (
			<div className='login-content'>
				<Signup/>
				<Signin/>
			</div>
		);
	}
}

interface SignupState {
	email?: string,
	emailError?: string,
	password?: string,
	passwordError?: string
	submitting: boolean
}

class Signup extends React.Component<{}, SignupState> {
	state: SignupState = {
		submitting: false
	};

	render() {
		const { email, emailError, password, passwordError, submitting } = this.state;
		return (
		<Paper className='login-paper' zDepth={5}>
			<Card>
				<CardHeader title='Register'/>
				<CardText>
					<TextField
						hintText='racha@japura.net'
						hintStyle={{ color: '#666' }}
						floatingLabelText="email"
						floatingLabelStyle={{ color: '#666' }}
						value={email}
						errorText={emailError}
						onChange={(e, email) => this.setState({ email, emailError: undefined })}/>
					<br/>
					<TextField
						hintText="**********"
						hintStyle={{ color: '#666' }}
						floatingLabelText="password"
						floatingLabelStyle={{ color: '#666' }}
						type="password"
						value={password}
						errorText={passwordError}
						onChange={(e, password) => this.setState({ password, passwordError: undefined })}/>
					<br/>
					<RaisedButton
						label={submitting ? <CircularProgress size={30}/> : 'Submit' }
						primary
						disabled={submitting}
						disabledBackgroundColor='rgb(101, 150, 43)'
						onClick={this.submit}/>
				</CardText>
			</Card>
		</Paper>
		);
	}

	@autobind
	private submit() {
		const { email, password } = this.state;
		// Yes, email regexes aren't perfect
		// no, i do not care
		if (!email || !email.match(/\S+@\S+\.\S+/)) {
			this.setState({ emailError: 'Invalid Email'});
			return;
		}
		if (!password) {
			this.setState({ passwordError: 'Missing Password'});
			return;
		}

		// TODO really submit
		this.setState({
			submitting: true
		})
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

