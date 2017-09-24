
'use strict';

// monofuel
// 7-22-2016
import React from 'react';
import {Card, CardActions, CardHeader, CardText} from 'material-ui/Card';


type Props = {
	error: Object
}
type State = {}

export default class ErrorCard extends React.Component {
	state: State;
	props: Props;
	render() {
		const {error} = this.props;
		let errorTime = new Date(error.timestamp).toString();

		//error.Message

		return (
			<Card>
				<CardHeader
					title={error.message}
					subtitle={(error.timestamp ? errorTime + ' | ' : '') + error.env + ' | ' + error.module + ' | ' + error.hostname}
					actAsExpander={true}
					showExpandableButton={true}
				/>
				<CardText expandable={true}>
					{error.Stack}
				</CardText>
			</Card>
		)
	}
}
