import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  LinearProgress,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Collapse,
  IconButton,
  Alert,
  Divider,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import PendingIcon from '@mui/icons-material/Pending';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { TestRun, StepResult } from '../../../shared/src/types';
import { api } from '../services/api';
import { useSocket } from '../hooks/useSocket';

interface RunResultsDialogProps {
  open: boolean;
  onClose: () => void;
  runId: string | null;
  flowName: string;
}

export default function RunResultsDialog({ open, onClose, runId, flowName }: RunResultsDialogProps) {
  const [run, setRun] = useState<TestRun | null>(null);
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const socket = useSocket();

  useEffect(() => {
    if (runId && open) {
      loadRunDetails();
    }
  }, [runId, open]);

  useEffect(() => {
    if (!socket || !runId) return;

    socket.on('run:updated', (updatedRun: TestRun) => {
      if (updatedRun.id === runId) {
        setRun(updatedRun);
      }
    });

    return () => {
      socket.off('run:updated');
    };
  }, [socket, runId]);

  const loadRunDetails = async () => {
    if (!runId) return;
    try {
      const runData = await api.getRun(runId);
      setRun(runData);
    } catch (error) {
      console.error('Failed to load run details:', error);
    }
  };

  const toggleStepExpanded = (stepId: string) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(stepId)) {
      newExpanded.delete(stepId);
    } else {
      newExpanded.add(stepId);
    }
    setExpandedSteps(newExpanded);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircleIcon color="success" />;
      case 'failed':
        return <ErrorIcon color="error" />;
      case 'pending':
        return <PendingIcon color="disabled" />;
      default:
        return <PendingIcon color="disabled" />;
    }
  };

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'running':
        return <Chip label="Running" color="primary" size="small" />;
      case 'completed':
        return <Chip label="Completed" color="success" size="small" />;
      case 'failed':
        return <Chip label="Failed" color="error" size="small" />;
      default:
        return <Chip label={status} size="small" />;
    }
  };

  const formatDuration = (start: string, end?: string) => {
    if (!end) return 'Running...';
    const duration = new Date(end).getTime() - new Date(start).getTime();
    return `${duration}ms`;
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">{flowName} - Run Results</Typography>
          {run && getStatusChip(run.status)}
        </Box>
      </DialogTitle>
      
      <DialogContent dividers>
        {!run ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2 }}>
            <LinearProgress sx={{ flexGrow: 1 }} />
            <Typography>Loading run details...</Typography>
          </Box>
        ) : (
          <>
            {run.status === 'running' && (
              <LinearProgress sx={{ mb: 2 }} />
            )}
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Started: {new Date(run.startTime).toLocaleString()}
              </Typography>
              {run.endTime && (
                <Typography variant="body2" color="text.secondary">
                  Completed: {new Date(run.endTime).toLocaleString()}
                </Typography>
              )}
              <Typography variant="body2" color="text.secondary">
                Duration: {formatDuration(run.startTime, run.endTime)}
              </Typography>
            </Box>

            {run.error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {run.error}
              </Alert>
            )}

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle1" gutterBottom>
              Step Results ({run.results.length} steps)
            </Typography>

            <List>
              {run.results.map((result: StepResult) => (
                <Box key={result.stepId}>
                  <ListItem
                    button
                    onClick={() => toggleStepExpanded(result.stepId)}
                    sx={{
                      bgcolor: result.status === 'failed' ? 'error.light' : 'background.paper',
                      '&:hover': {
                        bgcolor: result.status === 'failed' ? 'error.light' : 'action.hover',
                      },
                    }}
                  >
                    <ListItemIcon>
                      {getStatusIcon(result.status)}
                    </ListItemIcon>
                    <ListItemText
                      primary={`Step: ${result.stepId}`}
                      secondary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <AccessTimeIcon fontSize="small" />
                          <Typography variant="caption">
                            {formatDuration(result.startTime, result.endTime)}
                          </Typography>
                        </Box>
                      }
                    />
                    <IconButton size="small">
                      {expandedSteps.has(result.stepId) ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </IconButton>
                  </ListItem>
                  
                  <Collapse in={expandedSteps.has(result.stepId)} timeout="auto" unmountOnExit>
                    <Box sx={{ p: 2, bgcolor: 'background.default' }}>
                      {result.error && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                          {result.error}
                        </Alert>
                      )}
                      
                      {result.output && (
                        <Box>
                          <Typography variant="subtitle2" gutterBottom>
                            Output:
                          </Typography>
                          <Box
                            component="pre"
                            sx={{
                              p: 1,
                              bgcolor: 'background.paper',
                              borderRadius: 1,
                              overflow: 'auto',
                              maxHeight: 300,
                              fontSize: '0.875rem',
                              fontFamily: 'monospace',
                            }}
                          >
                            {typeof result.output === 'string' 
                              ? result.output 
                              : JSON.stringify(result.output, null, 2)}
                          </Box>
                        </Box>
                      )}
                    </Box>
                  </Collapse>
                </Box>
              ))}
            </List>
          </>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        {run && (
          <Button
            variant="contained"
            onClick={() => {
              window.open(`/runs/${run.id}`, '_blank');
            }}
          >
            View Full Details
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}