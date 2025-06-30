interface Config {
  port: number;
  nodeEnv: string;
  testFlowApiUrl: string;
  testFlowAuthToken: string;
  mcpAuthToken: string;
  allowedOrigins: string | string[];
  logLevel: string;
}

function parseAllowedOrigins(origins: string | undefined): string | string[] {
  if (!origins || origins === '*') {
    return '*';
  }
  
  const parsedOrigins = origins.split(',').map(origin => origin.trim());
  return parsedOrigins.length === 1 ? parsedOrigins[0] : parsedOrigins;
}

export const config: Config = {
  port: parseInt(process.env.PORT || '3002', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  testFlowApiUrl: process.env.TEST_FLOW_API_URL || 'http://localhost:3001',
  testFlowAuthToken: process.env.TEST_FLOW_AUTH_TOKEN || '',
  mcpAuthToken: process.env.MCP_AUTH_TOKEN || '',
  allowedOrigins: parseAllowedOrigins(process.env.ALLOWED_ORIGINS),
  logLevel: process.env.LOG_LEVEL || 'info',
};

// Validate required configuration
export function validateConfig(): void {
  const required: Array<keyof Config> = ['testFlowAuthToken', 'mcpAuthToken'];
  
  for (const key of required) {
    if (!config[key]) {
      throw new Error(`Missing required configuration: ${key}`);
    }
  }
  
  // Validate port
  if (config.port < 0 || config.port > 65535) {
    throw new Error('Invalid port number');
  }
  
  // Log configuration (excluding sensitive data)
  console.log('Server configuration:');
  console.log(`- Port: ${config.port}`);
  console.log(`- Environment: ${config.nodeEnv}`);
  console.log(`- API URL: ${config.testFlowApiUrl}`);
  console.log(`- CORS Origins: ${JSON.stringify(config.allowedOrigins)}`);
  console.log(`- Log Level: ${config.logLevel}`);
}