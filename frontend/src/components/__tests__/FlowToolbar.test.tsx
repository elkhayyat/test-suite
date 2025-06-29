import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import FlowToolbar from '../FlowToolbar';

describe('FlowToolbar', () => {
  const mockProps = {
    flowName: 'Test Flow',
    flowDescription: 'Test Description',
    onFlowNameChange: vi.fn(),
    onFlowDescriptionChange: vi.fn(),
    autoSaveEnabled: true,
    saveStatus: 'saved' as const,
    lastSaved: new Date(),
    onToggleAutoSave: vi.fn(),
    onSave: vi.fn(),
    onExport: vi.fn(),
    onImport: vi.fn(),
    onOpenAPIImport: vi.fn(),
    onRunFlow: vi.fn(),
    canRunFlow: true,
    isSaving: false,
    isRunning: false,
  };

  it('renders flow name and description inputs', () => {
    render(<FlowToolbar {...mockProps} />);
    
    expect(screen.getByDisplayValue('Test Flow')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test Description')).toBeInTheDocument();
  });

  it('calls onFlowNameChange when name input changes', () => {
    render(<FlowToolbar {...mockProps} />);
    
    const nameInput = screen.getByDisplayValue('Test Flow');
    fireEvent.change(nameInput, { target: { value: 'New Flow Name' } });
    
    expect(mockProps.onFlowNameChange).toHaveBeenCalledWith('New Flow Name');
  });

  it('calls onSave when save button is clicked', () => {
    render(<FlowToolbar {...mockProps} />);
    
    const saveButton = screen.getByText('Save');
    fireEvent.click(saveButton);
    
    expect(mockProps.onSave).toHaveBeenCalled();
  });

  it('shows loading state when saving', () => {
    render(<FlowToolbar {...mockProps} isSaving={true} />);
    
    expect(screen.getByText('Saving...')).toBeInTheDocument();
  });

  it('shows loading state when running', () => {
    render(<FlowToolbar {...mockProps} isRunning={true} />);
    
    expect(screen.getByText('Starting...')).toBeInTheDocument();
  });

  it('disables run button when canRunFlow is false', () => {
    render(<FlowToolbar {...mockProps} canRunFlow={false} />);
    
    const runButton = screen.getByText('Run Flow');
    expect(runButton).toBeDisabled();
  });
});