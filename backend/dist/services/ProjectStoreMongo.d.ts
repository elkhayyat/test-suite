import { Project, Folder } from '../../../shared/src/types';
import { MongoDB } from '../db/mongodb';
export declare class ProjectStore {
    private mongodb;
    constructor(mongodb: MongoDB);
    getProjects(): Promise<Project[]>;
    getProject(id: string): Promise<Project | undefined>;
    createProject(data: Partial<Project>): Promise<Project>;
    updateProject(id: string, data: Partial<Project>): Promise<Project | undefined>;
    deleteProject(id: string): Promise<boolean>;
    getFolders(projectId: string): Promise<Folder[]>;
    getFolder(id: string): Promise<Folder | undefined>;
    createFolder(projectId: string, data: Partial<Folder>): Promise<Folder>;
    updateFolder(projectId: string, folderId: string, data: Partial<Folder>): Promise<Folder | undefined>;
    deleteFolder(projectId: string, folderId: string): Promise<boolean>;
    getFolderTree(projectId: string): Promise<any>;
}
//# sourceMappingURL=ProjectStoreMongo.d.ts.map