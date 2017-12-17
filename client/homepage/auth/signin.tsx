import { autobind } from 'core-decorators';
import * as React from 'react';
import Paper from 'material-ui/Paper';
import { Card, CardHeader, CardText } from 'material-ui/Card';
import TextField from 'material-ui/TextField';
import RaisedButton from 'material-ui/RaisedButton';
import CircularProgress from 'material-ui/CircularProgress';
import axios from 'axios';
interface SigninState {
	username?: string,
	usernameError?: string,
	password?: string,
	passwordError?: string
	submitting: boolean
}

export default class Signin extends React.Component<{}, SigninState> {
	state: SigninState = {
		submitting: false,
		username: '',
		password: '',
	};


	render() {
		const { username, usernameError, password, passwordError, submitting } = this.state;
		return (
			<Paper className='login-paper' zDepth={5}>
				{/* https://www.youtube.com/watch?v=gzU_4NNfmi4 */}
				<Card>
					<CardHeader title='Login' />
					<CardText>
						<form
							onSubmit={(e) => {
								e.preventDefault();
								this.submit();
							}}>
							<TextField
								hintText='racha'
								hintStyle={{ color: '#666' }}
								floatingLabelText="username"
								floatingLabelStyle={{ color: '#666' }}
								value={username}
								errorText={usernameError}
								onChange={(e, username) => this.setState({ username, usernameError: undefined })} />
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
		const { username, password } = this.state;

		if (!username) {
			this.setState({ usernameError: 'Invalid Email' });
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
			const resp = await axios.post('/auth/login', {
				username, password
			});
			const {
				sessionToken
			}: {
					sessionToken: string
				} = resp.data;
			window.localStorage.setItem('session-token', sessionToken);
			this.setState({ submitting: false });
			(window as any).location = '/badmars';

		} catch (err) {
			if (err.response.data && err.response.data.msg) {
				const submitError = err.response.data.msg;
				this.setState({ submitting: false, usernameError: submitError });
			} else {
				this.setState({ submitting: false, usernameError: 'unknown error' });
			}
		}
	}
}