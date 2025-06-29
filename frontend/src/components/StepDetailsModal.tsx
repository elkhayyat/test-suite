import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Typography,
  Box,
  Tabs,
  Tab,
  Chip,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import PauseIcon from '@mui/icons-material/Pause';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { TestStep, StepResult } from '../../../shared/src/types';

interface StepDetailsModalProps {
  open: boolean;
  onClose: () => void;
  step: TestStep;
  result?: StepResult;
}

export default function StepDetailsModal({ open, onClose, step, result }: StepDetailsModalProps) {
  const [activeTab, setActiveTab] = useState(0);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // Could add a toast notification here if needed
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const formatDuration = (start: Date, end?: Date) => {
    if (!end) return 'Running...';
    const duration = new Date(end).getTime() - new Date(start).getTime();
    if (duration < 1000) return `${duration}ms`;
    return `${(duration / 1000).toFixed(2)}s`;
  };

  const getStatusColor = () => {
    if (!result) return 'default';
    switch (result.status) {
      case 'passed':
        return 'success';
      case 'failed':
        return 'error';
      case 'running':
        return 'primary';
      case 'skipped':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusIcon = () => {
    if (!result) return null;
    switch (result.status) {
      case 'passed':
        return <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} />;
      case 'failed':
        return <ErrorIcon sx={{ fontSize: 16, color: 'error.main' }} />;
      case 'skipped':
        return <PauseIcon sx={{ fontSize: 16, color: 'warning.main' }} />;
      default:
        return null;
    }
  };

  // Auto-switch to error tab when step fails
  React.useEffect(() => {
    if (result?.status === 'failed' && result?.error) {
      // Find error tab index and switch to it
      const errorTabIndex = result?.output ? 2 : 1;
      setActiveTab(errorTabIndex);
    }
  }, [result?.status, result?.error]);

  const tabs = [
    {
      label: 'Info',
      content: (
        <Box>
          <Typography variant="h6" gutterBottom>
            Step Information
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="body2">
              <strong>Name:</strong> {step.name}
            </Typography>
            <Typography variant="body2">
              <strong>Type:</strong> {step.type}
            </Typography>
            <Typography variant="body2">
              <strong>ID:</strong> {step.id}
            </Typography>
            
            {result && (
              <>
                <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
                  Execution Details
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  {getStatusIcon()}
                  <Chip 
                    label={result.status.toUpperCase()} 
                    size="small" 
                    color={getStatusColor() as any}
                    variant="filled"
                  />
                </Box>
                <Typography variant="body2">
                  <strong>Started:</strong> {new Date(result.startTime).toLocaleString()}
                </Typography>
                {result.endTime && (
                  <>
                    <Typography variant="body2">
                      <strong>Ended:</strong> {new Date(result.endTime).toLocaleString()}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <AccessTimeIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                      <Typography variant="body2">
                        <strong>Duration:</strong> {formatDuration(result.startTime, result.endTime)}
                      </Typography>
                    </Box>
                  </>
                )}
              </>
            )}
          </Box>
        </Box>
      )
    }
  ];

  if (result?.output) {
    // Special handling for SQL steps
    if (step.type === 'sql' && typeof result.output === 'object' && result.output.rows) {
      tabs.push({
        label: 'Results',
        content: (
          <Box>
            <Typography variant="h6" gutterBottom>
              SQL Results
            </Typography>
            {result.output.summary && (
              <Typography variant="body2" color="success.main" sx={{ mb: 2 }}>
                {result.output.summary}
              </Typography>
            )}
            <Typography variant="body2" sx={{ mb: 1 }}>
              <strong>Query:</strong> {result.output.query}
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              <strong>Rows:</strong> {result.output.rowCount} | <strong>Execution Time:</strong> {result.output.executionTime}ms
            </Typography>
            <Box sx={{ 
              maxHeight: 400, 
              overflow: 'auto', 
              border: 1, 
              borderColor: 'divider', 
              borderRadius: 1, 
              p: 2,
              bgcolor: 'background.default'
            }}>
              <pre style={{ 
                margin: 0, 
                fontSize: '0.875rem', 
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontFamily: 'monospace'
              }}>
                {JSON.stringify(result.output.rows, null, 2)}
              </pre>
            </Box>
          </Box>
        )
      });
    } else {
      // Standard output display for other step types
      tabs.push({
        label: 'Output',
        content: (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Step Output
              </Typography>
              <IconButton
                size="small"
                onClick={() => copyToClipboard(
                  typeof result.output === 'string' 
                    ? result.output 
                    : JSON.stringify(result.output, null, 2)
                )}
                title="Copy output"
              >
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </Box>
            <Box sx={{ 
              maxHeight: 400, 
              overflow: 'auto', 
              border: 1, 
              borderColor: 'divider', 
              borderRadius: 1, 
              p: 2,
              bgcolor: 'background.default'
            }}>
              <pre style={{ 
                margin: 0, 
                fontSize: '0.875rem', 
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontFamily: 'monospace'
              }}>
                {typeof result.output === 'string' 
                  ? result.output 
                  : JSON.stringify(result.output, null, 2)}
              </pre>
            </Box>
          </Box>
        )
      });
    }
  }

  if (result?.error) {
    tabs.push({
      label: 'Error',
      content: (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" color="error">
              Error Details
            </Typography>
            <IconButton
              size="small"
              onClick={() => copyToClipboard(result.error!)}
              title="Copy error message"
            >
              <ContentCopyIcon fontSize="small" />
            </IconButton>
          </Box>
          <Box sx={{ 
            maxHeight: 400, 
            overflow: 'auto', 
            border: 1, 
            borderColor: 'error.main', 
            borderRadius: 1, 
            p: 2,
            bgcolor: 'error.light',
            color: 'error.contrastText'
          }}>
            <Typography variant="body2" sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
              {result.error}
            </Typography>
          </Box>
        </Box>
      )
    });
  }

  // Ensure activeTab is within valid range
  const validActiveTab = Math.min(activeTab, tabs.length - 1);

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { height: '80vh' }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        pb: 1
      }}>
        <Box>
          <Typography variant="h6" component="div">
            {step.name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Step Details
          </Typography>
        </Box>
        <IconButton
          edge="end"
          color="inherit"
          onClick={onClose}
          aria-label="close"
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={validActiveTab} 
            onChange={(_, newValue) => setActiveTab(newValue)}
            variant="scrollable"
            scrollButtons="auto"
          >
            {tabs.map((tab, index) => (
              <Tab key={index} label={tab.label} />
            ))}
          </Tabs>
        </Box>
        
        <Box sx={{ p: 3, height: 'calc(100% - 48px)', overflow: 'auto' }}>
          {tabs[validActiveTab]?.content}
        </Box>
      </DialogContent>
    </Dialog>
  );
}