import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as injectTapEventPlugin from 'react-tap-event-plugin';
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import AppBar from 'material-ui/AppBar';
import { Tabs, Tab } from 'material-ui/Tabs';
import getMuiTheme from 'material-ui/styles/getMuiTheme';
import FlatButton from 'material-ui/FlatButton';
import { BrowserRouter, Route, Link } from 'react-router-dom';
import axios from 'axios';

import Frontpage from './frontpage';
import Login from './login';

// borrowed from the game
const palette = {
	uiBackground: 'rgba(0, 26, 5, 0.67)',
	uiPrimary: '#1b3006',
	uiSecondary: '#1b3006',
	uiTertiary: '#D01F09',
	fontColor: 'rgb(146, 222, 68)',
	land: '#8DC05C',
	water: '#265349',
	cliff: '#142329',
}

const muiTheme = getMuiTheme({
	palette: {
		primary1Color: palette.uiPrimary,
		primary2Color: palette.uiSecondary,
		primary3Color: palette.uiTertiary,
		textColor: palette.fontColor,
		canvasColor: palette.uiBackground,
		borderColor: palette.fontColor,
	}
})
console.log('adding onload');
window.onload = async () => {
	injectTapEventPlugin();
	ReactDOM.render(<Homepage />, document.getElementById('content'));
	console.log("DOM Rendered");
}


type Self = {
	uuid: string;
	username: string;
	email: string;
}

type HomepageState = {
	self: null | Self;
}

class Homepage extends React.Component<{}, {}> {
	state: HomepageState = {
		self: null,
	}
	componentDidMount() {
		this.loadSelf();
	}

	render() {
		const { self } = this.state;
		return (
			<BrowserRouter>
				<MuiThemeProvider muiTheme={muiTheme}>
					<div>
						<AppBar showMenuIconButton={false} title='Bad Mars'>
							<div className='nav-bar'>
								<Link className='nav-link' to='/'><FlatButton>Home</FlatButton></Link>
								{
									!self && <Link className='nav-link' to='/login'><FlatButton>Sign in</FlatButton></Link>
								}
								{
									self && <a href='/badmars'><FlatButton>Play</FlatButton></a>
								}
								{
									self && <FlatButton onClick={() => this.logout()}>Sign Out</FlatButton>
								}
							</div>
						</AppBar>
						<Route exact path='/' render={() => <Frontpage self={self} />} />
						<Route path='/login' component={Login} />
					</div>
				</MuiThemeProvider>
			</BrowserRouter>
		);
	}

	private async logout() {
		window.localStorage.setItem('session-token', null);
		this.setState({ self: null });
	}

	private async loadSelf(): Promise<void> {
		const token: string = window.localStorage.getItem('session-token');
		if (!token) {
			return
		}
		try {
			const resp = await axios.get('/auth/self', {
				headers: {
					'Authorization': `Bearer ${token}`
				}
			});
			console.log('loaded self', resp.data);
			this.setState({
				self: {
					uuid: resp.data.uuid,
					email: resp.data.email,
					username: resp.data.username,
				}
			})

		} catch (err) {
			// assume not logged in
			return
		}
	}
}