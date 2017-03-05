/* @flow */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import express from 'express';
import { exec } from 'child_process';

import { WrappedError } from '../../util/logger';
import MonoContext from '../../util/monoContext';

export default function route(ctx: MonoContext, app: express) {
	app.get('/management/pull', (req: express.Request, res: express.Response) => {
		ctx.logger.info(ctx, 'GET /management/pull', {}, { req });
		exec('sh update.sh', (err: Error) => {
			if(err) {
				ctx.logger.trackError(ctx, new WrappedError(err, 'running update script'));
			}
		});
		res.json(JSON.stringify({ success: true }));
	});
}
