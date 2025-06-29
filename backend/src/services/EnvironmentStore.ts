import { v4 as uuidv4 } from 'uuid';
import { Environment, EnvironmentVariable, IEnvironmentStore } from '../../../shared/src/types';
import { getDatabase } from '../db/database';

export class EnvironmentStore implements IEnvironmentStore {
  async getAllEnvironments(): Promise<Environment[]> {
    const db = await getDatabase();
    const rows = await db.all('SELECT * FROM environments ORDER BY name');
    return rows.map(row => ({
      ...row,
      isDefault: Boolean(row.is_default),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    }));
  }

  async getEnvironment(id: string): Promise<Environment | null> {
    const db = await getDatabase();
    const row = await db.get('SELECT * FROM environments WHERE id = ?', id);
    if (!row) return null;
    
    return {
      ...row,
      isDefault: Boolean(row.is_default),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  async createEnvironment(data: Partial<Environment>): Promise<Environment> {
    const db = await getDatabase();
    const id = uuidv4();
    const now = new Date();
    
    // If this is set as default, unset all other defaults
    if (data.isDefault) {
      await db.run('UPDATE environments SET is_default = FALSE');
    }
    
    await db.run(
      `INSERT INTO environments (id, name, description, is_default, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, data.name, data.description || null, data.isDefault || false, now.toISOString(), now.toISOString()]
    );
    
    return {
      id,
      name: data.name!,
      description: data.description,
      isDefault: data.isDefault || false,
      createdAt: now,
      updatedAt: now
    };
  }

  async updateEnvironment(id: string, data: Partial<Environment>): Promise<Environment | null> {
    const db = await getDatabase();
    const existing = await this.getEnvironment(id);
    if (!existing) return null;
    
    // If this is set as default, unset all other defaults
    if (data.isDefault && !existing.isDefault) {
      await db.run('UPDATE environments SET is_default = FALSE');
    }
    
    const updatedData = {
      name: data.name || existing.name,
      description: data.description !== undefined ? data.description : existing.description,
      isDefault: data.isDefault !== undefined ? data.isDefault : existing.isDefault,
      updatedAt: new Date()
    };
    
    await db.run(
      `UPDATE environments 
       SET name = ?, description = ?, is_default = ?, updated_at = ?
       WHERE id = ?`,
      [updatedData.name, updatedData.description, updatedData.isDefault, updatedData.updatedAt.toISOString(), id]
    );
    
    return {
      ...existing,
      ...updatedData
    };
  }

  async deleteEnvironment(id: string): Promise<boolean> {
    const db = await getDatabase();
    const result = await db.run('DELETE FROM environments WHERE id = ? AND is_default = FALSE', id);
    return (result.changes || 0) > 0;
  }

  // Environment Variables
  async getEnvironmentVariables(environmentId: string): Promise<EnvironmentVariable[]> {
    const db = await getDatabase();
    const rows = await db.all('SELECT * FROM environment_variables WHERE environment_id = ? ORDER BY key', environmentId);
    return rows.map(row => ({
      ...row,
      environmentId: row.environment_id,
      isSecret: Boolean(row.is_secret),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    }));
  }

  async setEnvironmentVariable(environmentId: string, key: string, value: string, isSecret: boolean = false): Promise<EnvironmentVariable> {
    const db = await getDatabase();
    const id = uuidv4();
    const now = new Date();
    
    // Upsert the variable
    await db.run(
      `INSERT INTO environment_variables (id, environment_id, key, value, is_secret, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(environment_id, key) 
       DO UPDATE SET value = ?, is_secret = ?, updated_at = ?`,
      [id, environmentId, key, value, isSecret, now.toISOString(), now.toISOString(), value, isSecret, now.toISOString()]
    );
    
    const row = await db.get(
      'SELECT * FROM environment_variables WHERE environment_id = ? AND key = ?',
      [environmentId, key]
    );
    
    return {
      id: row.id,
      environmentId: row.environment_id,
      key: row.key,
      value: row.value,
      isSecret: Boolean(row.is_secret),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  async deleteEnvironmentVariable(environmentId: string, key: string): Promise<boolean> {
    const db = await getDatabase();
    const result = await db.run(
      'DELETE FROM environment_variables WHERE environment_id = ? AND key = ?',
      [environmentId, key]
    );
    return (result.changes || 0) > 0;
  }
}