// monofuel

import * as React from 'react';
import * as PropTypes from 'prop-types';
import { Button, Modal } from 'react-bootstrap';
import config from '../config';
import State from '../state';

type Props = {
	onClose: () => void
}
export default class AboutModal extends React.Component<Props, {}> {
	public static contextTypes = {
		state: PropTypes.any.isRequired
	};
	context: {
		state: State,
	};

	render() {
		const { onClose } = this.props;
		return (
			<div>
				<Modal show={true} onHide={onClose}>
					<Modal.Header closeButton>
						<Modal.Title>BadMars v{config.version} alpha</Modal.Title>
					</Modal.Header>
					<Modal.Body>
						<h2>BadMars v{config.version}</h2>
						<p>Creator: Monofuel</p>
						<p><a href='https://github.com/monofuel/badMars-JS/'>Github repo</a></p>
					</Modal.Body>
					<Modal.Footer>
						<Button onClick={onClose}>Close</Button>
					</Modal.Footer>
				</Modal>
			</div>
		);
	}
}
