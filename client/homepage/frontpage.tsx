import * as React from 'react';
import Registration from './auth/registration'

type Self = {
	uuid: string;
	username: string;
	email: string;
}

type FrontpageProps = {
	self: null | Self;
}

export default class Frontpage extends React.Component<FrontpageProps,{}> {
	render() {
		const { self } = this.props;
		return (
			<div className='pane-content'>
				<div style={{ flexDirection: 'row', display: 'flex' }}>
					<div style={{ flex: 2 }}/> { /* padding to put other stuff into*/}
					{ !self && <Registration/> }
				</div>
			</div>
		);
	}
}