import { Request, Response, NextFunction } from 'express';
import { ApiTokenService } from '../services/ApiTokenService';
import { JWTPayload } from '../services/AuthService';

export interface ApiTokenRequest extends Request {
  user?: JWTPayload;
  apiToken?: {
    id: string;
    permissions: string[];
  };
}

export const apiTokenAuth = (apiTokenService: ApiTokenService) => {
  return async (req: ApiTokenRequest, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'API token required' });
      }

      const token = authHeader.substring(7);
      
      // Check if it's an API token (starts with tfs_)
      if (!token.startsWith('tfs_')) {
        // Not an API token, pass to next middleware
        return next();
      }

      const apiToken = await apiTokenService.validateToken(token);
      
      if (!apiToken) {
        return res.status(401).json({ error: 'Invalid or expired API token' });
      }

      // Set user context from API token
      req.user = {
        id: apiToken.userId,
        email: '', // API tokens don't have email
        role: 'api', // Special role for API tokens
        organizationId: apiToken.organizationId,
      };

      req.apiToken = {
        id: apiToken.id,
        permissions: apiToken.permissions,
      };

      next();
    } catch (error) {
      console.error('API token auth error:', error);
      return res.status(401).json({ error: 'Invalid API token' });
    }
  };
};

export const requireApiPermission = (permission: string) => {
  return (req: ApiTokenRequest, res: Response, next: NextFunction) => {
    if (!req.apiToken) {
      return res.status(403).json({ error: 'API token required for this operation' });
    }

    if (!req.apiToken.permissions.includes(permission) && !req.apiToken.permissions.includes('admin')) {
      return res.status(403).json({ error: `Missing required permission: ${permission}` });
    }

    next();
  };
};