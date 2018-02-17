import db from './';
import { setupDB } from '../';
import { prepareCtx } from '../../';
describe('memoryDB', () => {
    it('should start', async () => {
        setupDB(db);
    });
});