import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Button,
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
  Collapse,
  Alert,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import SpeedIcon from '@mui/icons-material/Speed';
import HttpIcon from '@mui/icons-material/Http';
import WebIcon from '@mui/icons-material/Web';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import TimerIcon from '@mui/icons-material/Timer';
import CodeIcon from '@mui/icons-material/Code';
import { TestRun, TestStep, StepResult } from '../../../shared/src/types';
import { api } from '../services/api';
import StatusIndicator from '../components/StatusIndicator';

export default function TestRunDetails() {
  const { runId } = useParams();
  const navigate = useNavigate();
  const [run, setRun] = useState<TestRun | null>(null);
  const [flow, setFlow] = useState<any>(null);
  const [expandedSteps, setExpandedSteps] = useState<{ [stepId: string]: boolean }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (runId) {
      loadRunDetails();
    }
  }, [runId]);

  const loadRunDetails = async () => {
    try {
      setLoading(true);
      const runData = await api.getRun(runId!);
      setRun(runData);
      
      // Load flow data
      const flowData = await api.getFlow(runData.flowId);
      setFlow(flowData);
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

  const formatDuration = (start: string, end?: string) => {
    if (!end) return 'Running...';
    const duration = new Date(end).getTime() - new Date(start).getTime();
    if (duration < 1000) return `${duration}ms`;
    return `${(duration / 1000).toFixed(2)}s`;
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
        <Typography variant="h4" className="text-gradient">
          Test Run Details
        </Typography>
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
              {flow.steps.map((step: TestStep, index: number) => {
                const result = getStepResult(step.id);
                const isExpanded = expandedSteps[step.id];

                return (
                  <Step 
                    key={step.id} 
                    active={result?.status === 'running'}
                    completed={result?.status === 'success'}
                  >
                    <StepLabel
                      error={result?.status === 'error'}
                      StepIconComponent={() => (
                        <Box
                          className={
                            result?.status === 'success' ? 'gradient-success' :
                            result?.status === 'error' ? 'gradient-error' :
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
                                result.status === 'success' ? 'success' :
                                result.status === 'error' ? 'error' :
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
                      <Collapse in={isExpanded}>
                        <Box sx={{ mt: 2, mb: 2 }}>
                          {result ? (
                            <>
                              {result.error && (
                                <Alert severity="error" sx={{ mb: 2 }}>
                                  <Typography variant="subtitle2" gutterBottom>
                                    Error:
                                  </Typography>
                                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                                    {result.error}
                                  </Typography>
                                </Alert>
                              )}

                              {result.output && (
                                <Box sx={{ mb: 2 }}>
                                  <Typography variant="subtitle2" gutterBottom>
                                    Output:
                                  </Typography>
                                  <Paper 
                                    variant="outlined" 
                                    sx={{ 
                                      p: 2, 
                                      backgroundColor: 'background.default',
                                      fontFamily: 'monospace',
                                      fontSize: '0.875rem',
                                      overflow: 'auto'
                                    }}
                                  >
                                    <pre style={{ margin: 0 }}>
                                      {typeof result.output === 'string' 
                                        ? result.output 
                                        : JSON.stringify(result.output, null, 2)}
                                    </pre>
                                  </Paper>
                                </Box>
                              )}

                              <Typography variant="caption" color="text.secondary">
                                Step ID: {step.id}
                              </Typography>
                            </>
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              Step not executed yet
                            </Typography>
                          )}
                        </Box>
                      </Collapse>
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