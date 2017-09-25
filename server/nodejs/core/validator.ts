
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import Context from '../util/context';

import Logger from '../util/logger';
import DB from '../db/db';
import Unit from '../unit/unit';
import Chunk from '../map/chunk';


let maps = [];

export default class ValidatorService {
	db: DB;
	logger: Logger;
	constructor(db: DB, logger: Logger) {
		this.db = db;
		this.logger = logger;
	}

	makeCtx(timeout?: number): Context {
		return new Context({ timeout }, this.db, this.logger);
	}	

	async init(): Promise<void> {
		const ctx = this.makeCtx();
		if(process.argv.length > 2) {
			maps = process.argv.slice(2, process.argv.length);
		} else {
			maps = await ctx.db.map.listNames();
		}

		for(const mapName of maps) {
			const map = await ctx.db.map.getMap(ctx, mapName);
			if(!map) {
				ctx.logger.info(ctx, 'no such map', { mapName });
				process.exit(-1);
			}
			await this.validateUnits(ctx, mapName);
			await this.validateChunks(ctx, mapName);
			//TODO validate maps
		}

		process.exit();
	}

	async validateUnits(ctx: Context, mapName: string): Promise<void> {
		let counter = 0;
		//TODO should rename listUnits to just list (and friends)``
		const promises: any = [];
		await ctx.db.units[mapName].each(ctx, (unit: Unit) => {
			counter++;
			promises.push(unit.validate(ctx));
		});
		Promise.all(promises);
		ctx.logger.info(ctx, 'units validated: ', { counter });
	}

	async validateChunks(ctx: Context, mapName: string): Promise<void> {
		let counter = 0;
		const promises: any = [];
		await ctx.db.chunks[mapName].each((chunk: Chunk) => {
			counter++;
			promises.push(chunk.validate(ctx));
		});
		Promise.all(promises);
		ctx.logger.info(ctx, 'chunks validated: ', { counter });
	}


/*async function checkUnitLocations(mapName: string) {
	const unitList = await db.units[mapName].listUnits();
	const tileMap = {};
	for(const unit of unitList) {
		if(!unit.tileHash) {
			throw new Error('unit missing tile: ' + unit.uuid);
		}
		if(unit.type === 'iron' || unit.type === 'oil') {
			continue;
		}
		for(const tileHash of unit.tileHash) {
			if(tileMap[tileHash]) {
				throw new Error('conflicting tile location:' + tileHash);
			}
			tileMap[tileHash] = unit.uuid;
		}
	}
	const chunkTileMap = {};
	const chunks = await db.chunks[mapName].listChunks();
	for(const chunk of chunks) {
		_.each(chunk.units, (uuid, tileHash) => {
			if(chunkTileMap[tileHash]) {
				console.log('chunk', chunk.hash);
				throw new Error('conflicting chunk tile location:' + tileHash);
			}
			chunkTileMap[tileHash] = uuid;
		});
	}
	/*
	const chunkTileUuids = _.map(chunkTileMap);
	const unitTileUuids = _.map(tileMap);
	if (chunkTileUuids.length != unitTileUuids.length) {
	  console.log(_.union(_.difference(unitTileUuids,chunkTileUuids)));
	  throw new Error('chunk unit lists are missing units');
	}*/

//}
}