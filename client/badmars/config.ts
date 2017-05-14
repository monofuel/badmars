// monofuel

const t = require('flow-runtime');
import { LogLevelType } from './logger';

interface Config {
	debug: boolean;
	version: number;
	logLevel: LogLevelType;
	cameraSpeed: number;
	orthographic: boolean;
}

const ConfigType = t.object({
	debug: t.boolean(),
	version: t.number(),
	logLevel: t.string(),
	cameraSpeed: t.number(),
	orthographic: t.boolean(),
});

const defaultConfig: Config = {
	debug: true,
	version: 9,
	logLevel: 'debug',
	cameraSpeed: 30,
	orthographic: false,
}

// TODO save config separately
const config: Config = {
	...defaultConfig
};

ConfigType.assert(config);

(window as any).debug.config = config;
export default config;
