/* @flow */
'use strict';

// monofuel
// 7-22-2016
import React from 'react';
import AppBar from 'material-ui/AppBar';

import IconMenu from 'material-ui/IconMenu';
import MenuItem from 'material-ui/MenuItem';
import IconButton from 'material-ui/IconButton/IconButton';
import MenuIcon from 'material-ui/svg-icons/navigation/menu';

type Props = {}
type State = {}

export default class TitleBar extends React.Component {
	state: State;
	props: Props;
	render() {
		var menuIcon = (
			<IconMenu
				iconButtonElement={<IconButton><MenuIcon/></IconButton>}
				anchorOrigin={{horizontal: 'left', vertical: 'top'}}
				targetOrigin={{horizontal: 'left', vertical: 'top'}}
			>
				<MenuItem primaryText="Frontend"/>
				<MenuItem primaryText="Backend"/>
			</IconMenu>
		);

		return (
			<div>
				<AppBar
					title="BadMars Dashboard"
					iconElementLeft={menuIcon}
				/>
			</div>
		)
	}
}
