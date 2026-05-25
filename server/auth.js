import { randomBytes } from 'node:crypto';

const sessions = new Map();

export function createSession() {
  const token = randomBytes(32).toString('hex');
  sessions.set(token, Date.now() + 1000 * 60 * 60 * 12);
  return token;
}

export function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '');
  const expiresAt = sessions.get(token);

  if (!token || !expiresAt || expiresAt < Date.now()) {
    return res.status(401).json({ error: 'Admin login required.' });
  }

  next();
}
