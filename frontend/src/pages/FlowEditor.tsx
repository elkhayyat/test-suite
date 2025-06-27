import React, { useState, useCallback, useEffect, useRef } from 'react';
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Connection,
} from 'react-flow-renderer';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Paper, Button, TextField, Snackbar, Alert, CircularProgress, Typography, Switch, FormControlLabel } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import DownloadIcon from '@mui/icons-material/Download';
import UploadIcon from '@mui/icons-material/Upload';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CloudDoneIcon from '@mui/icons-material/CloudDone';
import CloudQueueIcon from '@mui/icons-material/CloudQueue';
import CloudOffIcon from '@mui/icons-material/CloudOff';
import { TestFlow, TestStep, TestRun, StepResult } from '../../../shared/src/types';
import { api } from '../services/api';
import StepPanel from '../components/StepPanel';
import StepNode from '../components/StepNode';
import StepConfigPanel from '../components/StepConfigPanel';
import EnvironmentSelector from '../components/EnvironmentSelector';
import { useSocket } from '../hooks/useSocket';
import ContextMenu from '../components/ContextMenu';

const nodeTypes = {
  testStep: StepNode,
};

export default function FlowEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [flowName, setFlowName] = useState('New Flow');
  const [flowDescription, setFlowDescription] = useState('');
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [clipboard, setClipboard] = useState<TestStep | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity?: 'success' | 'info' | 'warning' | 'error' }>({ open: false, message: '' });
  const [selectedEnvironment, setSelectedEnvironment] = useState<string>('');
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(() => {
    const saved = localStorage.getItem('autoSaveEnabled');
    return saved === null ? true : saved === 'true';
  });
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialLoadRef = useRef(true);
  const [currentRun, setCurrentRun] = useState<TestRun | null>(null);
  const [stepResults, setStepResults] = useState<{ [stepId: string]: StepResult }>({});
  const socket = useSocket();
  const [contextMenu, setContextMenu] = useState<{ mouseX: number; mouseY: number } | null>(null);
  const [contextMenuNode, setContextMenuNode] = useState<Node | null>(null);

  useEffect(() => {
    if (id && id !== 'new') {
      loadFlow(id);
    }
  }, [id]);

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

    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Mark as unsaved
    setSaveStatus('unsaved');

    // Set new timeout for auto-save (2 seconds after last change)
    autoSaveTimeoutRef.current = setTimeout(async () => {
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

    // Cleanup
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [nodes, edges, flowName, flowDescription, autoSaveEnabled, id]);

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

  // WebSocket event listeners for real-time test results
  useEffect(() => {
    if (!socket) return;

    socket.on('run:started', (run: TestRun) => {
      if (run.flowId === id) {
        setCurrentRun(run);
        setStepResults({});
        setSnackbar({ open: true, message: 'Test run started', severity: 'info' });
      }
    });

    socket.on('run:updated', (run: TestRun) => {
      if (run.flowId === id && currentRun?.id === run.id) {
        setCurrentRun(run);
        
        // Update step results
        const results: { [stepId: string]: StepResult } = {};
        run.results.forEach(result => {
          results[result.stepId] = result;
        });
        setStepResults(results);
        
        // Show completion message
        if (run.status === 'completed') {
          setSnackbar({ open: true, message: 'Test run completed', severity: 'success' });
        } else if (run.status === 'failed') {
          setSnackbar({ open: true, message: 'Test run failed', severity: 'error' });
        }
      }
    });

    socket.on('step:updated', (data: { runId: string; stepId: string; result: StepResult }) => {
      if (currentRun?.id === data.runId) {
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
      }
    });

    return () => {
      socket.off('run:started');
      socket.off('run:updated');
      socket.off('step:updated');
    };
  }, [socket, id, currentRun]);

  // Update nodes with step results
  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => {
        const stepResult = stepResults[node.data.id];
        if (stepResult) {
          return {
            ...node,
            data: {
              ...node.data,
              result: stepResult,
              isRunning: currentRun?.status === 'running'
            }
          };
        }
        // Clear result if no current run or result
        if (!currentRun || currentRun.status === 'completed' || currentRun.status === 'failed') {
          const { result, isRunning, ...dataWithoutResult } = node.data;
          return {
            ...node,
            data: dataWithoutResult
          };
        }
        return node;
      })
    );
  }, [stepResults, currentRun, setNodes]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is typing in an input field
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') {
        return;
      }

      // Copy (Cmd/Ctrl + C)
      if ((e.metaKey || e.ctrlKey) && e.key === 'c' && selectedNode) {
        setClipboard(selectedNode.data as TestStep);
        setSnackbar({ open: true, message: `Copied "${selectedNode.data.name}"`, severity: 'success' });
      }

      // Paste (Cmd/Ctrl + V)
      if ((e.metaKey || e.ctrlKey) && e.key === 'v' && clipboard) {
        const newNode: Node = {
          id: `${Date.now()}`,
          type: 'testStep',
          position: { 
            x: selectedNode ? selectedNode.position.x + 50 : 250, 
            y: selectedNode ? selectedNode.position.y + 50 : 250 
          },
          data: {
            ...clipboard,
            id: `${Date.now()}`,
            name: `${clipboard.name} (Copy)`,
          },
        };
        setNodes((nds) => nds.concat(newNode));
        setSnackbar({ open: true, message: `Pasted "${clipboard.name}"`, severity: 'success' });
        setSaveStatus('unsaved');
      }

      // Delete (Delete or Backspace)
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNode) {
        setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
        setEdges((eds) => eds.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id));
        setSelectedNode(null);
        setSaveStatus('unsaved');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedNode, clipboard, setNodes, setEdges, setSaveStatus]);

  const loadFlow = async (flowId: string) => {
    try {
      const flow = await api.getFlow(flowId);
      setFlowName(flow.name);
      setFlowDescription(flow.description || '');
      
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
      
      setNodes(flowNodes);
      setEdges(flowEdges);
      
      // Mark initial load complete after a short delay
      setTimeout(() => {
        isInitialLoadRef.current = false;
      }, 500);
    } catch (error) {
      console.error('Failed to load flow:', error);
    }
  };

  const onConnect = useCallback(
    (params: Edge | Connection) => {
      setEdges((eds) => addEdge(params, eds));
      setSaveStatus('unsaved');
    },
    [setEdges, setSaveStatus]
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

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
    let config: any = {};
    
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
    setNodes((nds) => nds.concat(newNode));
    setSaveStatus('unsaved');
  };

  const handleUpdateNode = (nodeId: string, data: TestStep) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return { ...node, data };
        }
        return node;
      })
    );
    if (selectedNode && selectedNode.id === nodeId) {
      setSelectedNode({ ...selectedNode, data });
    }
    setSaveStatus('unsaved');
  };

  const handleSave = async (isAutoSave = false) => {
    const flow: Partial<TestFlow> = {
      name: flowName,
      description: flowDescription,
      steps: nodes.map((node) => ({
        ...node.data,
        position: node.position,
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
        position: node.position,
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
        setNodes(importedNodes);
        
        // Update edges
        const importedEdges = flow.connections.map((conn: any) => ({
          id: conn.id,
          source: conn.source,
          target: conn.target,
          sourceHandle: conn.sourceHandle,
          targetHandle: conn.targetHandle,
        }));
        setEdges(importedEdges);
        
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

  const handleRunFlow = async () => {
    try {
      // Save the flow first if it's been modified
      if (id && id !== 'new') {
        await handleSave();
      }
      
      const { runId } = await api.startRun(id!, selectedEnvironment);
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

  const handleContextMenuCopy = () => {
    if (contextMenuNode) {
      setClipboard(contextMenuNode.data as TestStep);
      setSnackbar({ open: true, message: `Copied "${contextMenuNode.data.name}"`, severity: 'success' });
    }
  };

  const handleContextMenuPaste = () => {
    if (clipboard && contextMenuNode) {
      const newNode: Node = {
        id: `${Date.now()}`,
        type: 'testStep',
        position: {
          x: contextMenuNode.position.x + 50,
          y: contextMenuNode.position.y + 50,
        },
        data: {
          ...clipboard,
          id: `${Date.now()}`,
          name: `${clipboard.name} (Copy)`,
        },
      };
      setNodes((nds) => nds.concat(newNode));
      setSnackbar({ open: true, message: `Pasted "${clipboard.name}"`, severity: 'success' });
      setSaveStatus('unsaved');
    }
  };

  const handleContextMenuDuplicate = () => {
    if (contextMenuNode) {
      const newNode: Node = {
        id: `${Date.now()}`,
        type: 'testStep',
        position: {
          x: contextMenuNode.position.x + 50,
          y: contextMenuNode.position.y + 50,
        },
        data: {
          ...(contextMenuNode.data as TestStep),
          id: `${Date.now()}`,
          name: `${contextMenuNode.data.name} (Copy)`,
        },
      };
      setNodes((nds) => nds.concat(newNode));
      setSnackbar({ open: true, message: `Duplicated "${contextMenuNode.data.name}"`, severity: 'success' });
      setSaveStatus('unsaved');
    }
  };

  const handleContextMenuDelete = () => {
    if (contextMenuNode) {
      setNodes((nds) => nds.filter((n) => n.id !== contextMenuNode.id));
      setEdges((eds) => eds.filter((e) => e.source !== contextMenuNode.id && e.target !== contextMenuNode.id));
      setSelectedNode(null);
      setSaveStatus('unsaved');
    }
  };

  const handleContextMenuRun = async () => {
    console.log('handleContextMenuRun called', { contextMenuNode, id, selectedEnvironment });
    
    if (!contextMenuNode || !id || id === 'new') {
      console.log('Cannot run step: missing contextMenuNode, id, or id is new');
      setSnackbar({ open: true, message: 'Please save the flow first', severity: 'warning' });
      return;
    }

    try {
      console.log('Saving flow before running step...');
      // Save the flow first if it's been modified
      await handleSave();
      
      console.log('Starting step run with:', { 
        flowId: id, 
        environmentId: selectedEnvironment, 
        selectedSteps: [contextMenuNode.data.id] 
      });
      
      // Run with selected step(s) - backend will handle running only these steps if supported
      const { runId } = await api.startRun(id, selectedEnvironment, [contextMenuNode.data.id]);
      
      console.log('Step run started successfully:', runId);
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
  };

  return (
    <Box sx={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            label="Flow Name"
            value={flowName}
            onChange={(e) => {
              setFlowName(e.target.value);
              setSaveStatus('unsaved');
            }}
            size="small"
          />
          <TextField
            label="Description"
            value={flowDescription}
            onChange={(e) => {
              setFlowDescription(e.target.value);
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
          <Box sx={{ borderLeft: 1, borderColor: 'divider', pl: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
            <EnvironmentSelector 
              value={selectedEnvironment}
              onChange={setSelectedEnvironment}
            />
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

      <Box sx={{ display: 'flex', flex: 1 }}>
        <StepPanel onAddStep={handleAddStep} />
        
        <Box sx={{ flex: 1 }}>
          <ReactFlow
            nodes={nodes.map(node => ({
              ...node,
              data: {
                ...node.data,
                result: stepResults[node.data.id],
                isRunning: currentRun?.status === 'running' && stepResults[node.data.id]?.status === 'running'
              }
            }))}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onNodeContextMenu={onNodeContextMenu}
            onNodesDelete={onNodesDelete}
            onDragOver={onDragOver}
            onDrop={onDrop}
            nodeTypes={nodeTypes}
            deleteKeyCode="Delete"
          >
            <Controls />
            <MiniMap />
            <Background variant={'dots' as any} gap={12} size={1} />
          </ReactFlow>
        </Box>

        {selectedNode && (
          <Box sx={{ width: 350, p: 2, borderLeft: 1, borderColor: 'divider', overflow: 'auto' }}>
            <StepConfigPanel
              step={selectedNode.data}
              onUpdate={(updatedStep) => handleUpdateNode(selectedNode.id, updatedStep)}
              onClose={() => setSelectedNode(null)}
            />
          </Box>
        )}
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
    </Box>
  );
}