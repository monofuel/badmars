/* @flow */
'use strict';

// monofuel
// 7-22-2016
import React from 'react';
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import {Card, CardActions, CardHeader, CardText} from 'material-ui/Card';
import HotIcon from 'material-ui/svg-icons/social/whatshot';
import ChartIcon from 'material-ui/svg-icons/editor/show-chart'

import TitleBar from './titlebar.jsx';
import ServerErrorList from './serverErrorList.jsx';
import ProfileList from './profileList.jsx';
import {makeRequest} from './apiHandler.js';

var panelStyle = {
	margin: '10px'
}

type Props = {}
type State = {
	serverErrors: Array<Object>,
	reloadInterval: number
}

export default class Layout extends React.Component {
	state: State = {serverErrors: [],reloadInterval: 0};
	props: Props;

	componentDidMount() {
		this._updateErrors();
		let interval = setInterval(() => {
			this._updateErrors();
		},10000);
		this.setState({reloadInterval: interval});
	}
	componentWillUnmount() {
		const {reloadInterval} = this.state;
		clearInterval(reloadInterval);
	}
	render() {
		const {serverErrors} = this.state;



		return (
			<MuiThemeProvider>
				<div style={{display: 'flex', flexDirection: 'column'}}>
					<TitleBar/>
					<Card style={panelStyle}>
						<CardHeader
							avatar={<ChartIcon/>}
							title='Server Profiling'
							actAsExpander={true}
							showExpandableButton={true}
						/>
						<CardText expandable={true}>
							<ProfileList/>
						</CardText>
					</Card>
					<Card style={panelStyle}>
						<CardHeader
							avatar={<HotIcon/>}
							title='Server Errors'
							actAsExpander={true}
							showExpandableButton={true}
						/>
						<CardText expandable={true}>
							<ServerErrorList errorList={serverErrors}/>
						</CardText>
					</Card>

				</div>
			</MuiThemeProvider>
		)
	}

	async _updateErrors() {
		let self = this;
		console.log('fetching server errors');
		const serverErrors = await makeRequest('/serverErrors','GET');
		self.setState({serverErrors});
	}
}
