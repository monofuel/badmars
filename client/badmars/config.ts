// monofuel

const t = require('flow-runtime');
import { LogLevelType } from './logger';

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
*/

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

interface Config {
	debug: boolean;
	version: number;
	logLevel: LogLevelType;
	cameraSpeed: number;
	orthographic: boolean;
	palette: Palette;
	loadDistance: number;
}


const ConfigType = t.object({
	debug: t.boolean(),
	version: t.number(),
	logLevel: t.string(),
	cameraSpeed: t.number(),
	orthographic: t.boolean(),
	palette: paletteType,
	loadDistance: t.number(),
});

const defaultConfig: Config = {
	debug: true,
	version: 13,
	logLevel: 'debug',
	cameraSpeed: 30,
	orthographic: false,
	palette: defaultPalette,
	loadDistance: 3,
}

// TODO save config separately
const config: Config = {
	...defaultConfig,
};

ConfigType.assert(config);

(window as any).config = config;
export default config;