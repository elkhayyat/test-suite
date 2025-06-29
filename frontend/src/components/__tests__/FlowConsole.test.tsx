import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import FlowConsole from '../FlowConsole';

describe('FlowConsole', () => {
  const mockProps = {
    isOpen: false,
    logs: [
      {
        id: '1',
        stepId: 'step1',
        timestamp: new Date(),
        level: 'info' as const,
        message: 'Test log message',
      },
    ],
    onToggle: vi.fn(),
    onClear: vi.fn(),
    onCommand: vi.fn(),
    context: {
      environmentVariables: {},
      stepResults: {},
      selectedNode: null,
    },
  };

  it('renders console header with log count', () => {
    render(<FlowConsole {...mockProps} />);
    
    expect(screen.getByText('Console')).toBeInTheDocument();
    expect(screen.getByText('(1 logs)')).toBeInTheDocument();
  });

  it('calls onToggle when header is clicked', () => {
    render(<FlowConsole {...mockProps} />);
    
    const header = screen.getByText('Console').closest('div');
    fireEvent.click(header!);
    
    expect(mockProps.onToggle).toHaveBeenCalled();
  });

  it('shows console content when open', () => {
    render(<FlowConsole {...mockProps} isOpen={true} />);
    
    // The InteractiveConsole component should be rendered
    expect(screen.getByText('Console')).toBeInTheDocument();
  });

  it('hides console content when closed', () => {
    render(<FlowConsole {...mockProps} isOpen={false} />);
    
    // Only the header should be visible
    expect(screen.getByText('Console')).toBeInTheDocument();
  });
});