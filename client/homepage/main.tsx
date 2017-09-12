import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as injectTapEventPlugin from 'react-tap-event-plugin';
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import AppBar from 'material-ui/AppBar';
import { Tabs, Tab } from 'material-ui/Tabs';
import getMuiTheme from 'material-ui/styles/getMuiTheme';
import FlatButton from 'material-ui/FlatButton';
import { BrowserRouter, Route, Link } from 'react-router-dom';

import Homepage from './homepage';
import Login from './login';

// borrowed from the game
const palette = {
	uiBackground: 'rgba(0, 26, 5, 0.67)',
	uiPrimary: '#1b3006',
	uiSecondary: '#1b3006',
	uiTertiary: '#D01F09',
	fontColor: '#72b033',
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

window.onload = async ()  => {
	injectTapEventPlugin();
	ReactDOM.render(
	<BrowserRouter>
		<MuiThemeProvider muiTheme={muiTheme}>
			<div>
				<AppBar showMenuIconButton={false} title='Bad Mars'>
					<div className='nav-bar'>
						<Link className='nav-link' to='/'><FlatButton>Home</FlatButton></Link>
						<Link className='nav-link' to='/login'><FlatButton>Sign up / Sign in</FlatButton></Link>
					</div>
				</AppBar>
				<Route exact path='/' component={Homepage} />
				<Route path='/login' component={Login}/>
			</div>
		</MuiThemeProvider>
	</BrowserRouter>
	, document.getElementById('content'));
	console.log("DOM Rendered");
}
