
import * as React from 'react';
import * as dat from 'dat-gui';
import { Paper } from 'material-ui';
import config from '../config';
import { forceUIUpdate } from '.';

export default function BMDatGui() {

  const gui = new dat.GUI();
  gui.add(config, 'loadDistance', 1, 20).step(1).listen();
  gui.add(config, 'showLinks').listen();
  gui.add(config, 'shadows').listen();
  gui.add(config, 'antiAlias').listen().onFinishChange(() => gameState.display.updateRenderer());
  gui.add(config, 'pixelRatio', 0.4, 1).listen();
  gui.add(config, 'cameraSpeed', 5, 100).listen();
  return gui;
}
