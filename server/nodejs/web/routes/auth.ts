import * as express from 'express';
import Context from '../../util/context';
import { newUser, loginUser } from '../../user/procedures';
import User from '../../user/user';
import { WrappedError } from '../../util/logger';
const t = require('flow-runtime');

interface RegisterRequest {
    username: string,
    email: string,
    password: string,
}

const RegisterRequestType = t.object({
    username: t.string(),
    email: t.string(),
    password: t.string(),
})

function isRegisterRequest(r: any): r is RegisterRequest {
    return RegisterRequestType.assert(r);
}

interface LoginRequest {
    username: string,
    password: string,
}

const LoginRequestType = t.object({
    username: t.string(),
    password: t.string(),
})

function isLoginRequest(r: any): r is LoginRequest {
    return LoginRequestType.assert(r);
}

export default function route(ctx: Context, app: express.Application) {

    app.post('/auth/register', async (req: express.Request, res: express.Response) => {
        ctx = ctx.create({ name: '/auth/register' });
        const { db, logger } = ctx;
        const registration: RegisterRequest = req.body;
        if (!isRegisterRequest(registration)) {
            res.status(400).send();
            return;
        }
        let user;
        try {
            user = await newUser(ctx, registration.username, registration.email, registration.password);
            await db.user.create(ctx, user);
        } catch (err) {
            logger.trackError(ctx,
                new WrappedError(err, 'failed to register', { name: registration.username, email: registration.email }));
            res.status(500).send();
            return;
        }
        await grantSession(ctx, req, res, user);
    });

    app.post('/auth/login', async (req: express.Request, res: express.Response) => {
        ctx = ctx.create({ name: '/auth/login' });
        const { db, logger } = ctx;
        const login: LoginRequest = req.body;
        if (!isLoginRequest(login)) {
            res.status(400).send();
            return;
        }

        let user;
        try {
            user = await loginUser(ctx, login.username, login.password);
        } catch (err) {
            // TODO handle 400 error cases
            logger.trackError(ctx,
                new WrappedError(err, 'failed to login', { name: login.username }));
            res.status(500).send();
            return;
        }
        await grantSession(ctx, req, res, user);
    });

    app.get('/auth/self', async (req: express.Request, res: express.Response) => {
        ctx = ctx.create({ name: '/auth/self' });
        const { logger } = ctx;
        try {
            const token = req.headers['Authorization'];
            if (typeof token !== 'string') {
                res.status(400).send();
                return;
            }
            const user = await authUser(ctx, token);
            res.status(200).send({
                uuid: user.uuid,
                username: user.name,
                email: user.email,
            });
        } catch (err) {
            // TODO handle 400 error cases
            logger.trackError(ctx,
                new WrappedError(err, 'invalid auth header'));
            res.status(400).send();
            return;
        }
    });
}

async function authUser(ctx: Context, token: string): Promise<User> {
    const { logger, db } = ctx;
    return db.session.getBearerUser(ctx, token);
}


async function grantSession(ctx: Context, req: express.Request, res: express.Response, user: User) {
    const { db, logger } = ctx;
    try {
        const sess = await db.session.createBearer(ctx, user.uuid);
        res.status(200).send({
            sessionToken: sess.token,
        });
    } catch (err) {
        logger.trackError(ctx,
            new WrappedError(err, 'failed to grant session', { uuid: user.uuid }));
        res.status(500).send();
        return;
    }
}