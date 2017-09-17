import * as React from 'react';
import Registration from './auth/registration'

export default class Homepage extends React.Component<{},{}> {
	render() {
		return (
			<div className='pane-content'>
				<div style={{ flexDirection: 'row', display: 'flex' }}>
					<div style={{ flex: 2 }}/> { /* padding to put other stuff into*/}
					<Registration/>
				</div>
			</div>
		);
	}
}