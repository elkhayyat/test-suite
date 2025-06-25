"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectStore = void 0;
const uuid_1 = require("uuid");
const database_1 = require("../db/database");
class ProjectStore {
    // Projects
    async getProjects() {
        const db = await (0, database_1.getDatabase)();
        const rows = await db.all('SELECT * FROM projects ORDER BY name');
        return rows.map(row => ({
            ...row,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at)
        }));
    }
    async getProject(id) {
        const db = await (0, database_1.getDatabase)();
        const row = await db.get('SELECT * FROM projects WHERE id = ?', id);
        if (!row)
            return null;
        return {
            ...row,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at)
        };
    }
    async createProject(data) {
        const db = await (0, database_1.getDatabase)();
        const id = (0, uuid_1.v4)();
        const now = new Date();
        await db.run(`INSERT INTO projects (id, name, description, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?)`, [id, data.name, data.description || null, now.toISOString(), now.toISOString()]);
        return {
            id,
            name: data.name,
            description: data.description,
            createdAt: now,
            updatedAt: now
        };
    }
    async updateProject(id, data) {
        const db = await (0, database_1.getDatabase)();
        const existing = await this.getProject(id);
        if (!existing)
            return null;
        const updatedData = {
            name: data.name || existing.name,
            description: data.description !== undefined ? data.description : existing.description,
            updatedAt: new Date()
        };
        await db.run(`UPDATE projects 
       SET name = ?, description = ?, updated_at = ?
       WHERE id = ?`, [updatedData.name, updatedData.description, updatedData.updatedAt.toISOString(), id]);
        return {
            ...existing,
            ...updatedData
        };
    }
    async deleteProject(id) {
        const db = await (0, database_1.getDatabase)();
        // Don't delete the default project
        const result = await db.run('DELETE FROM projects WHERE id = ? AND id != ?', [id, 'default']);
        return (result.changes || 0) > 0;
    }
    // Folders
    async getFolders(projectId) {
        const db = await (0, database_1.getDatabase)();
        const rows = await db.all('SELECT * FROM folders WHERE project_id = ? ORDER BY name', projectId);
        return rows.map(row => ({
            ...row,
            projectId: row.project_id,
            parentId: row.parent_id,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at)
        }));
    }
    async getFolder(id) {
        const db = await (0, database_1.getDatabase)();
        const row = await db.get('SELECT * FROM folders WHERE id = ?', id);
        if (!row)
            return null;
        return {
            ...row,
            projectId: row.project_id,
            parentId: row.parent_id,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at)
        };
    }
    async createFolder(data) {
        const db = await (0, database_1.getDatabase)();
        const id = (0, uuid_1.v4)();
        const now = new Date();
        await db.run(`INSERT INTO folders (id, project_id, parent_id, name, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?)`, [id, data.projectId, data.parentId || null, data.name, now.toISOString(), now.toISOString()]);
        return {
            id,
            projectId: data.projectId,
            parentId: data.parentId,
            name: data.name,
            createdAt: now,
            updatedAt: now
        };
    }
    async updateFolder(id, data) {
        const db = await (0, database_1.getDatabase)();
        const existing = await this.getFolder(id);
        if (!existing)
            return null;
        const updatedData = {
            name: data.name || existing.name,
            parentId: data.parentId !== undefined ? data.parentId : existing.parentId,
            updatedAt: new Date()
        };
        await db.run(`UPDATE folders 
       SET name = ?, parent_id = ?, updated_at = ?
       WHERE id = ?`, [updatedData.name, updatedData.parentId, updatedData.updatedAt.toISOString(), id]);
        return {
            ...existing,
            ...updatedData
        };
    }
    async deleteFolder(id) {
        const db = await (0, database_1.getDatabase)();
        const result = await db.run('DELETE FROM folders WHERE id = ?', id);
        return (result.changes || 0) > 0;
    }
    async getFolderTree(projectId) {
        const folders = await this.getFolders(projectId);
        // Build tree structure
        const tree = [];
        const folderMap = new Map();
        folders.forEach(folder => {
            folderMap.set(folder.id, {
                ...folder,
                children: []
            });
        });
        folders.forEach(folder => {
            if (folder.parentId) {
                const parent = folderMap.get(folder.parentId);
                if (parent) {
                    parent.children.push(folderMap.get(folder.id));
                }
            }
            else {
                tree.push(folderMap.get(folder.id));
            }
        });
        return tree;
    }
}
exports.ProjectStore = ProjectStore;
//# sourceMappingURL=ProjectStore.js.map