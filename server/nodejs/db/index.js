/* @flow */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import Rethink from './rethink';

const rethink = new Rethink();

export const init = rethink.init;
export const planets = rethink.planets;
