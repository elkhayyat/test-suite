import { v4 as uuidv4 } from 'uuid';
import { Project, Folder, FolderTree } from '../../../shared/src/types';
import { MongoDB } from '../db/mongodb';

export class ProjectStore {
  private mongodb: MongoDB;

  constructor(mongodb: MongoDB) {
    this.mongodb = mongodb;
  }

  async getProjects(): Promise<Project[]> {
    try {
      const collections = this.mongodb.getCollections();
      const projects = await collections.projects.find({}).toArray();
      return projects;
    } catch (error) {
      console.error('Failed to get projects:', error);
      return [];
    }
  }

  async getProject(id: string): Promise<Project | undefined> {
    try {
      const collections = this.mongodb.getCollections();
      const project = await collections.projects.findOne({ id });
      return project || undefined;
    } catch (error) {
      console.error('Failed to get project:', error);
      return undefined;
    }
  }

  async createProject(data: Partial<Project>): Promise<Project> {
    const project: Project = {
      id: data.id || uuidv4(),
      organizationId: data.organizationId || 'default',
      name: data.name || 'New Project',
      description: data.description,
      createdAt: data.createdAt || new Date(),
      updatedAt: data.updatedAt || new Date(),
    };

    try {
      const collections = this.mongodb.getCollections();
      await collections.projects.insertOne(project);
      return project;
    } catch (error) {
      console.error('Failed to create project:', error);
      throw error;
    }
  }

  async updateProject(id: string, data: Partial<Project>): Promise<Project | undefined> {
    try {
      const collections = this.mongodb.getCollections();
      
      const updateData = {
        ...data,
        updatedAt: new Date(),
      };
      
      // Remove id from update data
      delete updateData.id;
      
      const result = await collections.projects.findOneAndUpdate(
        { id },
        { $set: updateData },
        { returnDocument: 'after' }
      );
      
      return result || undefined;
    } catch (error) {
      console.error('Failed to update project:', error);
      return undefined;
    }
  }

  async deleteProject(id: string): Promise<boolean> {
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
    } catch (error) {
      console.error('Failed to delete project:', error);
      return false;
    }
  }

  // Folder operations
  async getFolders(projectId: string): Promise<Folder[]> {
    try {
      const collections = this.mongodb.getCollections();
      const folders = await collections.folders.find({ projectId }).toArray();
      return folders;
    } catch (error) {
      console.error('Failed to get folders:', error);
      return [];
    }
  }

  async getFolder(id: string): Promise<Folder | undefined> {
    try {
      const collections = this.mongodb.getCollections();
      const folder = await collections.folders.findOne({ id });
      return folder || undefined;
    } catch (error) {
      console.error('Failed to get folder:', error);
      return undefined;
    }
  }

  async createFolder(projectId: string, data: Partial<Folder>): Promise<Folder> {
    const folder: Folder = {
      id: data.id || uuidv4(),
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
    } catch (error) {
      console.error('Failed to create folder:', error);
      throw error;
    }
  }

  async updateFolder(projectId: string, folderId: string, data: Partial<Folder>): Promise<Folder | undefined> {
    try {
      const collections = this.mongodb.getCollections();
      
      const updateData = {
        ...data,
        updatedAt: new Date(),
      };
      
      // Remove id and projectId from update data
      delete updateData.id;
      delete updateData.projectId;
      
      const result = await collections.folders.findOneAndUpdate(
        { id: folderId, projectId },
        { $set: updateData },
        { returnDocument: 'after' }
      );
      
      return result || undefined;
    } catch (error) {
      console.error('Failed to update folder:', error);
      return undefined;
    }
  }

  async deleteFolder(projectId: string, folderId: string): Promise<boolean> {
    try {
      const collections = this.mongodb.getCollections();
      
      // Move all flows in this folder to the project root
      await collections.flows.updateMany(
        { folderId },
        { $unset: { folderId: '' } }
      );
      
      // Delete all subfolders
      await collections.folders.deleteMany({ parentId: folderId });
      
      // Delete the folder
      const result = await collections.folders.deleteOne({ id: folderId, projectId });
      return result.deletedCount > 0;
    } catch (error) {
      console.error('Failed to delete folder:', error);
      return false;
    }
  }

  async getFolderTree(projectId: string): Promise<any> {
    try {
      const folders = await this.getFolders(projectId);
      
      // Build tree structure
      const tree: FolderTree[] = [];
      const folderMap = new Map(folders.map(f => [f.id, { ...f, children: [] as FolderTree[] }]));
      
      folders.forEach(folder => {
        if (folder.parentId && folderMap.has(folder.parentId)) {
          folderMap.get(folder.parentId)!.children.push(folderMap.get(folder.id)!);
        } else if (!folder.parentId) {
          tree.push(folderMap.get(folder.id)!);
        }
      });
      
      return tree;
    } catch (error) {
      console.error('Failed to get folder tree:', error);
      return [];
    }
  }
}