import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/AuthService';
import { ApiTokenServiceMongo } from '../services/ApiTokenService';
import { authConfig } from '../config/auth';

export interface CombinedAuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    organizationId: string;
  };
  apiToken?: {
    id: string;
    permissions: string[];
  };
  authType?: 'jwt' | 'apiToken';
}

export const combinedAuth = (authService: AuthService, apiTokenService: ApiTokenServiceMongo) => {
  return async (req: CombinedAuthRequest, res: Response, next: NextFunction) => {
    try {
      // Check for Authorization header first
      const authHeader = req.headers.authorization;
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        
        // Check if it's an API token
        if (token.startsWith('tfs_')) {
          const apiToken = await apiTokenService.validateToken(token);
          
          if (!apiToken) {
            return res.status(401).json({ error: 'Invalid or expired API token' });
          }

          req.user = {
            id: apiToken.userId,
            email: 'api-token-user',
            role: 'api',
            organizationId: apiToken.organizationId,
          };

          req.apiToken = {
            id: apiToken.id,
            permissions: apiToken.permissions,
          };

          req.authType = 'apiToken';
          return next();
        }
        
        // Try as JWT token
        try {
          const payload = authService.verifyToken(token);
          req.user = payload;
          req.authType = 'jwt';
          return next();
        } catch (jwtError) {
          // Continue to check cookie
        }
      }

      // Check for JWT in cookie
      const cookieToken = req.cookies?.[authConfig.cookieName];
      if (cookieToken) {
        const payload = authService.verifyToken(cookieToken);
        req.user = payload;
        req.authType = 'jwt';
        return next();
      }

      return res.status(401).json({ error: 'Authentication required' });
    } catch (error) {
      console.error('Auth error:', error);
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  };
};

// Middleware to check if user has permission (works for both JWT and API tokens)
export const requirePermission = (permission: string) => {
  return (req: CombinedAuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // JWT users have all permissions based on their role
    if (req.authType === 'jwt') {
      // Admin and developer roles have all permissions
      if (['admin', 'developer'].includes(req.user.role)) {
        return next();
      }
      
      // Map permissions to roles
      const rolePermissions: Record<string, string[]> = {
        tester: ['read', 'write', 'execute'],
        viewer: ['read'],
      };

      const userPermissions = rolePermissions[req.user.role] || [];
      if (userPermissions.includes(permission)) {
        return next();
      }
    }

    // API token users have specific permissions
    if (req.authType === 'apiToken' && req.apiToken) {
      if (req.apiToken.permissions.includes(permission) || req.apiToken.permissions.includes('admin')) {
        return next();
      }
    }

    return res.status(403).json({ error: `Missing required permission: ${permission}` });
  };
};