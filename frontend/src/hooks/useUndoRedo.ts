import { useState, useCallback, useRef } from 'react';

export interface UndoRedoAction<T = any> {
  type: string;
  description: string;
  previousState: T;
  newState: T;
  timestamp: Date;
}

export interface UndoRedoOptions {
  maxHistorySize?: number;
}

/**
 * Custom hook for implementing undo/redo functionality
 * @param initialState The initial state
 * @param options Configuration options
 */
export function useUndoRedo<T>(
  initialState: T,
  options: UndoRedoOptions = {}
) {
  const { maxHistorySize = 50 } = options;
  
  const [currentState, setCurrentState] = useState<T>(initialState);
  const [undoStack, setUndoStack] = useState<UndoRedoAction<T>[]>([]);
  const [redoStack, setRedoStack] = useState<UndoRedoAction<T>[]>([]);
  const isUndoRedoOperation = useRef(false);

  const executeAction = useCallback((
    type: string,
    description: string,
    newState: T,
    merge: boolean = false
  ) => {
    // Don't record undo/redo operations themselves
    if (isUndoRedoOperation.current) {
      setCurrentState(newState);
      return;
    }

    const action: UndoRedoAction<T> = {
      type,
      description,
      previousState: currentState,
      newState,
      timestamp: new Date(),
    };

    setUndoStack(prev => {
      let newStack = [...prev];
      
      // If merge is true, try to merge with the last action of the same type
      if (merge && newStack.length > 0) {
        const lastAction = newStack[newStack.length - 1];
        if (lastAction.type === type && 
            Date.now() - lastAction.timestamp.getTime() < 1000) { // Merge within 1 second
          // Replace the last action with the merged one
          newStack[newStack.length - 1] = {
            ...lastAction,
            newState,
            timestamp: new Date(),
          };
          setCurrentState(newState);
          return newStack;
        }
      }

      newStack.push(action);
      
      // Limit history size
      if (newStack.length > maxHistorySize) {
        newStack = newStack.slice(-maxHistorySize);
      }
      
      setCurrentState(newState);
      return newStack;
    });

    // Clear redo stack when new action is performed
    setRedoStack([]);
  }, [currentState, maxHistorySize]);

  const undo = useCallback(() => {
    if (undoStack.length === 0) return false;

    const lastAction = undoStack[undoStack.length - 1];
    
    isUndoRedoOperation.current = true;
    setCurrentState(lastAction.previousState);
    isUndoRedoOperation.current = false;

    setUndoStack(prev => prev.slice(0, -1));
    setRedoStack(prev => [...prev, lastAction]);

    return true;
  }, [undoStack]);

  const redo = useCallback(() => {
    if (redoStack.length === 0) return false;

    const lastAction = redoStack[redoStack.length - 1];
    
    isUndoRedoOperation.current = true;
    setCurrentState(lastAction.newState);
    isUndoRedoOperation.current = false;

    setRedoStack(prev => prev.slice(0, -1));
    setUndoStack(prev => [...prev, lastAction]);

    return true;
  }, [redoStack]);

  const clearHistory = useCallback(() => {
    setUndoStack([]);
    setRedoStack([]);
  }, []);

  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;
  
  const lastUndoAction = undoStack.length > 0 ? undoStack[undoStack.length - 1] : null;
  const lastRedoAction = redoStack.length > 0 ? redoStack[redoStack.length - 1] : null;

  return {
    state: currentState,
    executeAction,
    undo,
    redo,
    canUndo,
    canRedo,
    clearHistory,
    undoStack,
    redoStack,
    lastUndoAction,
    lastRedoAction,
  };
}

export default useUndoRedo;