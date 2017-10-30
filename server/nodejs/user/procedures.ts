import User from './user';
import Context from '../util/context';
import * as crypto from 'crypto';

export class InvalidAuthError extends Error {
    constructor(msg: string) {
        super(msg);
    }
}

export async function newUser(ctx: Context, name: string, email: string, password: string): Promise<User> {
    const user = new User();
    user.name = name;
    user.email = email;
    const salt = await randomBytes(16);
    const hash = await hashPassword(password, salt);
    user.password = hash;
    return user;
}

export async function loginUser(ctx: Context, name: string, password: string): Promise<User> {
    const { db, logger } = ctx;

    const user = await db.user.getByName(ctx, name);
    const salt = user.password.slice(0, 16);
    const hash = await hashPassword(password, salt);
    if (hash !== user.password) {
        throw new InvalidAuthError('bad credentials');
    }

    return user;
}

async function randomBytes(n: number): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
        crypto.randomBytes(n, (err, buf) => {
            err ? reject(err) : resolve(buf);
        })
    });
}

async function hashPassword(password: string, salt: Buffer): Promise<Buffer> {
    const hash = await new Promise<Buffer>((resolve, reject) => {
        crypto.pbkdf2(password, salt, 100000, 64, 'sha512', (err, key) => {
            err ? reject(err) : resolve(key);
        })
    });

    const saltyHash = new Buffer(hash.length + salt.length);
    salt.copy(saltyHash);
    hash.copy(saltyHash);
    return saltyHash;
}