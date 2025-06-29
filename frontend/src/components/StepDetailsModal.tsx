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
import { TestStep, StepResult, HttpStepConfig } from '../../../shared/src/types';
import { generateCurlCommand } from '../utils/curlParser';
import { FrontendInterpolator } from '../utils/frontendInterpolator';
import { useEnvironment } from '../contexts/EnvironmentContext';

interface StepDetailsModalProps {
  open: boolean;
  onClose: () => void;
  step: TestStep;
  result?: StepResult;
}

export default function StepDetailsModal({ open, onClose, step, result }: StepDetailsModalProps) {
  const [activeTab, setActiveTab] = useState(0);
  const { environmentVariables } = useEnvironment();

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
      // Account for: Info (0), Request Details (1 if HTTP), Curl Command (2 if HTTP), Output (if available), Error
      let errorTabIndex = 1; // Base: Info + Error
      if (step.type === 'http') errorTabIndex += 2; // Add Request Details + Curl Command tabs
      if (result?.output) errorTabIndex++; // Add Output tab
      setActiveTab(errorTabIndex);
    }
  }, [result?.status, result?.error, step.type]);

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

  // Add Request Details and Curl Command tabs for HTTP steps
  if (step.type === 'http') {
    const httpConfig = step.config as HttpStepConfig;
    // Use actual execution values if available, otherwise fall back to template values
    const resolvedConfig = result?.output?.resolvedConfig;
    const displayConfig = resolvedConfig ? {
      method: resolvedConfig.method || httpConfig.method,
      url: resolvedConfig.url || httpConfig.url,
      headers: resolvedConfig.headers || httpConfig.headers,
      body: resolvedConfig.body !== undefined ? resolvedConfig.body : httpConfig.body,
      timeout: resolvedConfig.timeout !== undefined ? resolvedConfig.timeout : httpConfig.timeout,
      retries: resolvedConfig.retries !== undefined ? resolvedConfig.retries : httpConfig.retries,
      retryDelay: resolvedConfig.retryDelay !== undefined ? resolvedConfig.retryDelay : httpConfig.retryDelay,
    } as HttpStepConfig : httpConfig;
    
    // Request Details tab
    tabs.push({
      label: 'Request Details',
      content: (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              HTTP Request Details
            </Typography>
            <IconButton
              size="small"
              onClick={() => copyToClipboard(JSON.stringify(displayConfig, null, 2))}
              title="Copy request details"
            >
              <ContentCopyIcon fontSize="small" />
            </IconButton>
          </Box>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Method and URL */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                Method & URL
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Chip 
                  label={displayConfig.method} 
                  size="small" 
                  color="primary"
                  variant="filled"
                  sx={{ fontWeight: 'bold', minWidth: 80 }}
                />
                <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                  {displayConfig.url}
                </Typography>
              </Box>
            </Box>

            {/* Headers */}
            {displayConfig.headers && Object.keys(displayConfig.headers).length > 0 && (
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                  Headers
                </Typography>
                <Box sx={{ 
                  border: 1, 
                  borderColor: 'divider', 
                  borderRadius: 1, 
                  p: 2,
                  bgcolor: 'background.default'
                }}>
                  {Object.entries(displayConfig.headers).map(([key, value]) => (
                    <Box key={key} sx={{ mb: 1, display: 'flex', alignItems: 'flex-start' }}>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          fontFamily: 'monospace', 
                          fontWeight: 'bold',
                          color: 'primary.main',
                          minWidth: 120,
                          mr: 1
                        }}
                      >
                        {key}:
                      </Typography>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          fontFamily: 'monospace',
                          wordBreak: 'break-word',
                          flex: 1
                        }}
                      >
                        {value}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}

            {/* Body */}
            {displayConfig.body && (
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                  Request Body
                </Typography>
                <Box sx={{ 
                  maxHeight: 300, 
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
                    {typeof displayConfig.body === 'string' 
                      ? displayConfig.body 
                      : JSON.stringify(displayConfig.body, null, 2)}
                  </pre>
                </Box>
              </Box>
            )}

            {/* Additional Options */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                Configuration
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                {displayConfig.timeout && (
                  <Typography variant="body2">
                    <strong>Timeout:</strong> {displayConfig.timeout}ms
                  </Typography>
                )}
                {displayConfig.retries && (
                  <Typography variant="body2">
                    <strong>Retries:</strong> {displayConfig.retries}
                  </Typography>
                )}
                {displayConfig.retryDelay && (
                  <Typography variant="body2">
                    <strong>Retry Delay:</strong> {displayConfig.retryDelay}ms
                  </Typography>
                )}
              </Box>
            </Box>
          </Box>
        </Box>
      )
    });

    // Curl Command tab
    tabs.push({
      label: 'Curl Command',
      content: (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Equivalent Curl Command
            </Typography>
            <IconButton
              size="small"
              onClick={() => {
                try {
                  // Use actual execution values if available, otherwise interpolate template values
                  const configToUse = resolvedConfig ? displayConfig : (() => {
                    const interpolator = new FrontendInterpolator(environmentVariables, []);
                    return {
                      ...httpConfig,
                      url: interpolator.interpolateValue(httpConfig.url) as string,
                      headers: interpolator.interpolateValue(httpConfig.headers) as Record<string, string>,
                      body: interpolator.interpolateValue(httpConfig.body),
                    };
                  })();
                  const curlCmd = generateCurlCommand(configToUse);
                  copyToClipboard(curlCmd);
                } catch (error) {
                  // Fallback: copy raw command without substitution
                  const curlCmd = generateCurlCommand(httpConfig);
                  copyToClipboard(curlCmd);
                }
              }}
              title="Copy curl command"
            >
              <ContentCopyIcon fontSize="small" />
            </IconButton>
          </Box>
          
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {resolvedConfig 
                ? "This curl command shows the actual values that were used during execution."
                : "This curl command includes substituted environment variables and random values. Step references (like $stepId.path) are replaced with placeholder values."
              }
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
                fontFamily: 'monospace',
                lineHeight: 1.5
              }}>
                {(() => {
                  try {
                    // Use actual execution values if available, otherwise interpolate template values
                    const configToUse = resolvedConfig ? displayConfig : (() => {
                      const interpolator = new FrontendInterpolator(environmentVariables, []);
                      return {
                        ...httpConfig,
                        url: interpolator.interpolateValue(httpConfig.url) as string,
                        headers: interpolator.interpolateValue(httpConfig.headers) as Record<string, string>,
                        body: interpolator.interpolateValue(httpConfig.body),
                      };
                    })();
                    return generateCurlCommand(configToUse);
                  } catch (error) {
                    // Fallback: return raw command without substitution
                    return generateCurlCommand(httpConfig);
                  }
                })()}
              </pre>
            </Box>
          </Box>

          {/* Show step reference warning if needed and not using resolved config */}
          {!resolvedConfig && (() => {
            try {
              const interpolator = new FrontendInterpolator(environmentVariables, []);
              const configString = JSON.stringify(httpConfig);
              const note = interpolator.getStepReferenceNote(configString);
              if (note) {
                return (
                  <Box sx={{ 
                    mt: 2, 
                    p: 2, 
                    bgcolor: 'warning.light', 
                    borderRadius: 1,
                    border: 1,
                    borderColor: 'warning.main'
                  }}>
                    <Typography variant="body2" color="warning.dark">
                      ⚠️ {note}
                    </Typography>
                  </Box>
                );
              }
            } catch (error) {
              // Ignore errors in note generation
            }
            return null;
          })()}
        </Box>
      )
    });
  }

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