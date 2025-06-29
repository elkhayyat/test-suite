/**
 * Performance monitoring utilities for large flow operations
 * Provides timing, memory tracking, and performance metrics
 */

export interface PerformanceMetrics {
  operation: string;
  duration: number;
  startTime: number;
  endTime: number;
  nodeCount?: number;
  edgeCount?: number;
  memoryUsage?: {
    before: number;
    after: number;
    delta: number;
  };
  userAgent?: string;
}

export interface PerformanceThresholds {
  warning: number; // milliseconds
  critical: number; // milliseconds
}

// Default performance thresholds for different operations
export const PERFORMANCE_THRESHOLDS: Record<string, PerformanceThresholds> = {
  loadFlow: { warning: 500, critical: 1000 },
  saveFlow: { warning: 300, critical: 800 },
  renderNodes: { warning: 100, critical: 300 },
  executeFlow: { warning: 5000, critical: 15000 },
  importFlow: { warning: 1000, critical: 3000 },
  undoRedo: { warning: 50, critical: 150 },
  bulkOperations: { warning: 200, critical: 500 },
  dragOperations: { warning: 16, critical: 33 }, // 60fps vs 30fps
};

/**
 * Performance timer for measuring operation duration
 */
export class PerformanceTimer {
  private startTime: number;
  private operation: string;
  private metadata: Record<string, any>;

  constructor(operation: string, metadata: Record<string, any> = {}) {
    this.operation = operation;
    this.metadata = metadata;
    this.startTime = performance.now();
  }

  /**
   * End the timer and return performance metrics
   */
  end(): PerformanceMetrics {
    const endTime = performance.now();
    const duration = endTime - this.startTime;

    const metrics: PerformanceMetrics = {
      operation: this.operation,
      duration: Math.round(duration * 100) / 100, // Round to 2 decimal places
      startTime: this.startTime,
      endTime,
      ...this.metadata,
    };

    // Add memory usage if available
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      metrics.memoryUsage = {
        before: this.metadata.memoryBefore || 0,
        after: memory.usedJSHeapSize,
        delta: memory.usedJSHeapSize - (this.metadata.memoryBefore || 0),
      };
    }

    // Add user agent for performance analytics
    metrics.userAgent = navigator.userAgent;

    return metrics;
  }
}

/**
 * Hook for monitoring performance of operations
 */
export function usePerformanceTimer() {
  /**
   * Start a performance timer
   */
  const startTimer = (operation: string, metadata: Record<string, any> = {}): PerformanceTimer => {
    // Add initial memory usage if available
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      metadata.memoryBefore = memory.usedJSHeapSize;
    }

    return new PerformanceTimer(operation, metadata);
  };

  /**
   * Measure a synchronous operation
   */
  const measureSync = <T>(
    operation: string,
    fn: () => T,
    metadata: Record<string, any> = {}
  ): { result: T; metrics: PerformanceMetrics } => {
    const timer = startTimer(operation, metadata);
    const result = fn();
    const metrics = timer.end();
    
    logPerformanceMetrics(metrics);
    return { result, metrics };
  };

  /**
   * Measure an asynchronous operation
   */
  const measureAsync = async <T>(
    operation: string,
    fn: () => Promise<T>,
    metadata: Record<string, any> = {}
  ): Promise<{ result: T; metrics: PerformanceMetrics }> => {
    const timer = startTimer(operation, metadata);
    const result = await fn();
    const metrics = timer.end();
    
    logPerformanceMetrics(metrics);
    return { result, metrics };
  };

  return { startTimer, measureSync, measureAsync };
}

/**
 * Log performance metrics with appropriate severity level
 */
export function logPerformanceMetrics(metrics: PerformanceMetrics): void {
  const thresholds = PERFORMANCE_THRESHOLDS[metrics.operation] || 
                    PERFORMANCE_THRESHOLDS.loadFlow; // Default threshold

  const logData = {
    operation: metrics.operation,
    duration: `${metrics.duration}ms`,
    nodeCount: metrics.nodeCount,
    edgeCount: metrics.edgeCount,
    memoryDelta: metrics.memoryUsage ? `${(metrics.memoryUsage.delta / 1024 / 1024).toFixed(2)}MB` : undefined,
  };

  if (metrics.duration >= thresholds.critical) {
    console.error('🔴 Critical Performance Issue:', logData);
  } else if (metrics.duration >= thresholds.warning) {
    console.warn('🟡 Performance Warning:', logData);
  } else {
    console.log('🟢 Performance OK:', logData);
  }
}

/**
 * Performance monitoring for React components
 */
export function useComponentPerformance(componentName: string) {
  const renderCount = React.useRef(0);
  const lastRenderTime = React.useRef(performance.now());

  React.useEffect(() => {
    renderCount.current++;
    const now = performance.now();
    const timeSinceLastRender = now - lastRenderTime.current;
    lastRenderTime.current = now;

    // Log if renders are happening too frequently (potential infinite render loop)
    if (timeSinceLastRender < 16 && renderCount.current > 5) {
      console.warn(`⚠️ Frequent renders detected in ${componentName}:`, {
        renderCount: renderCount.current,
        timeSinceLastRender: `${timeSinceLastRender.toFixed(2)}ms`,
      });
    }
  });

  return { renderCount: renderCount.current };
}

/**
 * Monitor flow operation performance
 */
export function measureFlowOperation<T>(
  operation: string,
  nodeCount: number,
  edgeCount: number,
  fn: () => T
): { result: T; metrics: PerformanceMetrics } {
  const timer = new PerformanceTimer(operation, { nodeCount, edgeCount });
  const result = fn();
  const metrics = timer.end();
  
  logPerformanceMetrics(metrics);
  return { result, metrics };
}

/**
 * Monitor async flow operation performance
 */
export async function measureFlowOperationAsync<T>(
  operation: string,
  nodeCount: number,
  edgeCount: number,
  fn: () => Promise<T>
): Promise<{ result: T; metrics: PerformanceMetrics }> {
  const timer = new PerformanceTimer(operation, { nodeCount, edgeCount });
  const result = await fn();
  const metrics = timer.end();
  
  logPerformanceMetrics(metrics);
  return { result, metrics };
}

/**
 * Frame rate monitor for smooth interactions
 */
export class FrameRateMonitor {
  private frames: number = 0;
  private lastTime: number = performance.now();
  private fps: number = 0;
  private animationFrame?: number;

  start(): void {
    const updateFPS = (currentTime: number) => {
      this.frames++;
      const deltaTime = currentTime - this.lastTime;

      if (deltaTime >= 1000) { // Update every second
        this.fps = Math.round((this.frames * 1000) / deltaTime);
        
        if (this.fps < 30) {
          console.warn('🔴 Low FPS detected:', this.fps);
        } else if (this.fps < 50) {
          console.warn('🟡 Suboptimal FPS:', this.fps);
        }

        this.frames = 0;
        this.lastTime = currentTime;
      }

      this.animationFrame = requestAnimationFrame(updateFPS);
    };

    this.animationFrame = requestAnimationFrame(updateFPS);
  }

  stop(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
  }

  getCurrentFPS(): number {
    return this.fps;
  }
}

/**
 * Debounced performance logger to prevent spam
 */
export const debouncedPerformanceLog = (() => {
  let timeoutId: NodeJS.Timeout;
  const pendingLogs: PerformanceMetrics[] = [];

  return (metrics: PerformanceMetrics) => {
    pendingLogs.push(metrics);

    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      if (pendingLogs.length > 0) {
        console.group('📊 Performance Summary');
        pendingLogs.forEach(m => logPerformanceMetrics(m));
        console.groupEnd();
        pendingLogs.length = 0;
      }
    }, 1000);
  };
})();

// React import for useComponentPerformance
import React from 'react';