// -----------------------------------
// 	author: Monofuel
// 	website: badmars.net
// 	Licensed under included modified BSD license

import Context from '../context';
import logger from '../logger';
import Client from '../net/client';
import env from '../config/env';

import * as Influx from 'influxdb-nodejs';

type ProfileKey = string;

interface ProfileType {
  name: string;
  key: ProfileKey;
  startTime: number;
  endTime?: number;
  delta?: number;
}

const runningProfiles: {
  [key: string]: ProfileType,
} = {};

let influx: any;

export default async function init(ctx: Context) {
  if (!env.influxServer) {
    logger.info(ctx, 'not using influx');
  } else {
    influx = new Influx(`http://${env.influxServer}/badmars`);
    await influx.createDatabase();
  }
}

export function startProfile(name: string): ProfileKey {
  if (!influx) {
    return 'foobar';
  }

  const key: ProfileKey = name + Math.random();
  runningProfiles[key] = {
    name,
    key,
    startTime: (new Date()).getTime(),
  };

  return key;
}

export function endProfile(key: ProfileKey, visible?: boolean) {
  if (!influx) {
    return;
  }

  const profileRun: ProfileType = runningProfiles[key];
  if (!profileRun) {  // gets cleared when reporting
    return;
  }
  delete runningProfiles[key];
  const name: string = profileRun.name;
  profileRun.endTime = (new Date()).getTime();
  profileRun.delta = profileRun.endTime - profileRun.startTime;
  reportStat(profileRun.name,
    {
      startTime: profileRun.startTime,
      endTime: profileRun.endTime,
      delta: profileRun.delta,
    });
  if (visible) {
    // eslint-disable-next-line no-console
    console.log('profile: ', profileRun.name, '|', profileRun.delta);
  }

  return profileRun;
}

export function reportStat(key: string, value: { [key: string]: string | number | Date }) {
  if (!influx) {
    return;
  }

  Promise.resolve(influx
    .write(key)
    .tag({
      env: env.envType,
    }).field(
      value,
  )).catch((err: Error) => {
    logger.info(null, 'failed to report status', err);
  });
}
