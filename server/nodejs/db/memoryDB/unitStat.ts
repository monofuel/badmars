import * as fs from 'fs';
import * as _ from 'lodash';
import * as DB from '../';
import Context from '../../context';
import GameUnitStat from '../../unit/unitStat';
import logger, { DetailedError, WrappedError } from '../../logger';
const parseJson = require('parse-json');

const UNIT_STAT_FILE = 'config/units.json';

export default class UnitStat implements DB.DBUnitStat {

    unitMap: { [key: string]: GameUnitStat } = {};

    public async init(ctx: Context): Promise<void> {
        const statsFile = fs.readFileSync(UNIT_STAT_FILE).toString();
        try {
            // using jsonlint to give readable errors
            const stats = parseJson(statsFile);
            _.map(stats, (unit: Object, type: string) => {
                const unitStat = new GameUnitStat(type, unit);
                try {
                    unitStat.validateSync();
                } catch (err) {
                    throw new WrappedError(err, 'unit failed to validate', { type });
                }
                this.unitMap[type] = unitStat;
            });
        } catch (err) {
            throw new WrappedError(err, 'failed to load unit definitions');
        }
        logger.info(ctx, 'Unit definitions loaded');
    }

    async getAll(ctx: Context): Promise<{ [key: string]: GameUnitStat }> {
        return {
            ...this.unitMap
        }
    }
    async get(ctx: Context, type: string): Promise<GameUnitStat> {
        return this.unitMap[type];
    }
    async patch(ctx: Context, type: string, stats: Partial<GameUnitStat>): Promise<GameUnitStat> {
        throw new Error("Method not implemented.");
    }
}