import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { ApiToken } from '../models/ApiToken';
import { getDatabase } from '../db/database';

export class ApiTokenService {
  private db = getDatabase();

  constructor() {
    this.initializeTable();
  }

  private async initializeTable() {
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS api_tokens (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        organizationId TEXT NOT NULL,
        name TEXT NOT NULL,
        tokenHash TEXT NOT NULL,
        permissions TEXT NOT NULL,
        lastUsedAt TEXT,
        expiresAt TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        isActive INTEGER DEFAULT 1,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create index for faster token lookups
    await this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_api_tokens_hash ON api_tokens(tokenHash);
      CREATE INDEX IF NOT EXISTS idx_api_tokens_user ON api_tokens(userId);
    `);
  }

  async generateToken(
    userId: string,
    organizationId: string,
    name: string,
    permissions: string[] = ['read', 'write', 'execute'],
    expiresInDays?: number
  ): Promise<{ token: ApiToken; plainToken: string }> {
    // Generate a secure random token
    const plainToken = this.generateSecureToken();
    const tokenHash = await bcrypt.hash(plainToken, 10);

    const token: ApiToken = {
      id: uuidv4(),
      userId,
      organizationId,
      name,
      token: `tfs_${plainToken}`, // Prefix for easy identification
      tokenHash,
      permissions,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
    };

    if (expiresInDays) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);
      token.expiresAt = expiresAt;
    }

    // Store in database
    await this.db.run(
      `INSERT INTO api_tokens (
        id, userId, organizationId, name, tokenHash, permissions, 
        expiresAt, createdAt, updatedAt, isActive
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        token.id,
        token.userId,
        token.organizationId,
        token.name,
        token.tokenHash,
        JSON.stringify(token.permissions),
        token.expiresAt?.toISOString() || null,
        token.createdAt.toISOString(),
        token.updatedAt.toISOString(),
        token.isActive ? 1 : 0,
      ]
    );

    return { token, plainToken: token.token };
  }

  async validateToken(plainToken: string): Promise<ApiToken | null> {
    // Remove prefix if present
    const tokenWithoutPrefix = plainToken.replace(/^tfs_/, '');

    const tokens = await this.db.all<any[]>(
      `SELECT * FROM api_tokens WHERE isActive = 1`
    );

    for (const row of tokens) {
      const isValid = await bcrypt.compare(tokenWithoutPrefix, row.tokenHash);
      if (isValid) {
        // Check expiration
        if (row.expiresAt && new Date(row.expiresAt) < new Date()) {
          return null;
        }

        // Update last used
        await this.db.run(
          `UPDATE api_tokens SET lastUsedAt = ? WHERE id = ?`,
          [new Date().toISOString(), row.id]
        );

        return {
          id: row.id,
          userId: row.userId,
          organizationId: row.organizationId,
          name: row.name,
          token: plainToken,
          tokenHash: row.tokenHash,
          permissions: JSON.parse(row.permissions),
          lastUsedAt: row.lastUsedAt ? new Date(row.lastUsedAt) : undefined,
          expiresAt: row.expiresAt ? new Date(row.expiresAt) : undefined,
          createdAt: new Date(row.createdAt),
          updatedAt: new Date(row.updatedAt),
          isActive: row.isActive === 1,
        };
      }
    }

    return null;
  }

  async getUserTokens(userId: string): Promise<ApiToken[]> {
    const rows = await this.db.all<any[]>(
      `SELECT * FROM api_tokens WHERE userId = ? ORDER BY createdAt DESC`,
      [userId]
    );

    return rows.map(row => ({
      id: row.id,
      userId: row.userId,
      organizationId: row.organizationId,
      name: row.name,
      token: '***', // Don't return actual token
      tokenHash: row.tokenHash,
      permissions: JSON.parse(row.permissions),
      lastUsedAt: row.lastUsedAt ? new Date(row.lastUsedAt) : undefined,
      expiresAt: row.expiresAt ? new Date(row.expiresAt) : undefined,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
      isActive: row.isActive === 1,
    }));
  }

  async revokeToken(tokenId: string, userId: string): Promise<boolean> {
    const result = await this.db.run(
      `UPDATE api_tokens SET isActive = 0, updatedAt = ? 
       WHERE id = ? AND userId = ?`,
      [new Date().toISOString(), tokenId, userId]
    );

    return result.changes > 0;
  }

  async deleteToken(tokenId: string, userId: string): Promise<boolean> {
    const result = await this.db.run(
      `DELETE FROM api_tokens WHERE id = ? AND userId = ?`,
      [tokenId, userId]
    );

    return result.changes > 0;
  }

  private generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }
}