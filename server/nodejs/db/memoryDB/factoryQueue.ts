import * as DB from '../';
import Context from '../../context';

export default class FactoryQueue implements DB.FactoryQueue {
	public async init(ctx: Context): Promise<void> {

	}
	create(ctx: Context, order: FactoryOrder): Promise<void> {
		throw new Error("Method not implemented.");
	}
	list(ctx: Context, factory: string): Promise<FactoryOrder[]> {
		throw new Error("Method not implemented.");
	}
	pop(ctx: Context, factory: string): Promise<FactoryOrder> {
		throw new Error("Method not implemented.");
	}
	delete(ctx: Context, uuid: string): Promise<void> {
		throw new Error("Method not implemented.");
	}
}