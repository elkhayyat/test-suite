import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import FlowCanvas from '../FlowCanvas';

// Mock react-flow-renderer
vi.mock('react-flow-renderer', () => ({
  __esModule: true,
  default: ({ children, ...props }: any) => (
    <div data-testid="react-flow" {...props}>
      {children}
    </div>
  ),
  Controls: () => <div data-testid="controls" />,
  MiniMap: () => <div data-testid="minimap" />,
  Background: () => <div data-testid="background" />,
}));

describe('FlowCanvas', () => {
  const mockProps = {
    nodes: [
      {
        id: '1',
        type: 'testStep',
        position: { x: 100, y: 100 },
        data: { id: '1', name: 'Test Step' },
      },
    ],
    edges: [
      {
        id: 'e1-2',
        source: '1',
        target: '2',
      },
    ],
    onNodesChange: vi.fn(),
    onEdgesChange: vi.fn(),
    onConnect: vi.fn(),
    onNodeClick: vi.fn(),
    onNodeContextMenu: vi.fn(),
    onNodeDragStop: vi.fn(),
    onNodesDelete: vi.fn(),
    onDragOver: vi.fn(),
    onDrop: vi.fn(),
  };

  it('renders ReactFlow with controls and minimap', () => {
    render(<FlowCanvas {...mockProps} />);
    
    expect(screen.getByTestId('react-flow')).toBeInTheDocument();
    expect(screen.getByTestId('controls')).toBeInTheDocument();
    expect(screen.getByTestId('minimap')).toBeInTheDocument();
    expect(screen.getByTestId('background')).toBeInTheDocument();
  });

  it('passes nodes and edges to ReactFlow', () => {
    render(<FlowCanvas {...mockProps} />);
    
    const reactFlow = screen.getByTestId('react-flow');
    expect(reactFlow).toHaveAttribute('nodes');
    expect(reactFlow).toHaveAttribute('edges');
  });
});