
import * as React from 'react';
import * as dat from 'dat-gui';
import { Paper } from 'material-ui';
import config from '../config';

export default function BMDatGui() {

	const gui = new dat.GUI();
	gui.add(config, 'loadDistance', 1, 20).step(1);
}