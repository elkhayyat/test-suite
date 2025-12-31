import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  Node,
  Edge,
  Connection as ReactFlowConnection,
  useNodesState,
  useEdgesState,
} from 'react-flow-renderer';
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Box, Snackbar, Alert } from '@mui/material';
import { TestStep, TestRun, StepResult, ConsoleLog, HttpStepConfig, BrowserStepConfig, DelayStepConfig, AssertionStepConfig, ConditionStepConfig, SqlStepConfig, Connection } from '../../../shared/src/types';
import { api } from '../services/api';
import StepPanel from '../components/StepPanel';
import StepConfigPanel from '../components/StepConfigPanel';
import { useSocket } from '../hooks/useSocket';
import { useEnvironment } from '../contexts/EnvironmentContext';
import ContextMenu from '../components/ContextMenu';
import { ConsoleCommandExecutor } from '../services/ConsoleCommandExecutor';
import OpenAPIImportDialog from '../components/OpenAPIImportDialog';
import useDebounce from '../hooks/useDebounce';
import useKeyboardShortcuts, { KeyboardShortcutGroup, commonShortcuts } from '../hooks/useKeyboardShortcuts';
import KeyboardShortcutsDialog from '../components/KeyboardShortcutsDialog';
import useFlowUndoRedo from '../hooks/useFlowUndoRedo';
import useMultiSelection from '../hooks/useMultiSelection';
import BulkOperationsBar from '../components/BulkOperationsBar';
import { useFlowEditorState } from '../hooks/useFlowEditorState';
import { useAsyncOperations } from '../hooks/useAsyncOperation';
import LoadingOverlay from '../components/LoadingOverlay';
import { ComponentErrorBoundary } from '../components/ErrorBoundary';
import FlowToolbar from '../components/FlowToolbar';
import FlowCanvas from '../components/FlowCanvas';
import FlowConsole from '../components/FlowConsole';
import { 
  ensurePosition, 
  ensureInitialPosition, 
  calculateOffsetPosition, 
  calculateGridPosition, 
  calculateDropPosition 
} from '../utils/positionUtils';
import { 
  usePerformanceTimer, 
  useComponentPerformance
} from '../utils/performanceUtils';
import { 
  useFlowPerformanceMonitoring, 
  useBulkOperationMonitoring 
} from '../hooks/useFlowPerformanceMonitoring';


export default function FlowEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  
  // Performance monitoring
  const { measureSync, measureAsync } = usePerformanceTimer();
  useComponentPerformance('FlowEditor');
  
  let selectedEnvironment = '';
  let environmentVariables: any = {};
  try {
    const envContext = useEnvironment();
    selectedEnvironment = envContext.selectedEnvironment;
    environmentVariables = envContext.environmentVariables;
  } catch (error) {
    console.error('Failed to load environment context:', error);
  }
  // Use undo/redo enabled flow state management
  const flowUndoRedo = useFlowUndoRedo([], []);
  const { 
    nodes: undoNodes, 
    edges: undoEdges, 
    addNode: undoableAddNode,
    deleteNode: undoableDeleteNode,
    updateNode: undoableUpdateNode,
    moveNode: undoableMoveNode,
    addEdge: undoableAddEdge,
    deleteSelectedNodes: undoableDeleteSelectedNodes,
    resetState: undoableResetState,
    undo,
    redo,
    canUndo,
    canRedo,
    lastUndoAction,
    lastRedoAction
  } = flowUndoRedo;

  // Use ReactFlow's native state management for smooth dragging
  const [nodes, setNodes, onNodesChange] = useNodesState(undoNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(undoEdges);

  // Sync undo/redo state to ReactFlow state
  useEffect(() => {
    setNodes(undoNodes);
  }, [undoNodes, setNodes]);

  useEffect(() => {
    setEdges(undoEdges);
  }, [undoEdges, setEdges]);

  // Flow-specific performance monitoring
  useFlowPerformanceMonitoring(nodes.length, edges.length);
  const { measureBulkOperation } = useBulkOperationMonitoring();

  // Use optimized state management
  const {
    flowEditState,
    uiState,
    testExecutionState,
    flowEditActions,
    uiActions,
    testExecutionActions,
  } = useFlowEditorState();

  // Extract state values for easier access
  const {
    flowName,
    flowDescription,
    tempFlowName,
    tempFlowDescription,
    saveStatus,
    lastSaved,
  } = flowEditState;

  const {
    selectedNode,
    contextMenu,
    contextMenuNode,
    consoleOpen,
    openAPIDialogOpen,
    shortcutsDialogOpen,
    selectionMode,
    autoSaveEnabled,
  } = uiState;

  const {
    currentRun,
    stepResults,
    consoleLogs,
  } = testExecutionState;

  // Clipboard state (keeping separate as it's simple and has special localStorage logic)
  const [clipboard, setClipboard] = useState<TestStep[] | null>(() => {
    const saved = localStorage.getItem('stepClipboard');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Handle legacy single-item format
      return Array.isArray(parsed) ? parsed : [parsed];
    }
    return null;
  });

  // Helper function to update clipboard and localStorage
  const updateClipboard = (steps: TestStep[] | TestStep | null) => {
    const clipboardData = steps === null ? null : Array.isArray(steps) ? steps : [steps];
    setClipboard(clipboardData);
    if (clipboardData) {
      localStorage.setItem('stepClipboard', JSON.stringify(clipboardData));
    } else {
      localStorage.removeItem('stepClipboard');
    }
  };

  // Snackbar state (keeping separate as it's UI feedback)
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity?: 'success' | 'info' | 'warning' | 'error' }>({ open: false, message: '' });
  
  // Debounced save status setter to prevent excessive re-renders
  const debouncedSetSaveStatus = useDebounce((status: 'saved' | 'saving' | 'unsaved') => {
    flowEditActions.setSaveStatus(status);
  }, 100);

  const isInitialLoadRef = useRef(true);
  const currentRunRef = useRef<TestRun | null>(currentRun);
  
  // Update ref when currentRun changes
  useEffect(() => {
    currentRunRef.current = currentRun;
  }, [currentRun]);

  const socket = useSocket();
  const [commandExecutor] = useState(() => new ConsoleCommandExecutor());

  // Async operations with loading states
  const { createOperation } = useAsyncOperations();
  
  const loadFlowOperation = createOperation('loadFlow', api.getFlow.bind(api));
  const saveFlowOperation = createOperation('saveFlow', async (flow: any) => {
    if (id && id !== 'new') {
      return await api.updateFlow(id, flow);
    } else {
      return await api.createFlow(flow);
    }
  });
  const runFlowOperation = createOperation('runFlow', api.startRun.bind(api));

  // Multi-selection for bulk operations
  const multiSelection = useMultiSelection(nodes, (node) => node.id);
  const {
    selectedItems: selectedNodes,
    isItemSelected,
    toggleItemById,
    selectAll,
    selectNone,
    hasSelection,
    selectionCount,
    isAllSelected,
  } = multiSelection;

  // Debounced auto-save function
  const debouncedAutoSave = useDebounce(async () => {
    if (!autoSaveEnabled || !id || id === 'new') {
      return;
    }

    flowEditActions.setSaveStatus('saving');
    try {
      await handleSave(true);
      flowEditActions.setSaveStatus('saved');
      flowEditActions.setLastSaved(new Date());
    } catch (error) {
      console.error('Auto-save failed:', error);
      flowEditActions.setSaveStatus('unsaved');
      setSnackbar({ open: true, message: 'Auto-save failed', severity: 'error' });
    }
  }, 2000);

  // Debounced flow name update
  const debouncedUpdateFlowName = useDebounce((name: string) => {
    flowEditActions.setFlowName(name);
  }, 300);

  // Debounced flow description update
  const debouncedUpdateFlowDescription = useDebounce((description: string) => {
    flowEditActions.setFlowDescription(description);
  }, 300);

  useEffect(() => {
    // Check if we're on the new flow path (either by id="new" or pathname="/flows/new")
    const isNewFlow = id === 'new' || location.pathname === '/flows/new';
    
    // Clear multi-selection state when switching between flows
    if (hasSelection) {
      selectNone();
      uiActions.setSelectionMode(false);
    }
    
    if (id && id !== 'new' && !isNewFlow) {
      loadFlow(id);
    } else if (isNewFlow) {
      // Reset state for new flow creation
      flowEditActions.resetFlow('New Flow', '');
      undoableResetState([], []);
      uiActions.setSelectedNode(null);
      testExecutionActions.clearStepResults();
      testExecutionActions.setCurrentRun(null);
      testExecutionActions.clearConsoleLogs();
      
      // Mark initial load complete
      setTimeout(() => {
        isInitialLoadRef.current = false;
      }, 100);
    }
  }, [id, searchParams, location.pathname, hasSelection, selectNone, uiActions]);

  // Handle debounced flow name updates
  useEffect(() => {
    debouncedUpdateFlowName(tempFlowName);
  }, [tempFlowName, debouncedUpdateFlowName]);

  // Handle debounced flow description updates
  useEffect(() => {
    debouncedUpdateFlowDescription(tempFlowDescription);
  }, [tempFlowDescription, debouncedUpdateFlowDescription]);

  // Auto-save effect
  useEffect(() => {
    // Skip auto-save during initial load
    if (isInitialLoadRef.current) {
      return;
    }

    // Skip if auto-save is disabled or it's a new flow
    if (!autoSaveEnabled || !id || id === 'new') {
      return;
    }

    // Mark as unsaved immediately
    flowEditActions.setSaveStatus('unsaved');

    // Trigger debounced auto-save
    debouncedAutoSave();
  }, [nodes, edges, flowName, flowDescription, autoSaveEnabled, id, debouncedAutoSave]);

  // Toggle auto-save
  const toggleAutoSave = () => {
    const newValue = !autoSaveEnabled;
    uiActions.setAutoSaveEnabled(newValue);
    if (newValue) {
      setSnackbar({ open: true, message: 'Auto-save enabled', severity: 'success' });
    } else {
      setSnackbar({ open: true, message: 'Auto-save disabled', severity: 'info' });
    }
  };


  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+S or Cmd+S to save
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nodes, edges, flowName, flowDescription]); // Dependencies for handleSave

  // Memoized socket event handlers to prevent recreation
  const socketHandlers = useMemo(() => ({
    onRunStarted: (run: TestRun) => {
      if (run.flowId === id) {
        testExecutionActions.setCurrentRun(run);
        
        // Only clear step results and console logs for full flow runs, not single step runs
        if (!run.selectedSteps || run.selectedSteps.length === 0) {
          testExecutionActions.clearStepResults();
          testExecutionActions.clearConsoleLogs();
        }
        setSnackbar({ open: true, message: 'Test run started', severity: 'info' });
      }
    },
    
    onRunUpdated: (run: TestRun) => {
      if (run.flowId === id && run.id === currentRun?.id) {
        testExecutionActions.setCurrentRun(run);
        
        // Update step results - merge with existing results for single step runs
        if (run.selectedSteps && run.selectedSteps.length > 0) {
          // Single step run - merge new results with existing ones
          run.results.forEach(result => {
            testExecutionActions.updateStepResult(result.stepId, result);
          });
        } else {
          // Full flow run - replace all results
          const results: { [stepId: string]: StepResult } = {};
          run.results.forEach(result => {
            results[result.stepId] = result;
          });
          testExecutionActions.setStepResults(results);
        }
        
        // Show completion message
        if (run.status === 'completed') {
          setSnackbar({ open: true, message: 'Test run completed', severity: 'success' });
        } else if (run.status === 'failed') {
          setSnackbar({ open: true, message: 'Test run failed', severity: 'error' });
        }
      }
    },
    
    onStepUpdated: (data: { runId: string; stepId: string; result: StepResult }) => {
      if (currentRunRef.current?.id === data.runId) {
        testExecutionActions.updateStepResult(data.stepId, data.result);
        
        // Show notification for step completion/failure
        if (data.result.status === 'failed') {
          // Find the step name
          const step = nodes.find(node => node.data.id === data.stepId);
          const stepName = step?.data.name || `Step ${data.stepId.substring(0, 8)}`;
          const errorMessage = data.result.error || 'Unknown error';
          
          setSnackbar({ 
            open: true, 
            message: `${stepName} failed: ${errorMessage}`, 
            severity: 'error' 
          });
        } else if (data.result.status === 'passed') {
          // Find the step name
          const step = nodes.find(node => node.data.id === data.stepId);
          const stepName = step?.data.name || `Step ${data.stepId.substring(0, 8)}`;
          
          setSnackbar({ 
            open: true, 
            message: `${stepName} completed successfully`, 
            severity: 'success' 
          });
        }
        
        // Add step logs to console
        if (data.result.logs && data.result.logs.length > 0) {
          testExecutionActions.addConsoleLogs(data.result.logs);
        }
      }
    },
    
    onConsoleLog: (data: { runId: string; stepId: string; log: ConsoleLog }) => {
      if (currentRunRef.current?.id === data.runId) {
        testExecutionActions.addConsoleLogs([data.log]);
      }
    }
  }), [id, nodes, testExecutionActions, stepResults, currentRun]);

  // WebSocket event listeners for real-time test results with memoized handlers
  useEffect(() => {
    if (!socket) {
      return;
    }

    socket.on('connect', () => {
      // Socket connected
    });

    socket.on('disconnect', () => {
      // Socket disconnected
    });

    socket.on('run:started', socketHandlers.onRunStarted);
    socket.on('run:updated', socketHandlers.onRunUpdated);
    socket.on('step:updated', socketHandlers.onStepUpdated);
    socket.on('console:log', socketHandlers.onConsoleLog);

    return () => {
      socket.off('run:started');
      socket.off('run:updated');
      socket.off('step:updated');
      socket.off('console:log');
      // Clean up ref to prevent memory leaks
      currentRunRef.current = null;
    };
  }, [socket, socketHandlers]);

  // Update nodes with step results
  useEffect(() => {
    // Note: Node updates with step results are handled via direct state updates
    // since they don't need to be tracked in undo/redo history
    // This effect updates nodes with test results - we'll handle this differently
    // to avoid conflicts with the undo/redo system
  }, [stepResults, currentRun]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      try {
        // Check if user is typing in an input field
        if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') {
          return;
        }

        // Copy (Cmd/Ctrl + C)
        if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
          if (hasSelection && selectedNodes.length > 0) {
            // Copy multiple selected nodes
            const steps = selectedNodes.map(node => node.data as TestStep);
            updateClipboard(steps);
            setSnackbar({ 
              open: true, 
              message: `Copied ${selectedNodes.length === 1 ? `"${steps[0].name}"` : `${selectedNodes.length} steps`}`, 
              severity: 'success' 
            });
          } else if (selectedNode) {
            // Copy single selected node
            updateClipboard(selectedNode.data as TestStep);
            setSnackbar({ open: true, message: `Copied "${selectedNode.data.name}"`, severity: 'success' });
          }
        }

        // Paste (Cmd/Ctrl + V)
        if ((e.metaKey || e.ctrlKey) && e.key === 'v' && clipboard && clipboard.length > 0) {
          const basePosition = selectedNode?.position || { x: 100, y: 100 };
          const newNodes: Node[] = [];
          
          clipboard.forEach((step, index) => {
            const timestamp = Date.now() + index;
            const newNode: Node = {
              id: `${timestamp}`,
              type: 'testStep',
              position: {
                x: basePosition.x + (index * 50), // Offset horizontally
                y: basePosition.y + (index * 100), // Offset vertically
              },
              data: {
                ...step,
                id: `${timestamp}`,
                name: `${step.name} (Copy)`,
              },
            };
            newNodes.push(newNode);
          });
          
          // Add all nodes
          newNodes.forEach(node => undoableAddNode(node));
          
          setSnackbar({ 
            open: true, 
            message: `Pasted ${clipboard.length === 1 ? `"${clipboard[0].name}"` : `${clipboard.length} steps`}`, 
            severity: 'success' 
          });
          debouncedSetSaveStatus('unsaved');
        }

        // Delete (Delete or Backspace)
        if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNode) {
          undoableDeleteNode(selectedNode.id);
          uiActions.setSelectedNode(null);
          debouncedSetSaveStatus('unsaved');
        }
      } catch (error) {
        console.error('Keyboard shortcut error:', error);
        setSnackbar({
          open: true,
          message: 'An error occurred with keyboard shortcut',
          severity: 'error'
        });
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedNode, clipboard, undoableAddNode, undoableDeleteNode, debouncedSetSaveStatus]);

  const loadFlow = async (flowId: string) => {
    try {
      const { result: flow } = await measureAsync('loadFlow', 
        () => loadFlowOperation.execute(flowId)
      );
      
      flowEditActions.resetFlow(flow.name, flow.description || '');
      
      const { result: flowNodes } = measureSync('processFlowNodes', 
        () => flow.steps.map((step) => ({
          id: step.id,
          type: 'testStep',
          position: ensureInitialPosition(step.position),
          data: step,
        })), 
        { nodeCount: flow.steps.length }
      );
      
      const { result: flowEdges } = measureSync('processFlowEdges',
        () => flow.connections.map((conn) => ({
          id: conn.id,
          source: conn.source,
          target: conn.target,
          sourceHandle: conn.sourceHandle,
          targetHandle: conn.targetHandle,
        })),
        { edgeCount: flow.connections.length }
      );
      
      measureSync('resetFlowState', 
        () => undoableResetState(flowNodes, flowEdges),
        { nodeCount: flowNodes.length, edgeCount: flowEdges.length }
      );
      
      // Mark initial load complete after a short delay
      setTimeout(() => {
        isInitialLoadRef.current = false;
      }, 500);
    } catch (error) {
      console.error('Failed to load flow:', error);
      setSnackbar({ 
        open: true, 
        message: `Failed to load flow: ${error instanceof Error ? error.message : 'Unknown error'}`, 
        severity: 'error' 
      });
    }
  };

  const onConnect = useCallback(
    (params: Edge | ReactFlowConnection) => {
      if (!params.source || !params.target) return;
      
      const newEdge: Edge = {
        id: `${params.source}-${params.target}`,
        source: params.source,
        target: params.target,
        ...(params.sourceHandle && { sourceHandle: params.sourceHandle }),
        ...(params.targetHandle && { targetHandle: params.targetHandle }),
      };
      undoableAddEdge(newEdge);
      debouncedSetSaveStatus('unsaved');
    },
    [undoableAddEdge, debouncedSetSaveStatus]
  );

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    if (selectionMode || event.ctrlKey || event.metaKey) {
      // Multi-selection mode or ctrl/cmd click
      event.preventDefault();
      toggleItemById(node.id);
      uiActions.setSelectionMode(true);
    } else {
      // Normal single selection
      uiActions.setSelectedNode(node);
      // Clear multi-selection when clicking normally
      if (hasSelection) {
        selectNone();
        uiActions.setSelectionMode(false);
      }
    }
  }, [selectionMode, toggleItemById, uiActions.setSelectionMode, hasSelection, selectNone]);

  const onNodeContextMenu = useCallback((event: React.MouseEvent, node: Node) => {
    event.preventDefault();
    uiActions.setContextMenu({
      mouseX: event.clientX - 2,
      mouseY: event.clientY - 4,
    });
    uiActions.setContextMenuNode(node);
    uiActions.setSelectedNode(node);
  }, [uiActions]);

  const onNodesDelete = useCallback((deleted: Node[]) => {
    deleted.forEach(node => {
      if (selectedNode && selectedNode.id === node.id) {
        uiActions.setSelectedNode(null);
      }
    });
    debouncedSetSaveStatus('unsaved');
  }, [selectedNode, debouncedSetSaveStatus, uiActions]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();

    const type = event.dataTransfer.getData('application/reactflow');
    if (!type) {
      return;
    }

    const reactFlowBounds = (event.target as HTMLElement).closest('.react-flow')?.getBoundingClientRect();
    if (!reactFlowBounds) {
      return;
    }

    const position = calculateDropPosition(event, reactFlowBounds);

    handleAddStep(type as TestStep['type'], position);
  }, []);

  const handleAddStep = (type: TestStep['type'], position?: { x: number, y: number }) => {
    let config: HttpStepConfig | BrowserStepConfig | DelayStepConfig | AssertionStepConfig | ConditionStepConfig | SqlStepConfig = {
      method: 'GET',
      url: '',
      headers: {},
      body: null,
    } as HttpStepConfig;
    
    // Initialize config based on step type
    switch (type) {
      case 'http':
        config = {
          method: 'GET',
          url: '',
          headers: {},
          body: null,
        };
        break;
      case 'browser':
        config = {
          action: 'navigate',
          value: '',
        };
        break;
      case 'delay':
        config = {
          duration: 1000,
        };
        break;
      case 'assertion':
        config = {
          type: 'equals',
          source: '',
          expected: '',
        };
        break;
      case 'condition':
        config = {
          script: '',
        };
        break;
      case 'sql':
        config = {
          connectionString: '',
          query: '',
          parameters: {},
        };
        break;
    }
    
    const newNode: Node = {
      id: `${Date.now()}`,
      type: 'testStep',
      position: ensurePosition(position),
      data: {
        id: `${Date.now()}`,
        type,
        name: `New ${type} Step`,
        config,
      },
    };
    undoableAddNode(newNode);
    debouncedSetSaveStatus('unsaved');
  };

  const handleUpdateNode = useCallback((nodeId: string, data: TestStep) => {
    undoableUpdateNode(nodeId, { data });
    if (selectedNode && selectedNode.id === nodeId) {
      uiActions.setSelectedNode({ 
        ...selectedNode, 
        data,
        position: ensurePosition(selectedNode.position) // Ensure position exists
      });
    }
    debouncedSetSaveStatus('unsaved');
  }, [selectedNode, undoableUpdateNode, debouncedSetSaveStatus, uiActions]);

  const handleSave = async (isAutoSave = false) => {
    // Get folder and project context from URL params for new flows
    const folderId = searchParams.get('folderId');
    const projectId = searchParams.get('projectId');
    
    const { result: flow } = measureSync('prepareFlowData', 
      () => ({
        name: flowName,
        description: flowDescription,
        ...(projectId && { projectId }),
        ...(folderId && { folderId }),
        steps: nodes.map((node) => ({
          ...node.data,
          position: ensurePosition(node.position),
        })),
        connections: edges.map((edge) => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          sourceHandle: edge.sourceHandle || undefined,
          targetHandle: edge.targetHandle || undefined,
        })),
      }),
      { nodeCount: nodes.length, edgeCount: edges.length }
    );

    try {
      const { result } = await measureAsync('saveFlow', 
        () => saveFlowOperation.execute(flow),
        { nodeCount: nodes.length, edgeCount: edges.length }
      );
      
      if (id === 'new' && result?.id) {
        navigate(`/flows/${result.id}${projectId ? `?projectId=${projectId}` : ''}`);
        setSnackbar({ open: true, message: 'Flow created successfully', severity: 'success' });
      } else if (!isAutoSave) {
        setSnackbar({ open: true, message: 'Flow saved successfully', severity: 'success' });
      }
      
      flowEditActions.setSaveStatus('saved');
      flowEditActions.setLastSaved(new Date());
      
      // Trigger explorer refresh
      window.dispatchEvent(new Event('refreshExplorer'));
    } catch (error) {
      console.error('Failed to save flow:', error);
      if (!isAutoSave) {
        setSnackbar({ 
          open: true, 
          message: `Failed to save flow: ${error instanceof Error ? error.message : 'Unknown error'}`, 
          severity: 'error' 
        });
      }
      throw error;
    }
  };

  const handleExport = () => {
    try {
      const flow = {
        name: flowName,
        description: flowDescription,
        steps: nodes.map((node) => ({
          ...node.data,
          position: ensurePosition(node.position),
        })),
        connections: edges.map((edge) => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          sourceHandle: edge.sourceHandle || undefined,
          targetHandle: edge.targetHandle || undefined,
        })),
      };

      const dataStr = JSON.stringify(flow, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `${flowName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_flow.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      
      setSnackbar({ open: true, message: 'Flow exported successfully', severity: 'success' });
    } catch (error) {
      console.error('Failed to export flow:', error);
      setSnackbar({
        open: true,
        message: `Failed to export flow: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error'
      });
    }
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const flow = JSON.parse(e.target?.result as string);
        
        // Update flow name and description
        flowEditActions.setFlowName(flow.name || 'Imported Flow');
        flowEditActions.setFlowDescription(flow.description || '');
        
        // Update nodes
        const importedNodes = flow.steps.map((step: TestStep) => ({
          id: step.id,
          type: 'testStep',
          position: step.position || { x: 100, y: 100 },
          data: step,
        }));
        
        // Update edges
        const importedEdges = flow.connections.map((conn: Connection) => ({
          id: conn.id,
          source: conn.source,
          target: conn.target,
          sourceHandle: conn.sourceHandle,
          targetHandle: conn.targetHandle,
        }));
        
        undoableResetState(importedNodes, importedEdges);
        
        setSnackbar({ open: true, message: 'Flow imported successfully', severity: 'success' });
      } catch (error) {
        console.error('Failed to import flow:', error);
        setSnackbar({ open: true, message: 'Failed to import flow. Invalid file format.', severity: 'error' });
      }
    };
    reader.readAsText(file);
    
    // Reset the input
    event.target.value = '';
  };

  const handleOpenAPIImport = (importedSteps: TestStep[]) => {
    const { result: newNodes } = measureSync('createImportNodes',
      () => importedSteps.map((step, index) => ({
        id: step.id,
        type: 'testStep',
        position: calculateGridPosition(index),
        data: step,
      })),
      { nodeCount: importedSteps.length }
    );

    // Add multiple nodes one by one to maintain undo/redo tracking
    measureBulkOperation('addImportedNodes', newNodes.length, 
      () => newNodes.forEach(node => undoableAddNode(node))
    );
    
    setSnackbar({ 
      open: true, 
      message: `Imported ${importedSteps.length} operations from OpenAPI schema`, 
      severity: 'success' 
    });
  };

  const handleRunFlow = async () => {
    try {
      // Save the flow first if it's been modified
      if (id && id !== 'new') {
        await handleSave();
      }
      
      await measureAsync('executeFlow',
        () => runFlowOperation.execute(id!, selectedEnvironment),
        { nodeCount: nodes.length, edgeCount: edges.length }
      );
      setSnackbar({ open: true, message: 'Flow run started - watch the results on each step!', severity: 'success' });
      
      // Don't navigate away - stay here to see real-time results
    } catch (error) {
      console.error('Failed to run flow:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setSnackbar({ 
        open: true, 
        message: `Failed to start flow run: ${errorMessage}`, 
        severity: 'error' 
      });
    }
  };

  const handleContextMenuCopy = useCallback(() => {
    try {
      if (contextMenuNode) {
        updateClipboard(contextMenuNode.data as TestStep);
        setSnackbar({ open: true, message: `Copied "${contextMenuNode.data.name}"`, severity: 'success' });
      }
    } catch (error) {
      console.error('Failed to copy node:', error);
      setSnackbar({
        open: true,
        message: `Failed to copy step: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error'
      });
    }
  }, [contextMenuNode, updateClipboard]);

  const handleContextMenuPaste = useCallback(() => {
    try {
      if (clipboard && clipboard.length > 0 && contextMenuNode) {
        const basePosition = calculateOffsetPosition(contextMenuNode.position);
        const newNodes: Node[] = [];
        
        clipboard.forEach((step, index) => {
          const timestamp = Date.now() + index;
          const newNode: Node = {
            id: `${timestamp}`,
            type: 'testStep',
            position: {
              x: basePosition.x + (index * 50), // Offset horizontally
              y: basePosition.y + (index * 100), // Offset vertically
            },
            data: {
              ...step,
              id: `${timestamp}`,
              name: `${step.name} (Copy)`,
            },
          };
          newNodes.push(newNode);
        });
        
        // Add all nodes
        newNodes.forEach(node => undoableAddNode(node));
        
        setSnackbar({ 
          open: true, 
          message: `Pasted ${clipboard.length === 1 ? `"${clipboard[0].name}"` : `${clipboard.length} steps`}`, 
          severity: 'success' 
        });
        debouncedSetSaveStatus('unsaved');
      }
    } catch (error) {
      console.error('Failed to paste node:', error);
      setSnackbar({
        open: true,
        message: `Failed to paste step: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error'
      });
    }
  }, [clipboard, contextMenuNode, undoableAddNode, debouncedSetSaveStatus]);

  const handleContextMenuDuplicate = useCallback(() => {
    try {
      if (contextMenuNode) {
        const newNode: Node = {
          id: `${Date.now()}`,
          type: 'testStep',
          position: calculateOffsetPosition(contextMenuNode.position),
          data: {
            ...(contextMenuNode.data as TestStep),
            id: `${Date.now()}`,
            name: `${contextMenuNode.data.name} (Copy)`,
          },
        };
        undoableAddNode(newNode);
        setSnackbar({ open: true, message: `Duplicated "${contextMenuNode.data.name}"`, severity: 'success' });
        debouncedSetSaveStatus('unsaved');
      }
    } catch (error) {
      console.error('Failed to duplicate node:', error);
      setSnackbar({
        open: true,
        message: `Failed to duplicate step: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error'
      });
    }
  }, [contextMenuNode, undoableAddNode, debouncedSetSaveStatus]);

  const handleContextMenuDelete = useCallback(() => {
    try {
      if (contextMenuNode) {
        undoableDeleteNode(contextMenuNode.id);
        uiActions.setSelectedNode(null);
        debouncedSetSaveStatus('unsaved');
      }
    } catch (error) {
      console.error('Failed to delete node:', error);
      setSnackbar({
        open: true,
        message: `Failed to delete step: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error'
      });
    }
  }, [contextMenuNode, undoableDeleteNode, debouncedSetSaveStatus, uiActions]);

  const handleContextMenuRun = useCallback(async () => {
    if (!contextMenuNode || !id || id === 'new') {
      setSnackbar({ open: true, message: 'Please save the flow first', severity: 'warning' });
      return;
    }

    try {
      // Save the flow first if it's been modified
      await handleSave();
      
      // Run with selected step(s) - backend will handle running only these steps if supported
      await api.startRun(id, selectedEnvironment, [contextMenuNode.data.id]);
      
      setSnackbar({ 
        open: true, 
        message: `Running step "${contextMenuNode.data.name}" - watch for results!`, 
        severity: 'success' 
      });
    } catch (error) {
      console.error('Failed to run step:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setSnackbar({ 
        open: true, 
        message: `Failed to run step: ${errorMessage}`, 
        severity: 'error' 
      });
    }
  }, [contextMenuNode, id, selectedEnvironment, handleSave]);

  const toggleConsole = () => {
    const newState = !consoleOpen;
    uiActions.setConsoleOpen(newState);
    localStorage.setItem('consoleOpen', String(newState));
  };

  // Stable references for expensive computations
  const currentRunStatus = currentRunRef.current?.status;
  
  // Memoized nodes with step results - expensive operation with stable dependencies
  const nodesWithResults = useMemo(() => {
    // Only measure if we have a significant number of nodes
    if (nodes.length > 50) {
      return measureSync('renderNodes', 
        () => nodes.map(node => {
          const hasResult = stepResults[node.data.id];
          const resultStatus = hasResult?.status;
          const nodeIsSelected = isItemSelected(node.id);
          
          return {
            ...node,
            position: ensurePosition(node.position), // Ensure position always exists
            data: {
              ...node.data,
              result: hasResult,
              isRunning: currentRunStatus === 'running' && resultStatus === 'running',
              isSelected: nodeIsSelected,
              selectionMode
            }
          };
        }),
        { nodeCount: nodes.length }
      ).result;
    }
    
    return nodes.map(node => {
      const hasResult = stepResults[node.data.id];
      const resultStatus = hasResult?.status;
      const nodeIsSelected = isItemSelected(node.id);
      
      return {
        ...node,
        position: ensurePosition(node.position), // Ensure position always exists
        data: {
          ...node.data,
          result: hasResult,
          isRunning: currentRunStatus === 'running' && resultStatus === 'running',
          isSelected: nodeIsSelected,
          selectionMode
        }
      };
    });
  }, [nodes, stepResults, currentRunStatus, isItemSelected, selectionMode, measureSync]);

  // Memoized available steps for StepConfigPanel with stable reference
  const availableSteps = useMemo(() => {
    return nodes.map(node => node.data);
  }, [nodes]);

  const handleConsoleCommand = useCallback((command: string) => {
    // Special handling for clear command
    if (command.toLowerCase().trim() === 'clear') {
      testExecutionActions.clearConsoleLogs();
      return;
    }

    // Update command executor context
    commandExecutor.updateContext({
      environmentVariables,
      stepResults,
      currentStep: selectedNode?.id
    });

    // Execute command and add logs
    const commandLogs = commandExecutor.executeCommand(command);
    testExecutionActions.addConsoleLogs(commandLogs);
  }, [commandExecutor, environmentVariables, stepResults, selectedNode?.id, testExecutionActions]);

  // Bulk operation handlers
  const handleBulkDelete = useCallback(() => {
    if (selectedNodes.length === 0) return;
    
    try {
      const stepNames = selectedNodes.map(node => node.data.name).join(', ');
      if (window.confirm(`Are you sure you want to delete ${selectedNodes.length} step(s)?\n\n${stepNames}`)) {
        measureBulkOperation('deleteNodes', selectedNodes.length, () => {
          undoableDeleteSelectedNodes(selectedNodes.map(node => node.id));
        });
        selectNone();
        uiActions.setSelectedNode(null);
        debouncedSetSaveStatus('unsaved');
        setSnackbar({ 
          open: true, 
          message: `Deleted ${selectedNodes.length} step(s)`, 
          severity: 'success' 
        });
      }
    } catch (error) {
      console.error('Failed to delete nodes:', error);
      setSnackbar({
        open: true,
        message: `Failed to delete steps: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error'
      });
    }
  }, [selectedNodes, undoableDeleteSelectedNodes, selectNone, uiActions, debouncedSetSaveStatus, setSnackbar, measureBulkOperation]);

  const handleBulkCopy = useCallback(() => {
    if (selectedNodes.length === 0) return;
    
    try {
      // Copy all selected items to clipboard
      const steps = selectedNodes.map(node => node.data as TestStep);
      updateClipboard(steps);
      
      setSnackbar({ 
        open: true, 
        message: `Copied ${selectedNodes.length === 1 ? `"${steps[0].name}"` : `${selectedNodes.length} steps`}`, 
        severity: 'success' 
      });
    } catch (error) {
      console.error('Failed to copy nodes:', error);
      setSnackbar({
        open: true,
        message: `Failed to copy steps: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error'
      });
    }
  }, [selectedNodes, updateClipboard, setSnackbar]);

  const handleToggleSelectionMode = useCallback(() => {
    uiActions.setSelectionMode(!selectionMode);
    if (selectionMode) {
      selectNone();
    }
  }, [selectionMode, selectNone, uiActions]);

  // Define keyboard shortcuts for the FlowEditor with optimized memoization
  const fileShortcuts = useMemo(() => [
    {
      ...commonShortcuts.save,
      action: () => handleSave(),
      description: 'Save flow',
    },
    {
      ...commonShortcuts.new,
      action: () => navigate('/flows/new'),
      description: 'Create new flow',
    },
  ], [handleSave, navigate]);

  const flowShortcuts = useMemo(() => [
    {
      key: 'r',
      ctrlKey: true,
      metaKey: true,
      action: () => {
        if (id && id !== 'new') {
          handleRunFlow();
        }
      },
      description: 'Run flow',
      enabled: id !== 'new',
    },
  ], [handleRunFlow, id]);

  const stepShortcuts = useMemo(() => [
    {
      ...commonShortcuts.copy,
      action: () => {
        if (selectedNode) {
          updateClipboard(selectedNode.data as TestStep);
          setSnackbar({ open: true, message: `Copied "${selectedNode.data.name}"`, severity: 'success' });
        }
      },
      description: 'Copy selected step',
      enabled: !!selectedNode,
    },
    {
      ...commonShortcuts.paste,
      action: () => {
        if (clipboard && clipboard.length > 0) {
          const basePosition = selectedNode?.position || { x: 100, y: 100 };
          const newNodes: Node[] = [];
          
          clipboard.forEach((step, index) => {
            const timestamp = Date.now() + index;
            const newNode: Node = {
              id: `${timestamp}`,
              type: 'testStep',
              position: {
                x: basePosition.x + (index * 50), // Offset horizontally
                y: basePosition.y + (index * 100), // Offset vertically
              },
              data: {
                ...step,
                id: `${timestamp}`,
                name: `${step.name} (Copy)`,
              },
            };
            newNodes.push(newNode);
          });
          
          // Add all nodes
          newNodes.forEach(node => undoableAddNode(node));
          
          setSnackbar({ 
            open: true, 
            message: `Pasted ${clipboard.length === 1 ? `"${clipboard[0].name}"` : `${clipboard.length} steps`}`, 
            severity: 'success' 
          });
          debouncedSetSaveStatus('unsaved');
        }
      },
      description: 'Paste step',
      enabled: !!(clipboard && clipboard.length > 0),
    },
    {
      ...commonShortcuts.delete,
      action: () => {
        if (selectedNode) {
          undoableDeleteNode(selectedNode.id);
          uiActions.setSelectedNode(null);
          debouncedSetSaveStatus('unsaved');
        }
      },
      description: 'Delete selected step',
      enabled: !!selectedNode,
    },
  ], [selectedNode, clipboard, updateClipboard, undoableAddNode, undoableDeleteNode, debouncedSetSaveStatus]);

  const quickCreateShortcuts = useMemo(() => [
    {
      key: '1',
      altKey: true,
      action: () => handleAddStep('http'),
      description: 'Add HTTP step',
    },
    {
      key: '2',
      altKey: true,
      action: () => handleAddStep('browser'),
      description: 'Add Browser step',
    },
    {
      key: '3',
      altKey: true,
      action: () => handleAddStep('assertion'),
      description: 'Add Assertion step',
    },
    {
      key: '4',
      altKey: true,
      action: () => handleAddStep('delay'),
      description: 'Add Delay step',
    },
    {
      key: '5',
      altKey: true,
      action: () => handleAddStep('sql'),
      description: 'Add SQL step',
    },
  ], [handleAddStep]);

  const uiShortcuts = useMemo(() => [
    {
      key: '`',
      ctrlKey: true,
      action: () => uiActions.setConsoleOpen(!consoleOpen),
      description: 'Toggle console',
    },
    {
      ...commonShortcuts.escape,
      action: () => {
        if (hasSelection) {
          selectNone();
          uiActions.setSelectionMode(false);
        } else {
          uiActions.setSelectedNode(null);
          uiActions.setContextMenu(null);
          uiActions.setOpenAPIDialogOpen(false);
          uiActions.setShortcutsDialogOpen(false);
        }
      },
      description: 'Close dialogs / Clear selection',
    },
    {
      key: '?',
      action: () => uiActions.setShortcutsDialogOpen(true),
      description: 'Show keyboard shortcuts',
    },
  ], [consoleOpen, hasSelection, selectNone, uiActions]);

  const selectionShortcuts = useMemo(() => [
    {
      ...commonShortcuts.selectAll,
      action: () => {
        if (nodes.length > 0) {
          selectAll();
          uiActions.setSelectionMode(true);
          setSnackbar({ 
            open: true, 
            message: `Selected all ${nodes.length} steps`, 
            severity: 'info' 
          });
        }
      },
      description: 'Select all steps',
      enabled: nodes.length > 0,
    },
    {
      key: 's',
      altKey: true,
      action: handleToggleSelectionMode,
      description: 'Toggle selection mode',
    },
  ], [nodes.length, selectAll, uiActions, handleToggleSelectionMode]);

  const undoRedoShortcuts = useMemo(() => [
    {
      ...commonShortcuts.undo,
      action: () => {
        if (canUndo) {
          undo();
          setSnackbar({ 
            open: true, 
            message: `Undid: ${lastUndoAction?.description}`, 
            severity: 'info' 
          });
        }
      },
      description: 'Undo last action',
      enabled: canUndo,
    },
    {
      ...commonShortcuts.redo,
      action: () => {
        if (canRedo) {
          redo();
          setSnackbar({ 
            open: true, 
            message: `Redid: ${lastRedoAction?.description}`, 
            severity: 'info' 
          });
        }
      },
      description: 'Redo last action',
      enabled: canRedo,
    },
  ], [canUndo, canRedo, undo, redo, lastUndoAction, lastRedoAction]);

  // Combine all shortcuts with stable reference
  const keyboardShortcuts = useMemo(() => [
    ...fileShortcuts,
    ...flowShortcuts,
    ...stepShortcuts,
    ...quickCreateShortcuts,
    ...uiShortcuts,
    ...selectionShortcuts,
    ...undoRedoShortcuts,
  ], [
    fileShortcuts,
    flowShortcuts,
    stepShortcuts,
    quickCreateShortcuts,
    uiShortcuts,
    selectionShortcuts,
    undoRedoShortcuts,
  ]);

  // Keyboard shortcut groups for help dialog
  const shortcutGroups: KeyboardShortcutGroup[] = useMemo(() => [
    {
      name: 'File Operations',
      shortcuts: keyboardShortcuts.filter(s => 
        ['Save flow', 'Create new flow'].includes(s.description)
      ),
    },
    {
      name: 'Flow Operations',
      shortcuts: keyboardShortcuts.filter(s => 
        ['Run flow'].includes(s.description)
      ),
    },
    {
      name: 'Step Operations',
      shortcuts: keyboardShortcuts.filter(s => 
        ['Copy selected step', 'Paste step', 'Delete selected step'].includes(s.description)
      ),
    },
    {
      name: 'Quick Step Creation',
      shortcuts: keyboardShortcuts.filter(s => 
        s.description.startsWith('Add ') && s.description.endsWith(' step')
      ),
    },
    {
      name: 'Edit Operations',
      shortcuts: keyboardShortcuts.filter(s => 
        ['Undo last action', 'Redo last action'].includes(s.description)
      ),
    },
    {
      name: 'Selection Operations',
      shortcuts: keyboardShortcuts.filter(s => 
        ['Select all steps', 'Toggle selection mode'].includes(s.description)
      ),
    },
    {
      name: 'Interface',
      shortcuts: keyboardShortcuts.filter(s => 
        ['Toggle console', 'Close dialogs / Clear selection', 'Show keyboard shortcuts'].includes(s.description)
      ),
    },
  ], [keyboardShortcuts]);

  // Register keyboard shortcuts
  useKeyboardShortcuts(keyboardShortcuts);

  // Custom handler for node drag end to sync with undo/redo system
  const handleNodeDragStop = useCallback((_event: React.MouseEvent, node: Node) => {
    // Update undo/redo system when drag ends
    undoableMoveNode(node.id, node.position);
  }, [undoableMoveNode]);


  return (
    <Box sx={{ 
      height: 'calc(100vh - 64px)', 
      display: 'flex', 
      flexDirection: 'column'
    }}>
      <FlowToolbar
        flowName={tempFlowName}
        flowDescription={tempFlowDescription}
        onFlowNameChange={(name) => {
          flowEditActions.setTempFlowName(name);
          debouncedSetSaveStatus('unsaved');
        }}
        onFlowDescriptionChange={(description) => {
          flowEditActions.setTempFlowDescription(description);
          debouncedSetSaveStatus('unsaved');
        }}
        autoSaveEnabled={autoSaveEnabled}
        saveStatus={saveStatus}
        lastSaved={lastSaved}
        onToggleAutoSave={toggleAutoSave}
        onSave={() => handleSave()}
        onExport={handleExport}
        onImport={handleImport}
        onOpenAPIImport={() => uiActions.setOpenAPIDialogOpen(true)}
        onRunFlow={handleRunFlow}
        canRunFlow={!(!id || id === 'new' || runFlowOperation.isLoading)}
        isSaving={saveFlowOperation.isLoading}
        isRunning={runFlowOperation.isLoading}
      />

      <Box sx={{ 
        display: 'flex', 
        flex: 1, 
        overflow: 'hidden',
        minHeight: 0 // Important for flex children to shrink properly
      }}>
        <ComponentErrorBoundary context="Step Panel">
          <StepPanel onAddStep={handleAddStep} />
        </ComponentErrorBoundary>
        
        <FlowCanvas
          nodes={nodesWithResults}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onNodeContextMenu={onNodeContextMenu}
          onNodeDragStop={handleNodeDragStop}
          onNodesDelete={onNodesDelete}
          onDragOver={onDragOver}
          onDrop={onDrop}
        />

        {selectedNode && (
          <Box sx={{ 
            width: 350, 
            height: '100%', // Full height within the already constrained parent
            display: 'flex',
            flexDirection: 'column',
            borderLeft: 1, 
            borderColor: 'divider' 
          }}>
            <ComponentErrorBoundary context="Step Configuration">
              <StepConfigPanel
                step={selectedNode.data}
                onUpdate={(updatedStep) => handleUpdateNode(selectedNode.id, updatedStep)}
                onClose={() => uiActions.setSelectedNode(null)}
                availableSteps={availableSteps}
              />
            </ComponentErrorBoundary>
          </Box>
        )}
      </Box>
      
      <FlowConsole
        isOpen={consoleOpen}
        logs={consoleLogs}
        onToggle={toggleConsole}
        onClear={testExecutionActions.clearConsoleLogs}
        onCommand={handleConsoleCommand}
        context={{
          environmentVariables,
          stepResults,
          selectedNode
        }}
      />
      
      <Snackbar
        open={snackbar.open}
        autoHideDuration={2000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity || 'info'}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
      
      <ComponentErrorBoundary context="Context Menu">
        <ContextMenu
          anchorPosition={contextMenu}
          onClose={() => uiActions.setContextMenu(null)}
          onCopy={handleContextMenuCopy}
          onPaste={handleContextMenuPaste}
          onDuplicate={handleContextMenuDuplicate}
          onDelete={handleContextMenuDelete}
          onRun={handleContextMenuRun}
          canPaste={clipboard !== null}
        />
      </ComponentErrorBoundary>
      
      <ComponentErrorBoundary context="OpenAPI Import Dialog">
        <OpenAPIImportDialog
          open={openAPIDialogOpen}
          onClose={() => uiActions.setOpenAPIDialogOpen(false)}
          onImport={handleOpenAPIImport}
          projectId={searchParams.get('projectId') || undefined}
        />
      </ComponentErrorBoundary>
      
      <ComponentErrorBoundary context="Keyboard Shortcuts Dialog">
        <KeyboardShortcutsDialog
          open={shortcutsDialogOpen}
          onClose={() => uiActions.setShortcutsDialogOpen(false)}
          shortcutGroups={shortcutGroups}
        />
      </ComponentErrorBoundary>
      
      {/* Bulk Operations Bar */}
      <BulkOperationsBar
        selectionCount={selectionCount}
        onSelectAll={selectAll}
        onClearSelection={() => {
          selectNone();
          uiActions.setSelectionMode(false);
        }}
        onBulkDelete={handleBulkDelete}
        onBulkCopy={handleBulkCopy}
        isAllSelected={isAllSelected}
        hasItems={nodes.length > 0}
      />

      {/* Loading Overlays */}
      <LoadingOverlay 
        open={loadFlowOperation.isLoading} 
        message="Loading flow..." 
      />
    </Box>
  );
}