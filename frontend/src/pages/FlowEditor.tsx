import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  Connection as ReactFlowConnection,
  useNodesState,
  useEdgesState,
} from 'react-flow-renderer';
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Box, Paper, Button, TextField, Snackbar, Alert, CircularProgress, Typography, Switch, FormControlLabel, IconButton, Collapse } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import DownloadIcon from '@mui/icons-material/Download';
import UploadIcon from '@mui/icons-material/Upload';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CloudDoneIcon from '@mui/icons-material/CloudDone';
import CloudQueueIcon from '@mui/icons-material/CloudQueue';
import CloudOffIcon from '@mui/icons-material/CloudOff';
import TerminalIcon from '@mui/icons-material/Terminal';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { TestFlow, TestStep, TestRun, StepResult, ConsoleLog, HttpStepConfig, BrowserStepConfig, DelayStepConfig, AssertionStepConfig, ConditionStepConfig, SqlStepConfig, Connection } from '../../../shared/src/types';
import { api } from '../services/api';
import StepPanel from '../components/StepPanel';
import StepNode from '../components/StepNode';
import StepConfigPanel from '../components/StepConfigPanel';
import { useSocket } from '../hooks/useSocket';
import { useEnvironment } from '../contexts/EnvironmentContext';
import ContextMenu from '../components/ContextMenu';
import InteractiveConsole from '../components/InteractiveConsole';
import { ConsoleCommandExecutor } from '../services/ConsoleCommandExecutor';
import OpenAPIImportDialog from '../components/OpenAPIImportDialog';
import ApiIcon from '@mui/icons-material/Api';
import useDebounce from '../hooks/useDebounce';
import useKeyboardShortcuts, { KeyboardShortcutGroup, commonShortcuts } from '../hooks/useKeyboardShortcuts';
import KeyboardShortcutsDialog from '../components/KeyboardShortcutsDialog';
import useFlowUndoRedo from '../hooks/useFlowUndoRedo';
import useMultiSelection from '../hooks/useMultiSelection';
import BulkOperationsBar from '../components/BulkOperationsBar';

const nodeTypes = {
  testStep: StepNode,
};

export default function FlowEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  
  let selectedEnvironment = '';
  let environmentVariables = {};
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
  const [flowName, setFlowName] = useState('New Flow');
  const [flowDescription, setFlowDescription] = useState('');
  const [tempFlowName, setTempFlowName] = useState('New Flow');
  const [tempFlowDescription, setTempFlowDescription] = useState('');
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [clipboard, setClipboard] = useState<TestStep | null>(() => {
    const saved = localStorage.getItem('stepClipboard');
    return saved ? JSON.parse(saved) : null;
  });

  // Helper function to update clipboard and localStorage
  const updateClipboard = (step: TestStep | null) => {
    setClipboard(step);
    if (step) {
      localStorage.setItem('stepClipboard', JSON.stringify(step));
    } else {
      localStorage.removeItem('stepClipboard');
    }
  };
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity?: 'success' | 'info' | 'warning' | 'error' }>({ open: false, message: '' });
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(() => {
    const saved = localStorage.getItem('autoSaveEnabled');
    return saved === null ? true : saved === 'true';
  });
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const isInitialLoadRef = useRef(true);
  const [currentRun, setCurrentRun] = useState<TestRun | null>(null);
  const currentRunRef = useRef<TestRun | null>(null);
  const [stepResults, setStepResults] = useState<{ [stepId: string]: StepResult }>({});
  const socket = useSocket();
  const [contextMenu, setContextMenu] = useState<{ mouseX: number; mouseY: number } | null>(null);
  const [contextMenuNode, setContextMenuNode] = useState<Node | null>(null);
  const [consoleOpen, setConsoleOpen] = useState(() => {
    const saved = localStorage.getItem('consoleOpen');
    return saved === 'true';
  });
  const [consoleLogs, setConsoleLogs] = useState<ConsoleLog[]>([]);
  const [commandExecutor] = useState(() => new ConsoleCommandExecutor());
  const [openAPIDialogOpen, setOpenAPIDialogOpen] = useState(false);
  const [shortcutsDialogOpen, setShortcutsDialogOpen] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);

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

    setSaveStatus('saving');
    try {
      await handleSave(true);
      setSaveStatus('saved');
      setLastSaved(new Date());
    } catch (error) {
      console.error('Auto-save failed:', error);
      setSaveStatus('unsaved');
      setSnackbar({ open: true, message: 'Auto-save failed', severity: 'error' });
    }
  }, 2000);

  // Debounced flow name update
  const debouncedUpdateFlowName = useDebounce((name: string) => {
    setFlowName(name);
  }, 300);

  // Debounced flow description update
  const debouncedUpdateFlowDescription = useDebounce((description: string) => {
    setFlowDescription(description);
  }, 300);

  useEffect(() => {
    // Check if we're on the new flow path (either by id="new" or pathname="/flows/new")
    const isNewFlow = id === 'new' || location.pathname === '/flows/new';
    
    if (id && id !== 'new' && !isNewFlow) {
      loadFlow(id);
    } else if (isNewFlow) {
      // Reset state for new flow creation
      setFlowName('New Flow');
      setFlowDescription('');
      setTempFlowName('New Flow');
      setTempFlowDescription('');
      undoableResetState([], []);
      setSelectedNode(null);
      setStepResults({});
      setCurrentRun(null);
      setConsoleLogs([]);
      
      // Mark initial load complete
      setTimeout(() => {
        isInitialLoadRef.current = false;
      }, 100);
    }
  }, [id, searchParams, location.pathname]);

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
    setSaveStatus('unsaved');

    // Trigger debounced auto-save
    debouncedAutoSave();
  }, [nodes, edges, flowName, flowDescription, autoSaveEnabled, id, debouncedAutoSave]);

  // Toggle auto-save
  const toggleAutoSave = () => {
    const newValue = !autoSaveEnabled;
    setAutoSaveEnabled(newValue);
    localStorage.setItem('autoSaveEnabled', String(newValue));
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

  // WebSocket event listeners for real-time test results
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

    socket.on('run:started', (run: TestRun) => {
      if (run.flowId === id) {
        setCurrentRun(run);
        currentRunRef.current = run;
        
        // Only clear step results and console logs for full flow runs, not single step runs
        if (!run.selectedSteps || run.selectedSteps.length === 0) {
          setStepResults({});
          setConsoleLogs([]); // Clear console logs for new full flow run
        }
        setSnackbar({ open: true, message: 'Test run started', severity: 'info' });
      }
    });

    socket.on('run:updated', (run: TestRun) => {
      if (run.flowId === id && currentRunRef.current?.id === run.id) {
        setCurrentRun(run);
        currentRunRef.current = run;
        
        // Update step results - merge with existing results for single step runs
        if (run.selectedSteps && run.selectedSteps.length > 0) {
          // Single step run - merge new results with existing ones
          setStepResults(prev => {
            const updated = { ...prev };
            run.results.forEach(result => {
              updated[result.stepId] = result;
            });
            return updated;
          });
        } else {
          // Full flow run - replace all results
          const results: { [stepId: string]: StepResult } = {};
          run.results.forEach(result => {
            results[result.stepId] = result;
          });
          setStepResults(results);
        }
        
        // Show completion message
        if (run.status === 'completed') {
          setSnackbar({ open: true, message: 'Test run completed', severity: 'success' });
        } else if (run.status === 'failed') {
          setSnackbar({ open: true, message: 'Test run failed', severity: 'error' });
        }
      }
    });

    socket.on('step:updated', (data: { runId: string; stepId: string; result: StepResult }) => {
      if (currentRunRef.current?.id === data.runId) {
        setStepResults(prev => ({
          ...prev,
          [data.stepId]: data.result
        }));
        
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
          setConsoleLogs(prev => [...prev, ...(data.result.logs || [])]);
        }
      }
    });

    socket.on('console:log', (data: { runId: string; stepId: string; log: ConsoleLog }) => {
      if (currentRunRef.current?.id === data.runId) {
        setConsoleLogs(prev => [...prev, data.log]);
      }
    });

    return () => {
      socket.off('run:started');
      socket.off('run:updated');
      socket.off('step:updated');
      socket.off('console:log');
      // Clean up ref to prevent memory leaks
      currentRunRef.current = null;
    };
  }, [socket, id]);

  // Update nodes with step results
  useEffect(() => {
    // Note: Node updates with step results are handled via direct state updates
    // since they don't need to be tracked in undo/redo history
    // This effect updates nodes with test results - we'll handle this differently
    // to avoid conflicts with the undo/redo system
  }, [stepResults, currentRun]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is typing in an input field
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') {
        return;
      }

      // Copy (Cmd/Ctrl + C)
      if ((e.metaKey || e.ctrlKey) && e.key === 'c' && selectedNode) {
        updateClipboard(selectedNode.data as TestStep);
        setSnackbar({ open: true, message: `Copied "${selectedNode.data.name}"`, severity: 'success' });
      }

      // Paste (Cmd/Ctrl + V)
      if ((e.metaKey || e.ctrlKey) && e.key === 'v' && clipboard) {
        const newNode: Node = {
          id: `${Date.now()}`,
          type: 'testStep',
          position: { 
            x: (selectedNode?.position?.x || 0) + 50, 
            y: (selectedNode?.position?.y || 0) + 50 
          },
          data: {
            ...clipboard,
            id: `${Date.now()}`,
            name: `${clipboard.name} (Copy)`,
          },
        };
        undoableAddNode(newNode);
        setSnackbar({ open: true, message: `Pasted "${clipboard.name}"`, severity: 'success' });
        setSaveStatus('unsaved');
      }

      // Delete (Delete or Backspace)
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNode) {
        undoableDeleteNode(selectedNode.id);
        setSelectedNode(null);
        setSaveStatus('unsaved');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedNode, clipboard, undoableAddNode, undoableDeleteNode, setSaveStatus]);

  const loadFlow = async (flowId: string) => {
    try {
      const flow = await api.getFlow(flowId);
      setFlowName(flow.name);
      setFlowDescription(flow.description || '');
      setTempFlowName(flow.name);
      setTempFlowDescription(flow.description || '');
      
      const flowNodes = flow.steps.map((step) => ({
        id: step.id,
        type: 'testStep',
        position: step.position || { x: 100, y: 100 },
        data: step,
      }));
      
      const flowEdges = flow.connections.map((conn) => ({
        id: conn.id,
        source: conn.source,
        target: conn.target,
        sourceHandle: conn.sourceHandle,
        targetHandle: conn.targetHandle,
      }));
      
      undoableResetState(flowNodes, flowEdges);
      
      // Mark initial load complete after a short delay
      setTimeout(() => {
        isInitialLoadRef.current = false;
      }, 500);
    } catch (error) {
      console.error('Failed to load flow:', error);
    }
  };

  const onConnect = useCallback(
    (params: Edge | ReactFlowConnection) => {
      const newEdge: Edge = {
        id: `${params.source}-${params.target}`,
        source: params.source,
        target: params.target,
        sourceHandle: params.sourceHandle,
        targetHandle: params.targetHandle,
      };
      undoableAddEdge(newEdge);
      setSaveStatus('unsaved');
    },
    [undoableAddEdge, setSaveStatus]
  );

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    if (selectionMode || event.ctrlKey || event.metaKey) {
      // Multi-selection mode or ctrl/cmd click
      event.preventDefault();
      toggleItemById(node.id);
      setSelectionMode(true);
    } else {
      // Normal single selection
      setSelectedNode(node);
      // Clear multi-selection when clicking normally
      if (hasSelection) {
        selectNone();
        setSelectionMode(false);
      }
    }
  }, [selectionMode, toggleItemById, setSelectionMode, hasSelection, selectNone]);

  const onNodeContextMenu = useCallback((event: React.MouseEvent, node: Node) => {
    event.preventDefault();
    setContextMenu({
      mouseX: event.clientX - 2,
      mouseY: event.clientY - 4,
    });
    setContextMenuNode(node);
    setSelectedNode(node);
  }, []);

  const onNodesDelete = useCallback((deleted: Node[]) => {
    deleted.forEach(node => {
      if (selectedNode && selectedNode.id === node.id) {
        setSelectedNode(null);
      }
    });
    setSaveStatus('unsaved');
  }, [selectedNode, setSaveStatus]);

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

    const position = {
      x: event.clientX - reactFlowBounds.left,
      y: event.clientY - reactFlowBounds.top,
    };

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
      position: position || { x: 250, y: 250 },
      data: {
        id: `${Date.now()}`,
        type,
        name: `New ${type} Step`,
        config,
      },
    };
    undoableAddNode(newNode);
    setSaveStatus('unsaved');
  };

  const handleUpdateNode = useCallback((nodeId: string, data: TestStep) => {
    undoableUpdateNode(nodeId, { data });
    if (selectedNode && selectedNode.id === nodeId) {
      setSelectedNode({ 
        ...selectedNode, 
        data,
        position: selectedNode.position || { x: 250, y: 250 } // Ensure position exists
      });
    }
    setSaveStatus('unsaved');
  }, [selectedNode, undoableUpdateNode, setSaveStatus]);

  const handleSave = async (isAutoSave = false) => {
    // Get folder and project context from URL params for new flows
    const folderId = searchParams.get('folderId');
    const projectId = searchParams.get('projectId');
    
    const flow: Partial<TestFlow> = {
      name: flowName,
      description: flowDescription,
      ...(projectId && { projectId }),
      ...(folderId && { folderId }),
      steps: nodes.map((node) => ({
        ...node.data,
        position: node.position || { x: 250, y: 250 },
      })),
      connections: edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle || undefined,
        targetHandle: edge.targetHandle || undefined,
      })),
    };

    try {
      if (id && id !== 'new') {
        await api.updateFlow(id, flow);
        if (!isAutoSave) {
          setSnackbar({ open: true, message: 'Flow saved successfully', severity: 'success' });
        }
      } else {
        const newFlow = await api.createFlow(flow);
        navigate(`/flows/${newFlow.id}`);
        setSnackbar({ open: true, message: 'Flow created successfully', severity: 'success' });
      }
      setSaveStatus('saved');
      setLastSaved(new Date());
      
      // Trigger explorer refresh
      window.dispatchEvent(new Event('refreshExplorer'));
    } catch (error) {
      console.error('Failed to save flow:', error);
      if (!isAutoSave) {
        setSnackbar({ open: true, message: 'Failed to save flow', severity: 'error' });
      }
      throw error;
    }
  };

  const handleExport = () => {
    const flow = {
      name: flowName,
      description: flowDescription,
      steps: nodes.map((node) => ({
        ...node.data,
        position: node.position || { x: 250, y: 250 },
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
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const flow = JSON.parse(e.target?.result as string);
        
        // Update flow name and description
        setFlowName(flow.name || 'Imported Flow');
        setFlowDescription(flow.description || '');
        
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
    // Create nodes from imported steps
    const newNodes: Node[] = importedSteps.map((step, index) => ({
      id: step.id,
      type: 'testStep',
      position: { 
        x: 250 + (index % 3) * 300, 
        y: 250 + Math.floor(index / 3) * 150 
      },
      data: step,
    }));

    // Add multiple nodes one by one to maintain undo/redo tracking
    newNodes.forEach(node => undoableAddNode(node));
    
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
      
      await api.startRun(id!, selectedEnvironment);
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
    if (contextMenuNode) {
      updateClipboard(contextMenuNode.data as TestStep);
      setSnackbar({ open: true, message: `Copied "${contextMenuNode.data.name}"`, severity: 'success' });
    }
  }, [contextMenuNode, updateClipboard]);

  const handleContextMenuPaste = useCallback(() => {
    if (clipboard && contextMenuNode) {
      const newNode: Node = {
        id: `${Date.now()}`,
        type: 'testStep',
        position: {
          x: (contextMenuNode.position?.x || 250) + 50,
          y: (contextMenuNode.position?.y || 250) + 50,
        },
        data: {
          ...clipboard,
          id: `${Date.now()}`,
          name: `${clipboard.name} (Copy)`,
        },
      };
      undoableAddNode(newNode);
      setSnackbar({ open: true, message: `Pasted "${clipboard.name}"`, severity: 'success' });
      setSaveStatus('unsaved');
    }
  }, [clipboard, contextMenuNode, undoableAddNode, setSaveStatus]);

  const handleContextMenuDuplicate = useCallback(() => {
    if (contextMenuNode) {
      const newNode: Node = {
        id: `${Date.now()}`,
        type: 'testStep',
        position: {
          x: (contextMenuNode.position?.x || 250) + 50,
          y: (contextMenuNode.position?.y || 250) + 50,
        },
        data: {
          ...(contextMenuNode.data as TestStep),
          id: `${Date.now()}`,
          name: `${contextMenuNode.data.name} (Copy)`,
        },
      };
      undoableAddNode(newNode);
      setSnackbar({ open: true, message: `Duplicated "${contextMenuNode.data.name}"`, severity: 'success' });
      setSaveStatus('unsaved');
    }
  }, [contextMenuNode, undoableAddNode, setSaveStatus]);

  const handleContextMenuDelete = useCallback(() => {
    if (contextMenuNode) {
      undoableDeleteNode(contextMenuNode.id);
      setSelectedNode(null);
      setSaveStatus('unsaved');
    }
  }, [contextMenuNode, undoableDeleteNode, setSaveStatus]);

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
    setConsoleOpen(newState);
    localStorage.setItem('consoleOpen', String(newState));
  };

  const clearConsole = () => {
    setConsoleLogs([]);
  };

  // Memoized nodes with step results - expensive operation
  const nodesWithResults = useMemo(() => {
    return nodes.map(node => ({
      ...node,
      position: node.position || { x: 250, y: 250 }, // Ensure position always exists
      data: {
        ...node.data,
        result: stepResults[node.data.id],
        isRunning: currentRunRef.current?.status === 'running' && stepResults[node.data.id]?.status === 'running',
        isSelected: isItemSelected(node.id),
        selectionMode
      }
    }));
  }, [nodes, stepResults, currentRunRef.current?.status, isItemSelected, selectionMode]);

  // Memoized available steps for StepConfigPanel - expensive operation
  const availableSteps = useMemo(() => {
    return nodes.map(node => node.data);
  }, [nodes]);

  const handleConsoleCommand = useCallback((command: string) => {
    // Special handling for clear command
    if (command.toLowerCase().trim() === 'clear') {
      clearConsole();
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
    setConsoleLogs(prev => [...prev, ...commandLogs]);
  }, [commandExecutor, environmentVariables, stepResults, selectedNode?.id]);

  // Bulk operation handlers
  const handleBulkDelete = useCallback(() => {
    if (selectedNodes.length === 0) return;
    
    const stepNames = selectedNodes.map(node => node.data.name).join(', ');
    if (window.confirm(`Are you sure you want to delete ${selectedNodes.length} step(s)?\n\n${stepNames}`)) {
      undoableDeleteSelectedNodes(selectedNodes.map(node => node.id));
      selectNone();
      setSelectedNode(null);
      setSaveStatus('unsaved');
      setSnackbar({ 
        open: true, 
        message: `Deleted ${selectedNodes.length} step(s)`, 
        severity: 'success' 
      });
    }
  }, [selectedNodes, undoableDeleteSelectedNodes, selectNone, setSelectedNode, setSaveStatus, setSnackbar]);

  const handleBulkCopy = useCallback(() => {
    if (selectedNodes.length === 0) return;
    
    // For now, copy the first selected item to clipboard
    // In a more advanced implementation, you might want to support copying multiple items
    const firstNode = selectedNodes[0];
    updateClipboard(firstNode.data as TestStep);
    
    setSnackbar({ 
      open: true, 
      message: `Copied ${selectedNodes.length === 1 ? `"${firstNode.data.name}"` : `${selectedNodes.length} steps (first item to clipboard)`}`, 
      severity: 'success' 
    });
  }, [selectedNodes, updateClipboard, setSnackbar]);

  const handleToggleSelectionMode = useCallback(() => {
    setSelectionMode(!selectionMode);
    if (selectionMode) {
      selectNone();
    }
  }, [selectionMode, selectNone]);

  // Define keyboard shortcuts for the FlowEditor
  const keyboardShortcuts = useMemo(() => [
    // File operations
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
    // Flow operations
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
    // Step operations
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
        if (clipboard) {
          const newNode: Node = {
            id: `${Date.now()}`,
            type: 'testStep',
            position: { 
              x: (selectedNode?.position?.x || 0) + 50, 
              y: (selectedNode?.position?.y || 0) + 50 
            },
            data: {
              ...clipboard,
              id: `${Date.now()}`,
              name: `${clipboard.name} (Copy)`,
            },
          };
          undoableAddNode(newNode);
          setSnackbar({ open: true, message: `Pasted "${clipboard.name}"`, severity: 'success' });
          setSaveStatus('unsaved');
        }
      },
      description: 'Paste step',
      enabled: !!clipboard,
    },
    {
      ...commonShortcuts.delete,
      action: () => {
        if (selectedNode) {
          undoableDeleteNode(selectedNode.id);
          setSelectedNode(null);
          setSaveStatus('unsaved');
        }
      },
      description: 'Delete selected step',
      enabled: !!selectedNode,
    },
    // Quick step creation
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
    // Console operations
    {
      key: '`',
      ctrlKey: true,
      action: () => setConsoleOpen(!consoleOpen),
      description: 'Toggle console',
    },
    // Selection operations
    {
      ...commonShortcuts.selectAll,
      action: () => {
        if (nodes.length > 0) {
          selectAll();
          setSelectionMode(true);
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
    // UI operations
    {
      ...commonShortcuts.escape,
      action: () => {
        if (hasSelection) {
          selectNone();
          setSelectionMode(false);
        } else {
          setSelectedNode(null);
          setContextMenu(null);
          setOpenAPIDialogOpen(false);
          setShortcutsDialogOpen(false);
        }
      },
      description: 'Close dialogs / Clear selection',
    },
    // Undo/Redo
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
    // Help
    {
      key: '?',
      action: () => setShortcutsDialogOpen(true),
      description: 'Show keyboard shortcuts',
    },
  ], [
    selectedNode, clipboard, id, handleSave, navigate, handleRunFlow, updateClipboard, 
    setSnackbar, undoableAddNode, undoableDeleteNode, setSaveStatus, handleAddStep, consoleOpen, 
    setConsoleOpen, setSelectedNode, setContextMenu, setOpenAPIDialogOpen, setShortcutsDialogOpen,
    canUndo, canRedo, undo, redo, lastUndoAction, lastRedoAction, nodes, selectAll, 
    setSelectionMode, hasSelection, selectNone, handleToggleSelectionMode
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
  const handleNodeDragStop = useCallback((event: React.MouseEvent, node: Node) => {
    // Update undo/redo system when drag ends
    undoableMoveNode(node.id, node.position);
  }, [undoableMoveNode]);


  return (
    <Box sx={{ 
      height: 'calc(100vh - 64px)', 
      display: 'flex', 
      flexDirection: 'column'
    }}>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            label="Flow Name"
            value={tempFlowName}
            onChange={(e) => {
              setTempFlowName(e.target.value);
              setSaveStatus('unsaved');
            }}
            size="small"
          />
          <TextField
            label="Description"
            value={tempFlowDescription}
            onChange={(e) => {
              setTempFlowDescription(e.target.value);
              setSaveStatus('unsaved');
            }}
            size="small"
            sx={{ flex: 1 }}
          />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={autoSaveEnabled}
                  onChange={toggleAutoSave}
                  size="small"
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography variant="body2">Auto-save</Typography>
                  {autoSaveEnabled && (
                    <>
                      {saveStatus === 'saved' && <CloudDoneIcon sx={{ fontSize: 16, color: 'success.main' }} />}
                      {saveStatus === 'saving' && <CircularProgress size={14} thickness={2} />}
                      {saveStatus === 'unsaved' && <CloudQueueIcon sx={{ fontSize: 16, color: 'warning.main' }} />}
                    </>
                  )}
                  {!autoSaveEnabled && <CloudOffIcon sx={{ fontSize: 16, color: 'text.disabled' }} />}
                </Box>
              }
            />
            {lastSaved && autoSaveEnabled && saveStatus === 'saved' && (
              <Typography variant="caption" color="text.secondary">
                {new Date(lastSaved).toLocaleTimeString()}
              </Typography>
            )}
          </Box>
          <Button
            variant="contained"
            className="gradient-success"
            startIcon={<SaveIcon />}
            onClick={() => handleSave()}
            sx={{ 
              color: 'white',
              boxShadow: '0 4px 20px rgba(132, 250, 176, 0.3)',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 8px 32px rgba(132, 250, 176, 0.4)',
              }
            }}
          >
            Save
          </Button>
          <Button
            variant="contained"
            className="gradient-info"
            startIcon={<DownloadIcon />}
            onClick={handleExport}
            sx={{ 
              color: 'white',
              boxShadow: '0 4px 20px rgba(79, 172, 254, 0.3)',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 8px 32px rgba(79, 172, 254, 0.4)',
              }
            }}
          >
            Export
          </Button>
          <input
            type="file"
            id="import-flow"
            accept=".json"
            style={{ display: 'none' }}
            onChange={handleImport}
          />
          <label htmlFor="import-flow">
            <Button
              variant="outlined"
              startIcon={<UploadIcon />}
              component="span"
            >
              Import
            </Button>
          </label>
          <Button
            variant="outlined"
            startIcon={<ApiIcon />}
            onClick={() => setOpenAPIDialogOpen(true)}
            sx={{
              borderColor: '#9c27b0',
              color: '#9c27b0',
              '&:hover': {
                borderColor: '#7b1fa2',
                backgroundColor: 'rgba(156, 39, 176, 0.08)',
              }
            }}
          >
            Import OpenAPI
          </Button>
          <Box sx={{ borderLeft: 1, borderColor: 'divider', pl: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
            <Button
              variant="contained"
              className="gradient-primary"
              startIcon={<PlayArrowIcon />}
              onClick={handleRunFlow}
              disabled={!id || id === 'new'}
              sx={{ 
                color: 'white',
                boxShadow: '0 4px 20px rgba(102, 126, 234, 0.3)',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: '0 8px 32px rgba(102, 126, 234, 0.4)',
                }
              }}
            >
              Run Flow
            </Button>
          </Box>
        </Box>
      </Paper>

      <Box sx={{ 
        display: 'flex', 
        flex: 1, 
        overflow: 'hidden',
        minHeight: 0 // Important for flex children to shrink properly
      }}>
        <StepPanel onAddStep={handleAddStep} />
        
        <Box sx={{ flex: 1 }}>
          <ReactFlow
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
            nodeTypes={nodeTypes}
            deleteKeyCode="Delete"
            nodesDraggable={true}
            nodesConnectable={true}
            elementsSelectable={true}
          >
            <Controls />
            <MiniMap />
            <Background variant={'dots' as any} gap={12} size={1} />
          </ReactFlow>
        </Box>

        {selectedNode && (
          <Box sx={{ 
            width: 350, 
            height: '100%', // Full height within the already constrained parent
            display: 'flex',
            flexDirection: 'column',
            borderLeft: 1, 
            borderColor: 'divider' 
          }}>
            <StepConfigPanel
              step={selectedNode.data}
              onUpdate={(updatedStep) => handleUpdateNode(selectedNode.id, updatedStep)}
              onClose={() => setSelectedNode(null)}
              availableSteps={availableSteps}
            />
          </Box>
        )}
      </Box>
      
      {/* Console Panel */}
      <Box sx={{
        flexShrink: 0, // Prevent console from shrinking
        backgroundColor: 'background.paper',
        borderTop: 1,
        borderColor: 'divider'
      }}>
        <Box 
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            px: 2,
            py: 0.5,
            backgroundColor: 'background.paper',
            cursor: 'pointer',
            borderBottom: consoleOpen ? 1 : 0,
            borderColor: 'divider'
          }}
          onClick={toggleConsole}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TerminalIcon fontSize="small" />
            <Typography variant="body2">Console</Typography>
            {consoleLogs.length > 0 && (
              <Typography variant="caption" color="text.secondary">
                ({consoleLogs.length} logs)
              </Typography>
            )}
          </Box>
          <IconButton size="small">
            {consoleOpen ? <ExpandMoreIcon /> : <ExpandLessIcon />}
          </IconButton>
        </Box>
        <Collapse in={consoleOpen}>
          <Box sx={{ height: 300 }}>
            <InteractiveConsole 
              logs={consoleLogs}
              onClear={clearConsole}
              onCommand={handleConsoleCommand}
              maxHeight={300}
              autoScroll={true}
              context={{
                environmentVariables,
                stepResults,
                selectedNode
              }}
            />
          </Box>
        </Collapse>
      </Box>
      
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
      
      <ContextMenu
        anchorPosition={contextMenu}
        onClose={() => setContextMenu(null)}
        onCopy={handleContextMenuCopy}
        onPaste={handleContextMenuPaste}
        onDuplicate={handleContextMenuDuplicate}
        onDelete={handleContextMenuDelete}
        onRun={handleContextMenuRun}
        canPaste={clipboard !== null}
      />
      
      <OpenAPIImportDialog
        open={openAPIDialogOpen}
        onClose={() => setOpenAPIDialogOpen(false)}
        onImport={handleOpenAPIImport}
      />
      
      <KeyboardShortcutsDialog
        open={shortcutsDialogOpen}
        onClose={() => setShortcutsDialogOpen(false)}
        shortcutGroups={shortcutGroups}
      />
      
      {/* Bulk Operations Bar */}
      <BulkOperationsBar
        selectionCount={selectionCount}
        onSelectAll={selectAll}
        onClearSelection={() => {
          selectNone();
          setSelectionMode(false);
        }}
        onBulkDelete={handleBulkDelete}
        onBulkCopy={handleBulkCopy}
        isAllSelected={isAllSelected}
        hasItems={nodes.length > 0}
      />
    </Box>
  );
}