import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { ApiTokenService } from '../services/ApiTokenService';
import { authenticateToken } from '../middleware/auth';

interface AuthRequest extends Request {
  user?: {
    id: string;
    organizationId: string;
  };
}

export function apiTokenRoutes(apiTokenService: ApiTokenService): Router {
  const router = Router();

  // All routes require authentication
  router.use(authenticateToken);

  // Get all tokens for the current user
  router.get('/', async (req: AuthRequest, res: Response) => {
    try {
      const tokens = await apiTokenService.getUserTokens(req.user!.id);
      res.json(tokens);
    } catch (error) {
      console.error('Error fetching tokens:', error);
      res.status(500).json({ error: 'Failed to fetch tokens' });
    }
  });

  // Generate a new token
  router.post(
    '/',
    [
      body('name').trim().notEmpty().withMessage('Token name is required'),
      body('permissions')
        .optional()
        .isArray()
        .withMessage('Permissions must be an array'),
      body('expiresInDays')
        .optional()
        .isInt({ min: 1, max: 365 })
        .withMessage('Expiration must be between 1 and 365 days'),
    ],
    async (req: AuthRequest, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      try {
        const { name, permissions, expiresInDays } = req.body;
        const { token, plainToken } = await apiTokenService.generateToken(
          req.user!.id,
          req.user!.organizationId,
          name,
          permissions || ['read', 'write', 'execute'],
          expiresInDays
        );

        // Return the token only once, user must save it
        res.json({
          ...token,
          token: plainToken, // Only time we return the actual token
          message: 'Save this token securely. It will not be shown again.',
        });
      } catch (error) {
        console.error('Error generating token:', error);
        res.status(500).json({ error: 'Failed to generate token' });
      }
    }
  );

  // Revoke a token (soft delete)
  router.put('/:tokenId/revoke', async (req: AuthRequest, res: Response) => {
    try {
      const success = await apiTokenService.revokeToken(
        req.params.tokenId,
        req.user!.id
      );

      if (success) {
        res.json({ message: 'Token revoked successfully' });
      } else {
        res.status(404).json({ error: 'Token not found' });
      }
    } catch (error) {
      console.error('Error revoking token:', error);
      res.status(500).json({ error: 'Failed to revoke token' });
    }
  });

  // Delete a token (hard delete)
  router.delete('/:tokenId', async (req: AuthRequest, res: Response) => {
    try {
      const success = await apiTokenService.deleteToken(
        req.params.tokenId,
        req.user!.id
      );

      if (success) {
        res.json({ message: 'Token deleted successfully' });
      } else {
        res.status(404).json({ error: 'Token not found' });
      }
    } catch (error) {
      console.error('Error deleting token:', error);
      res.status(500).json({ error: 'Failed to delete token' });
    }
  });

  return router;
}