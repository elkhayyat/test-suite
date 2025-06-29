/**
 * Performance monitoring hook specifically for FlowEditor operations
 * Provides comprehensive performance tracking for large flow operations
 */

import { useEffect, useRef, useCallback } from 'react';
import { 
  PerformanceTimer, 
  FrameRateMonitor, 
  logPerformanceMetrics,
  PERFORMANCE_THRESHOLDS 
} from '../utils/performanceUtils';

export interface FlowPerformanceStats {
  nodeCount: number;
  edgeCount: number;
  renderCount: number;
  lastRenderTime: number;
  avgRenderTime: number;
  memoryUsage?: number;
  fps?: number;
}

export function useFlowPerformanceMonitoring(nodeCount: number, edgeCount: number) {
  const renderTimings = useRef<number[]>([]);
  const renderCount = useRef(0);
  const frameRateMonitor = useRef<FrameRateMonitor | null>(null);
  const performanceWarnings = useRef(new Set<string>());

  // Initialize frame rate monitoring
  useEffect(() => {
    frameRateMonitor.current = new FrameRateMonitor();
    frameRateMonitor.current.start();

    return () => {
      frameRateMonitor.current?.stop();
    };
  }, []);

  // Monitor render performance
  const measureRender = useCallback(() => {
    const startTime = performance.now();
    renderCount.current++;

    // Return a function to call when render is complete
    return () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // Keep last 10 render timings for average calculation
      renderTimings.current.push(renderTime);
      if (renderTimings.current.length > 10) {
        renderTimings.current.shift();
      }

      // Log performance warnings for large flows
      if (nodeCount > 100 && renderTime > PERFORMANCE_THRESHOLDS.renderNodes.warning) {
        const warningKey = `render-${Math.floor(renderTime / 100) * 100}ms`;
        if (!performanceWarnings.current.has(warningKey)) {
          console.warn(`🟡 Slow render detected with ${nodeCount} nodes: ${renderTime.toFixed(2)}ms`);
          performanceWarnings.current.add(warningKey);
        }
      }
    };
  }, [nodeCount]);

  // Get current performance stats
  const getPerformanceStats = useCallback((): FlowPerformanceStats => {
    const avgRenderTime = renderTimings.current.length > 0 
      ? renderTimings.current.reduce((a, b) => a + b, 0) / renderTimings.current.length 
      : 0;

    const stats: FlowPerformanceStats = {
      nodeCount,
      edgeCount,
      renderCount: renderCount.current,
      lastRenderTime: renderTimings.current[renderTimings.current.length - 1] || 0,
      avgRenderTime,
      fps: frameRateMonitor.current?.getCurrentFPS(),
    };

    // Add memory usage if available
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      stats.memoryUsage = memory.usedJSHeapSize;
    }

    return stats;
  }, [nodeCount, edgeCount]);

  // Log performance summary when component unmounts or flow size changes significantly
  useEffect(() => {
    return () => {
      const stats = getPerformanceStats();
      if (renderCount.current > 0 && (nodeCount > 50 || edgeCount > 50)) {
        console.group('📊 Flow Performance Summary');
        console.log('Flow Size:', { nodes: nodeCount, edges: edgeCount });
        console.log('Render Performance:', {
          totalRenders: stats.renderCount,
          avgRenderTime: `${stats.avgRenderTime.toFixed(2)}ms`,
          lastRenderTime: `${stats.lastRenderTime.toFixed(2)}ms`,
        });
        if (stats.fps) {
          console.log('Frame Rate:', `${stats.fps} FPS`);
        }
        if (stats.memoryUsage) {
          console.log('Memory Usage:', `${(stats.memoryUsage / 1024 / 1024).toFixed(2)}MB`);
        }
        console.groupEnd();
      }
    };
  }, [nodeCount, edgeCount, getPerformanceStats]);

  // Warn about potential performance issues
  useEffect(() => {
    const totalNodes = nodeCount + edgeCount;
    
    if (totalNodes > 500 && !performanceWarnings.current.has('large-flow')) {
      console.warn(`⚠️ Large flow detected: ${nodeCount} nodes, ${edgeCount} edges. Consider flow optimization.`);
      performanceWarnings.current.add('large-flow');
    }
    
    if (totalNodes > 1000 && !performanceWarnings.current.has('very-large-flow')) {
      console.error(`🔴 Very large flow detected: ${nodeCount} nodes, ${edgeCount} edges. Performance may be severely impacted.`);
      performanceWarnings.current.add('very-large-flow');
    }
  }, [nodeCount, edgeCount]);

  return {
    measureRender,
    getPerformanceStats,
    renderCount: renderCount.current,
    avgRenderTime: renderTimings.current.length > 0 
      ? renderTimings.current.reduce((a, b) => a + b, 0) / renderTimings.current.length 
      : 0,
  };
}

/**
 * Performance monitoring for bulk operations
 */
export function useBulkOperationMonitoring() {
  const measureBulkOperation = useCallback(<T>(
    operationName: string,
    itemCount: number,
    operation: () => T
  ): T => {
    const timer = new PerformanceTimer(operationName, { itemCount });
    const result = operation();
    const metrics = timer.end();
    
    // Log performance for bulk operations
    if (itemCount > 10) {
      logPerformanceMetrics(metrics);
      
      const timePerItem = metrics.duration / itemCount;
      if (timePerItem > 10) { // More than 10ms per item
        console.warn(`🟡 Slow bulk operation: ${timePerItem.toFixed(2)}ms per item`);
      }
    }
    
    return result;
  }, []);

  const measureBulkOperationAsync = useCallback(async <T>(
    operationName: string,
    itemCount: number,
    operation: () => Promise<T>
  ): Promise<T> => {
    const timer = new PerformanceTimer(operationName, { itemCount });
    const result = await operation();
    const metrics = timer.end();
    
    // Log performance for bulk operations
    if (itemCount > 10) {
      logPerformanceMetrics(metrics);
      
      const timePerItem = metrics.duration / itemCount;
      if (timePerItem > 10) { // More than 10ms per item
        console.warn(`🟡 Slow bulk operation: ${timePerItem.toFixed(2)}ms per item`);
      }
    }
    
    return result;
  }, []);

  return {
    measureBulkOperation,
    measureBulkOperationAsync,
  };
}