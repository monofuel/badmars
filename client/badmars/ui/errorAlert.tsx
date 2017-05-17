// monofuel

import * as React from 'react';
import * as PropTypes from 'prop-types';
import {Alert} from 'react-bootstrap';
import State from '../state';

const errorStyle: any = {
	top: '100px',
	position: 'absolute',
	left: '10%',
	width: '80%'
}

type Props = {
	errorMessage: string;
	onClose: () => void;
}

export default class ErrorAlert extends React.Component<Props,{}> {
	public static contextTypes = {
		state: PropTypes.any.isRequired
	};
	context: {
		state: State,
	};

	props: Props;
	constructor(props: Props) {
		super(props);
	}

	render() {
		const {errorMessage,onClose} = this.props;
		let message = errorMessage ? errorMessage :
			'Looks like there\'s been an unknown error! Monkeys have been dispatched to fix the issue, but you might want to reload.';

		return (
			<Alert bsStyle='danger' style={errorStyle} onDismiss={onClose}>
				<h4>Oops!</h4>
				<p>{message}</p>
			</Alert>
		);
	}
};
