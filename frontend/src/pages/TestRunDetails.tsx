import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  IconButton,
  Chip,
  Divider,
  Alert,
  Tabs,
  Tab,
  Tooltip,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import SpeedIcon from '@mui/icons-material/Speed';
import HttpIcon from '@mui/icons-material/Http';
import WebIcon from '@mui/icons-material/Web';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import TimerIcon from '@mui/icons-material/Timer';
import CodeIcon from '@mui/icons-material/Code';
import StorageIcon from '@mui/icons-material/Storage';
import DownloadIcon from '@mui/icons-material/Download';
import { TestRun, TestStep, StepResult, ConsoleLog } from '../../../shared/src/types';
import { api } from '../services/api';
import StatusIndicator from '../components/StatusIndicator';
import InteractiveConsole from '../components/InteractiveConsole';
import { ConsoleCommandExecutor } from '../services/ConsoleCommandExecutor';
import { useSocket } from '../hooks/useSocket';
import { generatePDFReport } from '../utils/pdfReportGenerator';

export default function TestRunDetails() {
  const { runId } = useParams();
  const navigate = useNavigate();
  const socket = useSocket();
  const [run, setRun] = useState<TestRun | null>(null);
  const [flow, setFlow] = useState<any>(null);
  const [expandedSteps, setExpandedSteps] = useState<{ [stepId: string]: boolean }>({});
  const [stepActiveTabs, setStepActiveTabs] = useState<{ [stepId: string]: number }>({});
  const [loading, setLoading] = useState(true);
  const [commandExecutor] = useState(() => new ConsoleCommandExecutor());
  const [environmentVariables, setEnvironmentVariables] = useState<any[]>([]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // Could add a toast notification here if needed
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  useEffect(() => {
    if (runId) {
      loadRunDetails();
    }
  }, [runId]);

  // Listen for real-time updates
  useEffect(() => {
    if (!socket || !runId) return;

    const handleRunUpdate = (updatedRun: TestRun) => {
      if (updatedRun.id === runId) {
        setRun(updatedRun);
      }
    };

    const handleStepUpdate = (data: { runId: string; stepId: string; result: StepResult }) => {
      if (data.runId === runId && run) {
        // Update the specific step result
        setRun(prevRun => {
          if (!prevRun) return prevRun;
          const updatedResults = [...prevRun.results];
          const existingIndex = updatedResults.findIndex(r => r.stepId === data.stepId);
          if (existingIndex >= 0) {
            updatedResults[existingIndex] = data.result;
          } else {
            updatedResults.push(data.result);
          }
          return { ...prevRun, results: updatedResults };
        });
      }
    };

    const handleConsoleLog = (data: { runId: string; stepId: string; log: ConsoleLog }) => {
      if (data.runId === runId && run) {
        // Update the specific step result with new log
        setRun(prevRun => {
          if (!prevRun) return prevRun;
          const updatedResults = [...prevRun.results];
          const existingIndex = updatedResults.findIndex(r => r.stepId === data.stepId);
          if (existingIndex >= 0) {
            const result = { ...updatedResults[existingIndex] };
            result.logs = [...(result.logs || []), data.log];
            updatedResults[existingIndex] = result;
          }
          return { ...prevRun, results: updatedResults };
        });
      }
    };

    socket.on('run:updated', handleRunUpdate);
    socket.on('step:updated', handleStepUpdate);
    socket.on('console:log', handleConsoleLog);

    return () => {
      socket.off('run:updated', handleRunUpdate);
      socket.off('step:updated', handleStepUpdate);
      socket.off('console:log', handleConsoleLog);
    };
  }, [socket, runId, run]);

  const loadRunDetails = async () => {
    try {
      setLoading(true);
      const runData = await api.getRun(runId!);
      setRun(runData);
      
      // Load flow data
      const flowData = await api.getFlow(runData.flowId);
      setFlow(flowData);
      
      // Load environment variables if environment is set
      if (runData.environmentId) {
        try {
          const variables = await api.getEnvironmentVariables(runData.environmentId);
          setEnvironmentVariables(variables);
        } catch (error) {
          console.error('Failed to load environment variables:', error);
        }
      }
    } catch (error) {
      console.error('Failed to load run details:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStepIcon = (type: string) => {
    switch (type) {
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
      default:
        return null;
    }
  };

  const getStepResult = (stepId: string): StepResult | undefined => {
    return run?.results?.find(r => r.stepId === stepId);
  };

  const toggleStepExpanded = (stepId: string) => {
    setExpandedSteps(prev => ({
      ...prev,
      [stepId]: !prev[stepId]
    }));
  };

  const handleStepTabChange = (stepId: string, newValue: number) => {
    setStepActiveTabs(prev => ({
      ...prev,
      [stepId]: newValue
    }));
  };

  const formatDuration = (start: Date | string, end?: Date | string) => {
    if (!end) return 'Running...';
    const startTime = typeof start === 'string' ? new Date(start) : start;
    const endTime = typeof end === 'string' ? new Date(end) : end;
    const duration = endTime.getTime() - startTime.getTime();
    if (duration < 1000) return `${duration}ms`;
    return `${(duration / 1000).toFixed(2)}s`;
  };

  const handleStepConsoleCommand = (stepId: string, command: string) => {
    // Get all step results for context
    const allStepResults: { [stepId: string]: StepResult } = {};
    run?.results.forEach(result => {
      allStepResults[result.stepId] = result;
    });

    // Update command executor context
    commandExecutor.updateContext({
      environmentVariables,
      stepResults: allStepResults,
      currentStep: stepId
    });

    // Execute command and get logs
    const commandLogs = commandExecutor.executeCommand(command);
    
    // Add command logs to the step's logs
    setRun(prevRun => {
      if (!prevRun) return prevRun;
      const updatedResults = [...prevRun.results];
      const existingIndex = updatedResults.findIndex(r => r.stepId === stepId);
      if (existingIndex >= 0) {
        const result = { ...updatedResults[existingIndex] };
        result.logs = [...(result.logs || []), ...commandLogs];
        updatedResults[existingIndex] = result;
      }
      return { ...prevRun, results: updatedResults };
    });
  };

  if (loading || !run || !flow) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  return (
    <Box className="animate-fadeIn">
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <IconButton onClick={() => navigate('/runs')} sx={{ color: '#667eea' }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" className="text-gradient" sx={{ flex: 1 }}>
          Test Run Details
        </Typography>
        <Tooltip title="Download PDF Report">
          <IconButton 
            onClick={() => generatePDFReport({
              id: run.id,
              flowName: flow.name,
              status: run.status,
              startTime: run.startTime.toString(),
              endTime: run.endTime?.toString(),
              duration: run.endTime ? new Date(run.endTime).getTime() - new Date(run.startTime).getTime() : undefined,
              environment: run.environmentId,
              results: run.results
            }, flow)}
            sx={{ color: '#667eea' }}
          >
            <DownloadIcon />
          </IconButton>
        </Tooltip>
      </Box>

      <Grid container spacing={3}>
        {/* Summary Card */}
        <Grid item xs={12} md={4}>
          <Card className="animate-scaleIn hover-lift">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Run Summary
              </Typography>
              <Divider sx={{ my: 2 }} />
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Run ID
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', color: '#667eea' }}>
                    {run.id}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Flow Name
                  </Typography>
                  <Typography variant="body2">
                    {flow.name}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Status
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <StatusIndicator 
                      status={run.status === 'completed' ? 'success' : 
                              run.status === 'failed' ? 'error' : 
                              run.status === 'running' ? 'running' : 'pending'}
                      size="medium"
                    />
                  </Box>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Environment
                  </Typography>
                  <Typography variant="body2">
                    {run.environmentId || 'Default'}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AccessTimeIcon fontSize="small" color="action" />
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Started
                    </Typography>
                    <Typography variant="body2">
                      {new Date(run.startTime).toLocaleString()}
                    </Typography>
                  </Box>
                </Box>

                {run.endTime && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SpeedIcon fontSize="small" color="action" />
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Duration
                      </Typography>
                      <Typography variant="body2">
                        {formatDuration(run.startTime, run.endTime)}
                      </Typography>
                    </Box>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Step Results */}
        <Grid item xs={12} md={8}>
          <Paper 
            className="animate-fadeIn" 
            sx={{ 
              p: 3,
              animationDelay: '0.2s',
              animationFillMode: 'both'
            }}
          >
            <Typography variant="h6" gutterBottom>
              Step Execution Results
            </Typography>
            <Divider sx={{ mb: 3 }} />

            <Stepper orientation="vertical">
              {flow.steps.map((step: TestStep) => {
                const result = getStepResult(step.id);
                const isExpanded = expandedSteps[step.id];

                return (
                  <Step 
                    key={step.id} 
                    active={result?.status === 'running'}
                    completed={result?.status === 'passed'}
                    expanded={isExpanded}
                  >
                    <StepLabel
                      error={result?.status === 'failed'}
                      StepIconComponent={() => (
                        <Box
                          className={
                            result?.status === 'passed' ? 'gradient-success' :
                            result?.status === 'failed' ? 'gradient-error' :
                            result?.status === 'running' ? 'gradient-info' :
                            'gradient-dark'
                          }
                          sx={{
                            width: 40,
                            height: 40,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                          }}
                        >
                          {getStepIcon(step.type)}
                        </Box>
                      )}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Typography variant="subtitle1">
                          {step.name}
                        </Typography>
                        {result && (
                          <>
                            <Chip
                              label={result.status}
                              size="small"
                              color={
                                result.status === 'passed' ? 'success' :
                                result.status === 'failed' ? 'error' :
                                result.status === 'running' ? 'primary' :
                                'default'
                              }
                            />
                            {result.duration && (
                              <Typography variant="caption" color="text.secondary">
                                {result.duration}ms
                              </Typography>
                            )}
                          </>
                        )}
                        <IconButton
                          size="small"
                          onClick={() => toggleStepExpanded(step.id)}
                        >
                          {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                        </IconButton>
                      </Box>
                    </StepLabel>
                    <StepContent>
                      <Box sx={{ mt: 2, mb: 2 }}>
                        {result ? (() => {
                          const tabs = [];
                          
                          // Info tab
                          tabs.push({
                            label: 'Info',
                            content: (
                              <Box>
                                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                                  <Box>
                                    <Typography variant="caption" color="text.secondary">
                                      Status
                                    </Typography>
                                    <Typography variant="body2">
                                      <Chip
                                        label={result.status}
                                        size="small"
                                        color={
                                          result.status === 'passed' ? 'success' :
                                          result.status === 'failed' ? 'error' :
                                          result.status === 'running' ? 'primary' :
                                          'default'
                                        }
                                      />
                                    </Typography>
                                  </Box>
                                  {result.startTime && (
                                    <Box>
                                      <Typography variant="caption" color="text.secondary">
                                        Started
                                      </Typography>
                                      <Typography variant="body2">
                                        {new Date(result.startTime).toLocaleTimeString()}
                                      </Typography>
                                    </Box>
                                  )}
                                  {result.endTime && (
                                    <Box>
                                      <Typography variant="caption" color="text.secondary">
                                        Ended
                                      </Typography>
                                      <Typography variant="body2">
                                        {new Date(result.endTime).toLocaleTimeString()}
                                      </Typography>
                                    </Box>
                                  )}
                                  {result.duration && (
                                    <Box>
                                      <Typography variant="caption" color="text.secondary">
                                        Duration
                                      </Typography>
                                      <Typography variant="body2">
                                        {result.duration}ms
                                      </Typography>
                                    </Box>
                                  )}
                                </Box>
                                <Typography variant="caption" color="text.secondary">
                                  Step ID: {step.id}
                                </Typography>
                              </Box>
                            )
                          });

                          // Output tab
                          if (result.output) {
                            tabs.push({
                              label: 'Output',
                              content: (
                                <Paper 
                                  variant="outlined" 
                                  sx={{ 
                                    p: 2, 
                                    backgroundColor: 'background.default',
                                    fontFamily: 'monospace',
                                    fontSize: '0.875rem',
                                    overflow: 'auto',
                                    maxHeight: 300
                                  }}
                                >
                                  <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                    {typeof result.output === 'string' 
                                      ? result.output 
                                      : JSON.stringify(result.output, null, 2)}
                                  </pre>
                                </Paper>
                              )
                            });
                          }

                          // Error tab
                          if (result.error) {
                            tabs.push({
                              label: 'Error',
                              content: (
                                <Alert severity="error" 
                                  action={
                                    <IconButton
                                      color="inherit"
                                      size="small"
                                      onClick={() => copyToClipboard(result.error!)}
                                      title="Copy error message"
                                    >
                                      <ContentCopyIcon fontSize="small" />
                                    </IconButton>
                                  }
                                >
                                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                                    {result.error}
                                  </Typography>
                                </Alert>
                              )
                            });
                          }

                          // Console tab
                          if (result.logs && result.logs.length > 0) {
                            tabs.push({
                              label: `Console (${result.logs.length})`,
                              content: (
                                <InteractiveConsole 
                                  logs={result.logs} 
                                  maxHeight={400}
                                  autoScroll={true}
                                  onCommand={(cmd) => handleStepConsoleCommand(step.id, cmd)}
                                  context={{
                                    environmentVariables,
                                    stepResults: { [step.id]: result }
                                  }}
                                />
                              )
                            });
                          }

                          // Auto-select error tab when step fails
                          let activeTab = stepActiveTabs[step.id] || 0;
                          if (result.status === 'failed' && result.error) {
                            const errorTabIndex = tabs.findIndex(tab => tab.label === 'Error');
                            if (errorTabIndex !== -1) {
                              activeTab = errorTabIndex;
                            }
                          }
                          activeTab = Math.min(activeTab, tabs.length - 1);

                          return (
                            <Box sx={{ bgcolor: 'background.default', borderRadius: 1 }}>
                              <Tabs 
                                value={activeTab} 
                                onChange={(_, newValue) => handleStepTabChange(step.id, newValue)}
                                variant="scrollable"
                                scrollButtons="auto"
                                sx={{ 
                                  minHeight: 32,
                                  '& .MuiTab-root': { 
                                    minHeight: 32, 
                                    py: 0.5, 
                                    fontSize: '0.875rem',
                                    minWidth: 'auto',
                                    px: 2
                                  }
                                }}
                              >
                                {tabs.map((tab, index) => (
                                  <Tab key={index} label={tab.label} />
                                ))}
                              </Tabs>
                              
                              <Box sx={{ p: 2 }}>
                                {tabs[activeTab]?.content}
                              </Box>
                            </Box>
                          );
                        })() : (
                          <Typography variant="body2" color="text.secondary">
                            Step not executed yet
                          </Typography>
                        )}
                      </Box>
                    </StepContent>
                  </Step>
                );
              })}
            </Stepper>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}