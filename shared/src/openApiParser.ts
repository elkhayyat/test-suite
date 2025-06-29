import { TestStep, HttpStepConfig } from './types';
import { v4 as uuidv4 } from 'uuid';

export interface OpenAPIOperation {
  path: string;
  method: string;
  operationId?: string;
  summary?: string;
  description?: string;
  parameters?: any[];
  requestBody?: any;
  responses?: any;
}

export interface ParsedOpenAPI {
  title: string;
  version: string;
  servers: string[];
  operations: OpenAPIOperation[];
}

export function parseOpenAPISchema(schema: any): ParsedOpenAPI {
  const result: ParsedOpenAPI = {
    title: schema.info?.title || 'Untitled API',
    version: schema.info?.version || '1.0.0',
    servers: [],
    operations: []
  };

  // Extract servers
  if (schema.servers && Array.isArray(schema.servers)) {
    result.servers = schema.servers.map((server: any) => server.url);
  }

  // Extract operations from paths
  if (schema.paths) {
    Object.entries(schema.paths).forEach(([path, pathItem]: [string, any]) => {
      const methods = ['get', 'post', 'put', 'delete', 'patch'];
      
      methods.forEach(method => {
        if (pathItem[method]) {
          const operation = pathItem[method];
          result.operations.push({
            path,
            method: method.toUpperCase(),
            operationId: operation.operationId,
            summary: operation.summary,
            description: operation.description,
            parameters: operation.parameters || [],
            requestBody: operation.requestBody,
            responses: operation.responses
          });
        }
      });
    });
  }

  return result;
}

export function generateStepsFromOpenAPI(
  parsedAPI: ParsedOpenAPI, 
  selectedOperations: string[],
  baseUrl?: string
): TestStep[] {
  const steps: TestStep[] = [];
  const server = baseUrl || parsedAPI.servers[0] || '';

  parsedAPI.operations
    .filter(op => selectedOperations.includes(`${op.method} ${op.path}`))
    .forEach(operation => {
      const stepId = uuidv4();
      const stepName = operation.summary || 
        operation.operationId || 
        `${operation.method} ${operation.path}`;

      // Build URL with path parameters as placeholders
      let url = `${server}${operation.path}`;
      
      // Replace path parameters with placeholder syntax
      if (operation.parameters) {
        operation.parameters
          .filter((param: any) => param.in === 'path')
          .forEach((param: any) => {
            url = url.replace(`{${param.name}}`, `{{${param.name}}}`);
          });
      }

      // Build headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      // Add header parameters
      if (operation.parameters) {
        operation.parameters
          .filter((param: any) => param.in === 'header')
          .forEach((param: any) => {
            headers[param.name] = param.example || `{{${param.name}}}`;
          });
      }

      // Build query parameters
      const queryParams: string[] = [];
      if (operation.parameters) {
        operation.parameters
          .filter((param: any) => param.in === 'query')
          .forEach((param: any) => {
            queryParams.push(`${param.name}={{${param.name}}}`);
          });
      }

      if (queryParams.length > 0) {
        url += '?' + queryParams.join('&');
      }

      // Build request body
      let body = null;
      if (operation.requestBody?.content?.['application/json']?.schema) {
        body = generateExampleFromSchema(operation.requestBody.content['application/json'].schema);
      }

      const config: HttpStepConfig = {
        method: operation.method as any,
        url,
        headers,
        body,
        timeout: 30000,
        retries: 0
      };

      steps.push({
        id: stepId,
        name: stepName,
        type: 'http',
        config
      });
    });

  return steps;
}

function generateExampleFromSchema(schema: any): any {
  if (!schema) return null;

  switch (schema.type) {
    case 'object':
      const obj: any = {};
      if (schema.properties) {
        Object.entries(schema.properties).forEach(([key, propSchema]: [string, any]) => {
          obj[key] = generateExampleFromSchema(propSchema);
        });
      }
      return obj;

    case 'array':
      return [generateExampleFromSchema(schema.items)];

    case 'string':
      if (schema.example) return schema.example;
      if (schema.enum) return schema.enum[0];
      if (schema.format === 'email') return 'user@example.com';
      if (schema.format === 'date') return '2024-01-01';
      if (schema.format === 'date-time') return '2024-01-01T00:00:00Z';
      if (schema.format === 'uuid') return '123e4567-e89b-12d3-a456-426614174000';
      return 'string';

    case 'number':
    case 'integer':
      if (schema.example) return schema.example;
      if (schema.minimum !== undefined) return schema.minimum;
      return 0;

    case 'boolean':
      if (schema.example !== undefined) return schema.example;
      return true;

    default:
      return null;
  }
}