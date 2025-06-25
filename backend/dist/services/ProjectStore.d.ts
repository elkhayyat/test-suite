import { Project, Folder } from '../../../shared/src/types';
export declare class ProjectStore {
    getProjects(): Promise<Project[]>;
    getProject(id: string): Promise<Project | null>;
    createProject(data: Partial<Project>): Promise<Project>;
    updateProject(id: string, data: Partial<Project>): Promise<Project | null>;
    deleteProject(id: string): Promise<boolean>;
    getFolders(projectId: string): Promise<Folder[]>;
    getFolder(id: string): Promise<Folder | null>;
    createFolder(data: Partial<Folder> & {
        projectId: string;
    }): Promise<Folder>;
    updateFolder(id: string, data: Partial<Folder>): Promise<Folder | null>;
    deleteFolder(id: string): Promise<boolean>;
    getFolderTree(projectId: string): Promise<any>;
}
//# sourceMappingURL=ProjectStore.d.ts.map