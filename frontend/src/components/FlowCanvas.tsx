import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  Connection as ReactFlowConnection,
} from 'react-flow-renderer';
import { Box } from '@mui/material';
import StepNode from './StepNode';
import { ComponentErrorBoundary } from './ErrorBoundary';

const nodeTypes = {
  testStep: StepNode,
};

interface FlowCanvasProps {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: (changes: any[]) => void;
  onEdgesChange: (changes: any[]) => void;
  onConnect: (params: Edge | ReactFlowConnection) => void;
  onNodeClick: (event: React.MouseEvent, node: Node) => void;
  onNodeContextMenu: (event: React.MouseEvent, node: Node) => void;
  onNodeDragStop: (event: React.MouseEvent, node: Node) => void;
  onNodesDelete: (nodes: Node[]) => void;
  onDragOver: (event: React.DragEvent) => void;
  onDrop: (event: React.DragEvent) => void;
}

export default function FlowCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeClick,
  onNodeContextMenu,
  onNodeDragStop,
  onNodesDelete,
  onDragOver,
  onDrop,
}: FlowCanvasProps) {
  return (
    <Box sx={{ flex: 1 }}>
      <ComponentErrorBoundary context="Flow Canvas">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onNodeContextMenu={onNodeContextMenu}
          onNodeDragStop={onNodeDragStop}
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
      </ComponentErrorBoundary>
    </Box>
  );
}