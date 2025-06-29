import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Checkbox,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  FormControlLabel,
  Checkbox as MuiCheckbox,
  Divider,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import LinkIcon from '@mui/icons-material/Link';
import { parseOpenAPISchema, generateStepsFromOpenAPI, ParsedOpenAPI } from '../../../shared/src/openApiParser';
import { TestStep } from '../../../shared/src/types';
import { api } from '../services/api';

interface OpenAPIImportDialogProps {
  open: boolean;
  onClose: () => void;
  onImport: (steps: TestStep[]) => void;
  projectId?: string; // Optional: if provided, show option to save schema
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export default function OpenAPIImportDialog({ open, onClose, onImport, projectId }: OpenAPIImportDialogProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [schemaText, setSchemaText] = useState('');
  const [schemaUrl, setSchemaUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [parsedAPI, setParsedAPI] = useState<ParsedOpenAPI | null>(null);
  const [selectedOperations, setSelectedOperations] = useState<string[]>([]);
  const [baseUrlOverride, setBaseUrlOverride] = useState('');
  const [saveSchema, setSaveSchema] = useState(false);
  const [schemaName, setSchemaName] = useState('');
  const [schemaDescription, setSchemaDescription] = useState('');

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setSchemaText(content);
      parseSchema(content);
    };
    reader.readAsText(file);
  };

  const handleUrlLoad = async () => {
    if (!schemaUrl) {
      setError('Please enter a URL');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Use proxy endpoint to avoid CORS issues
      const proxyUrl = `/api/proxy?url=${encodeURIComponent(schemaUrl)}`;
      const response = await fetch(proxyUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.statusText}`);
      }
      const text = await response.text();
      setSchemaText(text);
      parseSchema(text);
    } catch (err) {
      setError(`Failed to load schema: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const parseSchema = (text: string) => {
    try {
      const schema = JSON.parse(text);
      const parsed = parseOpenAPISchema(schema);
      setParsedAPI(parsed);
      setError('');
      
      // Pre-select all operations
      const allOperations = parsed.operations.map(op => `${op.method} ${op.path}`);
      setSelectedOperations(allOperations);
      
      // Set default base URL if available
      if (parsed.servers.length > 0) {
        setBaseUrlOverride(parsed.servers[0]);
      }
      
      // Auto-populate schema name
      setSchemaName(parsed.title || '');
      setSchemaDescription('');
    } catch (err) {
      setError(`Failed to parse schema: ${(err as Error).message}`);
      setParsedAPI(null);
    }
  };

  const handleToggleOperation = (operation: string) => {
    setSelectedOperations(prev => {
      if (prev.includes(operation)) {
        return prev.filter(op => op !== operation);
      } else {
        return [...prev, operation];
      }
    });
  };

  const handleSelectAll = () => {
    if (parsedAPI) {
      const allOperations = parsedAPI.operations.map(op => `${op.method} ${op.path}`);
      setSelectedOperations(allOperations);
    }
  };

  const handleDeselectAll = () => {
    setSelectedOperations([]);
  };

  const handleImport = async () => {
    if (!parsedAPI) return;

    try {
      // Save schema if requested and projectId is available
      if (saveSchema && projectId && schemaName.trim()) {
        const schemaData = {
          name: schemaName.trim(),
          description: schemaDescription.trim() || undefined,
          version: parsedAPI.version,
          title: parsedAPI.title,
          baseUrl: baseUrlOverride || undefined,
          schema: JSON.parse(schemaText), // Use original schema text
        };

        await api.createProjectOpenAPISchema(projectId, schemaData);
      }

      const steps = generateStepsFromOpenAPI(
        parsedAPI,
        selectedOperations,
        baseUrlOverride || undefined
      );

      onImport(steps);
      handleClose();
    } catch (err) {
      setError(`Failed to save schema: ${(err as Error).message}`);
    }
  };

  const handleClose = () => {
    setActiveTab(0);
    setSchemaText('');
    setSchemaUrl('');
    setError('');
    setParsedAPI(null);
    setSelectedOperations([]);
    setBaseUrlOverride('');
    setSaveSchema(false);
    setSchemaName('');
    setSchemaDescription('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Import OpenAPI Schema</DialogTitle>
      
      <DialogContent>
        {!parsedAPI ? (
          <>
            <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
              <Tab label="Upload File" icon={<UploadFileIcon />} />
              <Tab label="From URL" icon={<LinkIcon />} />
            </Tabs>

            <TabPanel value={activeTab} index={0}>
              <Button
                variant="contained"
                component="label"
                fullWidth
                startIcon={<UploadFileIcon />}
              >
                Upload OpenAPI Schema (JSON)
                <input
                  type="file"
                  hidden
                  accept=".json"
                  onChange={handleFileUpload}
                />
              </Button>
              
              {schemaText && (
                <Alert severity="success" sx={{ mt: 2 }}>
                  Schema loaded successfully
                </Alert>
              )}
            </TabPanel>

            <TabPanel value={activeTab} index={1}>
              <TextField
                fullWidth
                label="OpenAPI Schema URL"
                value={schemaUrl}
                onChange={(e) => setSchemaUrl(e.target.value)}
                placeholder="https://api.example.com/openapi.json"
                margin="normal"
              />
              <Button
                variant="contained"
                onClick={handleUrlLoad}
                disabled={loading || !schemaUrl}
                fullWidth
              >
                {loading ? <CircularProgress size={24} /> : 'Load Schema'}
              </Button>
            </TabPanel>

            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}
          </>
        ) : (
          <>
            <Typography variant="h6" gutterBottom>
              {parsedAPI.title} v{parsedAPI.version}
            </Typography>

            <FormControl fullWidth margin="normal">
              <InputLabel>Base URL</InputLabel>
              <Select
                value={baseUrlOverride}
                onChange={(e) => setBaseUrlOverride(e.target.value)}
                label="Base URL"
              >
                {parsedAPI.servers.map((server, index) => (
                  <MenuItem key={index} value={server}>
                    {server}
                  </MenuItem>
                ))}
                <MenuItem value="">
                  <em>Custom (use environment variable)</em>
                </MenuItem>
              </Select>
            </FormControl>

            {baseUrlOverride === '' && (
              <TextField
                fullWidth
                label="Custom Base URL"
                placeholder="{{baseUrl}}"
                value={baseUrlOverride}
                onChange={(e) => setBaseUrlOverride(e.target.value)}
                margin="normal"
                helperText="Use environment variables like {{baseUrl}}"
              />
            )}

            {projectId && (
              <>
                <Divider sx={{ my: 2 }} />
                <FormControlLabel
                  control={
                    <MuiCheckbox
                      checked={saveSchema}
                      onChange={(e) => setSaveSchema(e.target.checked)}
                    />
                  }
                  label="Save schema to project for reuse"
                />
                {saveSchema && (
                  <Box sx={{ mt: 2 }}>
                    <TextField
                      fullWidth
                      label="Schema Name"
                      value={schemaName}
                      onChange={(e) => setSchemaName(e.target.value)}
                      placeholder="My API Schema"
                      margin="normal"
                      size="small"
                      required
                    />
                    <TextField
                      fullWidth
                      label="Description (Optional)"
                      value={schemaDescription}
                      onChange={(e) => setSchemaDescription(e.target.value)}
                      placeholder="Description of this API schema"
                      margin="normal"
                      size="small"
                      multiline
                      rows={2}
                    />
                  </Box>
                )}
              </>
            )}

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2, mb: 1 }}>
              <Typography variant="subtitle1">
                Select Operations ({selectedOperations.length}/{parsedAPI.operations.length})
              </Typography>
              <Box>
                <Button size="small" onClick={handleSelectAll}>
                  Select All
                </Button>
                <Button size="small" onClick={handleDeselectAll}>
                  Deselect All
                </Button>
              </Box>
            </Box>

            <List sx={{ maxHeight: 300, overflow: 'auto', border: 1, borderColor: 'divider', borderRadius: 1 }}>
              {parsedAPI.operations.map((operation, index) => {
                const operationId = `${operation.method} ${operation.path}`;
                const isSelected = selectedOperations.includes(operationId);
                
                return (
                  <ListItem key={index} disablePadding>
                    <ListItemButton onClick={() => handleToggleOperation(operationId)}>
                      <ListItemIcon>
                        <Checkbox
                          edge="start"
                          checked={isSelected}
                          tabIndex={-1}
                          disableRipple
                        />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                            <Typography
                              variant="caption"
                              sx={{
                                px: 1,
                                py: 0.5,
                                borderRadius: 1,
                                bgcolor: getMethodColor(operation.method),
                                color: 'white',
                                fontWeight: 'bold'
                              }}
                            >
                              {operation.method}
                            </Typography>
                            <Typography variant="body2">{operation.path}</Typography>
                          </Box>
                        }
                        secondary={operation.summary || operation.operationId}
                      />
                    </ListItemButton>
                  </ListItem>
                );
              })}
            </List>
          </>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button
          onClick={handleImport}
          variant="contained"
          disabled={
            !parsedAPI || 
            selectedOperations.length === 0 || 
            (saveSchema && !schemaName.trim())
          }
        >
          Import {selectedOperations.length} Operation{selectedOperations.length !== 1 ? 's' : ''}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function getMethodColor(method: string): string {
  switch (method.toUpperCase()) {
    case 'GET': return '#61affe';
    case 'POST': return '#49cc90';
    case 'PUT': return '#fca130';
    case 'DELETE': return '#f93e3e';
    case 'PATCH': return '#50e3c2';
    default: return '#9012fe';
  }
}