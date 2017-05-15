// monofuel

import * as React from 'react';
import { Button, Modal } from 'react-bootstrap';
import config from '../config';

type Props = {
	onClose: () => void
}
export default function AboutModal({ onClose }: Props) {
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
