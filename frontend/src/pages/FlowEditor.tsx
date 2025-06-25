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
import { Box, Paper, AppBar, Toolbar, Typography, Button, TextField } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import { TestFlow, TestStep } from '../../../shared/src/types';
import { api } from '../services/api';
import StepPanel from '../components/StepPanel';
import StepNode from '../components/StepNode';

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

  useEffect(() => {
    if (id && id !== 'new') {
      loadFlow(id);
    }
  }, [id]);

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
            startIcon={<SaveIcon />}
            onClick={handleSave}
          >
            Save
          </Button>
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
            nodeTypes={nodeTypes}
          >
            <Controls />
            <MiniMap />
            <Background variant="dots" gap={12} size={1} />
          </ReactFlow>
        </Box>

        {selectedNode && (
          <Box sx={{ width: 300, p: 2, borderLeft: 1, borderColor: 'divider' }}>
            <Typography variant="h6" gutterBottom>
              Step Configuration
            </Typography>
            {/* Step configuration form would go here */}
          </Box>
        )}
      </Box>
    </Box>
  );
}