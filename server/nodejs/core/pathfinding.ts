
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import AStarPath from '../nav/astarpath';
import SimplePath from '../nav/simplepath';
import DIRECTION from '../map/directions';
import Context from '../context';
import { WrappedError } from '../logger';
import { clearDestination, setPath, setUnitDestination } from '../unit/unit';

import logger from '../logger';
import db from '../db';
import PlanetLoc from '../map/planetloc';
import { Service } from './';
import sleep from '../util/sleep';

type TileHash = string;
const registeredMaps: any = [];

let inProcess = false;

export default class PathfindService implements Service {
	private parentCtx: Context;
	async init(ctx: Context): Promise<void> {
		this.parentCtx = ctx;
	}

	async start(): Promise<void> {
		const ctx = this.parentCtx.create();
		setInterval((): Promise<void> => this.registerListeners(ctx), 1000);

		await this.registerListeners(ctx);

		const maps: Array<string> = await db.listPlanetNames(ctx);

		// TODO check for units that need to be processed
	}

	async registerListeners(ctx: Context): Promise<void> {
		const names: string[] = await db.listPlanetNames(ctx);
		for (const name of names) {
			if (registeredMaps.indexOf(name) === -1) {
				ctx = ctx.create();
				registeredMaps.push(name);
				const planetDB = await db.getPlanetDB(ctx, name);
				planetDB.unit.watchPathing(ctx, this.pathfind);
			}
		}
	}

	private async pathfind(ctx: Context, unit: Unit, oldUnit?: Unit): Promise<void> {
		logger.info(ctx, 'processing path', { uuid: unit.uuid });


		if (!unit.movable || !unit.movable.destination) {
			return;
		}

		if (unit.movable.layer !== 'ground') {
			return;
		}
		const planetDB = await db.getPlanetDB(ctx, unit.location.map);
		const map = planetDB.planet;
		const start = await map.getLoc(ctx, unit.location.x, unit.location.y);

		if (!unit.movable || !unit.movable.destination) {
			return;
		}
		const destination: TileHash = unit.movable.destination;
		const destinationX = parseInt(destination.split(':')[0]);
		const destinationY = parseInt(destination.split(':')[1]);
		const dest: PlanetLoc = await map.getLoc(ctx, destinationX, destinationY);

		//if the destination is covered, get the nearest valid point.
		const end: PlanetLoc = await map.getNearestFreeTile(ctx, dest, unit, false);
		if (!end) {
			throw new Error('no nearby free tile?');
		}
		if (start.equals(end)) {

			await clearDestination(ctx, unit);
			return;
		}

		// HACK should probably use a token bucket or something
		while (inProcess) {
			await sleep(1000);
		}
		inProcess = true;
		const pathfinder = new AStarPath(start, end, unit);
		//const pathfinder = new SimplePath(start, end, unit);
		if (pathfinder.generate) {
			try {
				await pathfinder.generate(ctx);
			} catch (err) {
				inProcess = false;
				throw new WrappedError(err, 'generating path');
			}
		}
		const path = [];

		let nextTile = start;
		do {
			const dir = await pathfinder.getNext(ctx, nextTile);
			//console.log('dir:' + DIRECTION.getTypeName(dir));
			nextTile = await nextTile.getDirTile(ctx, dir);
			path.push(DIRECTION.getTypeName(dir));
			if (dir === DIRECTION.C || nextTile.equals(end)) {
				break;
			}
		} while (true);

		await setPath(ctx, unit, path);
		inProcess = false;
		// await setUnitDestination(ctx, unit, end.x, end.y);
	}

	async stop(): Promise<void> {
		this.parentCtx.info('stopping standalone');
		// TODO stop watching for paths
	}

}