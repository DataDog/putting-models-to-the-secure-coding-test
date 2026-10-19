import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { query } from '../db/pool.js';

export function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    config.jwtSecret,
    { expiresIn: '24h', algorithm: 'HS256' }
  );
}

export function verifyToken(token) {
  return jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] });
}

export async function authenticate(req, res, next) {
  try {
    let token = null;

    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    } else if (req.session?.userId) {
      const result = await query(
        'SELECT id, email, name, role, bio FROM users WHERE id = $1',
        [req.session.userId]
      );
      if (result.rows.length > 0) {
        req.user = result.rows[0];
        return next();
      }
    }

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const payload = verifyToken(token);
    const result = await query(
      'SELECT id, email, name, role, bio FROM users WHERE id = $1',
      [payload.sub]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = result.rows[0];
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

export function canWriteDocuments(user) {
  return user.role === 'admin' || user.role === 'user';
}

export function canManageUsers(user) {
  return user.role === 'admin';
}
