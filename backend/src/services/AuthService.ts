import jwt, { SignOptions } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User } from '../../../shared/src/types';
import { authConfig } from '../config/auth';

export interface JWTPayload {
  userId: string;
  email: string;
  organizationId: string;
  role: string;
}

export class AuthService {
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, authConfig.bcryptRounds);
  }

  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  generateToken(user: User): string {
    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
      organizationId: user.organizationId || 'default',
      role: user.role,
    };

    return jwt.sign(payload, authConfig.jwtSecret, {
      expiresIn: authConfig.jwtExpiresIn,
    } as SignOptions);
  }

  verifyToken(token: string): JWTPayload {
    return jwt.verify(token, authConfig.jwtSecret) as JWTPayload;
  }

  generateInvitationToken(email: string, organizationId: string, teamId: string, role: string): string {
    const payload = {
      email,
      organizationId,
      teamId,
      role,
      type: 'invitation',
    };

    return jwt.sign(payload, authConfig.jwtSecret, {
      expiresIn: authConfig.invitationExpiresIn,
    } as SignOptions);
  }

  verifyInvitationToken(token: string): any {
    const payload = jwt.verify(token, authConfig.jwtSecret) as any;
    if (payload.type !== 'invitation') {
      throw new Error('Invalid invitation token');
    }
    return payload;
  }
}