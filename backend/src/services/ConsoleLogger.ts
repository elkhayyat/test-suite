import { Server } from 'socket.io';
import { ConsoleLog } from '../../../shared/src/types';

export class ConsoleLogger {
  private logs: Map<string, ConsoleLog[]> = new Map();
  private originalConsole = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error,
    debug: console.debug,
    command: console.log
  };

  constructor(private io: Server) {}

  startCapture(runId: string, stepId: string): void {
    const runKey = `${runId}:${stepId}`;
    this.logs.set(runKey, []);

    // Override console methods to capture output
    const captureLog = (level: ConsoleLog['level']) => {
      return (...args: any[]) => {
        // Call original console method
        this.originalConsole[level](...args);
        
        // Capture the log
        const log: ConsoleLog = {
          timestamp: new Date(),
          level,
          message: args.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
          ).join(' '),
          details: args.length > 1 ? args.slice(1).map(arg => 
            typeof arg === 'object' ? arg : String(arg)
          ).reduce((acc, val, idx) => ({ ...acc, [idx]: val }), {}) : undefined
        };

        const logs = this.logs.get(runKey) || [];
        logs.push(log);
        this.logs.set(runKey, logs);

        // Emit real-time log update
        this.io.emit('console:log', {
          runId,
          stepId,
          log
        });
      };
    };

    // Override all console methods
    console.log = captureLog('log');
    console.info = captureLog('info');
    console.warn = captureLog('warn');
    console.error = captureLog('error');
    console.debug = captureLog('debug');
  }

  stopCapture(): void {
    // Restore original console methods
    console.log = this.originalConsole.log;
    console.info = this.originalConsole.info;
    console.warn = this.originalConsole.warn;
    console.error = this.originalConsole.error;
    console.debug = this.originalConsole.debug;
  }

  getStepLogs(runId: string, stepId: string): ConsoleLog[] {
    const runKey = `${runId}:${stepId}`;
    return this.logs.get(runKey) || [];
  }

  clearStepLogs(runId: string, stepId: string): void {
    const runKey = `${runId}:${stepId}`;
    this.logs.delete(runKey);
  }

  clearRunLogs(runId: string): void {
    // Clear all logs for a specific run
    const keysToDelete: string[] = [];
    for (const key of this.logs.keys()) {
      if (key.startsWith(`${runId}:`)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => this.logs.delete(key));
  }

  log(runId: string, stepId: string, level: ConsoleLog['level'], message: string, details?: any): void {
    const runKey = `${runId}:${stepId}`;
    const logs = this.logs.get(runKey) || [];
    
    const log: ConsoleLog = {
      timestamp: new Date(),
      level,
      message,
      details
    };
    
    logs.push(log);
    this.logs.set(runKey, logs);

    // Emit real-time log update
    this.io.emit('console:log', {
      runId,
      stepId,
      log
    });
  }
}