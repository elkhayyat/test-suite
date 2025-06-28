import { Node, Edge } from 'react-flow-renderer';
import { useUndoRedo } from './useUndoRedo';
import { useCallback } from 'react';
import { ensurePosition } from '../utils/positionUtils';

export interface FlowState {
  nodes: Node[];
  edges: Edge[];
}

/**
 * Custom hook for undo/redo operations specific to flow editing
 */
export function useFlowUndoRedo(initialNodes: Node[], initialEdges: Edge[]) {
  const initialState: FlowState = {
    nodes: initialNodes,
    edges: initialEdges,
  };

  const {
    state,
    executeAction,
    undo,
    redo,
    canUndo,
    canRedo,
    clearHistory,
    lastUndoAction,
    lastRedoAction,
  } = useUndoRedo<FlowState>(initialState);

  // Wrapped actions for common flow operations
  const addNode = useCallback((node: Node) => {
    // Ensure the node has a position property
    const nodeWithPosition = {
      ...node,
      position: ensurePosition(node.position)
    };
    const newState: FlowState = {
      nodes: [...state.nodes, nodeWithPosition],
      edges: state.edges,
    };
    executeAction('ADD_NODE', `Add step "${node.data.name}"`, newState);
  }, [state, executeAction]);

  const deleteNode = useCallback((nodeId: string) => {
    const nodeToDelete = state.nodes.find(n => n.id === nodeId);
    const newState: FlowState = {
      nodes: state.nodes.filter(n => n.id !== nodeId),
      edges: state.edges.filter(e => e.source !== nodeId && e.target !== nodeId),
    };
    executeAction(
      'DELETE_NODE', 
      `Delete step "${nodeToDelete?.data.name || nodeId}"`, 
      newState
    );
  }, [state, executeAction]);

  const updateNode = useCallback((nodeId: string, updates: Partial<Node>) => {
    const oldNode = state.nodes.find(n => n.id === nodeId);
    const newState: FlowState = {
      nodes: state.nodes.map(n => n.id === nodeId ? { 
        ...n, 
        ...updates, 
        position: ensurePosition(updates.position || n.position)
      } : n),
      edges: state.edges,
    };
    executeAction(
      'UPDATE_NODE', 
      `Update step "${oldNode?.data.name || nodeId}"`, 
      newState,
      true // Allow merging of consecutive updates
    );
  }, [state, executeAction]);

  const moveNode = useCallback((nodeId: string, position: { x: number; y: number }) => {
    const oldNode = state.nodes.find(n => n.id === nodeId);
    const newState: FlowState = {
      nodes: state.nodes.map(n => n.id === nodeId ? { ...n, position } : n),
      edges: state.edges,
    };
    executeAction(
      'MOVE_NODE', 
      `Move step "${oldNode?.data.name || nodeId}"`, 
      newState,
      true // Allow merging of consecutive moves
    );
  }, [state, executeAction]);

  const addEdge = useCallback((edge: Edge) => {
    const newState: FlowState = {
      nodes: state.nodes,
      edges: [...state.edges, edge],
    };
    executeAction('ADD_EDGE', 'Add connection', newState);
  }, [state, executeAction]);

  const deleteEdge = useCallback((edgeId: string) => {
    const newState: FlowState = {
      nodes: state.nodes,
      edges: state.edges.filter(e => e.id !== edgeId),
    };
    executeAction('DELETE_EDGE', 'Delete connection', newState);
  }, [state, executeAction]);

  const deleteSelectedNodes = useCallback((nodeIds: string[]) => {
    const deletedNodes = state.nodes.filter(n => nodeIds.includes(n.id));
    const newState: FlowState = {
      nodes: state.nodes.filter(n => !nodeIds.includes(n.id)),
      edges: state.edges.filter(e => !nodeIds.includes(e.source) && !nodeIds.includes(e.target)),
    };
    executeAction(
      'DELETE_NODES', 
      `Delete ${deletedNodes.length} step${deletedNodes.length > 1 ? 's' : ''}`, 
      newState
    );
  }, [state, executeAction]);

  const pasteNodes = useCallback((nodesToPaste: Node[], edgesToPaste: Edge[]) => {
    // Ensure all pasted nodes have position
    const nodesWithPosition = nodesToPaste.map(node => ({
      ...node,
      position: ensurePosition(node.position)
    }));
    const newState: FlowState = {
      nodes: [...state.nodes, ...nodesWithPosition],
      edges: [...state.edges, ...edgesToPaste],
    };
    executeAction(
      'PASTE_NODES', 
      `Paste ${nodesToPaste.length} step${nodesToPaste.length > 1 ? 's' : ''}`, 
      newState
    );
  }, [state, executeAction]);

  const replaceAllNodes = useCallback((newNodes: Node[], newEdges: Edge[], description: string) => {
    // Ensure all nodes have position
    const nodesWithPosition = newNodes.map(node => ({
      ...node,
      position: ensurePosition(node.position)
    }));
    const newState: FlowState = {
      nodes: nodesWithPosition,
      edges: newEdges,
    };
    executeAction('REPLACE_ALL', description, newState);
  }, [executeAction]);

  // Reset the state when loading a new flow
  const resetState = useCallback((newNodes: Node[], newEdges: Edge[]) => {
    // Ensure all nodes have position
    const nodesWithPosition = newNodes.map(node => ({
      ...node,
      position: ensurePosition(node.position)
    }));
    const newState: FlowState = {
      nodes: nodesWithPosition,
      edges: newEdges,
    };
    clearHistory();
    executeAction('LOAD_FLOW', 'Load flow', newState);
  }, [executeAction, clearHistory]);

  return {
    nodes: state.nodes,
    edges: state.edges,
    
    // Actions
    addNode,
    deleteNode,
    updateNode,
    moveNode,
    addEdge,
    deleteEdge,
    deleteSelectedNodes,
    pasteNodes,
    replaceAllNodes,
    resetState,
    
    // Undo/Redo
    undo,
    redo,
    canUndo,
    canRedo,
    clearHistory,
    lastUndoAction,
    lastRedoAction,
  };
}

export default useFlowUndoRedo;