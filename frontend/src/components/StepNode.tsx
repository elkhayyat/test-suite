import React, { useState } from 'react';
import { Handle, Position } from 'react-flow-renderer';
import { Box, Paper, Typography, CircularProgress, Chip, Collapse, IconButton, Tabs, Tab } from '@mui/material';
import HttpIcon from '@mui/icons-material/Http';
import WebIcon from '@mui/icons-material/Web';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import TimerIcon from '@mui/icons-material/Timer';
import CodeIcon from '@mui/icons-material/Code';
import ErrorIcon from '@mui/icons-material/Error';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import StorageIcon from '@mui/icons-material/Storage';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import { TestStep, StepResult } from '../../../shared/src/types';

interface StepNodeData extends TestStep {
  result?: StepResult;
  isRunning?: boolean;
}

interface StepNodeProps {
  data: StepNodeData;
}

export default function StepNode({ data }: StepNodeProps) {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  // Auto-expand when step fails and switch to error tab
  React.useEffect(() => {
    if (data.result?.status === 'failed') {
      setExpanded(true);
      // The error tab will be added dynamically, so we'll set activeTab in the render
    }
  }, [data.result]);

  const getIcon = () => {
    switch (data.type) {
      case 'http':
        return <HttpIcon />;
      case 'browser':
        return <WebIcon />;
      case 'assertion':
        return <CheckCircleIcon />;
      case 'delay':
        return <TimerIcon />;
      case 'condition':
        return <CodeIcon />;
      case 'sql':
        return <StorageIcon />;
      case 'subflow':
        return <AccountTreeIcon />;
      default:
        return null;
    }
  };

  const getTypeColor = () => {
    switch (data.type) {
      case 'http':
        return 'gradient-info';
      case 'browser':
        return 'gradient-primary';
      case 'assertion':
        return 'gradient-success';
      case 'delay':
        return 'gradient-warning';
      case 'condition':
        return 'gradient-error';
      case 'sql':
        return 'gradient-secondary';
      case 'subflow':
        return 'gradient-info';
      default:
        return 'gradient-dark';
    }
  };

  const getStatusColor = () => {
    if (!data.result) return 'default';
    switch (data.result.status) {
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
    if (!data.result) return null;
    switch (data.result.status) {
      case 'passed':
        return <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} />;
      case 'failed':
        return <ErrorIcon sx={{ fontSize: 16, color: 'error.main' }} />;
      case 'running':
        return <CircularProgress size={16} thickness={4} />;
      default:
        return null;
    }
  };

  const formatDuration = (start: Date, end?: Date) => {
    if (!end) return 'Running...';
    const duration = new Date(end).getTime() - new Date(start).getTime();
    if (duration < 1000) return `${duration}ms`;
    return `${(duration / 1000).toFixed(2)}s`;
  };

  return (
    <Paper 
      className="animate-scaleIn"
      sx={{ 
        p: 2, 
        minWidth: 250,
        cursor: 'move',
        transition: 'all 0.3s ease',
        border: data.result ? `2px solid` : '1px solid',
        borderColor: data.result ? 
          (data.result.status === 'passed' ? 'success.main' : 
           data.result.status === 'failed' ? 'error.main' :
           data.result.status === 'running' ? 'primary.main' : 'warning.main') 
          : 'divider',
        '&:hover': {
          transform: 'scale(1.05)',
          boxShadow: (theme) => theme.palette.mode === 'dark' 
            ? '0 8px 32px rgba(255,255,255,0.1)' 
            : '0 8px 32px rgba(0,0,0,0.15)',
        }
      }}
    >
      <Handle type="target" position={Position.Top} />
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
            ID: {data.id.substring(0, 8)}
          </Typography>
          {data.result && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {getStatusIcon()}
              <Chip 
                label={data.result.status} 
                size="small" 
                color={getStatusColor() as any}
                sx={{ height: 20, fontSize: '0.7rem' }}
              />
            </Box>
          )}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box 
            className={getTypeColor()}
            sx={{ 
              p: 0.5,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'transform 0.3s ease',
              '.MuiPaper-root:hover &': {
                transform: 'rotate(360deg) scale(1.1)',
              }
            }}
          >
            <Box sx={{ color: 'white', display: 'flex' }}>
              {getIcon()}
            </Box>
          </Box>
          <Typography variant="body2" sx={{ flex: 1 }}>{data.name}</Typography>
          {data.result && (data.result.output || data.result.error || data.result.status === 'passed') && (
            <IconButton 
              size="small" 
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(!expanded);
              }}
              sx={{ p: 0.5 }}
            >
              {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          )}
        </Box>

        {/* Execution result details */}
        <Collapse in={expanded && !!data.result}>
          {data.result && (() => {
            const tabs = [
              { label: 'Info', content: (
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    Status: {data.result!.status}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    Started: {new Date(data.result!.startTime).toLocaleTimeString()}
                  </Typography>
                  {data.result!.endTime && (
                    <>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        Ended: {new Date(data.result!.endTime).toLocaleTimeString()}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        Duration: {formatDuration(data.result!.startTime, data.result!.endTime)}
                      </Typography>
                    </>
                  )}
                </Box>
              )}
            ];

            if (data.result.output) {
              // Special handling for SQL steps
              if (data.type === 'sql' && typeof data.result.output === 'object' && data.result.output.rows) {
                tabs.push({
                  label: 'Results',
                  content: (
                    <Box>
                      {data.result.output.summary && (
                        <Typography variant="caption" color="success.main" sx={{ display: 'block', mb: 1 }}>
                          {data.result.output.summary}
                        </Typography>
                      )}
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                        Query: {data.result.output.query}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                        Rows: {data.result.output.rowCount} | Time: {data.result.output.executionTime}ms
                      </Typography>
                      <Box sx={{ maxHeight: 150, overflow: 'auto', border: 1, borderColor: 'divider', borderRadius: 1, p: 1 }}>
                        <pre style={{ 
                          margin: 0, 
                          fontSize: '0.7rem', 
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word'
                        }}>
                          {JSON.stringify(data.result.output.rows, null, 2)}
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
                      <pre style={{ 
                        margin: 0, 
                        fontSize: '0.75rem', 
                        overflow: 'auto', 
                        maxHeight: 200,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word'
                      }}>
                        {typeof data.result!.output === 'string' 
                          ? data.result!.output 
                          : JSON.stringify(data.result!.output, null, 2)}
                      </pre>
                    </Box>
                  )
                });
              }
            }

            if (data.result.error) {
              tabs.push({
                label: 'Error',
                content: (
                  <Box>
                    <Typography variant="body2" color="error">
                      {data.result!.error}
                    </Typography>
                  </Box>
                )
              });
            }

            // Auto-select error tab when step fails
            let validActiveTab = Math.min(activeTab, tabs.length - 1);
            if (data.result.status === 'failed' && data.result.error) {
              const errorTabIndex = tabs.findIndex(tab => tab.label === 'Error');
              if (errorTabIndex !== -1) {
                validActiveTab = errorTabIndex;
              }
            }

            return (
              <Box sx={{ mt: 1, bgcolor: 'background.default', borderRadius: 1 }}>
                <Tabs 
                  value={validActiveTab} 
                  onChange={(_, newValue) => setActiveTab(newValue)}
                  variant="scrollable"
                  scrollButtons="auto"
                  sx={{ 
                    minHeight: 32,
                    '& .MuiTab-root': { 
                      minHeight: 32, 
                      py: 0.5, 
                      fontSize: '0.75rem',
                      minWidth: 'auto',
                      px: 1
                    }
                  }}
                >
                  {tabs.map((tab, index) => (
                    <Tab key={index} label={tab.label} />
                  ))}
                </Tabs>
                
                <Box sx={{ p: 1 }}>
                  {tabs[validActiveTab]?.content}
                </Box>
              </Box>
            );
          })()}
        </Collapse>
      </Box>
      <Handle type="source" position={Position.Bottom} />
    </Paper>
  );
}