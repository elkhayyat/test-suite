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
  security?: any[];
}

export interface ParsedOpenAPI {
  title: string;
  version: string;
  servers: string[];
  operations: OpenAPIOperation[];
  securitySchemes?: any;
  security?: any[];
}

export function parseOpenAPISchema(schema: any): ParsedOpenAPI {
  const result: ParsedOpenAPI = {
    title: schema.info?.title || 'Untitled API',
    version: schema.info?.version || '1.0.0',
    servers: [],
    operations: [],
    securitySchemes: schema.components?.securitySchemes || {},
    security: schema.security || []
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
            responses: operation.responses,
            security: operation.security || schema.security || []
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
  baseUrl?: string,
  fullSchema?: any
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

      // Add authorization headers based on security schemes
      if (operation.security && operation.security.length > 0 && parsedAPI.securitySchemes) {
        operation.security.forEach((secReq: any) => {
          Object.keys(secReq).forEach(schemeName => {
            const scheme = parsedAPI.securitySchemes[schemeName];
            if (scheme) {
              switch (scheme.type) {
                case 'http':
                  if (scheme.scheme === 'bearer') {
                    headers['Authorization'] = '{{bearerToken}}';
                  } else if (scheme.scheme === 'basic') {
                    headers['Authorization'] = '{{basicAuth}}';
                  }
                  break;
                case 'apiKey':
                  if (scheme.in === 'header') {
                    headers[scheme.name] = `{{${scheme.name}}}`;
                  }
                  break;
              }
            }
          });
        });
      }

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
      if (operation.requestBody?.content) {
        // Try different content types
        const contentTypes = ['application/json', 'application/x-www-form-urlencoded', 'multipart/form-data'];
        for (const contentType of contentTypes) {
          if (operation.requestBody.content[contentType]?.schema) {
            const schema = operation.requestBody.content[contentType].schema;
            body = generateExampleFromSchema(schema, parsedAPI, fullSchema);
            if (contentType !== 'application/json') {
              headers['Content-Type'] = contentType;
            }
            break;
          }
        }
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

function generateExampleFromSchema(schema: any, parsedAPI?: ParsedOpenAPI, fullSchema?: any): any {
  if (!schema) return null;

  // Handle $ref references
  if (schema.$ref) {
    // Extract the reference path (e.g., #/components/schemas/User)
    const refPath = schema.$ref.split('/');
    if (refPath[0] === '#' && fullSchema) {
      let resolvedSchema = fullSchema;
      for (let i = 1; i < refPath.length; i++) {
        resolvedSchema = resolvedSchema[refPath[i]];
        if (!resolvedSchema) break;
      }
      if (resolvedSchema && resolvedSchema !== schema) {
        return generateExampleFromSchema(resolvedSchema, parsedAPI, fullSchema);
      }
    }
    // Fallback if reference cannot be resolved
    const schemaName = refPath[refPath.length - 1];
    return { [`${schemaName}_ref`]: 'unresolved reference' };
  }

  // Handle allOf, oneOf, anyOf
  if (schema.allOf) {
    const combined: any = {};
    schema.allOf.forEach((subSchema: any) => {
      Object.assign(combined, generateExampleFromSchema(subSchema, parsedAPI, fullSchema));
    });
    return combined;
  }

  if (schema.oneOf || schema.anyOf) {
    const schemas = schema.oneOf || schema.anyOf;
    return generateExampleFromSchema(schemas[0], parsedAPI, fullSchema);
  }

  // Handle examples
  if (schema.example !== undefined) {
    return schema.example;
  }

  if (schema.examples && Array.isArray(schema.examples) && schema.examples.length > 0) {
    return schema.examples[0];
  }

  switch (schema.type) {
    case 'object':
      const obj: any = {};
      if (schema.properties) {
        Object.entries(schema.properties).forEach(([key, propSchema]: [string, any]) => {
          obj[key] = generateExampleFromSchema(propSchema, parsedAPI, fullSchema);
        });
      }
      return obj;

    case 'array':
      return [generateExampleFromSchema(schema.items, parsedAPI, fullSchema)];

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
      // If no type is specified but we have properties, treat as object
      if (schema.properties) {
        const obj: any = {};
        Object.entries(schema.properties).forEach(([key, propSchema]: [string, any]) => {
          obj[key] = generateExampleFromSchema(propSchema, parsedAPI, fullSchema);
        });
        return obj;
      }
      return null;
  }
}