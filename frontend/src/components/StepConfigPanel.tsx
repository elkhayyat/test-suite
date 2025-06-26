import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Typography,
  Divider,
  Autocomplete,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
  Tooltip,
} from '@mui/material';
import ContentPasteIcon from '@mui/icons-material/ContentPaste';
import { TestStep, HttpStepConfig, BrowserStepConfig, AssertionStepConfig, DelayStepConfig, ConditionStepConfig, SqlStepConfig, SubflowStepConfig, TestFlow } from '../../../shared/src/types';
import { api } from '../services/api';
import { parseCurlCommand, generateCurlCommand } from '../utils/curlParser';

interface StepConfigPanelProps {
  step: TestStep;
  onUpdate: (step: TestStep) => void;
  onClose: () => void;
}

export default function StepConfigPanel({ step, onUpdate, onClose }: StepConfigPanelProps) {
  const [headersText, setHeadersText] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [availableFlows, setAvailableFlows] = useState<TestFlow[]>([]);
  const [curlDialogOpen, setCurlDialogOpen] = useState(false);
  const [curlCommand, setCurlCommand] = useState('');
  const [curlError, setCurlError] = useState('');
  const [curlSuccess, setCurlSuccess] = useState(false);
  
  useEffect(() => {
    if (step.type === 'http') {
      const config = step.config as HttpStepConfig;
      setHeadersText(config.headers ? JSON.stringify(config.headers, null, 2) : '{}');
      setBodyText(config.body ? JSON.stringify(config.body, null, 2) : '');
    }
    
    // Load available flows for subflow configuration
    if (step.type === 'subflow') {
      api.getFlows().then(flows => {
        // Filter out the current flow to prevent recursion
        const filtered = flows.filter(flow => flow.id !== step.id);
        setAvailableFlows(filtered);
      }).catch(error => {
        console.error('Failed to load flows:', error);
      });
    }
  }, [step]);

  const handleChange = (field: string, value: any) => {
    onUpdate({
      ...step,
      config: {
        ...step.config,
        [field]: value,
      },
    });
  };

  const handleNameChange = (name: string) => {
    onUpdate({
      ...step,
      name,
    });
  };

  const handleCurlImport = () => {
    try {
      const parsed = parseCurlCommand(curlCommand);
      
      // Update the step with parsed data
      onUpdate({
        ...step,
        config: {
          method: parsed.method,
          url: parsed.url,
          headers: parsed.headers,
          body: parsed.body,
          timeout: parsed.timeout || 30000,
        },
      });

      // Update UI state
      setHeadersText(JSON.stringify(parsed.headers, null, 2));
      setBodyText(parsed.body ? (typeof parsed.body === 'string' ? parsed.body : JSON.stringify(parsed.body, null, 2)) : '');
      
      setCurlDialogOpen(false);
      setCurlCommand('');
      setCurlError('');
      setCurlSuccess(true);
      
      setTimeout(() => setCurlSuccess(false), 3000);
    } catch (error) {
      setCurlError((error as Error).message);
    }
  };

  const handleCurlExport = () => {
    try {
      const config = step.config as HttpStepConfig;
      const curlCmd = generateCurlCommand(config);
      navigator.clipboard.writeText(curlCmd);
      setCurlSuccess(true);
      setTimeout(() => setCurlSuccess(false), 3000);
    } catch (error) {
      setCurlError('Failed to generate curl command');
    }
  };

  const renderHttpConfig = () => {
    const config = step.config as HttpStepConfig;
    return (
      <>
        <FormControl fullWidth margin="normal">
          <InputLabel>Method</InputLabel>
          <Select
            value={config.method || 'GET'}
            label="Method"
            onChange={(e) => handleChange('method', e.target.value)}
          >
            <MenuItem value="GET">GET</MenuItem>
            <MenuItem value="POST">POST</MenuItem>
            <MenuItem value="PUT">PUT</MenuItem>
            <MenuItem value="DELETE">DELETE</MenuItem>
            <MenuItem value="PATCH">PATCH</MenuItem>
          </Select>
        </FormControl>
        
        {/* Curl Import/Export Controls */}
        <Box sx={{ display: 'flex', gap: 1, my: 1 }}>
          <Tooltip title="Import from curl command">
            <Button
              variant="outlined"
              size="small"
              startIcon={<ContentPasteIcon />}
              onClick={() => setCurlDialogOpen(true)}
            >
              Import from curl
            </Button>
          </Tooltip>
          <Tooltip title="Copy as curl command">
            <Button
              variant="outlined"
              size="small"
              onClick={handleCurlExport}
              disabled={!config.url}
            >
              Export to curl
            </Button>
          </Tooltip>
        </Box>
        
        <TextField
          fullWidth
          label="URL"
          value={config.url || ''}
          onChange={(e) => handleChange('url', e.target.value)}
          margin="normal"
        />
        <TextField
          fullWidth
          label="Headers (JSON)"
          value={headersText}
          onChange={(e) => setHeadersText(e.target.value)}
          onBlur={() => {
            try {
              const parsed = JSON.parse(headersText || '{}');
              handleChange('headers', parsed);
            } catch (e) {
              // Keep the text as is if invalid JSON
            }
          }}
          multiline
          rows={3}
          margin="normal"
          helperText='Enter headers as JSON object, e.g., {"Authorization": "Bearer token"}'
        />
        <TextField
          fullWidth
          label="Body (JSON)"
          value={bodyText}
          onChange={(e) => setBodyText(e.target.value)}
          onBlur={() => {
            try {
              if (bodyText.trim()) {
                const parsed = JSON.parse(bodyText);
                handleChange('body', parsed);
              } else {
                handleChange('body', null);
              }
            } catch (e) {
              // Keep the text as is if invalid JSON
            }
          }}
          multiline
          rows={4}
          margin="normal"
          helperText="Enter request body as JSON"
        />
        <TextField
          fullWidth
          label="Timeout (ms)"
          type="number"
          value={config.timeout || 30000}
          onChange={(e) => handleChange('timeout', parseInt(e.target.value))}
          margin="normal"
        />
      </>
    );
  };

  const renderBrowserConfig = () => {
    const config = step.config as BrowserStepConfig;
    return (
      <>
        <FormControl fullWidth margin="normal">
          <InputLabel>Action</InputLabel>
          <Select
            value={config.action || 'navigate'}
            label="Action"
            onChange={(e) => handleChange('action', e.target.value)}
          >
            <MenuItem value="navigate">Navigate</MenuItem>
            <MenuItem value="click">Click</MenuItem>
            <MenuItem value="type">Type</MenuItem>
            <MenuItem value="wait">Wait</MenuItem>
            <MenuItem value="screenshot">Screenshot</MenuItem>
          </Select>
        </FormControl>
        {(config.action === 'click' || config.action === 'type' || config.action === 'wait') && (
          <TextField
            fullWidth
            label="Selector"
            value={config.selector || ''}
            onChange={(e) => handleChange('selector', e.target.value)}
            margin="normal"
          />
        )}
        {(config.action === 'navigate' || config.action === 'type') && (
          <TextField
            fullWidth
            label="Value"
            value={config.value || ''}
            onChange={(e) => handleChange('value', e.target.value)}
            margin="normal"
          />
        )}
        <TextField
          fullWidth
          label="Timeout (ms)"
          type="number"
          value={config.timeout || 30000}
          onChange={(e) => handleChange('timeout', parseInt(e.target.value))}
          margin="normal"
        />
      </>
    );
  };

  const renderAssertionConfig = () => {
    const config = step.config as AssertionStepConfig;
    return (
      <>
        <FormControl fullWidth margin="normal">
          <InputLabel>Type</InputLabel>
          <Select
            value={config.type || 'equals'}
            label="Type"
            onChange={(e) => handleChange('type', e.target.value)}
          >
            <MenuItem value="equals">Equals</MenuItem>
            <MenuItem value="contains">Contains</MenuItem>
            <MenuItem value="exists">Exists</MenuItem>
            <MenuItem value="custom">Custom</MenuItem>
          </Select>
        </FormControl>
        <TextField
          fullWidth
          label="Source (JSONPath or variable)"
          value={config.source || ''}
          onChange={(e) => handleChange('source', e.target.value)}
          margin="normal"
        />
        {config.type !== 'exists' && config.type !== 'custom' && (
          <TextField
            fullWidth
            label="Expected Value"
            value={config.expected || ''}
            onChange={(e) => handleChange('expected', e.target.value)}
            margin="normal"
          />
        )}
        {config.type === 'custom' && (
          <TextField
            fullWidth
            label="Custom Script"
            value={config.customScript || ''}
            onChange={(e) => handleChange('customScript', e.target.value)}
            multiline
            rows={4}
            margin="normal"
            helperText="JavaScript function that returns true/false"
          />
        )}
      </>
    );
  };

  const renderDelayConfig = () => {
    const config = step.config as DelayStepConfig;
    return (
      <TextField
        fullWidth
        label="Duration (ms)"
        type="number"
        value={config.duration || 1000}
        onChange={(e) => handleChange('duration', parseInt(e.target.value))}
        margin="normal"
      />
    );
  };

  const renderConditionConfig = () => {
    const config = step.config as ConditionStepConfig;
    return (
      <>
        <TextField
          fullWidth
          label="Script"
          value={config.script || ''}
          onChange={(e) => handleChange('script', e.target.value)}
          multiline
          rows={4}
          margin="normal"
          helperText="JavaScript expression that returns true/false"
        />
        <TextField
          fullWidth
          label="True Target Step ID"
          value={config.trueTarget || ''}
          onChange={(e) => handleChange('trueTarget', e.target.value)}
          margin="normal"
        />
        <TextField
          fullWidth
          label="False Target Step ID"
          value={config.falseTarget || ''}
          onChange={(e) => handleChange('falseTarget', e.target.value)}
          margin="normal"
        />
      </>
    );
  };

  const renderSqlConfig = () => {
    const config = step.config as SqlStepConfig;
    return (
      <>
        <TextField
          fullWidth
          label="Connection String"
          value={config.connectionString || ''}
          onChange={(e) => handleChange('connectionString', e.target.value)}
          margin="normal"
          helperText="e.g., postgresql://user:password@localhost:5432/database"
        />
        <TextField
          fullWidth
          label="SQL Query"
          value={config.query || ''}
          onChange={(e) => handleChange('query', e.target.value)}
          multiline
          rows={4}
          margin="normal"
          helperText="SQL query to execute. Use {{variable}} for variable interpolation"
        />
        <TextField
          fullWidth
          label="Parameters (JSON)"
          value={config.parameters ? JSON.stringify(config.parameters, null, 2) : '{}'}
          onChange={(e) => {
            try {
              const parsed = JSON.parse(e.target.value || '{}');
              handleChange('parameters', parsed);
            } catch (e) {
              // Keep the text as is if invalid JSON
            }
          }}
          multiline
          rows={3}
          margin="normal"
          helperText="Named parameters for prepared statements"
        />
        <TextField
          fullWidth
          label="Timeout (ms)"
          type="number"
          value={config.timeout || 30000}
          onChange={(e) => handleChange('timeout', parseInt(e.target.value))}
          margin="normal"
        />
      </>
    );
  };

  const renderSubflowConfig = () => {
    const config = step.config as SubflowStepConfig;
    const selectedFlow = availableFlows.find(flow => flow.id === config.flowId);
    
    return (
      <>
        <Autocomplete
          fullWidth
          options={availableFlows}
          getOptionLabel={(option) => `${option.name} (${option.id})`}
          value={selectedFlow || null}
          onChange={(_, newValue) => {
            if (newValue) {
              handleChange('flowId', newValue.id);
              handleChange('flowName', newValue.name);
            } else {
              handleChange('flowId', '');
              handleChange('flowName', '');
            }
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Select Flow"
              margin="normal"
              required
              helperText="Choose the flow to execute as a sub-flow"
            />
          )}
        />
        <TextField
          fullWidth
          label="Flow Name (optional)"
          value={config.flowName || ''}
          onChange={(e) => handleChange('flowName', e.target.value)}
          margin="normal"
          helperText="Display name for the sub-flow"
        />
        <TextField
          fullWidth
          label="Timeout (ms)"
          type="number"
          value={config.timeout || 300000}
          onChange={(e) => handleChange('timeout', parseInt(e.target.value))}
          margin="normal"
          helperText="Maximum time to wait for sub-flow completion"
        />
        <FormControl fullWidth margin="normal">
          <InputLabel>Inherit Environment</InputLabel>
          <Select
            value={config.inheritEnvironment !== false ? 'true' : 'false'}
            label="Inherit Environment"
            onChange={(e) => handleChange('inheritEnvironment', e.target.value === 'true')}
          >
            <MenuItem value="true">Yes - Use parent flow's environment</MenuItem>
            <MenuItem value="false">No - Use default environment</MenuItem>
          </Select>
        </FormControl>
        <TextField
          fullWidth
          label="Variable Mapping (JSON)"
          value={config.variableMapping ? JSON.stringify(config.variableMapping, null, 2) : '{}'}
          onChange={(e) => {
            try {
              const parsed = JSON.parse(e.target.value);
              handleChange('variableMapping', parsed);
            } catch (error) {
              // Keep the text as is if invalid JSON
            }
          }}
          multiline
          rows={3}
          margin="normal"
          helperText="Map parent flow variables to sub-flow variables"
        />
      </>
    );
  };

  const renderConfig = () => {
    switch (step.type) {
      case 'http':
        return renderHttpConfig();
      case 'browser':
        return renderBrowserConfig();
      case 'assertion':
        return renderAssertionConfig();
      case 'delay':
        return renderDelayConfig();
      case 'condition':
        return renderConditionConfig();
      case 'sql':
        return renderSqlConfig();
      case 'subflow':
        return renderSubflowConfig();
      default:
        return null;
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Step Configuration</Typography>
        <Button size="small" onClick={onClose}>Close</Button>
      </Box>
      
      <TextField
        fullWidth
        label="Step ID"
        value={step.id}
        disabled
        margin="normal"
        InputProps={{
          style: { fontFamily: 'monospace' }
        }}
      />
      
      <TextField
        fullWidth
        label="Step Name"
        value={step.name}
        onChange={(e) => handleNameChange(e.target.value)}
        margin="normal"
      />
      
      <Divider sx={{ my: 2 }} />
      
      {renderConfig()}

      {/* Curl Import Dialog */}
      <Dialog open={curlDialogOpen} onClose={() => setCurlDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Import from curl Command</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={8}
            label="Paste curl command here"
            value={curlCommand}
            onChange={(e) => {
              setCurlCommand(e.target.value);
              setCurlError(''); // Clear error when user types
            }}
            margin="normal"
            placeholder={`curl -X POST "https://api.example.com/users" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer your-token" \\
  -d '{"name":"John","email":"john@example.com"}'`}
            helperText="Paste any curl command and it will be parsed into the HTTP step configuration"
          />
          {curlError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {curlError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCurlDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleCurlImport} 
            variant="contained"
            disabled={!curlCommand.trim()}
          >
            Import
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success/Error Snackbar */}
      <Snackbar
        open={curlSuccess}
        autoHideDuration={3000}
        onClose={() => setCurlSuccess(false)}
      >
        <Alert severity="success" onClose={() => setCurlSuccess(false)}>
          {curlDialogOpen ? 'curl command imported successfully!' : 'curl command copied to clipboard!'}
        </Alert>
      </Snackbar>
    </Box>
  );
}