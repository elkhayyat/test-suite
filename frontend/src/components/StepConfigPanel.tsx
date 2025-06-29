import { useState, useEffect } from 'react';
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
  InputAdornment,
  IconButton,
} from '@mui/material';
import ContentPasteIcon from '@mui/icons-material/ContentPaste';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { TestStep, HttpStepConfig, BrowserStepConfig, AssertionStepConfig, DelayStepConfig, ConditionStepConfig, SqlStepConfig, SubflowStepConfig, TestFlow } from '../../../shared/src/types';
import { api } from '../services/api';
import { parseCurlCommand, generateCurlCommand } from '../utils/curlParser';
import StepReferenceField from './StepReferenceField';
import { GENERATOR_FUNCTIONS } from '../utils/randomGenerators';
import { useEnvironment } from '../contexts/EnvironmentContext';
import { FrontendInterpolator } from '../utils/frontendInterpolator';

interface StepConfigPanelProps {
  step: TestStep;
  onUpdate: (step: TestStep) => void;
  onClose: () => void;
  availableSteps?: TestStep[];
}

export default function StepConfigPanel({ step, onUpdate, onClose, availableSteps = [] }: StepConfigPanelProps) {
  const { environmentVariables } = useEnvironment();
  const [headersText, setHeadersText] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [availableFlows, setAvailableFlows] = useState<TestFlow[]>([]);
  const [curlDialogOpen, setCurlDialogOpen] = useState(false);
  const [curlCommand, setCurlCommand] = useState('');
  const [curlError, setCurlError] = useState('');
  const [curlSuccess, setCurlSuccess] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [randomHelpOpen, setRandomHelpOpen] = useState(false);
  const [stepReferenceNote, setStepReferenceNote] = useState<string | null>(null);
  
  useEffect(() => {
    if (step.type === 'http') {
      const config = step.config as HttpStepConfig;
      setHeadersText(config.headers ? JSON.stringify(config.headers, null, 2) : '{}');
      
      // Handle body - it might be a string with interpolation or an object
      if (config.body) {
        if (typeof config.body === 'string') {
          setBodyText(config.body);
        } else {
          setBodyText(JSON.stringify(config.body, null, 2));
        }
      } else {
        setBodyText('');
      }
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

  const handleCopyStepId = async () => {
    try {
      await navigator.clipboard.writeText(step.id);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Failed to copy step ID:', error);
    }
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
          timeout: parsed.timeout || 1000,
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
      const interpolator = new FrontendInterpolator(environmentVariables);
      
      // Create a copy of the config with interpolated values
      const interpolatedConfig: HttpStepConfig = {
        ...config,
        url: interpolator.interpolateValue(config.url) as string,
        headers: interpolator.interpolateValue(config.headers) as Record<string, string>,
        body: interpolator.interpolateValue(config.body),
      };
      
      const curlCmd = generateCurlCommand(interpolatedConfig);
      
      // Check if there are any step references that couldn't be resolved
      const configString = JSON.stringify(config);
      const note = interpolator.getStepReferenceNote(configString);
      setStepReferenceNote(note);
      
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
        
        <StepReferenceField
          fullWidth
          label="URL"
          value={config.url || ''}
          onChange={(value) => handleChange('url', value)}
          margin="normal"
          availableSteps={availableSteps}
          helperText="Use {{variableName}} for environment variables or $stepId.path for step outputs"
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
        <Box sx={{ position: 'relative' }}>
          <StepReferenceField
            fullWidth
            label="Body (JSON)"
            value={bodyText}
            onChange={(value) => {
              setBodyText(value);
              // Process on blur will be handled by onBlur
            }}
            onBlur={() => {
              if (bodyText.trim()) {
                // Check if the body contains interpolation syntax
                const hasInterpolation = bodyText.includes('{{') || bodyText.includes('$');
                
                if (hasInterpolation) {
                  // Save as string for interpolation
                  handleChange('body', bodyText);
                } else {
                  // Try to parse as JSON
                  try {
                    const parsed = JSON.parse(bodyText);
                    handleChange('body', parsed);
                  } catch (e) {
                    // If not valid JSON and no interpolation, save as string
                    handleChange('body', bodyText);
                  }
                }
              } else {
                handleChange('body', null);
              }
            }}
            multiline
            rows={4}
            margin="normal"
            availableSteps={availableSteps}
            helperText="Use {{variableName}}, $stepId.path, or $random.type() for dynamic values"
          />
          <IconButton 
            size="small" 
            onClick={() => setRandomHelpOpen(true)}
            sx={{ position: 'absolute', top: 8, right: 8 }}
            title="Random value generators help"
          >
            <HelpOutlineIcon fontSize="small" />
          </IconButton>
        </Box>
        <TextField
          fullWidth
          label="Timeout (ms)"
          type="number"
          value={config.timeout || 1000}
          onChange={(e) => handleChange('timeout', parseInt(e.target.value))}
          margin="normal"
        />
        <TextField
          fullWidth
          label="Retries"
          type="number"
          value={config.retries || 0}
          onChange={(e) => handleChange('retries', parseInt(e.target.value))}
          margin="normal"
          helperText="Number of retry attempts if request fails"
          inputProps={{ min: 0, max: 10 }}
        />
        {(config.retries || 0) > 0 && (
          <TextField
            fullWidth
            label="Retry Delay (ms)"
            type="number"
            value={config.retryDelay || 1000}
            onChange={(e) => handleChange('retryDelay', parseInt(e.target.value))}
            margin="normal"
            helperText="Delay between retry attempts"
            inputProps={{ min: 0, max: 60000 }}
          />
        )}
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
          <StepReferenceField
            fullWidth
            label="Value"
            value={config.value || ''}
            onChange={(value) => handleChange('value', value)}
            margin="normal"
            availableSteps={availableSteps}
            helperText={config.action === 'navigate' ? 'URL to navigate to' : 'Text to type'}
          />
        )}
        <TextField
          fullWidth
          label="Timeout (ms)"
          type="number"
          value={config.timeout || 1000}
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
        <StepReferenceField
          fullWidth
          label="Source (JSONPath or variable)"
          value={config.source || ''}
          onChange={(value) => handleChange('source', value)}
          margin="normal"
          availableSteps={availableSteps}
          helperText="Use {{variableName}} for environment variables or $stepId.path for step outputs"
        />
        {config.type !== 'exists' && config.type !== 'custom' && (
          <StepReferenceField
            fullWidth
            label="Expected Value"
            value={String(config.expected || '')}
            onChange={(value) => handleChange('expected', value)}
            margin="normal"
            availableSteps={availableSteps}
            helperText="Use {{variableName}} for environment variables or $stepId.path for step outputs"
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
        <Autocomplete
          fullWidth
          options={availableSteps.filter(s => s.id !== step.id)}
          getOptionLabel={(option) => `${option.name} (${option.id})`}
          value={availableSteps.find(s => s.id === config.trueTarget) || null}
          onChange={(_, newValue) => handleChange('trueTarget', newValue?.id || '')}
          renderInput={(params) => (
            <TextField
              {...params}
              label="True Target Step"
              margin="normal"
              helperText="Step to execute when condition is true"
            />
          )}
        />
        <Autocomplete
          fullWidth
          options={availableSteps.filter(s => s.id !== step.id)}
          getOptionLabel={(option) => `${option.name} (${option.id})`}
          value={availableSteps.find(s => s.id === config.falseTarget) || null}
          onChange={(_, newValue) => handleChange('falseTarget', newValue?.id || '')}
          renderInput={(params) => (
            <TextField
              {...params}
              label="False Target Step"
              margin="normal"
              helperText="Step to execute when condition is false"
            />
          )}
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
          value={config.timeout || 1000}
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
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, pb: 0 }}>
        <Typography variant="h6">Step Configuration</Typography>
        <Button size="small" onClick={onClose}>Close</Button>
      </Box>
      
      <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
        <TextField
          fullWidth
          label="Step ID"
          value={step.id}
          disabled
          margin="normal"
          InputProps={{
            style: { fontFamily: 'monospace' },
            endAdornment: (
              <InputAdornment position="end">
                <Tooltip title="Copy Step ID">
                  <IconButton
                    size="small"
                    onClick={handleCopyStepId}
                    edge="end"
                  >
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </InputAdornment>
            ),
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
      </Box>

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

      {/* Random Generators Help Dialog */}
      <Dialog open={randomHelpOpen} onClose={() => setRandomHelpOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Random Value Generators</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Use these generators in your request body, headers, or URLs to generate random values at runtime.
          </Alert>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {Object.entries(GENERATOR_FUNCTIONS).map(([key, generator]) => (
              <Box key={key} sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>{generator.name}</Typography>
                <Typography variant="body2" color="text.secondary">{generator.description}</Typography>
                <Typography variant="caption" sx={{ fontFamily: 'monospace', display: 'block', mt: 1 }}>
                  Syntax: {generator.syntax}
                </Typography>
                <Typography variant="caption" sx={{ fontFamily: 'monospace', display: 'block', color: 'primary.main' }}>
                  Example: {generator.example}
                </Typography>
              </Box>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRandomHelpOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Success/Error Snackbar */}
      <Snackbar
        open={curlSuccess}
        autoHideDuration={stepReferenceNote ? 6000 : 3000}
        onClose={() => {
          setCurlSuccess(false);
          setStepReferenceNote(null);
        }}
      >
        <Alert 
          severity={stepReferenceNote ? "warning" : "success"} 
          onClose={() => {
            setCurlSuccess(false);
            setStepReferenceNote(null);
          }}
        >
          {curlDialogOpen ? 'curl command imported successfully!' : 'curl command copied to clipboard!'}
          {stepReferenceNote && (
            <div style={{ marginTop: 8, fontSize: '0.875rem' }}>
              {stepReferenceNote}
            </div>
          )}
        </Alert>
      </Snackbar>

      {/* Copy Success Snackbar */}
      <Snackbar
        open={copySuccess}
        autoHideDuration={2000}
        onClose={() => setCopySuccess(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={() => setCopySuccess(false)}>
          Step ID copied to clipboard!
        </Alert>
      </Snackbar>
    </Box>
  );
}