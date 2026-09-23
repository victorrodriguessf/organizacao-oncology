// Copyright © 2026 Victor Rodrigues (@victorrodriguessf). Consulte LICENSE.
import { Router, type Request, type RequestHandler, type CookieOptions } from 'express';
import { randomBytes, randomUUID, scrypt, timingSafeEqual } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { promisify } from 'node:util';
import path from 'node:path';
import { SignJWT, jwtVerify } from 'jose';

const deriveKey = promisify(scrypt);
const COOKIE = 'oncology_session';
const ISSUER = 'organizacao-oncology';
const AUDIENCE = 'oncology-web';
const TTL = 8 * 60 * 60;
interface Credentials { username: string; salt: string; passwordHash: string; jwtSecret: string }

async function credentials(file: string): Promise<Credentials> {
  try { return JSON.parse(await readFile(file, 'utf8')); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  const salt = randomBytes(32).toString('hex');
  const initial: Credentials = { username: 'admin', salt, passwordHash: (await deriveKey('admin', salt, 64) as Buffer).toString('hex'), jwtSecret: randomBytes(64).toString('hex') };
  await mkdir(path.dirname(file), { recursive: true });
  try { await writeFile(file, JSON.stringify(initial, null, 2), { flag: 'wx', mode: 0o600 }); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error; }
  return JSON.parse(await readFile(file, 'utf8'));
}

export async function createAuth(root: string) {
  const account = await credentials(path.join(root, 'data', 'auth.json'));
  const secret = Buffer.from(account.jwtSecret, 'hex');
  if (secret.length < 32 || !/^[a-f0-9]{128}$/.test(account.passwordHash)) throw new Error('Configuração de autenticação inválida.');
  const sessions = new Map<string, number>();
  const attempts = new Map<string, { count: number; until: number }>();
  const router = Router();
  const cookieOptions = (req: Request): CookieOptions => ({ httpOnly: true, sameSite: 'strict', secure: req.secure, path: '/' });
  const readToken = (req: Request) => req.headers.cookie?.split(';').map(s => s.trim()).find(s => s.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
  async function session(req: Request) {
    const token = readToken(req);
    if (!token) throw new Error('Sessão ausente');
    const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'], issuer: ISSUER, audience: AUDIENCE, requiredClaims: ['exp', 'iat', 'jti', 'sub'] });
    if (payload.sub !== account.username || payload.role !== 'admin' || !payload.jti || sessions.get(payload.jti) !== payload.exp || payload.exp! <= Math.floor(Date.now() / 1000)) throw new Error('Sessão inválida');
    return { user: { username: account.username, role: 'admin' }, expiresAt: payload.exp! * 1000, jti: payload.jti };
  }
  const requireAuth: RequestHandler = (req, res, next) => {
    session(req).then(value => { res.locals.session = value; next(); }).catch(() => {
      res.clearCookie(COOKIE, cookieOptions(req));
      res.status(401).json({ error: 'Sua sessão terminou. Entre novamente.' });
    });
  };
  router.use((req, res, next) => {
    if (req.method !== 'POST') { next(); return; }
    const origin = req.get('origin');
    let sameOrigin = true;
    if (origin) { try { sameOrigin = new URL(origin).origin === `${req.protocol}://${req.get('host')}`; } catch { sameOrigin = false; } }
    if (!sameOrigin || req.get('sec-fetch-site') === 'cross-site') { res.status(403).json({ error: 'Origem não permitida.' }); return; }
    if (!req.is('application/json')) { res.status(415).json({ error: 'Envie os dados em JSON.' }); return; }
    next();
  });
  router.post('/login', async (req, res, next) => {
    try {
      const now = Date.now();
      for (const [id, expiry] of sessions) if (expiry * 1000 <= now) sessions.delete(id);
      for (const [ip, entry] of attempts) if (entry.until <= now) attempts.delete(ip);
      const ip = req.ip || 'local';
      const entry = attempts.get(ip) || { count: 0, until: now + 15 * 60 * 1000 };
      if (entry.count >= 30) { res.set('Retry-After', String(Math.ceil((entry.until - now) / 1000))).status(429).json({ error: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' }); return; }
      entry.count++; attempts.set(ip, entry);
      const { username, password } = req.body || {};
      if (typeof username !== 'string' || typeof password !== 'string' || username.length > 100 || password.length > 256) { res.status(400).json({ error: 'Informe seu login e senha.' }); return; }
      const candidate = await deriveKey(password, account.salt, 64) as Buffer;
      if (!timingSafeEqual(candidate, Buffer.from(account.passwordHash, 'hex')) || username !== account.username) { res.status(401).json({ error: 'Login ou senha incorretos.' }); return; }
      const expires = Math.floor(now / 1000) + TTL;
      const jti = randomUUID();
      const token = await new SignJWT({ role: 'admin' }).setProtectedHeader({ alg: 'HS256', typ: 'JWT' }).setSubject(account.username).setIssuer(ISSUER).setAudience(AUDIENCE).setIssuedAt().setExpirationTime(expires).setJti(jti).sign(secret);
      // Replacing a browser session also invalidates its previous token.
      try { sessions.delete((await session(req)).jti); } catch { /* No previous valid session. */ }
      sessions.set(jti, expires); attempts.delete(ip);
      res.cookie(COOKIE, token, { ...cookieOptions(req), maxAge: TTL * 1000 });
      res.json({ user: { username: account.username, role: 'admin' }, expiresAt: expires * 1000 });
    } catch (error) { next(error); }
  });
  router.get('/me', requireAuth, (_req, res) => {
    const { user, expiresAt } = res.locals.session;
    res.json({ user, expiresAt });
  });
  router.post('/logout', async (req, res) => {
    try { sessions.delete((await session(req)).jti); } catch { /* Logout is idempotent. */ }
    res.clearCookie(COOKIE, cookieOptions(req));
    res.status(204).end();
  });
  return { router, requireAuth };
}
