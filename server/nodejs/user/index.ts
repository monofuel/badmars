import Context from '../context';
import * as crypto from 'crypto';
import db from '../db';
import * as uuidv4 from 'uuid/v4';

export default interface User {
	uuid: string;
	name: string;
	email: string;
	passwordHash: Buffer; // pbkdf2 byte array

	location?: TileHash; // TODO should be unique for each planet
}

export class InvalidAuthError extends Error {
	constructor(msg: string) {
		super(msg);
	}
}

export async function newUser(ctx: Context, name: string, email: string, password: string): Promise<User> {
	const salt = await randomBytes(16);
	const passwordHash = await hashPassword(password, salt);
	return {
		uuid: uuidv4(),
		name,
		email,
		passwordHash
	}
}

export async function loginUser(ctx: Context, name: string, password: string): Promise<User> {
	const user = await db.user.getByName(ctx, name);
	if (!user) {
		throw new InvalidAuthError('missing user');
	}
	const salt = user.passwordHash.slice(0, 16);
	const hash = await hashPassword(password, salt);
	if (hash !== user.passwordHash) {
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