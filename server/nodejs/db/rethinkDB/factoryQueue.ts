import * as r from 'rethinkdb';
import * as DB from '../../db';
import Context from '../../context';

import { createTable } from '../helper';

export default class FactoryQueue implements DB.FactoryQueue {

    conn: r.Connection;
    table: r.Table;

    public async init(ctx: Context, conn: r.Connection, planetName: string): Promise<void> {
        this.conn = conn;
        this.table = r.table(`${planetName}_factoryQueue`);
    }
    public async setupSchema(ctx: Context, conn: r.Connection, planetName: string): Promise<void> {
        this.table = await createTable(conn, `${planetName}_factoryQueue`, 'hash');
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
    peek(ctx: Context, factory: string): Promise<FactoryOrder> {
        throw new Error("Method not implemented.");
    }
    delete(ctx: Context, uuid: string): Promise<void> {
        throw new Error("Method not implemented.");
    }

}