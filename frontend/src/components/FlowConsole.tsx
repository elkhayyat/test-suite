import { Box, Typography, IconButton, Collapse } from '@mui/material';
import TerminalIcon from '@mui/icons-material/Terminal';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { ConsoleLog } from '../../../shared/src/types';
import InteractiveConsole from './InteractiveConsole';
import { ComponentErrorBoundary } from './ErrorBoundary';

interface FlowConsoleProps {
  isOpen: boolean;
  logs: ConsoleLog[];
  onToggle: () => void;
  onClear: () => void;
  onCommand: (command: string) => void;
  context: {
    environmentVariables: any;
    stepResults: any;
    selectedNode: any;
  };
}

export default function FlowConsole({
  isOpen,
  logs,
  onToggle,
  onClear,
  onCommand,
  context,
}: FlowConsoleProps) {
  return (
    <Box sx={{
      flexShrink: 0,
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
          borderBottom: isOpen ? 1 : 0,
          borderColor: 'divider'
        }}
        onClick={onToggle}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TerminalIcon fontSize="small" />
          <Typography variant="body2">Console</Typography>
          {logs.length > 0 && (
            <Typography variant="caption" color="text.secondary">
              ({logs.length} logs)
            </Typography>
          )}
        </Box>
        <IconButton size="small">
          {isOpen ? <ExpandMoreIcon /> : <ExpandLessIcon />}
        </IconButton>
      </Box>
      <Collapse in={isOpen}>
        <Box sx={{ height: 300 }}>
          <ComponentErrorBoundary context="Interactive Console">
            <InteractiveConsole 
              logs={logs}
              onClear={onClear}
              onCommand={onCommand}
              maxHeight={300}
              autoScroll={true}
              context={context}
            />
          </ComponentErrorBoundary>
        </Box>
      </Collapse>
    </Box>
  );
}