import { autobind } from 'core-decorators';
import * as React from 'react';
import Paper from 'material-ui/Paper';
import { Card, CardHeader, CardText } from 'material-ui/Card';
import TextField from 'material-ui/TextField';
import RaisedButton from 'material-ui/RaisedButton';
import CircularProgress from 'material-ui/CircularProgress';

interface RegistrationState {
	email?: string,
	username?: string,
	usernameError?: string,
	emailError?: string,
	password?: string,
	passwordError?: string
	submitting: boolean
}

export default class Registration extends React.Component<{}, RegistrationState> {
    state: RegistrationState = {
		submitting: false,
		username: '',
		email: '',
		password: '',
	};


	render() {
		const { username, usernameError, email, emailError, password, passwordError, submitting } = this.state;
		return (
		<Paper className='login-paper' zDepth={5}>
			{/* https://www.youtube.com/watch?v=gzU_4NNfmi4 */}
			<Card>
				<CardHeader title='Register'/>
				<CardText>
					<form
						onSubmit={this.submit}
						action='/auth/register'
						encType='application/json'
						method='POST'>
						<TextField
							hintText="Racha"
							hintStyle={{ color: '#666' }}
							floatingLabelText="username"
							floatingLabelStyle={{ color: '#666' }}
							value={username}
							errorText={usernameError}
							onChange={(e, username) => this.setState({ username, usernameError: undefined })}/>
						<br/>
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
						<div id='recaptcha' style={{ margin: '10px' }} />
						<br/>
						<RaisedButton
							label={submitting ? <CircularProgress size={30}/> : 'Submit' }
							primary
							type='submit'
							disabled={submitting}
							disabledBackgroundColor='rgb(101, 150, 43)'
							onClick={this.submit}/>
					</form>
				</CardText>
			</Card>
		</Paper>
		);
	}

	@autobind
	private submit() {
		console.log('SUBMITTING');
		const { username, email, password } = this.state;

		if (!username) {
			this.setState({ usernameError: 'Missing username'});
			return false;
		}
		// Yes, email regexes aren't perfect
		// no, i do not care
		if (!email || !email.match(/\S+@\S+\.\S+/)) {
			this.setState({ emailError: 'Invalid Email'});
			return false;
		}
		if (!password) {
			this.setState({ passwordError: 'Missing Password'});
			return false;
		}

		// TODO really submit
		this.setState({
			submitting: true
		})
	}
}