import { Request, Response, NextFunction } from 'express';
import { AuthService, JWTPayload } from '../services/AuthService';
import { authConfig } from '../config/auth';

export interface AuthRequest extends Request {
  user?: JWTPayload;
}

export const authMiddleware = (authService: AuthService) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      // Check for token in cookie first, then Authorization header
      let token = req.cookies?.[authConfig.cookieName];
      
      if (!token) {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
          token = authHeader.substring(7);
        }
      }

      if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const payload = authService.verifyToken(token);
      req.user = payload;
      next();
    } catch (error) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  };
};

export const requireRole = (allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

export const optionalAuth = (authService: AuthService) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      let token = req.cookies?.[authConfig.cookieName];
      
      if (!token) {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
          token = authHeader.substring(7);
        }
      }

      if (token) {
        const payload = authService.verifyToken(token);
        req.user = payload;
      }
    } catch (error) {
      // Invalid token, continue without user context
    }
    
    next();
  };
};