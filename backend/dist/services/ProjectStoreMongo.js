"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectStore = void 0;
const uuid_1 = require("uuid");
class ProjectStore {
    mongodb;
    constructor(mongodb) {
        this.mongodb = mongodb;
    }
    async getProjects() {
        try {
            const collections = this.mongodb.getCollections();
            const projects = await collections.projects.find({}).toArray();
            return projects;
        }
        catch (error) {
            console.error('Failed to get projects:', error);
            return [];
        }
    }
    async getProject(id) {
        try {
            const collections = this.mongodb.getCollections();
            const project = await collections.projects.findOne({ id });
            return project || undefined;
        }
        catch (error) {
            console.error('Failed to get project:', error);
            return undefined;
        }
    }
    async createProject(data) {
        const project = {
            id: data.id || (0, uuid_1.v4)(),
            name: data.name || 'New Project',
            description: data.description,
            createdAt: data.createdAt || new Date(),
            updatedAt: data.updatedAt || new Date(),
        };
        try {
            const collections = this.mongodb.getCollections();
            await collections.projects.insertOne(project);
            return project;
        }
        catch (error) {
            console.error('Failed to create project:', error);
            throw error;
        }
    }
    async updateProject(id, data) {
        try {
            const collections = this.mongodb.getCollections();
            const updateData = {
                ...data,
                updatedAt: new Date(),
            };
            // Remove id from update data
            delete updateData.id;
            const result = await collections.projects.findOneAndUpdate({ id }, { $set: updateData }, { returnDocument: 'after' });
            return result || undefined;
        }
        catch (error) {
            console.error('Failed to update project:', error);
            return undefined;
        }
    }
    async deleteProject(id) {
        try {
            const collections = this.mongodb.getCollections();
            // Delete all folders in this project
            await collections.folders.deleteMany({ projectId: id });
            // Delete all flows in this project
            await collections.flows.deleteMany({ projectId: id });
            // Delete project users
            await collections.projectUsers.deleteMany({ projectId: id });
            // Delete the project
            const result = await collections.projects.deleteOne({ id });
            return result.deletedCount > 0;
        }
        catch (error) {
            console.error('Failed to delete project:', error);
            return false;
        }
    }
    // Folder operations
    async getFolders(projectId) {
        try {
            const collections = this.mongodb.getCollections();
            const folders = await collections.folders.find({ projectId }).toArray();
            return folders;
        }
        catch (error) {
            console.error('Failed to get folders:', error);
            return [];
        }
    }
    async getFolder(id) {
        try {
            const collections = this.mongodb.getCollections();
            const folder = await collections.folders.findOne({ id });
            return folder || undefined;
        }
        catch (error) {
            console.error('Failed to get folder:', error);
            return undefined;
        }
    }
    async createFolder(projectId, data) {
        const folder = {
            id: data.id || (0, uuid_1.v4)(),
            name: data.name || 'New Folder',
            projectId,
            parentId: data.parentId,
            description: data.description,
            createdAt: data.createdAt || new Date(),
            updatedAt: data.updatedAt || new Date(),
        };
        try {
            const collections = this.mongodb.getCollections();
            await collections.folders.insertOne(folder);
            return folder;
        }
        catch (error) {
            console.error('Failed to create folder:', error);
            throw error;
        }
    }
    async updateFolder(projectId, folderId, data) {
        try {
            const collections = this.mongodb.getCollections();
            const updateData = {
                ...data,
                updatedAt: new Date(),
            };
            // Remove id and projectId from update data
            delete updateData.id;
            delete updateData.projectId;
            const result = await collections.folders.findOneAndUpdate({ id: folderId, projectId }, { $set: updateData }, { returnDocument: 'after' });
            return result || undefined;
        }
        catch (error) {
            console.error('Failed to update folder:', error);
            return undefined;
        }
    }
    async deleteFolder(projectId, folderId) {
        try {
            const collections = this.mongodb.getCollections();
            // Move all flows in this folder to the project root
            await collections.flows.updateMany({ folderId }, { $unset: { folderId: '' } });
            // Delete all subfolders
            await collections.folders.deleteMany({ parentId: folderId });
            // Delete the folder
            const result = await collections.folders.deleteOne({ id: folderId, projectId });
            return result.deletedCount > 0;
        }
        catch (error) {
            console.error('Failed to delete folder:', error);
            return false;
        }
    }
    async getFolderTree(projectId) {
        try {
            const folders = await this.getFolders(projectId);
            // Build tree structure
            const tree = [];
            const folderMap = new Map(folders.map(f => [f.id, { ...f, children: [] }]));
            folders.forEach(folder => {
                if (folder.parentId && folderMap.has(folder.parentId)) {
                    folderMap.get(folder.parentId).children.push(folderMap.get(folder.id));
                }
                else if (!folder.parentId) {
                    tree.push(folderMap.get(folder.id));
                }
            });
            return tree;
        }
        catch (error) {
            console.error('Failed to get folder tree:', error);
            return [];
        }
    }
}
exports.ProjectStore = ProjectStore;
//# sourceMappingURL=ProjectStoreMongo.js.map