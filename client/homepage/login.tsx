import { autobind } from 'core-decorators';
import * as React from 'react';
import Paper from 'material-ui/Paper';
import { Card, CardHeader, CardText } from 'material-ui/Card';
import TextField from 'material-ui/TextField';
import RaisedButton from 'material-ui/RaisedButton';
import CircularProgress from 'material-ui/CircularProgress';
import Signin from './auth/signin';


export default class Login extends React.Component<{},{}> {
	render() {
		return (
			<div className='pane-content'>
				<div style={{ flexDirection: 'row', display: 'flex' }}>
					<div style={{ flex: 2 }}/> { /* padding to put other stuff into*/}
					<Signin/>
				</div>
			</div>
		);
	}
}
