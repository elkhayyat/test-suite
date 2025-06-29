import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Checkbox,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Alert,
  CircularProgress,
} from '@mui/material';
import { ProjectOpenAPISchema, Folder } from '../../../shared/src/types';
import { api } from '../services/api';
import { parseOpenAPISchema, OpenAPIOperation } from '../../../shared/src/openApiParser';

interface OpenAPIGenerateFlowsDialogProps {
  open: boolean;
  onClose: (generated?: boolean) => void;
  projectId: string;
  schema: ProjectOpenAPISchema;
  projectFolders: Folder[];
}

export default function OpenAPIGenerateFlowsDialog({
  open,
  onClose,
  projectId,
  schema,
  projectFolders,
}: OpenAPIGenerateFlowsDialogProps) {
  const [operations, setOperations] = useState<OpenAPIOperation[]>([]);
  const [selectedOperations, setSelectedOperations] = useState<string[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string>('');
  const [baseUrlOverride, setBaseUrlOverride] = useState<string>('');
  const [useCustomBaseUrl, setUseCustomBaseUrl] = useState(false);
  const [servers, setServers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open && schema) {
      try {
        const parsed = parseOpenAPISchema(schema.schema);
        setOperations(parsed.operations);
        setServers(parsed.servers);
        if (schema.baseUrl) {
          setBaseUrlOverride(schema.baseUrl);
          setUseCustomBaseUrl(!parsed.servers.includes(schema.baseUrl));
        } else if (parsed.servers.length > 0) {
          setBaseUrlOverride(parsed.servers[0]);
          setUseCustomBaseUrl(false);
        } else {
          setBaseUrlOverride('');
          setUseCustomBaseUrl(true);
        }
        
        // Pre-select all operations
        const allOperations = parsed.operations.map(op => `${op.method} ${op.path}`);
        setSelectedOperations(allOperations);
      } catch (err) {
        setError('Failed to parse OpenAPI schema');
      }
    }
  }, [open, schema]);

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
    const allOperations = operations.map(op => `${op.method} ${op.path}`);
    setSelectedOperations(allOperations);
  };

  const handleDeselectAll = () => {
    setSelectedOperations([]);
  };

  const handleClose = () => {
    setSelectedOperations([]);
    setSelectedFolder('');
    setBaseUrlOverride('');
    setUseCustomBaseUrl(false);
    setError('');
    onClose(false);
  };

  const handleGenerate = async () => {
    if (selectedOperations.length === 0) {
      setError('Please select at least one operation');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api.generateFlowsFromOpenAPISchema(
        projectId,
        schema.id,
        selectedOperations,
        baseUrlOverride || undefined,
        selectedFolder || undefined
      );
      onClose(true);
    } catch (err) {
      setError(`Failed to generate flows: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const getMethodColor = (method: string): string => {
    switch (method.toUpperCase()) {
      case 'GET': return '#61affe';
      case 'POST': return '#49cc90';
      case 'PUT': return '#fca130';
      case 'DELETE': return '#f93e3e';
      case 'PATCH': return '#50e3c2';
      default: return '#9012fe';
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Generate Flows from "{schema?.name}"
      </DialogTitle>

      <DialogContent>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Select operations to generate flows for. Each operation will create a separate flow.
        </Typography>

        <Box sx={{ mb: 3 }}>
          <FormControl fullWidth margin="normal">
            <InputLabel>Target Folder (Optional)</InputLabel>
            <Select
              value={selectedFolder}
              onChange={(e) => setSelectedFolder(e.target.value)}
              label="Target Folder (Optional)"
            >
              <MenuItem value="">
                <em>Root Project (No Folder)</em>
              </MenuItem>
              {projectFolders.map((folder) => (
                <MenuItem key={folder.id} value={folder.id}>
                  {folder.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth margin="normal">
            <InputLabel>Base URL</InputLabel>
            <Select
              value={useCustomBaseUrl ? 'custom' : baseUrlOverride}
              onChange={(e) => {
                if (e.target.value === 'custom') {
                  setUseCustomBaseUrl(true);
                  setBaseUrlOverride('');
                } else {
                  setUseCustomBaseUrl(false);
                  setBaseUrlOverride(e.target.value);
                }
              }}
              label="Base URL"
            >
              {servers.map((server, index) => (
                <MenuItem key={index} value={server}>
                  {server}
                </MenuItem>
              ))}
              <MenuItem value="custom">
                <em>Custom</em>
              </MenuItem>
            </Select>
          </FormControl>

          {useCustomBaseUrl && (
            <TextField
              fullWidth
              label="Custom Base URL"
              placeholder="{{baseUrl}} or https://api.example.com"
              value={baseUrlOverride}
              onChange={(e) => setBaseUrlOverride(e.target.value)}
              margin="normal"
              helperText="Use environment variables like {{baseUrl}}"
            />
          )}
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="subtitle1">
            Select Operations ({selectedOperations.length}/{operations.length})
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

        <List sx={{ maxHeight: 400, overflow: 'auto', border: 1, borderColor: 'divider', borderRadius: 1 }}>
          {operations.map((operation, index) => {
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
                            fontWeight: 'bold',
                            minWidth: 60,
                            textAlign: 'center',
                          }}
                        >
                          {operation.method}
                        </Typography>
                        <Typography variant="body2">{operation.path}</Typography>
                      </Box>
                    }
                    secondary={operation.summary || operation.operationId || operation.description}
                  />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleGenerate}
          variant="contained"
          disabled={loading || selectedOperations.length === 0}
        >
          {loading ? (
            <CircularProgress size={20} />
          ) : (
            `Generate ${selectedOperations.length} Flow${selectedOperations.length !== 1 ? 's' : ''}`
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
}