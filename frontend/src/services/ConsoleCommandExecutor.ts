import { ConsoleLog, StepResult, EnvironmentVariable } from '../../../shared/src/types';

export interface CommandContext {
  environmentVariables?: EnvironmentVariable[];
  stepResults?: { [stepId: string]: StepResult };
  lastOutput?: any;
  currentStep?: string;
}

export class ConsoleCommandExecutor {
  private context: CommandContext;

  constructor(context: CommandContext = {}) {
    this.context = context;
  }

  updateContext(context: Partial<CommandContext>) {
    this.context = { ...this.context, ...context };
  }

  executeCommand(command: string): ConsoleLog[] {
    const logs: ConsoleLog[] = [];
    const timestamp = new Date();

    // Add command to logs
    logs.push({
      timestamp,
      level: 'command',
      message: command
    });

    try {
      const [cmd, ...args] = command.trim().split(/\s+/);
      const result = this.handleCommand(cmd.toLowerCase(), args);
      
      if (result) {
        logs.push({
          timestamp: new Date(),
          level: 'info',
          message: typeof result === 'string' ? result : 'Result:',
          details: typeof result === 'string' ? undefined : result
        });
      }
    } catch (error) {
      logs.push({
        timestamp: new Date(),
        level: 'error',
        message: error instanceof Error ? error.message : 'Command execution failed'
      });
    }

    return logs;
  }

  private handleCommand(cmd: string, args: string[]): any {
    switch (cmd) {
      case 'help':
        return this.showHelp();
      
      case 'vars':
      case 'variables':
        return this.listVariables();
      
      case 'get':
        return this.getVariable(args[0]);
      
      case 'steps':
        return this.listSteps();
      
      case 'step':
        return this.getStepDetails(args[0]);
      
      case 'output':
        return this.getStepOutput(args[0]);
      
      case 'json':
        return this.parseJsonPath(args.join('.'));
      
      case 'clear':
        // Clear is handled by the parent component
        return 'Console cleared';
      
      default:
        throw new Error(`Unknown command: ${cmd}. Type 'help' for available commands.`);
    }
  }

  private showHelp(): string {
    return `Available Commands:
• vars - List all available variables
• get [variable] - Get value of a variable (e.g., get baseUrl)
• steps - List all executed steps
• step [id] - Get details of a specific step
• output [stepId] - Get output of a specific step
• json [path] - Parse JSON from last output (e.g., json data.id)
• clear - Clear console
• help - Show this help`;
  }

  private listVariables(): any {
    const { environmentVariables = [] } = this.context;
    
    if (environmentVariables.length === 0) {
      return 'No environment variables available';
    }

    const vars: Record<string, any> = {};
    environmentVariables.forEach(v => {
      vars[v.key] = v.isSecret ? '***' : v.value;
    });

    return vars;
  }

  private getVariable(varName: string): any {
    if (!varName) {
      throw new Error('Variable name required. Usage: get [variable]');
    }

    const { environmentVariables = [] } = this.context;
    const variable = environmentVariables.find(v => v.key === varName);

    if (!variable) {
      throw new Error(`Variable '${varName}' not found`);
    }

    return {
      key: variable.key,
      value: variable.isSecret ? '***' : variable.value,
      isSecret: variable.isSecret
    };
  }

  private listSteps(): any {
    const { stepResults = {} } = this.context;
    const steps = Object.entries(stepResults);

    if (steps.length === 0) {
      return 'No steps have been executed yet';
    }

    return steps.map(([stepId, result]) => ({
      id: stepId,
      status: result.status,
      duration: result.endTime && result.startTime 
        ? new Date(result.endTime).getTime() - new Date(result.startTime).getTime() 
        : null,
      hasOutput: !!result.output,
      hasError: !!result.error
    }));
  }

  private getStepDetails(stepId: string): any {
    if (!stepId) {
      throw new Error('Step ID required. Usage: step [id]');
    }

    const { stepResults = {} } = this.context;
    const result = stepResults[stepId];

    if (!result) {
      throw new Error(`Step '${stepId}' not found`);
    }

    return {
      stepId: result.stepId,
      status: result.status,
      startTime: result.startTime,
      endTime: result.endTime,
      duration: result.endTime && result.startTime 
        ? new Date(result.endTime).getTime() - new Date(result.startTime).getTime() + 'ms'
        : null,
      error: result.error,
      hasOutput: !!result.output,
      logsCount: result.logs?.length || 0
    };
  }

  private getStepOutput(stepId: string): any {
    if (!stepId) {
      // If no stepId provided, return last output
      const { lastOutput } = this.context;
      if (!lastOutput) {
        throw new Error('No output available. Run a step first.');
      }
      return lastOutput;
    }

    const { stepResults = {} } = this.context;
    const result = stepResults[stepId];

    if (!result) {
      throw new Error(`Step '${stepId}' not found`);
    }

    if (!result.output) {
      throw new Error(`Step '${stepId}' has no output`);
    }

    // Update last output for json command
    this.context.lastOutput = result.output;

    return result.output;
  }

  private parseJsonPath(path: string): any {
    const { lastOutput } = this.context;
    
    if (!lastOutput) {
      throw new Error('No output to parse. Run a step first or use "output [stepId]"');
    }

    if (!path) {
      // Return formatted JSON
      return JSON.stringify(lastOutput, null, 2);
    }

    // Parse JSON path (simple implementation)
    const keys = path.split('.');
    let current = lastOutput;

    for (const key of keys) {
      if (current === null || current === undefined) {
        throw new Error(`Cannot access property '${key}' of ${current}`);
      }

      // Handle array access like items[0]
      const arrayMatch = key.match(/^(\w+)\[(\d+)\]$/);
      if (arrayMatch) {
        const [, arrayKey, index] = arrayMatch;
        current = current[arrayKey];
        if (!Array.isArray(current)) {
          throw new Error(`'${arrayKey}' is not an array`);
        }
        current = current[parseInt(index)];
      } else {
        current = current[key];
      }
    }

    return current;
  }
}