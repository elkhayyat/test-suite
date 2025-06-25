"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnvironmentStore = void 0;
const uuid_1 = require("uuid");
const database_1 = require("../db/database");
class EnvironmentStore {
    async getEnvironments() {
        const db = await (0, database_1.getDatabase)();
        const rows = await db.all('SELECT * FROM environments ORDER BY name');
        return rows.map(row => ({
            ...row,
            isDefault: Boolean(row.is_default),
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at)
        }));
    }
    async getEnvironment(id) {
        const db = await (0, database_1.getDatabase)();
        const row = await db.get('SELECT * FROM environments WHERE id = ?', id);
        if (!row)
            return null;
        return {
            ...row,
            isDefault: Boolean(row.is_default),
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at)
        };
    }
    async createEnvironment(data) {
        const db = await (0, database_1.getDatabase)();
        const id = (0, uuid_1.v4)();
        const now = new Date();
        // If this is set as default, unset all other defaults
        if (data.isDefault) {
            await db.run('UPDATE environments SET is_default = FALSE');
        }
        await db.run(`INSERT INTO environments (id, name, description, is_default, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?)`, [id, data.name, data.description || null, data.isDefault || false, now.toISOString(), now.toISOString()]);
        return {
            id,
            name: data.name,
            description: data.description,
            isDefault: data.isDefault || false,
            createdAt: now,
            updatedAt: now
        };
    }
    async updateEnvironment(id, data) {
        const db = await (0, database_1.getDatabase)();
        const existing = await this.getEnvironment(id);
        if (!existing)
            return null;
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
        await db.run(`UPDATE environments 
       SET name = ?, description = ?, is_default = ?, updated_at = ?
       WHERE id = ?`, [updatedData.name, updatedData.description, updatedData.isDefault, updatedData.updatedAt.toISOString(), id]);
        return {
            ...existing,
            ...updatedData
        };
    }
    async deleteEnvironment(id) {
        const db = await (0, database_1.getDatabase)();
        const result = await db.run('DELETE FROM environments WHERE id = ? AND is_default = FALSE', id);
        return (result.changes || 0) > 0;
    }
    // Environment Variables
    async getEnvironmentVariables(environmentId) {
        const db = await (0, database_1.getDatabase)();
        const rows = await db.all('SELECT * FROM environment_variables WHERE environment_id = ? ORDER BY key', environmentId);
        return rows.map(row => ({
            ...row,
            environmentId: row.environment_id,
            isSecret: Boolean(row.is_secret),
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at)
        }));
    }
    async setEnvironmentVariable(environmentId, key, value, isSecret = false) {
        const db = await (0, database_1.getDatabase)();
        const id = (0, uuid_1.v4)();
        const now = new Date();
        // Upsert the variable
        await db.run(`INSERT INTO environment_variables (id, environment_id, key, value, is_secret, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(environment_id, key) 
       DO UPDATE SET value = ?, is_secret = ?, updated_at = ?`, [id, environmentId, key, value, isSecret, now.toISOString(), now.toISOString(), value, isSecret, now.toISOString()]);
        const row = await db.get('SELECT * FROM environment_variables WHERE environment_id = ? AND key = ?', [environmentId, key]);
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
    async deleteEnvironmentVariable(environmentId, key) {
        const db = await (0, database_1.getDatabase)();
        const result = await db.run('DELETE FROM environment_variables WHERE environment_id = ? AND key = ?', [environmentId, key]);
        return (result.changes || 0) > 0;
    }
}
exports.EnvironmentStore = EnvironmentStore;
//# sourceMappingURL=EnvironmentStore.js.map