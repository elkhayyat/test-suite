import React, { useState, useCallback, useEffect } from 'react';
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
import { Box, Paper, AppBar, Toolbar, Typography, Button, TextField, Snackbar, Alert } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import DownloadIcon from '@mui/icons-material/Download';
import UploadIcon from '@mui/icons-material/Upload';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ContentPasteIcon from '@mui/icons-material/ContentPaste';
import { TestFlow, TestStep } from '../../../shared/src/types';
import { api } from '../services/api';
import StepPanel from '../components/StepPanel';
import StepNode from '../components/StepNode';
import StepConfigPanel from '../components/StepConfigPanel';

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

  useEffect(() => {
    if (id && id !== 'new') {
      loadFlow(id);
    }
  }, [id]);

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
      }

      // Delete (Delete or Backspace)
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNode) {
        setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
        setEdges((eds) => eds.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id));
        setSelectedNode(null);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedNode, clipboard, setNodes, setEdges]);

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
    } catch (error) {
      console.error('Failed to load flow:', error);
    }
  };

  const onConnect = useCallback(
    (params: Edge | Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const onNodesDelete = useCallback((deleted: Node[]) => {
    deleted.forEach(node => {
      if (selectedNode && selectedNode.id === node.id) {
        setSelectedNode(null);
      }
    });
  }, [selectedNode]);

  const handleAddStep = (type: TestStep['type']) => {
    const newNode: Node = {
      id: `${Date.now()}`,
      type: 'testStep',
      position: { x: 250, y: 250 },
      data: {
        id: `${Date.now()}`,
        type,
        name: `New ${type} Step`,
        config: {},
      },
    };
    setNodes((nds) => nds.concat(newNode));
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
  };

  const handleSave = async () => {
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
        sourceHandle: edge.sourceHandle,
        targetHandle: edge.targetHandle,
      })),
    };

    try {
      if (id && id !== 'new') {
        await api.updateFlow(id, flow);
      } else {
        const newFlow = await api.createFlow(flow);
        navigate(`/flows/${newFlow.id}`);
      }
    } catch (error) {
      console.error('Failed to save flow:', error);
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
        sourceHandle: edge.sourceHandle,
        targetHandle: edge.targetHandle,
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

  return (
    <Box sx={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            label="Flow Name"
            value={flowName}
            onChange={(e) => setFlowName(e.target.value)}
            size="small"
          />
          <TextField
            label="Description"
            value={flowDescription}
            onChange={(e) => setFlowDescription(e.target.value)}
            size="small"
            sx={{ flex: 1 }}
          />
          <Button
            variant="contained"
            className="gradient-success"
            startIcon={<SaveIcon />}
            onClick={handleSave}
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
        </Box>
      </Paper>

      <Box sx={{ display: 'flex', flex: 1 }}>
        <StepPanel onAddStep={handleAddStep} />
        
        <Box sx={{ flex: 1 }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onNodesDelete={onNodesDelete}
            nodeTypes={nodeTypes}
            deleteKeyCode="Delete"
          >
            <Controls />
            <MiniMap />
            <Background variant="dots" gap={12} size={1} />
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
    </Box>
  );
}