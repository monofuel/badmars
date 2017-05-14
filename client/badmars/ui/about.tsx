/* @flow */
'use strict';

// monofuel
// 4-2-2016

import {
  version
} from '../client.js';

import React from 'react';
import { Button,Modal } from 'react-bootstrap';

type Props = {
	onClose: () => void
}

export default class AboutModal extends React.Component{
	props: Props;

    render() {
		const {onClose} = this.props;
      return (
        <div>
          <Modal show={true} onHide={onClose}>
            <Modal.Header closeButton>
              <Modal.Title>BadMars v{version} alpha</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <h2>BadMars v{version}</h2>
              <p>Creator: Monofuel</p>
              <p><a href="https://github.com/monofuel/badMars-JS/">Github repo</a></p>
            </Modal.Body>
            <Modal.Footer>
              <Button onClick={onClose}>Close</Button>
            </Modal.Footer>
          </Modal>
        </div>
      );
    }
  };
