import SwaggerParser from '@apidevtools/swagger-parser';
import { OpenAPIV3, OpenAPIV2 } from 'openapi-types';
import { v4 as uuidv4 } from 'uuid';
import type { TestFlow, TestStep, Connection, HttpStepConfig } from '../../shared/src/types.js';
import { ApiClient } from './api-client.js';
import axios from 'axios';

type OpenAPIDocument = OpenAPIV3.Document | OpenAPIV2.Document;

interface GenerateFlowsOptions {
  schemaUrl?: string;
  schema?: OpenAPIDocument;
  projectId: string;
  folderId?: string;
  baseUrl?: string;
  includeOptions?: {
    includePaths?: string[];
    includeMethods?: string[];
    includeTags?: string[];
  };
}

interface GenerateFlowsResult {
  flowsCreated: number;
  flows: TestFlow[];
}

export class OpenAPIFlowGenerator {
  constructor(private apiClient: ApiClient) {}

  async generateFlows(options: GenerateFlowsOptions): Promise<GenerateFlowsResult> {
    // Parse OpenAPI schema
    let openApiDoc: OpenAPIDocument;
    
    if (options.schemaUrl) {
      // Fetch schema from URL
      const response = await axios.get(options.schemaUrl);
      openApiDoc = await SwaggerParser.parse(response.data) as OpenAPIDocument;
    } else if (options.schema) {
      openApiDoc = await SwaggerParser.parse(options.schema) as OpenAPIDocument;
    } else {
      throw new Error('Either schemaUrl or schema must be provided');
    }

    // Determine base URL
    const baseUrl = options.baseUrl || this.extractBaseUrl(openApiDoc);
    
    // Generate flows from paths
    const flows: TestFlow[] = [];
    const paths = this.getPathsFromSchema(openApiDoc);

    for (const [path, pathItem] of Object.entries(paths)) {
      // Check if path should be included
      if (!this.shouldIncludePath(path, options.includeOptions)) {
        continue;
      }

      // Process each method in the path
      for (const [method, operation] of Object.entries(pathItem)) {
        if (this.isHttpMethod(method) && this.isOperation(operation)) {
          // Check if method should be included
          if (!this.shouldIncludeMethod(method, options.includeOptions)) {
            continue;
          }

          // Check if tags should be included
          if (!this.shouldIncludeTags(operation.tags, options.includeOptions)) {
            continue;
          }

          // Create flow for this endpoint
          const flow = await this.createFlowFromOperation(
            path,
            method.toUpperCase() as HttpStepConfig['method'],
            operation,
            baseUrl,
            options.projectId,
            options.folderId
          );

          flows.push(flow);
        }
      }
    }

    // Save flows to API
    const createdFlows: TestFlow[] = [];
    for (const flow of flows) {
      const created = await this.apiClient.createFlow(flow);
      createdFlows.push(created);
    }

    return {
      flowsCreated: createdFlows.length,
      flows: createdFlows,
    };
  }

  private extractBaseUrl(doc: OpenAPIDocument): string {
    if ('servers' in doc && doc.servers && doc.servers.length > 0) {
      return doc.servers[0].url;
    } else if ('host' in doc && doc.host) {
      const scheme = ('schemes' in doc && doc.schemes && doc.schemes[0]) || 'https';
      const basePath = ('basePath' in doc && doc.basePath) || '';
      return `${scheme}://${doc.host}${basePath}`;
    }
    return 'http://localhost';
  }

  private getPathsFromSchema(doc: OpenAPIDocument): OpenAPIV3.PathsObject | OpenAPIV2.PathsObject {
    return doc.paths;
  }

  private isHttpMethod(method: string): boolean {
    return ['get', 'post', 'put', 'delete', 'patch', 'options', 'head'].includes(method.toLowerCase());
  }

  private isOperation(obj: any): obj is (OpenAPIV3.OperationObject | OpenAPIV2.OperationObject) {
    return obj && typeof obj === 'object' && !Array.isArray(obj);
  }

  private shouldIncludePath(path: string, options?: GenerateFlowsOptions['includeOptions']): boolean {
    if (!options?.includePaths || options.includePaths.length === 0) {
      return true;
    }

    return options.includePaths.some(pattern => {
      // Simple wildcard matching
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      return regex.test(path);
    });
  }

  private shouldIncludeMethod(method: string, options?: GenerateFlowsOptions['includeOptions']): boolean {
    if (!options?.includeMethods || options.includeMethods.length === 0) {
      return true;
    }

    return options.includeMethods.includes(method.toUpperCase());
  }

  private shouldIncludeTags(tags?: string[], options?: GenerateFlowsOptions['includeOptions']): boolean {
    if (!options?.includeTags || options.includeTags.length === 0) {
      return true;
    }

    if (!tags || tags.length === 0) {
      return false;
    }

    return tags.some(tag => options.includeTags!.includes(tag));
  }

  private async createFlowFromOperation(
    path: string,
    method: HttpStepConfig['method'],
    operation: OpenAPIV3.OperationObject | OpenAPIV2.OperationObject,
    baseUrl: string,
    projectId: string,
    folderId?: string
  ): Promise<TestFlow> {
    const flowId = uuidv4();
    const startStepId = uuidv4();
    const httpStepId = uuidv4();
    const assertionStepId = uuidv4();

    // Build HTTP step config
    const httpConfig: HttpStepConfig = {
      method,
      url: `${baseUrl}${path}`,
      headers: this.generateHeaders(operation),
      timeout: 30000,
    };

    // Add example body if needed
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      httpConfig.body = this.generateExampleBody(operation);
    }

    // Create steps
    const steps: TestStep[] = [
      {
        id: startStepId,
        type: 'http',
        name: 'Start',
        config: {},
        position: { x: 100, y: 100 },
      },
      {
        id: httpStepId,
        type: 'http',
        name: `${method} ${path}`,
        config: httpConfig,
        position: { x: 300, y: 100 },
      },
      {
        id: assertionStepId,
        type: 'assertion',
        name: 'Assert Success',
        config: {
          type: 'custom',
          source: 'steps.' + httpStepId + '.output.status',
          customScript: `
// Assert successful response
const status = source;
if (status >= 200 && status < 300) {
  return true;
} else {
  throw new Error(\`Expected successful status code, got \${status}\`);
}
          `.trim(),
        },
        position: { x: 500, y: 100 },
      },
    ];

    // Create connections
    const connections: Connection[] = [
      {
        id: uuidv4(),
        source: startStepId,
        target: httpStepId,
      },
      {
        id: uuidv4(),
        source: httpStepId,
        target: assertionStepId,
      },
    ];

    // Create flow name
    const flowName = operation.summary || 
                    operation.operationId || 
                    `${method} ${path}`;

    const flow: TestFlow = {
      id: flowId,
      projectId,
      folderId,
      name: flowName,
      description: operation.description || `Auto-generated flow for ${method} ${path}`,
      steps,
      connections,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return flow;
  }

  private generateHeaders(operation: OpenAPIV3.OperationObject | OpenAPIV2.OperationObject): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    // Add authorization header if security is defined
    if (operation.security && operation.security.length > 0) {
      headers['Authorization'] = '{{authToken}}'; // Using variable placeholder
    }

    // Extract headers from parameters
    if ('parameters' in operation && operation.parameters) {
      for (const param of operation.parameters) {
        if ('in' in param && param.in === 'header' && 'name' in param) {
          headers[param.name] = `{{${param.name}}}`;
        }
      }
    }

    return headers;
  }

  private generateExampleBody(operation: OpenAPIV3.OperationObject | OpenAPIV2.OperationObject): any {
    // Try to extract example from request body
    if ('requestBody' in operation && operation.requestBody) {
      const requestBody = operation.requestBody as OpenAPIV3.RequestBodyObject;
      if (requestBody.content && requestBody.content['application/json']) {
        const mediaType = requestBody.content['application/json'];
        if (mediaType.example) {
          return mediaType.example;
        } else if (mediaType.examples) {
          const firstExample = Object.values(mediaType.examples)[0];
          if ('value' in firstExample) {
            return firstExample.value;
          }
        } else if (mediaType.schema) {
          return this.generateExampleFromSchema(mediaType.schema as OpenAPIV3.SchemaObject);
        }
      }
    }

    // For OpenAPI 2.0, check parameters
    if ('parameters' in operation && operation.parameters) {
      for (const param of operation.parameters) {
        if ('in' in param && param.in === 'body' && 'schema' in param) {
          return this.generateExampleFromSchema(param.schema as any);
        }
      }
    }

    return {};
  }

  private generateExampleFromSchema(schema: OpenAPIV3.SchemaObject): any {
    if (schema.example) {
      return schema.example;
    }

    if (schema.type === 'object' && schema.properties) {
      const example: any = {};
      for (const [key, prop] of Object.entries(schema.properties)) {
        example[key] = this.generateExampleFromSchema(prop as OpenAPIV3.SchemaObject);
      }
      return example;
    }

    if (schema.type === 'array' && schema.items) {
      return [this.generateExampleFromSchema(schema.items as OpenAPIV3.SchemaObject)];
    }

    // Generate default values based on type
    switch (schema.type) {
      case 'string':
        return schema.enum ? schema.enum[0] : 'string';
      case 'number':
        return 0;
      case 'integer':
        return 0;
      case 'boolean':
        return true;
      default:
        return null;
    }
  }
}