import * as r from 'rethinkdb';
import * as DB from '../../db';
import Context from '../../context';

import { createTable, createIndex } from '../helper';

export default class FactoryQueue implements DB.FactoryQueue {

    conn: r.Connection;
    table: r.Table;

    public async init(ctx: Context, conn: r.Connection, planetName: string): Promise<void> {
        this.conn = conn;
        this.table = r.table(`${planetName}_factoryQueue`);
    }
    public async setupSchema(ctx: Context, conn: r.Connection, planetName: string): Promise<void> {
        this.table = await createTable(conn, `${planetName}_factoryQueue`, 'uuid');
        await createIndex(this.conn, this.table, 'factory');
    }

    async create(ctx: Context, order: FactoryOrder): Promise<void> {
        const result = await this.table.insert(order).run(this.conn);
    }
    async list(ctx: Context, factory: string): Promise<FactoryOrder[]> {
        const cursor = await this.table.getAll().run(this.conn);
        return cursor.toArray();
    }
    async pop(ctx: Context, factory: string): Promise<FactoryOrder | null> {
        const cursor = await this.table.filter({ factory }).limit(1).delete({ returnChanges: true }).run(this.conn);
        if (cursor.deleted === 0) {
            return null;
        }
        const list: FactoryOrder[] = (cursor as any).changes;
        return list[0];
    }
    async peek(ctx: Context, factory: string): Promise<FactoryOrder | null> {
        // TODO will probably need a property to sort on
        const cursor = await this.table.filter({ factory }).limit(1).run(this.conn);
        if (!cursor.hasNext()) {
            return null;
        }
        return (await cursor.toArray())[0];
    }
    async delete(ctx: Context, uuid: string): Promise<void> {
        await this.table.get(uuid).delete().run(this.conn);
    }

}
