export interface ApiToken {
  id: string;
  userId: string;
  organizationId: string;
  name: string;
  token: string;
  tokenHash: string; // Store hashed version for security
  permissions: string[]; // ['read', 'write', 'execute', 'admin']
  lastUsedAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}