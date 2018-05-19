import * as express from 'express';
import Context from '../../context';
import User, { newUser, loginUser, InvalidAuthError } from '../../user';
import logger, { WrappedError } from '../../logger';
import db from '../../db';
import * as uuidv4 from 'uuid/v4';
const t = require('flow-runtime');

interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

const RegisterRequestType = t.object({
  username: t.string(),
  email: t.string(),
  password: t.string(),
});

function isRegisterRequest(r: any): r is RegisterRequest {
  return RegisterRequestType.accepts(r);
}

interface LoginRequest {
  username: string;
  password: string;
}

const LoginRequestType = t.object({
  username: t.string(),
  password: t.string(),
});

function isLoginRequest(r: any): r is LoginRequest {
  return LoginRequestType.accepts(r);
}

export default function route(ctx: Context, app: express.Application) {
  app.post('/auth/register', async (req: express.Request, res: express.Response) => {
    ctx = ctx.create({ name: '/auth/register' });
    const registration: RegisterRequest = req.body;
    if (!isRegisterRequest(registration)) {
      res.status(400).send({ msg: 'invalid request' });
      return;
    }
    let user;
    try {
      if (await db.user.getByName(ctx, registration.username)) {
        res.status(400).send({ msg: 'username already in use' });
        return;
      }
      user = await newUser(
        ctx, registration.username, registration.email,
        registration.password);
      await db.user.create(ctx, user);
    } catch (err) {
      logger.trackError(ctx, new WrappedError(err, 'failed to register', {
        name: registration.username,
        email: registration.email,
      }));
      res.status(500).send();
      return;
    }
    await grantSession(ctx, req, res, user);
  });

  app.post('/auth/login', async (req: express.Request, res: express.Response) => {
    ctx = ctx.create({ name: '/auth/login' });
    const login: LoginRequest = req.body;
    if (!isLoginRequest(login)) {
      res.status(400).send();
      return;
    }

    let user;
    try {
      user = await loginUser(ctx, login.username, login.password);
    } catch (err) {
      if (err instanceof InvalidAuthError) {
        res.status(400).send({ msg: err.message });
        return;
      } else {
        // TODO handle 400 error cases
        logger.trackError(
          ctx, new WrappedError(err, 'failed to login', { name: login.username }));
        res.status(500).send();
        return;
      }
    }
    await grantSession(ctx, req, res, user);
  });

  app.get('/auth/self', async (req: express.Request, res: express.Response) => {
    ctx = ctx.create({ name: '/auth/self' });
    try {
      const authHeader = req.headers.authorization;
      /*
      if (typeof authHeader === 'object') {
        authHeader = authHeader[0];
      }
      */
      if (!authHeader) {
        res.status(400).send();
        return;
      }
      const authSplit = authHeader.split(' ');
      if (authSplit.length < 2 || authSplit[0] !== 'Bearer') {
        res.status(400).send();
        return;
      }
      const user = await authUser(ctx, authSplit[1]);
      if (!user) {
        res.status(400).send();
        return;
      }
      res.status(200).send({
        uuid: user.uuid,
        username: user.username,
        email: user.email,
      });
    } catch (err) {
      // TODO handle 400 error cases
      logger.trackError(ctx, new WrappedError(err, 'invalid auth header'));
      res.status(400).send();
      return;
    }
  });
}

async function authUser(ctx: Context, token: string): Promise<User | null> {
  const useruuid = await db.session.getBearerUser(ctx, token);
  if (!useruuid) {
    return null;
  }
  return db.user.get(ctx, useruuid);
}

async function grantSession(ctx: Context, req: express.Request, res: express.Response, user: User) {
  try {
    const sess = await db.session.createBearer(ctx, user.uuid, uuidv4());
    res.status(200).send({
      sessionToken: sess.token,
    });
  } catch (err) {
    logger.trackError(ctx, new WrappedError(err, 'failed to grant session', { uuid: user.uuid }));
    res.status(500).send();
    return;
  }
}
