
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import Unit from './unit';
import { DetailedError } from '../util/logger';
import Context from '../util/context';

type Resource = 'iron' | 'fuel';

// returns the amount of resource that could be transfered
export async function sendResource(ctx: Context, type: Resource, amount: number, src: Unit, dest: Unit): Promise<number> {
	if (!src.storage) {
		throw new DetailedError('source unit does not have storage', { uuid: src.uuid, type: src.details.type });
	}

	if (!dest.storage) {
		throw new DetailedError('destination unit does not have storage', { uuid: dest.uuid, type: src.details.type });
	}
	const maxField = type === 'iron' ? 'maxIron' : 'maxFuel';

	if ((dest.storage as any)[type] === dest.storage[maxField]) {
		ctx.logger.info(ctx, 'transfer ignored, already full');
		return 0;
	}

	if ((src.storage as any)[type] < amount) {
		ctx.logger.info(ctx, `transfer ignored, not enough vespene gas. i mean ${type}`);
		amount = (src.storage as any)[type];
		if (amount === 0) {
			return 0;
		}
	}

	const pulled: number = await ctx.db.units[src.location.map].pullResource(ctx, type, amount, src);
	if (pulled === 0) {
		return 0;
	}

	const pushed: number = await ctx.db.units[src.location.map].putResource(ctx, type, pulled, dest);
	if (pushed !== pulled) {
		// TODO attempt to return pulled resources
	}
	return pushed;
}