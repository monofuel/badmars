
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import express from 'express';
import MonoContext from '../../util/monoContext';

export default function route(ctx: MonoContext, app: express) {
	app.get('/_health', (req: express.Request, res: express.Response) => {
		// ctx.logger.info(ctx, 'GET /_health', {}, { req });
		res.send('OK');
	});
}
