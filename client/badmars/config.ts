// monofuel

const t = require('flow-runtime');
import { LogLevelType } from './logger';
import * as _ from 'lodash';
import * as qs from 'qs';
import { PreloadHash } from './preload';

interface Palette {
  uiBackground: string
  uiPrimary: string
  uiSecondary: string
  uiTertiary: string
  fontColor: string
  land: string
  water: string
  cliff: string
}

const paletteType = t.object({
  uiBackground: t.string(),
  uiPrimary: t.string(),
  uiSecondary: t.string(),
  uiTertiary: t.string(),
  fontColor: t.string(),
  land: t.string(),
  water: t.string(),
  cliff: t.string(),
});

/**
 * old colors
 * land: #37DB67
 * cliff: #2C3A4E
 * water: #54958A
 */

/**
 // desert-y
const defaultPalette = {
	uiBackground: '#E4C78A',
	uiForeground: '#CD6333',
	fontColor: '#000000',
	land: '#37DB67',
	water: '#54958A',
	cliff: '#442B21',
}
 */
/*
const defaultPalette = {
  uiBackground: '#FEFEFD',
  uiPrimary: '#ABB2B3',
  uiSecondary: '#617A78',
  uiTertiary: '#D01F09',
  fontColor: '#193233',
  land: '#8DC05C',
  water: '#265349',
  cliff: '#142329',
}


/*
const defaultPalette = {
  uiBackground: 'rgba(0, 26, 5, 0.67)',
  uiPrimary: '#1b3006',
  uiSecondary: '#1b3006',
  uiTertiary: '#D01F09',
  fontColor: '#72b033',
  land: '#8DC05C',
  water: '#265349',
  cliff: '#142329',
}
*/


// snow
const defaultPalette = {
  uiBackground: 'rgba(0, 26, 5, 0.67)',
  uiPrimary: '#1b3006',
  uiSecondary: '#1b3006',
  uiTertiary: '#D01F09',
  fontColor: '#72b033',
  land: '#c6c6c6',
  water: '#53b0e2',
  cliff: '#142329',
}


export interface Config {
  debug: boolean;
  version: number;
  logLevel: LogLevelType;
  cameraSpeed: number;
  orthographic: boolean;
  palette: Palette;
  loadDistance: number;
  frameLimit: number | 'auto';
  showLinks: boolean;
  pixelRatio: number;
  antiAlias: boolean;
  shadows: boolean;
}


const ConfigType = t.object({
  debug: t.boolean(),
  version: t.number(),
  logLevel: t.string(),
  cameraSpeed: t.number(),
  orthographic: t.boolean(),
  palette: paletteType,
  loadDistance: t.number(),
  showLinks: t.boolean(),
});

const defaultConfig: Config = {
  debug: true,
  version: 15,
  logLevel: 'debug',
  cameraSpeed: 30,
  orthographic: false,
  palette: defaultPalette,
  loadDistance: 4,
  frameLimit: 'auto',
  showLinks: true,
  pixelRatio: 1,
  antiAlias: false,
  shadows: false
}

// TODO save config separately
const config: Config = {
  ...defaultConfig,
};

ConfigType.assert(config);

function loadFromHash() {


  // type is not enforced, but this is a dangerous dev feature anyway
  const hashObj: Partial<PreloadHash> = qs.parse(window.location.hash.replace('#', ''));
  console.log('hashObj', hashObj);
  if (!hashObj.config) {
    return;
  }
  console.log('loading config', hashObj.config);
  if (hashObj.config.pixelRatio) {
    // HACK
    hashObj.config.pixelRatio = parseFloat(hashObj.config.pixelRatio as any);
    console.log(hashObj.config);
  }
  if (hashObj.config.debug as any === 'false') {
    hashObj.config.debug = false;
  }
  _.merge(config, hashObj.config);
}


loadFromHash();

(window as any).config = config;
export default config;