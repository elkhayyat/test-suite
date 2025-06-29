import { v4 as uuidv4 } from 'uuid';
import { Project, Folder, ProjectOpenAPISchema, TestFlow, TestStep } from '../../../shared/src/types';
import { getDatabase } from '../db/database';
import { parseOpenAPISchema, generateStepsFromOpenAPI } from '../../../shared/src/openApiParser';

export class ProjectStore {
  // Projects
  async getProjects(): Promise<Project[]> {
    const db = await getDatabase();
    const rows = await db.all('SELECT * FROM projects ORDER BY name');
    return rows.map(row => ({
      ...row,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    }));
  }

  async getProject(id: string): Promise<Project | null> {
    const db = await getDatabase();
    const row = await db.get('SELECT * FROM projects WHERE id = ?', id);
    if (!row) return null;
    
    return {
      ...row,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  async createProject(data: Partial<Project>): Promise<Project> {
    const db = await getDatabase();
    const id = uuidv4();
    const now = new Date();
    
    await db.run(
      `INSERT INTO projects (id, name, description, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?)`,
      [id, data.name, data.description || null, now.toISOString(), now.toISOString()]
    );
    
    return {
      id,
      organizationId: 'default',
      name: data.name!,
      description: data.description,
      createdAt: now,
      updatedAt: now
    };
  }

  async updateProject(id: string, data: Partial<Project>): Promise<Project | null> {
    const db = await getDatabase();
    const existing = await this.getProject(id);
    if (!existing) return null;
    
    const updatedData = {
      name: data.name || existing.name,
      description: data.description !== undefined ? data.description : existing.description,
      updatedAt: new Date()
    };
    
    await db.run(
      `UPDATE projects 
       SET name = ?, description = ?, updated_at = ?
       WHERE id = ?`,
      [updatedData.name, updatedData.description, updatedData.updatedAt.toISOString(), id]
    );
    
    return {
      ...existing,
      ...updatedData
    };
  }

  async deleteProject(id: string): Promise<boolean> {
    const db = await getDatabase();
    // Don't delete the default project
    const result = await db.run('DELETE FROM projects WHERE id = ? AND id != ?', [id, 'default']);
    return (result.changes || 0) > 0;
  }

  // Folders
  async getFolders(projectId: string): Promise<Folder[]> {
    const db = await getDatabase();
    const rows = await db.all(
      'SELECT * FROM folders WHERE project_id = ? ORDER BY name',
      projectId
    );
    return rows.map(row => ({
      ...row,
      projectId: row.project_id,
      parentId: row.parent_id,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    }));
  }

  async getFolder(id: string): Promise<Folder | null> {
    const db = await getDatabase();
    const row = await db.get('SELECT * FROM folders WHERE id = ?', id);
    if (!row) return null;
    
    return {
      ...row,
      projectId: row.project_id,
      parentId: row.parent_id,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  async createFolder(data: Partial<Folder> & { projectId: string }): Promise<Folder> {
    const db = await getDatabase();
    const id = uuidv4();
    const now = new Date();
    
    await db.run(
      `INSERT INTO folders (id, project_id, parent_id, name, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, data.projectId, data.parentId || null, data.name, now.toISOString(), now.toISOString()]
    );
    
    return {
      id,
      projectId: data.projectId,
      parentId: data.parentId,
      name: data.name!,
      createdAt: now,
      updatedAt: now
    };
  }

  async updateFolder(id: string, data: Partial<Folder>): Promise<Folder | null> {
    const db = await getDatabase();
    const existing = await this.getFolder(id);
    if (!existing) return null;
    
    const updatedData = {
      name: data.name || existing.name,
      parentId: data.parentId !== undefined ? data.parentId : existing.parentId,
      updatedAt: new Date()
    };
    
    await db.run(
      `UPDATE folders 
       SET name = ?, parent_id = ?, updated_at = ?
       WHERE id = ?`,
      [updatedData.name, updatedData.parentId, updatedData.updatedAt.toISOString(), id]
    );
    
    return {
      ...existing,
      ...updatedData
    };
  }

  async deleteFolder(id: string): Promise<boolean> {
    const db = await getDatabase();
    const result = await db.run('DELETE FROM folders WHERE id = ?', id);
    return (result.changes || 0) > 0;
  }

  async getFolderTree(projectId: string): Promise<any> {
    const folders = await this.getFolders(projectId);
    
    // Build tree structure
    const tree: any[] = [];
    const folderMap = new Map<string, any>();
    
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
      } else {
        tree.push(folderMap.get(folder.id));
      }
    });
    
    return tree;
  }

  // Add missing method for organization-based project retrieval
  async getProjectsByOrganization(organizationId: string): Promise<Project[]> {
    // Since SQLite version doesn't have organization support,
    // we return all projects for now
    return this.getProjects();
  }

  // OpenAPI Schema management methods (SQLite implementation)
  async getOpenAPISchemas(projectId: string): Promise<ProjectOpenAPISchema[]> {
    const db = await getDatabase();
    const rows = await db.all(
      'SELECT * FROM project_openapi_schemas WHERE project_id = ? ORDER BY name',
      projectId
    );
    return rows.map(row => ({
      id: row.id,
      projectId: row.project_id,
      name: row.name,
      description: row.description,
      version: row.version,
      title: row.title,
      baseUrl: row.base_url,
      schema: JSON.parse(row.schema),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    }));
  }

  async getOpenAPISchema(schemaId: string): Promise<ProjectOpenAPISchema | undefined> {
    const db = await getDatabase();
    const row = await db.get('SELECT * FROM project_openapi_schemas WHERE id = ?', schemaId);
    if (!row) return undefined;
    
    return {
      id: row.id,
      projectId: row.project_id,
      name: row.name,
      description: row.description,
      version: row.version,
      title: row.title,
      baseUrl: row.base_url,
      schema: JSON.parse(row.schema),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  async createOpenAPISchema(data: Partial<ProjectOpenAPISchema>): Promise<ProjectOpenAPISchema> {
    const db = await getDatabase();
    const id = uuidv4();
    const now = new Date();
    
    await db.run(
      `INSERT INTO project_openapi_schemas 
       (id, project_id, name, description, version, title, base_url, schema, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.projectId,
        data.name,
        data.description || null,
        data.version,
        data.title,
        data.baseUrl || null,
        JSON.stringify(data.schema),
        now.toISOString(),
        now.toISOString()
      ]
    );
    
    return {
      id,
      projectId: data.projectId!,
      name: data.name!,
      description: data.description,
      version: data.version!,
      title: data.title!,
      baseUrl: data.baseUrl,
      schema: data.schema!,
      createdAt: now,
      updatedAt: now
    };
  }

  async updateOpenAPISchema(schemaId: string, data: Partial<ProjectOpenAPISchema>): Promise<ProjectOpenAPISchema | undefined> {
    const db = await getDatabase();
    const now = new Date();
    
    const updateData: any = {
      updated_at: now.toISOString()
    };
    
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.version !== undefined) updateData.version = data.version;
    if (data.title !== undefined) updateData.title = data.title;
    if (data.baseUrl !== undefined) updateData.base_url = data.baseUrl;
    if (data.schema !== undefined) updateData.schema = JSON.stringify(data.schema);
    
    const setClause = Object.keys(updateData).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updateData);
    values.push(schemaId);
    
    const result = await db.run(
      `UPDATE project_openapi_schemas SET ${setClause} WHERE id = ?`,
      values
    );
    
    if ((result.changes || 0) === 0) {
      return undefined;
    }
    
    return await this.getOpenAPISchema(schemaId);
  }

  async deleteOpenAPISchema(schemaId: string): Promise<boolean> {
    const db = await getDatabase();
    const result = await db.run('DELETE FROM project_openapi_schemas WHERE id = ?', schemaId);
    return (result.changes || 0) > 0;
  }

  async generateFlowsFromOpenAPISchema(
    schemaId: string,
    selectedOperations: string[],
    baseUrlOverride?: string,
    folderId?: string
  ): Promise<TestFlow[]> {
    const schema = await this.getOpenAPISchema(schemaId);
    if (!schema) {
      throw new Error('OpenAPI schema not found');
    }

    const parsedAPI = parseOpenAPISchema(schema.schema);
    const steps = generateStepsFromOpenAPI(parsedAPI, selectedOperations, baseUrlOverride, schema.schema);
    
    // Create flows for each operation
    const flows: TestFlow[] = [];
    const db = await getDatabase();
    
    for (const operation of selectedOperations) {
      const operationSteps = steps.filter(step => 
        step.name.includes(operation) || step.config?.url?.includes(operation.split(' ')[1])
      );
      
      if (operationSteps.length > 0) {
        const flowId = uuidv4();
        const now = new Date();
        
        const flow: TestFlow = {
          id: flowId,
          projectId: schema.projectId,
          folderId,
          name: `${parsedAPI.title} - ${operation}`,
          description: `Generated from OpenAPI schema: ${schema.name}`,
          steps: operationSteps,
          connections: [],
          createdAt: now,
          updatedAt: now,
        };
        
        // Insert flow into database
        await db.run(
          `INSERT INTO flows (id, project_id, folder_id, name, description, steps, created_at, updated_at) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            flowId,
            schema.projectId,
            folderId || null,
            flow.name,
            flow.description,
            JSON.stringify(operationSteps),
            now.toISOString(),
            now.toISOString()
          ]
        );
        
        flows.push(flow);
      }
    }
    
    return flows;
  }
}