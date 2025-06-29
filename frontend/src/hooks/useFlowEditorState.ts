import { useReducer, useCallback } from 'react';
import { Node } from 'react-flow-renderer';
import { TestRun, StepResult, ConsoleLog } from '../../../shared/src/types';

// Flow editing state
export interface FlowEditState {
  flowName: string;
  flowDescription: string;
  tempFlowName: string;
  tempFlowDescription: string;
  saveStatus: 'saved' | 'saving' | 'unsaved';
  lastSaved: Date | null;
}

export type FlowEditAction =
  | { type: 'SET_FLOW_NAME'; payload: string }
  | { type: 'SET_FLOW_DESCRIPTION'; payload: string }
  | { type: 'SET_TEMP_FLOW_NAME'; payload: string }
  | { type: 'SET_TEMP_FLOW_DESCRIPTION'; payload: string }
  | { type: 'SET_SAVE_STATUS'; payload: 'saved' | 'saving' | 'unsaved' }
  | { type: 'SET_LAST_SAVED'; payload: Date | null }
  | { type: 'RESET_FLOW'; payload: { name: string; description: string } };

const flowEditReducer = (state: FlowEditState, action: FlowEditAction): FlowEditState => {
  switch (action.type) {
    case 'SET_FLOW_NAME':
      return { ...state, flowName: action.payload };
    case 'SET_FLOW_DESCRIPTION':
      return { ...state, flowDescription: action.payload };
    case 'SET_TEMP_FLOW_NAME':
      return { ...state, tempFlowName: action.payload };
    case 'SET_TEMP_FLOW_DESCRIPTION':
      return { ...state, tempFlowDescription: action.payload };
    case 'SET_SAVE_STATUS':
      return { ...state, saveStatus: action.payload };
    case 'SET_LAST_SAVED':
      return { ...state, lastSaved: action.payload };
    case 'RESET_FLOW':
      return {
        ...state,
        flowName: action.payload.name,
        flowDescription: action.payload.description,
        tempFlowName: action.payload.name,
        tempFlowDescription: action.payload.description,
        saveStatus: 'saved',
      };
    default:
      return state;
  }
};

// UI state
export interface UIState {
  selectedNode: Node | null;
  contextMenu: { mouseX: number; mouseY: number } | null;
  contextMenuNode: Node | null;
  consoleOpen: boolean;
  openAPIDialogOpen: boolean;
  shortcutsDialogOpen: boolean;
  selectionMode: boolean;
  autoSaveEnabled: boolean;
}

export type UIAction =
  | { type: 'SET_SELECTED_NODE'; payload: Node | null }
  | { type: 'SET_CONTEXT_MENU'; payload: { mouseX: number; mouseY: number } | null }
  | { type: 'SET_CONTEXT_MENU_NODE'; payload: Node | null }
  | { type: 'SET_CONSOLE_OPEN'; payload: boolean }
  | { type: 'SET_OPENAPI_DIALOG_OPEN'; payload: boolean }
  | { type: 'SET_SHORTCUTS_DIALOG_OPEN'; payload: boolean }
  | { type: 'SET_SELECTION_MODE'; payload: boolean }
  | { type: 'SET_AUTO_SAVE_ENABLED'; payload: boolean }
  | { type: 'CLOSE_ALL_DIALOGS' };

const uiReducer = (state: UIState, action: UIAction): UIState => {
  switch (action.type) {
    case 'SET_SELECTED_NODE':
      return { ...state, selectedNode: action.payload };
    case 'SET_CONTEXT_MENU':
      return { ...state, contextMenu: action.payload };
    case 'SET_CONTEXT_MENU_NODE':
      return { ...state, contextMenuNode: action.payload };
    case 'SET_CONSOLE_OPEN':
      return { ...state, consoleOpen: action.payload };
    case 'SET_OPENAPI_DIALOG_OPEN':
      return { ...state, openAPIDialogOpen: action.payload };
    case 'SET_SHORTCUTS_DIALOG_OPEN':
      return { ...state, shortcutsDialogOpen: action.payload };
    case 'SET_SELECTION_MODE':
      return { ...state, selectionMode: action.payload };
    case 'SET_AUTO_SAVE_ENABLED':
      return { ...state, autoSaveEnabled: action.payload };
    case 'CLOSE_ALL_DIALOGS':
      return {
        ...state,
        contextMenu: null,
        openAPIDialogOpen: false,
        shortcutsDialogOpen: false,
      };
    default:
      return state;
  }
};

// Test execution state
export interface TestExecutionState {
  currentRun: TestRun | null;
  stepResults: { [stepId: string]: StepResult };
  consoleLogs: ConsoleLog[];
}

export type TestExecutionAction =
  | { type: 'SET_CURRENT_RUN'; payload: TestRun | null }
  | { type: 'SET_STEP_RESULTS'; payload: { [stepId: string]: StepResult } }
  | { type: 'UPDATE_STEP_RESULT'; payload: { stepId: string; result: StepResult } }
  | { type: 'ADD_CONSOLE_LOGS'; payload: ConsoleLog[] }
  | { type: 'CLEAR_CONSOLE_LOGS' }
  | { type: 'CLEAR_STEP_RESULTS' };

const testExecutionReducer = (state: TestExecutionState, action: TestExecutionAction): TestExecutionState => {
  switch (action.type) {
    case 'SET_CURRENT_RUN':
      return { ...state, currentRun: action.payload };
    case 'SET_STEP_RESULTS':
      return { ...state, stepResults: action.payload };
    case 'UPDATE_STEP_RESULT':
      return {
        ...state,
        stepResults: {
          ...state.stepResults,
          [action.payload.stepId]: action.payload.result,
        },
      };
    case 'ADD_CONSOLE_LOGS':
      return { ...state, consoleLogs: [...state.consoleLogs, ...action.payload] };
    case 'CLEAR_CONSOLE_LOGS':
      return { ...state, consoleLogs: [] };
    case 'CLEAR_STEP_RESULTS':
      return { ...state, stepResults: {} };
    default:
      return state;
  }
};

// Combined hook for all state management
export function useFlowEditorState() {
  const [flowEditState, flowEditDispatch] = useReducer(flowEditReducer, {
    flowName: 'New Flow',
    flowDescription: '',
    tempFlowName: 'New Flow',
    tempFlowDescription: '',
    saveStatus: 'saved',
    lastSaved: null,
  });

  const [uiState, uiDispatch] = useReducer(uiReducer, {
    selectedNode: null,
    contextMenu: null,
    contextMenuNode: null,
    consoleOpen: (() => {
      const saved = localStorage.getItem('consoleOpen');
      return saved === 'true';
    })(),
    openAPIDialogOpen: false,
    shortcutsDialogOpen: false,
    selectionMode: false,
    autoSaveEnabled: (() => {
      const saved = localStorage.getItem('autoSaveEnabled');
      return saved === null ? true : saved === 'true';
    })(),
  });

  const [testExecutionState, testExecutionDispatch] = useReducer(testExecutionReducer, {
    currentRun: null,
    stepResults: {},
    consoleLogs: [],
  });

  // Action creators for better type safety and convenience
  const flowEditActions = {
    setFlowName: useCallback((name: string) => 
      flowEditDispatch({ type: 'SET_FLOW_NAME', payload: name }), []),
    setFlowDescription: useCallback((description: string) => 
      flowEditDispatch({ type: 'SET_FLOW_DESCRIPTION', payload: description }), []),
    setTempFlowName: useCallback((name: string) => 
      flowEditDispatch({ type: 'SET_TEMP_FLOW_NAME', payload: name }), []),
    setTempFlowDescription: useCallback((description: string) => 
      flowEditDispatch({ type: 'SET_TEMP_FLOW_DESCRIPTION', payload: description }), []),
    setSaveStatus: useCallback((status: 'saved' | 'saving' | 'unsaved') => 
      flowEditDispatch({ type: 'SET_SAVE_STATUS', payload: status }), []),
    setLastSaved: useCallback((date: Date | null) => 
      flowEditDispatch({ type: 'SET_LAST_SAVED', payload: date }), []),
    resetFlow: useCallback((name: string, description: string) => 
      flowEditDispatch({ type: 'RESET_FLOW', payload: { name, description } }), []),
  };

  const uiActions = {
    setSelectedNode: useCallback((node: Node | null) => 
      uiDispatch({ type: 'SET_SELECTED_NODE', payload: node }), []),
    setContextMenu: useCallback((menu: { mouseX: number; mouseY: number } | null) => 
      uiDispatch({ type: 'SET_CONTEXT_MENU', payload: menu }), []),
    setContextMenuNode: useCallback((node: Node | null) => 
      uiDispatch({ type: 'SET_CONTEXT_MENU_NODE', payload: node }), []),
    setConsoleOpen: useCallback((open: boolean) => {
      uiDispatch({ type: 'SET_CONSOLE_OPEN', payload: open });
      localStorage.setItem('consoleOpen', String(open));
    }, []),
    setOpenAPIDialogOpen: useCallback((open: boolean) => 
      uiDispatch({ type: 'SET_OPENAPI_DIALOG_OPEN', payload: open }), []),
    setShortcutsDialogOpen: useCallback((open: boolean) => 
      uiDispatch({ type: 'SET_SHORTCUTS_DIALOG_OPEN', payload: open }), []),
    setSelectionMode: useCallback((mode: boolean) => 
      uiDispatch({ type: 'SET_SELECTION_MODE', payload: mode }), []),
    setAutoSaveEnabled: useCallback((enabled: boolean) => {
      uiDispatch({ type: 'SET_AUTO_SAVE_ENABLED', payload: enabled });
      localStorage.setItem('autoSaveEnabled', String(enabled));
    }, []),
    closeAllDialogs: useCallback(() => 
      uiDispatch({ type: 'CLOSE_ALL_DIALOGS' }), []),
  };

  const testExecutionActions = {
    setCurrentRun: useCallback((run: TestRun | null) => 
      testExecutionDispatch({ type: 'SET_CURRENT_RUN', payload: run }), []),
    setStepResults: useCallback((results: { [stepId: string]: StepResult }) => 
      testExecutionDispatch({ type: 'SET_STEP_RESULTS', payload: results }), []),
    updateStepResult: useCallback((stepId: string, result: StepResult) => 
      testExecutionDispatch({ type: 'UPDATE_STEP_RESULT', payload: { stepId, result } }), []),
    addConsoleLogs: useCallback((logs: ConsoleLog[]) => 
      testExecutionDispatch({ type: 'ADD_CONSOLE_LOGS', payload: logs }), []),
    clearConsoleLogs: useCallback(() => 
      testExecutionDispatch({ type: 'CLEAR_CONSOLE_LOGS' }), []),
    clearStepResults: useCallback(() => 
      testExecutionDispatch({ type: 'CLEAR_STEP_RESULTS' }), []),
  };

  return {
    // State
    flowEditState,
    uiState,
    testExecutionState,
    
    // Actions
    flowEditActions,
    uiActions,
    testExecutionActions,
  };
}