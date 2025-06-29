import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import LinkIcon from '@mui/icons-material/Link';
import { ProjectOpenAPISchema } from '../../../shared/src/types';
import { api } from '../services/api';
import { parseOpenAPISchema } from '../../../shared/src/openApiParser';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ p: 2 }}>{children}</Box>}
    </div>
  );
}

interface OpenAPISchemaDialogProps {
  open: boolean;
  onClose: (saved?: boolean) => void;
  projectId: string;
  schema?: ProjectOpenAPISchema | null;
}

export default function OpenAPISchemaDialog({
  open,
  onClose,
  projectId,
  schema,
}: OpenAPISchemaDialogProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    version: '',
    title: '',
    baseUrl: '',
    schemaText: '',
    schemaUrl: '',
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [parsedSchema, setParsedSchema] = useState<any>(null);

  const isEditing = Boolean(schema);

  useEffect(() => {
    if (schema) {
      setFormData({
        name: schema.name,
        description: schema.description || '',
        version: schema.version,
        title: schema.title,
        baseUrl: schema.baseUrl || '',
        schemaText: JSON.stringify(schema.schema, null, 2),
        schemaUrl: '',
      });
      setParsedSchema(schema.schema);
    } else {
      setFormData({
        name: '',
        description: '',
        version: '',
        title: '',
        baseUrl: '',
        schemaText: '',
        schemaUrl: '',
      });
      setParsedSchema(null);
    }
    setError('');
    setActiveTab(0);
  }, [schema, open]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setFormData(prev => ({ ...prev, schemaText: content }));
      parseSchemaText(content);
    };
    reader.readAsText(file);
  };

  const handleUrlLoad = async () => {
    if (!formData.schemaUrl) {
      setError('Please enter a URL');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Use proxy endpoint to avoid CORS issues
      const proxyUrl = `/api/proxy?url=${encodeURIComponent(formData.schemaUrl)}`;
      const response = await fetch(proxyUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.statusText}`);
      }
      const text = await response.text();
      setFormData(prev => ({ ...prev, schemaText: text }));
      parseSchemaText(text);
    } catch (err) {
      setError(`Failed to load schema: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const parseSchemaText = (text: string) => {
    try {
      const schema = JSON.parse(text);
      const parsed = parseOpenAPISchema(schema);
      setParsedSchema(schema);
      
      // Auto-populate form fields if not editing
      if (!isEditing) {
        setFormData(prev => ({
          ...prev,
          title: parsed.title || prev.title,
          version: parsed.version || prev.version,
          baseUrl: parsed.servers.length > 0 ? parsed.servers[0] : prev.baseUrl,
          name: prev.name || parsed.title || '',
        }));
      }
      
      setError('');
    } catch (err) {
      setError(`Failed to parse schema: ${(err as Error).message}`);
      setParsedSchema(null);
    }
  };

  const handleSchemaTextChange = (value: string) => {
    setFormData(prev => ({ ...prev, schemaText: value }));
    if (value.trim()) {
      parseSchemaText(value);
    } else {
      setParsedSchema(null);
    }
  };

  const handleSave = async () => {
    // Validation
    if (!formData.name.trim()) {
      setError('Schema name is required');
      return;
    }
    if (!formData.version.trim()) {
      setError('Version is required');
      return;
    }
    if (!formData.title.trim()) {
      setError('Title is required');
      return;
    }
    if (!parsedSchema) {
      setError('Valid OpenAPI schema is required');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const schemaData = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        version: formData.version.trim(),
        title: formData.title.trim(),
        baseUrl: formData.baseUrl.trim() || undefined,
        schema: parsedSchema,
      };

      if (isEditing) {
        await api.updateProjectOpenAPISchema(projectId, schema!.id, schemaData);
      } else {
        await api.createProjectOpenAPISchema(projectId, schemaData);
      }

      onClose(true);
    } catch (err) {
      setError(`Failed to save schema: ${(err as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    onClose(false);
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {isEditing ? 'Edit OpenAPI Schema' : 'Add OpenAPI Schema'}
      </DialogTitle>

      <DialogContent>
        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            label="Schema Name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            margin="normal"
            required
            placeholder="My API Schema"
          />
          
          <TextField
            fullWidth
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            margin="normal"
            multiline
            rows={2}
            placeholder="Description of this API schema"
          />

          <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
            <TextField
              label="Version"
              value={formData.version}
              onChange={(e) => setFormData(prev => ({ ...prev, version: e.target.value }))}
              required
              placeholder="1.0.0"
              sx={{ flex: 1 }}
            />
            
            <TextField
              label="Title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              required
              placeholder="API Title"
              sx={{ flex: 2 }}
            />
          </Box>

          <TextField
            fullWidth
            label="Base URL"
            value={formData.baseUrl}
            onChange={(e) => setFormData(prev => ({ ...prev, baseUrl: e.target.value }))}
            margin="normal"
            placeholder="https://api.example.com"
            helperText="Optional base URL for the API"
          />
        </Box>

        <Typography variant="h6" gutterBottom>
          OpenAPI Schema
        </Typography>

        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 2 }}>
          <Tab label="Paste/Edit JSON" />
          <Tab label="Upload File" icon={<UploadFileIcon />} />
          <Tab label="Load from URL" icon={<LinkIcon />} />
        </Tabs>

        <TabPanel value={activeTab} index={0}>
          <TextField
            fullWidth
            multiline
            rows={12}
            label="OpenAPI Schema (JSON)"
            value={formData.schemaText}
            onChange={(e) => handleSchemaTextChange(e.target.value)}
            placeholder="Paste your OpenAPI schema JSON here..."
            variant="outlined"
          />
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          <Button
            variant="contained"
            component="label"
            fullWidth
            startIcon={<UploadFileIcon />}
            sx={{ mb: 2 }}
          >
            Upload OpenAPI Schema (JSON)
            <input
              type="file"
              hidden
              accept=".json"
              onChange={handleFileUpload}
            />
          </Button>
          
          {parsedSchema && (
            <Alert severity="success">
              Schema loaded successfully: {formData.title}
            </Alert>
          )}
        </TabPanel>

        <TabPanel value={activeTab} index={2}>
          <TextField
            fullWidth
            label="OpenAPI Schema URL"
            value={formData.schemaUrl}
            onChange={(e) => setFormData(prev => ({ ...prev, schemaUrl: e.target.value }))}
            placeholder="https://api.example.com/openapi.json"
            margin="normal"
          />
          <Button
            variant="contained"
            onClick={handleUrlLoad}
            disabled={loading || !formData.schemaUrl}
            fullWidth
            sx={{ mt: 1 }}
          >
            {loading ? <CircularProgress size={24} /> : 'Load Schema'}
          </Button>
        </TabPanel>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}

        {parsedSchema && (
          <Alert severity="success" sx={{ mt: 2 }}>
            Schema parsed successfully! Found {parseOpenAPISchema(parsedSchema).operations.length} operations.
          </Alert>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={saving}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={saving || !parsedSchema}
        >
          {saving ? (
            <CircularProgress size={20} />
          ) : (
            isEditing ? 'Update Schema' : 'Save Schema'
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
}