/* @flow */
'use strict';

// monofuel
// 6-18-2016

import React from 'react';

import {Alert} from 'react-bootstrap';

var errorStyle = {
	top: '100px',
	position: 'absolute',
	left: '10%',
	width: '80%'
}

type Props = {
	errorMessage: ?string;
	onClose: () => void;
}

export default class ErrorAlert extends React.Component {
	props: Props;
	constructor(props: Props) {
		super(props);
	}

	render() {
		const {errorMessage,onClose} = this.props;
		let message = errorMessage ? errorMessage :
			"Looks like there's been an unknown error! Monkeys have been dispatched to fix the issue, but you might want to reload.";

		return (
			<Alert bsStyle="danger" style={errorStyle} onDismiss={onClose}>
				<h4>Oops!</h4>
				<p>{message}</p>
			</Alert>
		);
	}
};
