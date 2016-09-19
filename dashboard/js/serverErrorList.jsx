/* @flow */
'use strict';

// monofuel
// 7-22-2016
import React from 'react';

import ErrorCard from './errorCard.jsx';

type Props = {
	errorList: Array<Object>
}
type State = {}

export default class ServerErrorList extends React.Component {
	state: State;
	props: Props;
	render() {
		const {errorList} = this.props;
		return (
			<div>
				<div>
					{errorList.map((error) => {
						return <ErrorCard key={error.id} error={error}/>
					})}
				</div>
			</div>
		)
	}
}
