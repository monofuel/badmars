// monofuel

import { autobind } from 'core-decorators';
import * as React from 'react';
import * as PropTypes from 'prop-types';
import config from '../config';
import State, { GameFocusChange } from '../state';
import Dialog from 'material-ui/Dialog';

type Props = {
	onClose: () => void
}
export default class AboutModal extends React.Component<Props, {}> {

	render() {
		const { onClose } = this.props;
		return (
			<div onClick={this.setHUDFocus}>
				<Dialog
					title={`BadMars v${config.version} alpha`}
					modal={false}
					open={true}
					onRequestClose={onClose}>
					<p>
						<p>Creator: Monofuel</p>
						<p><a href='https://github.com/monofuel/badmars/'>Github repo</a></p>
					</p>
				</Dialog>
			</div>
		);
	}

	@autobind
	private setHUDFocus(e: React.MouseEvent<HTMLDivElement>) {
		GameFocusChange.post({ focus: 'hud', prev: state.focused });
		e.stopPropagation();
	}
}
