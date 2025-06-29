export interface RandomGeneratorConfig {
  type: 'string' | 'number' | 'uuid' | 'email' | 'name' | 'phone' | 'date' | 'boolean';
  min?: number;
  max?: number;
  length?: number;
  format?: string;
  prefix?: string;
  suffix?: string;
}

export const GENERATOR_FUNCTIONS = {
  string: {
    name: 'Random String',
    description: 'Generate a random alphanumeric string',
    syntax: '$random.string(length)',
    example: '$random.string(10)',
    generate: (length: number = 10) => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let result = '';
      for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    }
  },
  number: {
    name: 'Random Number',
    description: 'Generate a random number within a range',
    syntax: '$random.number(min, max)',
    example: '$random.number(1, 100)',
    generate: (min: number = 0, max: number = 100) => {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }
  },
  float: {
    name: 'Random Float',
    description: 'Generate a random floating point number',
    syntax: '$random.float(min, max, decimals)',
    example: '$random.float(0, 1, 2)',
    generate: (min: number = 0, max: number = 1, decimals: number = 2) => {
      const num = Math.random() * (max - min) + min;
      return parseFloat(num.toFixed(decimals));
    }
  },
  uuid: {
    name: 'Random UUID',
    description: 'Generate a random UUID v4',
    syntax: '$random.uuid()',
    example: '$random.uuid()',
    generate: () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }
  },
  email: {
    name: 'Random Email',
    description: 'Generate a random email address',
    syntax: '$random.email()',
    example: '$random.email()',
    generate: () => {
      const domains = ['example.com', 'test.com', 'demo.com', 'sample.org'];
      const username = GENERATOR_FUNCTIONS.string.generate(8).toLowerCase();
      const domain = domains[Math.floor(Math.random() * domains.length)];
      return `${username}@${domain}`;
    }
  },
  name: {
    name: 'Random Name',
    description: 'Generate a random full name',
    syntax: '$random.name()',
    example: '$random.name()',
    generate: () => {
      const firstNames = ['John', 'Jane', 'Michael', 'Emily', 'David', 'Sarah', 'Robert', 'Lisa', 'James', 'Mary'];
      const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      return `${firstName} ${lastName}`;
    }
  },
  phone: {
    name: 'Random Phone',
    description: 'Generate a random phone number',
    syntax: '$random.phone()',
    example: '$random.phone()',
    generate: () => {
      const areaCode = GENERATOR_FUNCTIONS.number.generate(200, 999);
      const prefix = GENERATOR_FUNCTIONS.number.generate(200, 999);
      const lineNumber = GENERATOR_FUNCTIONS.number.generate(1000, 9999);
      return `+1-${areaCode}-${prefix}-${lineNumber}`;
    }
  },
  date: {
    name: 'Random Date',
    description: 'Generate a random date',
    syntax: '$random.date(format)',
    example: '$random.date("yyyy-MM-dd")',
    generate: (format: string = 'yyyy-MM-dd') => {
      const start = new Date(2020, 0, 1);
      const end = new Date();
      const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
      
      if (format === 'yyyy-MM-dd') {
        return date.toISOString().split('T')[0];
      } else if (format === 'iso') {
        return date.toISOString();
      } else {
        return date.toLocaleDateString();
      }
    }
  },
  boolean: {
    name: 'Random Boolean',
    description: 'Generate a random boolean value',
    syntax: '$random.boolean()',
    example: '$random.boolean()',
    generate: () => {
      return Math.random() < 0.5;
    }
  },
  timestamp: {
    name: 'Current Timestamp',
    description: 'Generate current timestamp',
    syntax: '$random.timestamp()',
    example: '$random.timestamp()',
    generate: () => {
      return Date.now();
    }
  }
};

export function processRandomGenerators(input: string): string {
  let processed = input;
  
  // Match patterns like $random.string(10) or $random.number(1, 100)
  const regex = /\$random\.(\w+)\((.*?)\)/g;
  
  processed = processed.replace(regex, (match, funcName, argsStr) => {
    const generator = GENERATOR_FUNCTIONS[funcName as keyof typeof GENERATOR_FUNCTIONS];
    
    if (!generator) {
      return match; // Return unchanged if generator not found
    }
    
    try {
      // Parse arguments
      const args = argsStr
        .split(',')
        .map((arg: string) => arg.trim())
        .filter((arg: string) => arg)
        .map((arg: string) => {
          // Remove quotes if string
          if (arg.startsWith('"') && arg.endsWith('"')) {
            return arg.slice(1, -1);
          }
          // Try to parse as number
          const num = parseFloat(arg);
          return isNaN(num) ? arg : num;
        });
      
      // Call generator with parsed arguments
      const result = (generator.generate as (...args: any[]) => any)(...args);
      return JSON.stringify(result);
    } catch (error) {
      console.error(`Error generating random value for ${funcName}:`, error);
      return match;
    }
  });
  
  return processed;
}

// Function to process JSON objects recursively
export function processRandomInJSON(obj: any): any {
  if (typeof obj === 'string') {
    return processRandomGenerators(obj);
  } else if (Array.isArray(obj)) {
    return obj.map(item => processRandomInJSON(item));
  } else if (obj && typeof obj === 'object') {
    const processed: any = {};
    for (const key in obj) {
      processed[key] = processRandomInJSON(obj[key]);
    }
    return processed;
  }
  return obj;
}