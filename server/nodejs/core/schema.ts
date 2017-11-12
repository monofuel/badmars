
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

/*
import Context from '../context';
import { Service } from './';
import RethinkDB from '../db/rethinkdb';

export default class SchemaService implements Service {

	private parentCtx: Context;

	async init(ctx: Context): Promise<void> {
		this.parentCtx = ctx;
	}

	async start(): Promise<void> {
		const ctx = this.parentCtx.create();
		if (!(ctx.db instanceof RethinkDB)) {
			throw new Error('schema service is only for rethinkdb')
		}
		const rethinkDB = ctx.db;
		await rethinkDB.setupSchema();

		process.exit();
	}
	async stop(): Promise<void> {
		this.parentCtx.info('stopping standalone');
		throw new Error('not implemented');
	}
}
*/