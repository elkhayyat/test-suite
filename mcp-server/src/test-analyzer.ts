import type { TestRun, StepResult, ConsoleLog } from '../../shared/src/types.js';

interface AnalyzeOptions {
  includeSuccessful?: boolean;
}

export class TestAnalyzer {
  async analyzeRun(testRun: TestRun, options?: AnalyzeOptions): Promise<string> {
    const analysis: string[] = [];
    
    // Header
    analysis.push(`# Test Run Analysis: ${testRun.flowName || testRun.flowId}`);
    analysis.push(`Status: ${testRun.status}`);
    analysis.push(`Duration: ${this.calculateDuration(testRun)}ms`);
    analysis.push('');

    // Overall error if present
    if (testRun.error) {
      analysis.push('## Overall Error');
      analysis.push(testRun.error);
      analysis.push('');
    }

    // Step analysis
    analysis.push('## Step Results');
    for (const stepResult of testRun.results) {
      if (stepResult.status === 'failed' || options?.includeSuccessful) {
        analysis.push(this.analyzeStep(stepResult));
      }
    }

    // Summary and recommendations
    const summary = this.generateSummary(testRun);
    analysis.push('');
    analysis.push('## Summary');
    analysis.push(summary);

    const recommendations = this.generateRecommendations(testRun);
    if (recommendations.length > 0) {
      analysis.push('');
      analysis.push('## Recommendations');
      recommendations.forEach(rec => analysis.push(`- ${rec}`));
    }

    return analysis.join('\n');
  }

  summarizeMultipleRuns(testRuns: TestRun[]): string {
    const summary: string[] = [];
    
    // Overall statistics
    const total = testRuns.length;
    const passed = testRuns.filter(r => r.status === 'completed').length;
    const failed = testRuns.filter(r => r.status === 'failed').length;
    const pending = testRuns.filter(r => r.status === 'pending').length;
    const running = testRuns.filter(r => r.status === 'running').length;

    summary.push('# Test Execution Summary');
    summary.push(`Total flows: ${total}`);
    summary.push(`Passed: ${passed} (${this.percentage(passed, total)}%)`);
    summary.push(`Failed: ${failed} (${this.percentage(failed, total)}%)`);
    if (pending > 0) summary.push(`Pending: ${pending}`);
    if (running > 0) summary.push(`Running: ${running}`);
    summary.push('');

    // Failed flows details
    if (failed > 0) {
      summary.push('## Failed Flows');
      testRuns
        .filter(r => r.status === 'failed')
        .forEach(run => {
          summary.push(`### ${run.flowName || run.flowId}`);
          const failedSteps = run.results.filter(s => s.status === 'failed');
          if (failedSteps.length > 0) {
            failedSteps.forEach(step => {
              summary.push(`- Step ${step.stepId}: ${step.error || 'Unknown error'}`);
            });
          } else if (run.error) {
            summary.push(`- Overall error: ${run.error}`);
          }
          summary.push('');
        });
    }

    // Successful flows summary
    if (passed > 0 && failed === 0) {
      summary.push('## All flows passed successfully! ');
    }

    return summary.join('\n');
  }

  private analyzeStep(stepResult: StepResult): string {
    const lines: string[] = [];
    
    lines.push(`### Step: ${stepResult.stepId}`);
    lines.push(`Status: ${stepResult.status}`);
    
    if (stepResult.duration) {
      lines.push(`Duration: ${stepResult.duration}ms`);
    }

    if (stepResult.error) {
      lines.push('#### Error');
      lines.push(this.formatError(stepResult.error));
    }

    if (stepResult.output) {
      lines.push('#### Output');
      
      // HTTP response details
      if (stepResult.output.status) {
        lines.push(`HTTP Status: ${stepResult.output.status}`);
      }
      
      if (stepResult.output.resolvedConfig) {
        lines.push('Resolved Configuration:');
        lines.push(`- URL: ${stepResult.output.resolvedConfig.url}`);
        lines.push(`- Method: ${stepResult.output.resolvedConfig.method}`);
        if (stepResult.output.resolvedConfig.headers) {
          lines.push('- Headers:');
          Object.entries(stepResult.output.resolvedConfig.headers).forEach(([key, value]) => {
            lines.push(`  - ${key}: ${value}`);
          });
        }
      }

      if (stepResult.output.data) {
        lines.push('Response Data:');
        lines.push('```json');
        lines.push(JSON.stringify(stepResult.output.data, null, 2));
        lines.push('```');
      }
    }

    if (stepResult.logs && stepResult.logs.length > 0) {
      lines.push('#### Console Logs');
      stepResult.logs.forEach(log => {
        lines.push(this.formatLog(log));
      });
    }

    lines.push('');
    return lines.join('\n');
  }

  private formatError(error: string): string {
    // Common error patterns and explanations
    const errorPatterns = [
      {
        pattern: /ECONNREFUSED/,
        explanation: 'Connection refused - The server is not running or not accepting connections on the specified port.',
      },
      {
        pattern: /ETIMEDOUT/,
        explanation: 'Request timeout - The server took too long to respond. Consider increasing the timeout value.',
      },
      {
        pattern: /401|Unauthorized/i,
        explanation: 'Authentication failed - Check your API credentials or authentication token.',
      },
      {
        pattern: /403|Forbidden/i,
        explanation: 'Access forbidden - You don\'t have permission to access this resource.',
      },
      {
        pattern: /404|Not Found/i,
        explanation: 'Resource not found - The URL or endpoint does not exist.',
      },
      {
        pattern: /500|Internal Server Error/i,
        explanation: 'Server error - The server encountered an error processing the request.',
      },
      {
        pattern: /ENOTFOUND/,
        explanation: 'DNS lookup failed - The hostname could not be resolved. Check the URL.',
      },
    ];

    let formattedError = error;
    
    for (const { pattern, explanation } of errorPatterns) {
      if (pattern.test(error)) {
        formattedError += `\n**Explanation**: ${explanation}`;
        break;
      }
    }

    return formattedError;
  }

  private formatLog(log: ConsoleLog): string {
    const timestamp = new Date(log.timestamp).toISOString();
    const level = log.level.toUpperCase();
    let message = `[${timestamp}] ${level}: ${log.message}`;
    
    if (log.details) {
      if (typeof log.details === 'string') {
        message += `\n  ${log.details}`;
      } else {
        message += `\n  ${JSON.stringify(log.details, null, 2)}`;
      }
    }
    
    return message;
  }

  private calculateDuration(testRun: TestRun): number {
    if (testRun.endTime) {
      return new Date(testRun.endTime).getTime() - new Date(testRun.startTime).getTime();
    }
    return 0;
  }

  private generateSummary(testRun: TestRun): string {
    const totalSteps = testRun.results.length;
    const passedSteps = testRun.results.filter(s => s.status === 'passed').length;
    const failedSteps = testRun.results.filter(s => s.status === 'failed').length;
    const skippedSteps = testRun.results.filter(s => s.status === 'skipped').length;

    const lines: string[] = [];
    lines.push(`Total steps: ${totalSteps}`);
    lines.push(`Passed: ${passedSteps} (${this.percentage(passedSteps, totalSteps)}%)`);
    lines.push(`Failed: ${failedSteps} (${this.percentage(failedSteps, totalSteps)}%)`);
    if (skippedSteps > 0) {
      lines.push(`Skipped: ${skippedSteps} (${this.percentage(skippedSteps, totalSteps)}%)`);
    }

    return lines.join('\n');
  }

  private generateRecommendations(testRun: TestRun): string[] {
    const recommendations: string[] = [];

    // Check for timeout issues
    const timeoutErrors = testRun.results.filter(r => 
      r.error && /timeout|ETIMEDOUT/i.test(r.error)
    );
    if (timeoutErrors.length > 0) {
      recommendations.push('Consider increasing timeout values for slow endpoints');
    }

    // Check for authentication issues
    const authErrors = testRun.results.filter(r => 
      r.error && /401|403|unauthorized|forbidden/i.test(r.error)
    );
    if (authErrors.length > 0) {
      recommendations.push('Review authentication configuration and ensure credentials are correct');
    }

    // Check for connection issues
    const connectionErrors = testRun.results.filter(r => 
      r.error && /ECONNREFUSED|ENOTFOUND/i.test(r.error)
    );
    if (connectionErrors.length > 0) {
      recommendations.push('Verify that the target server is running and accessible');
      recommendations.push('Check that URLs and hostnames are correct');
    }

    // Check for server errors
    const serverErrors = testRun.results.filter(r => 
      r.output?.status && r.output.status >= 500
    );
    if (serverErrors.length > 0) {
      recommendations.push('Server errors detected - check server logs for more details');
    }

    // Performance recommendations
    const slowSteps = testRun.results.filter(r => 
      r.duration && r.duration > 5000
    );
    if (slowSteps.length > 0) {
      recommendations.push(`${slowSteps.length} steps took longer than 5 seconds - consider optimizing or adjusting expectations`);
    }

    return recommendations;
  }

  private percentage(value: number, total: number): number {
    if (total === 0) return 0;
    return Math.round((value / total) * 100);
  }
}