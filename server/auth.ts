import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Strict fallback strategy to keep the app highly resilient and secure
export const JWT_SECRET = process.env.JWT_SECRET || 'nimbus_pos_secret_token_signature_key_2026';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    username: string;
    role: 'admin' | 'customer';
  };
}

/**
 * Signs a payload to compile a new JWT for the admin
 */
export function signToken(payload: { id: string; username: string; role: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });
}

/**
 * Midleware enforcing valid Admin JWT Authentication
 */
export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization header is missing or malformed (Bearer token required).' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied: Resource requires administrator rights.' });
    }
    req.user = decoded;
    next();
  } catch (err: any) {
    return res.status(401).json({ error: 'Invalid or expired administrative token.' });
  }
}
