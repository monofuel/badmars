import { autobind } from 'core-decorators';
import * as React from 'react';
import Paper from 'material-ui/Paper';
import { Card, CardHeader, CardText } from 'material-ui/Card';
import TextField from 'material-ui/TextField';
import RaisedButton from 'material-ui/RaisedButton';
import CircularProgress from 'material-ui/CircularProgress';
import axios from 'axios';
interface SigninState {
	email?: string,
	emailError?: string,
	password?: string,
	passwordError?: string
	submitting: boolean
	submitError?: string
}

export default class Signin extends React.Component<{}, SigninState> {
    state: SigninState = {
		submitting: false,
		email: '',
		password: '',
	};


	render() {
		const { email, emailError, password, passwordError, submitting } = this.state;
		return (
		<Paper className='login-paper' zDepth={5}>
			{/* https://www.youtube.com/watch?v=gzU_4NNfmi4 */}
			<Card>
				<CardHeader title='Login'/>
				<CardText>
					<form
						onSubmit={(e) => {
							e.preventDefault();
							this.submit();
						}}>
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
							type='submit'
							disabled={submitting}
							disabledBackgroundColor='rgb(101, 150, 43)'/>
					</form>
				</CardText>
			</Card>
		</Paper>
		);
	}

	@autobind
	private async submit() {
		console.log('SUBMITTING');
		const { email, password } = this.state;

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

		this.setState({
			submitting: true,
			submitError: null,
		});

		const resp = await axios.post('/auth/login', {
			email, password
		});

		try {
			const resp = await axios.post('/auth/login', {
				email, password
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
			if (err.resp.data && err.resp.data.message) {
				const submitError = err.resp.data.message;
				this.setState({ submitting: false, submitError });
			} else {
				this.setState({ submitting: false, submitError: 'unknown error' });
			}
		}
	}
}