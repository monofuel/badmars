// monofuel

const t = require('flow-runtime');
import { LogLevelType } from './logger';

interface Config {
	debug: boolean;
	version: number;
	logLevel: LogLevelType;
}

const ConfigType = t.object({
	debug: t.boolean(),
	version: t.number(),
	logLevel: t.string(),
});

const defaultConfig: Config = {
	debug: true,
	version: 9,
	logLevel: 'debug',
}

// TODO save config separately
const config: Config = {
	...defaultConfig
};

ConfigType.assert(config);

(window as any).config = config;
export default config;
