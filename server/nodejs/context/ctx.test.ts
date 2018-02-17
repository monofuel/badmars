import Context from './';
import delay from '../util/sleep';
import { assert } from 'chai';

describe('ctx', () => {
	it('should timeout', async () => {
		const parentCtx = new Context();
		const ctx = parentCtx.create({ timeout: 10 });
		assert(ctx.canceled === false);
		assert(ctx.deadlineExceeded === false);
		await delay(20);
		assert(ctx.canceled === true);
		assert(ctx.deadlineExceeded === true);
		try {
			ctx.check('test timeout');
			assert(false, 'context should have expired');
		} catch (err) {
			assert(err.message.startsWith('context deadline exceeded'), 'error should state it is for the deadline');
		}
	});
});