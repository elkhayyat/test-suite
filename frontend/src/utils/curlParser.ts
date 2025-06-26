import { HttpStepConfig } from '../../../shared/src/types';

export interface ParsedCurlCommand {
  method: HttpStepConfig['method'];
  url: string;
  headers: Record<string, string>;
  body?: any;
  timeout?: number;
}

export function parseCurlCommand(curlCommand: string): ParsedCurlCommand {
  // Clean the command and split into parts
  const cleanCommand = curlCommand.trim().replace(/\\\n/g, ' ').replace(/\s+/g, ' ');
  
  // Basic validation
  if (!cleanCommand.toLowerCase().startsWith('curl')) {
    throw new Error('Command must start with "curl"');
  }

  const result: ParsedCurlCommand = {
    method: 'GET',
    url: '',
    headers: {},
  };

  // Split the command into tokens, handling quoted strings
  const tokens = tokenizeCurlCommand(cleanCommand);
  
  let i = 1; // Skip 'curl'
  while (i < tokens.length) {
    const token = tokens[i];

    if (token === '-X' || token === '--request') {
      result.method = (tokens[i + 1]?.toUpperCase() as HttpStepConfig['method']) || 'GET';
      i += 2;
    } else if (token === '-H' || token === '--header') {
      const headerValue = tokens[i + 1];
      if (headerValue) {
        const [key, ...valueParts] = headerValue.split(':');
        if (key && valueParts.length > 0) {
          result.headers[key.trim()] = valueParts.join(':').trim();
        }
      }
      i += 2;
    } else if (token === '-d' || token === '--data' || token === '--data-raw') {
      const dataValue = tokens[i + 1];
      if (dataValue) {
        try {
          // Try to parse as JSON
          result.body = JSON.parse(dataValue);
        } catch {
          // If not JSON, store as string
          result.body = dataValue;
        }
        // If we have data, assume POST unless explicitly set
        if (result.method === 'GET') {
          result.method = 'POST';
        }
      }
      i += 2;
    } else if (token === '--data-binary') {
      result.body = tokens[i + 1];
      if (result.method === 'GET') {
        result.method = 'POST';
      }
      i += 2;
    } else if (token === '--data-urlencode') {
      const dataValue = tokens[i + 1];
      if (dataValue) {
        // Convert to URL encoded format
        result.body = dataValue;
        result.headers['Content-Type'] = 'application/x-www-form-urlencoded';
        if (result.method === 'GET') {
          result.method = 'POST';
        }
      }
      i += 2;
    } else if (token === '-u' || token === '--user') {
      const userPass = tokens[i + 1];
      if (userPass) {
        const encoded = btoa(userPass);
        result.headers['Authorization'] = `Basic ${encoded}`;
      }
      i += 2;
    } else if (token === '-A' || token === '--user-agent') {
      result.headers['User-Agent'] = tokens[i + 1] || '';
      i += 2;
    } else if (token === '-e' || token === '--referer') {
      result.headers['Referer'] = tokens[i + 1] || '';
      i += 2;
    } else if (token === '--compressed') {
      result.headers['Accept-Encoding'] = 'gzip, deflate';
      i += 1;
    } else if (token === '-k' || token === '--insecure') {
      // Note: This would typically disable SSL verification
      // We'll just ignore it since axios handles SSL by default
      i += 1;
    } else if (token === '-L' || token === '--location') {
      // Follow redirects - axios follows by default
      i += 1;
    } else if (token === '-s' || token === '--silent') {
      // Silent mode - just ignore
      i += 1;
    } else if (token === '--connect-timeout') {
      const timeout = parseInt(tokens[i + 1] || '0');
      if (timeout > 0) {
        result.timeout = timeout * 1000; // Convert to milliseconds
      }
      i += 2;
    } else if (token === '-m' || token === '--max-time') {
      const timeout = parseInt(tokens[i + 1] || '0');
      if (timeout > 0) {
        result.timeout = timeout * 1000; // Convert to milliseconds
      }
      i += 2;
    } else if (!token.startsWith('-') && !result.url) {
      // This should be the URL
      result.url = token.replace(/^['"]|['"]$/g, ''); // Remove surrounding quotes
      i += 1;
    } else {
      // Skip unknown options
      i += 1;
    }
  }

  if (!result.url) {
    throw new Error('No URL found in curl command');
  }

  return result;
}

function tokenizeCurlCommand(command: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let inQuotes = false;
  let quoteChar = '';
  let escaped = false;

  for (let i = 0; i < command.length; i++) {
    const char = command[i];

    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }

    if (char === '\\') {
      escaped = true;
      continue;
    }

    if (!inQuotes && (char === '"' || char === "'")) {
      inQuotes = true;
      quoteChar = char;
      continue;
    }

    if (inQuotes && char === quoteChar) {
      inQuotes = false;
      quoteChar = '';
      continue;
    }

    if (!inQuotes && char === ' ') {
      if (current.trim()) {
        tokens.push(current.trim());
        current = '';
      }
      continue;
    }

    current += char;
  }

  if (current.trim()) {
    tokens.push(current.trim());
  }

  return tokens;
}

export function generateCurlCommand(config: HttpStepConfig): string {
  let command = 'curl';

  // Add method if not GET
  if (config.method && config.method !== 'GET') {
    command += ` -X ${config.method}`;
  }

  // Add headers
  if (config.headers) {
    Object.entries(config.headers).forEach(([key, value]) => {
      command += ` -H "${key}: ${value}"`;
    });
  }

  // Add body data
  if (config.body) {
    const bodyStr = typeof config.body === 'string' 
      ? config.body 
      : JSON.stringify(config.body);
    command += ` -d '${bodyStr}'`;
  }

  // Add timeout
  if (config.timeout) {
    command += ` --max-time ${Math.ceil(config.timeout / 1000)}`;
  }

  // Add URL (always last)
  command += ` "${config.url}"`;

  return command;
}