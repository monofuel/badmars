
// -----------------------------------
// 	author: Monofuel
// 	website: badmars.net
// 	Licensed under included modified BSD license

import * as WebSocket from 'ws';
import * as _ from 'lodash';
import * as http from 'http';

import logger, { DetailedError, WrappedError } from '../logger';
import { sanitizeUnit, sanitizeUser } from '../util/socketFilter';
import Context from '../context';
import db from '../db';
import User from '../user';
import Map from '../map/map';
import { GameEvent, ChatEvent } from '../db';
import * as jsonpatch from 'fast-json-patch';

import auth from './handler/auth';
import { getUnitLocs, isUnitVisible } from '../unit/unit';

const KEEP_ALIVE = 5000;

type NetHandler = (ctx: Context, client: Client, data: object) => Promise<void>;
type ChunkHash = string;
interface HandlerMapType {
  [key: string]: NetHandler;
}

export default class Client {
  public ws: WebSocket;
  public auth: boolean;
  public handlers: HandlerMapType;
  public keepAlive: NodeJS.Timer;
  public map: Map;
  public unitStatWatcher: any;
  public planet: Map;
  public user: User;
  public ctx: Context;
  public loadedChunks: ChunkHash[];
  public visibleUnits: { [uuid: string]: Unit };

  constructor(ctx: Context, ws: WebSocket, req: http.IncomingMessage) {
    this.ws = ws;
    this.auth = false;
    this.handlers = {};
    this.ctx = ctx;
    this.user = (req as any).user;
    this.loadedChunks = [];
    this.visibleUnits = {};
    this.handlers.login = auth;

    logger.info(ctx, 'client connected');

    ws.on('message', async (msg: string): Promise<void> => {
      try {
        await this.handleFromClient(ctx.create(), msg);
      } catch (err) {
        logger.trackError(
          ctx,
          new WrappedError(err, 'failed to handle network message', { msg }));
      }
    });
    ws.on('error', (err: Error) => {
      logger.trackError(ctx, new WrappedError(err, 'websocket error'));
    });

    ws.on('close', () => { this.handleLogOut(); });

    await this.send('connected');

    this.keepAlive = setInterval(() => {
      try {
        this.ws.ping();
      } catch (err) {
        clearInterval(this.keepAlive);
      }
    }, KEEP_ALIVE);
  }

  public async send(type: string, data?: any) {
    if (!this.ws) {
      // logger.errorWithInfo('sending data on closed websocket', { type, data
      // });
      return;
    }
    data = data || {};
    data.type = type;
    data.success = true;
    try {
      // console.log('sending ', type);
      await this.ws.send(JSON.stringify(data));
    } catch (err) {
      this.handleLogOut();
    }
  }

  public sendError(ctx: Context, type: string, errMsg: string) {
    logger.info(ctx, 'client error', { errMsg, type });
    try {
      this.ws.send(
        JSON.stringify({ type, success: false, reason: errMsg }));
    } catch (err) {
      this.handleLogOut();
    }
  }

  public handleLogOut() {
    logger.info(this.ctx, 'client closed connection');
    if (this.user) {
      logger.info(this.ctx, 'logout', { player: this.user.username });
    }
    if (this.unitStatWatcher) {
      this.unitStatWatcher.close();
    }
    clearInterval(this.keepAlive);
    this.ws = null;
  }

  public async handleFromClient(ctx: Context, dataText: string): Promise<void> {
    // console.log('received' + data);
    const data: any = JSON.parse(dataText);
    if (!data.type || !this.handlers[data.type]) {
      this.sendError(ctx, 'invalid', 'invalid request');
      return;
    }
    if (typeof this.handlers[data.type] !== 'function') {
      throw new DetailedError(
        'bad handler',
        { handle: data.type, type: typeof this.handlers[data.type] });
    }
    await this.handlers[data.type](ctx, this, data);
  }

  public async registerUnitListener(): Promise<void> {
    const planetDB = await db.getPlanetDB(this.ctx, this.map.name);
    await planetDB.unit.watch(
      this.ctx,
      async (ctx: Context, { next: unit, prev: oldUnit }): Promise<void> => {
        await this.handleUnitUpdate(ctx, unit, oldUnit);
      });
  }

  public async registerUserListener(): Promise<void> {
    await db.user.watch(
      this.ctx, async (ctx: Context, { next }): Promise<void> => {
        await this.handleUserUpdate(ctx, next);
      });
  }

  public async registerEventHandler(): Promise<void> {
    await db.event.watch(
      this.ctx, async (ctx: Context, e: GameEvent): Promise<void> => {
        if (e.type === 'chat') {
          await this.handleChat(ctx, e);
        } else {
          await this.handleEvents(ctx, e);
        }
      });
  }

  public async handleUnitUpdate(ctx: Context, unit: Unit, oldUnit?: Unit): Promise<void> {
    // unit death (TODO)
    if (!unit) {
      return;
    }

    // check if unit is on a chunk the player sees
    if (_.intersection(unit.location.chunkHash, this.loadedChunks).length === 0) {
      return;
    }

    // if our unit has moved, we should update the visibility of units around it
    if (!unit || !oldUnit ||
      unit.location.hash !== oldUnit.location.hash &&
      unit.details.owner === this.user.uuid) {
      await this.updateUnitVisiblity(ctx, unit);
    }

    unit.visible = true;
    let prevVisible: boolean;
    let nextVisible: boolean;
    if (oldUnit) {
      // this does not work when another unit is moving.
      prevVisible = await isUnitVisible(ctx, oldUnit, this.user);
      nextVisible = await isUnitVisible(ctx, unit, this.user);
      if (prevVisible && !nextVisible) {
        // tell the client that the unit is moving, and will no longer be
        // visible
        unit.visible = false;
      } else if (!nextVisible) {  // else if the unit is not going to be visible
        return;
      }
    } else {
      // if the unit is new, don't send it if it is not visible
      if (!await isUnitVisible(ctx, unit, this.user)) {
        return;
      }
    }
    if (nextVisible) {
      this.visibleUnits[unit.uuid] = unit;
    }

    // prepare the unit to be sent to the client
    const sanitizedNewUnit = sanitizeUnit(unit, this.user.uuid);

    await this.send('units', { units: [sanitizedNewUnit] });
  }

  // find units in visibleUnits that need to be updated for the user
  public async updateUnitVisiblity(ctx: Context, movedUnit: Unit) {
    for (const unit of Object.values(this.visibleUnits)) {
      if (!await isUnitVisible(ctx, unit, this.user)) {
        delete this.visibleUnits[unit.uuid];
        const next = {
          ...unit,
          visible: false,
        };

        await this.send('units', { units: [next] });
      }
    }
    const nearby = await this.map.getNearbyUnitsFromChunk(
      ctx, `${movedUnit.location.chunkX}:${movedUnit.location.chunkY}`,
      ctx.env.maxVision / this.map.settings.chunkSize);

    // find nearby units that are not visible
    const filtered =
      _.filter(nearby, (nearbyUnit) => !this.visibleUnits[nearbyUnit.uuid]);

    // make sure that they are still not visible
    const nowVisible: Unit[] = [];
    for (const unit of filtered) {
      const deltaX = Math.abs(movedUnit.location.x - unit.location.x);
      const deltaY = Math.abs(movedUnit.location.y - unit.location.y);
      const distance = Math.sqrt((deltaX * deltaX) + (deltaY * deltaY));
      if (distance < movedUnit.details.vision) {
        nowVisible.push(unit);
        this.visibleUnits[unit.uuid] = unit;
      }
    }
    await this.send(
      'units',
      { units: nowVisible.map((unit) => sanitizeUnit(unit, this.user.uuid)) });
  }

  public async handleUserUpdate(ctx: Context, user: User) {
    const newUser = sanitizeUser(user);
    await this.send('players', { players: [newUser] });
  }

  public async handleEvents(ctx: Context, gameEvent: any) {
    if (gameEvent.name !== 'server_gameEvent') {
      return;
    }

    switch (gameEvent.type) {
      case 'attack':
        if (!gameEvent.enemyId) {
          logger.trackError(
            ctx,
            new DetailedError(
              'invalid event', { id: gameEvent.id, type: gameEvent.type }));
        }
        if (!gameEvent.unitId) {
          logger.trackError(
            ctx,
            new DetailedError(
              'invalid event', { id: gameEvent.id, type: gameEvent.type }));
        }
        await this.send(
          'attack', { enemyId: gameEvent.enemyId, unitId: gameEvent.unitId });
        break;
      case 'kill':
        if (!gameEvent.unitId) {
          logger.trackError(
            ctx,
            new DetailedError(
              'invalid event', { id: gameEvent.id, type: gameEvent.type }));
        }
        await this.send('attack', { unitId: gameEvent.unitId });
        break;
      default:
        logger.trackError(
          ctx,
          new DetailedError(
            'invalid event', { id: gameEvent.id, type: gameEvent.type }));
    }
  }

  public async handleChat(ctx: Context, e: ChatEvent): Promise<void> {
    // TODO filtering based on channel and planet
    await this.send('chat', e);
  }
}
