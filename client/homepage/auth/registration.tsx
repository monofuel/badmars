import { autobind } from 'core-decorators';
import * as React from 'react';
import Paper from 'material-ui/Paper';
import { Card, CardHeader, CardText } from 'material-ui/Card';
import TextField from 'material-ui/TextField';
import RaisedButton from 'material-ui/RaisedButton';
import CircularProgress from 'material-ui/CircularProgress';
import axios from 'axios';
interface RegistrationState {
	email?: string,
	username?: string,
	usernameError?: string,
	emailError?: string,
	password?: string,
	verifiedPassword?: string,
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
		const { username, usernameError, email, emailError, password, verifiedPassword, passwordError, submitting } = this.state;
		return (
			<Paper className='login-paper' zDepth={5}>
				{/* https://www.youtube.com/watch?v=gzU_4NNfmi4 */}
				<Card>
					<CardHeader title='Register' />
					<CardText>
						<form
							onSubmit={(e) => {
								e.preventDefault();
								this.submit();
							}}>
							<TextField
								hintText="Racha"
								hintStyle={{ color: '#666' }}
								floatingLabelText="username"
								floatingLabelStyle={{ color: '#666' }}
								value={username}
								errorText={usernameError}
								onChange={(e, username) => this.setState({ username, usernameError: undefined })} />
							<br />
							<TextField
								hintText='racha@japura.net'
								hintStyle={{ color: '#666' }}
								floatingLabelText="email"
								floatingLabelStyle={{ color: '#666' }}
								value={email}
								errorText={emailError}
								onChange={(e, email) => this.setState({ email, emailError: undefined })} />
							<br />
							<TextField
								hintText="**********"
								hintStyle={{ color: '#666' }}
								floatingLabelText="password"
								floatingLabelStyle={{ color: '#666' }}
								type="password"
								value={password}
								errorText={passwordError}
								onChange={(e, password) => this.setState({ password, passwordError: undefined })} />
							<br />
							<TextField
								hintText="**********"
								hintStyle={{ color: '#666' }}
								floatingLabelText="verify password"
								floatingLabelStyle={{ color: '#666' }}
								type="password"
								value={verifiedPassword}
								onChange={(e, verifiedPassword) => this.setState({ verifiedPassword })} />
							<br />
							<RaisedButton
								label={submitting ? <CircularProgress size={30} /> : 'Submit'}
								primary
								type='submit'
								disabled={submitting}
								disabledBackgroundColor='rgb(101, 150, 43)' />
						</form>
					</CardText>
				</Card>
			</Paper>
		);
	}

	@autobind
	private async submit() {
		console.log('SUBMITTING');
		const { username, email, password, verifiedPassword } = this.state;

		if (!username) {
			this.setState({ usernameError: 'Missing username' });
			return false;
		}
		// Yes, email regexes aren't perfect
		// no, i do not care
		if (!email || !email.match(/\S+@\S+\.\S+/)) {
			this.setState({ emailError: 'Invalid Email' });
			return false;
		}
		if (password != verifiedPassword) {
			this.setState({ passwordError: 'verification password does not match' })
			return false;
		}
		if (!password) {
			this.setState({ passwordError: 'Missing Password' });
			return false;
		}

		this.setState({
			submitting: true,
		});
		try {
			const resp = await axios.post('/auth/register', {
				username, email, password
			});
			const {
				sessionToken
			}: {
					sessionToken: string
				} = resp.data;
			window.sessionStorage.setItem('session-token', sessionToken);
			this.setState({ submitting: false });
			(window as any).location = '/badmars';

		} catch (err) {
			if (err.response.data && err.response.data.message) {
				const submitError = err.response.data.message;
				this.setState({ submitting: false, usernameError: submitError });
			} else {
				this.setState({ submitting: false, usernameError: 'unknown error' });
			}
		}
	}
}