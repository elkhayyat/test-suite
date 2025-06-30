import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { ApiToken } from '../models/ApiToken';
import { Db, Collection } from 'mongodb';

export class ApiTokenServiceMongo {
  private collection: Collection<any>;

  constructor(private db: Db) {
    this.collection = this.db.collection('api_tokens');
    this.initializeCollection();
  }

  private async initializeCollection() {
    // Create indexes for faster lookups
    await this.collection.createIndex({ tokenHash: 1 });
    await this.collection.createIndex({ userId: 1 });
    await this.collection.createIndex({ organizationId: 1 });
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
    await this.collection.insertOne({
      _id: token.id,
      ...token
    });

    return { token, plainToken: token.token };
  }

  async validateToken(plainToken: string): Promise<ApiToken | null> {
    // Remove prefix if present
    const tokenWithoutPrefix = plainToken.replace(/^tfs_/, '');

    const tokens = await this.collection.find({ isActive: true }).toArray();

    for (const doc of tokens) {
      const isValid = await bcrypt.compare(tokenWithoutPrefix, doc.tokenHash);
      if (isValid) {
        // Check expiration
        if (doc.expiresAt && new Date(doc.expiresAt) < new Date()) {
          return null;
        }

        // Update last used
        await this.collection.updateOne(
          { _id: doc._id },
          { $set: { lastUsedAt: new Date() } }
        );

        return {
          id: doc._id,
          userId: doc.userId,
          organizationId: doc.organizationId,
          name: doc.name,
          token: plainToken,
          tokenHash: doc.tokenHash,
          permissions: doc.permissions,
          lastUsedAt: doc.lastUsedAt,
          expiresAt: doc.expiresAt,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
          isActive: doc.isActive,
        };
      }
    }

    return null;
  }

  async getUserTokens(userId: string): Promise<ApiToken[]> {
    const docs = await this.collection
      .find({ userId })
      .sort({ createdAt: -1 })
      .toArray();

    return docs.map(doc => ({
      id: doc._id,
      userId: doc.userId,
      organizationId: doc.organizationId,
      name: doc.name,
      token: '***', // Don't return actual token
      tokenHash: doc.tokenHash,
      permissions: doc.permissions,
      lastUsedAt: doc.lastUsedAt,
      expiresAt: doc.expiresAt,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      isActive: doc.isActive,
    }));
  }

  async revokeToken(tokenId: string, userId: string): Promise<boolean> {
    const result = await this.collection.updateOne(
      { _id: tokenId, userId },
      { 
        $set: { 
          isActive: false, 
          updatedAt: new Date() 
        } 
      }
    );

    return result.modifiedCount > 0;
  }

  async deleteToken(tokenId: string, userId: string): Promise<boolean> {
    const result = await this.collection.deleteOne({
      _id: tokenId,
      userId
    });

    return result.deletedCount > 0;
  }

  private generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }
}