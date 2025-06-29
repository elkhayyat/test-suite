import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Fab,
  Typography,
  Box,
  Chip,
  Alert,
  Snackbar,
  Menu,
  MenuItem,
  ListItemIcon,
  Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ApiIcon from '@mui/icons-material/Api';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { ProjectOpenAPISchema, Folder } from '../../../shared/src/types';
import { api } from '../services/api';
import OpenAPISchemaDialog from './OpenAPISchemaDialog';
import OpenAPIGenerateFlowsDialog from './OpenAPIGenerateFlowsDialog';

interface ProjectOpenAPIDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
  projectFolders: Folder[];
}

export default function ProjectOpenAPIDialog({
  open,
  onClose,
  projectId,
  projectName,
  projectFolders,
}: ProjectOpenAPIDialogProps) {
  const [schemas, setSchemas] = useState<ProjectOpenAPISchema[]>([]);
  const [loading, setLoading] = useState(false);
  const [schemaDialogOpen, setSchemaDialogOpen] = useState(false);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [editingSchema, setEditingSchema] = useState<ProjectOpenAPISchema | null>(null);
  const [selectedSchema, setSelectedSchema] = useState<ProjectOpenAPISchema | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuSchemaId, setMenuSchemaId] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity?: 'success' | 'error' }>({
    open: false,
    message: '',
  });

  useEffect(() => {
    if (open) {
      loadSchemas();
    }
  }, [open, projectId]);

  const loadSchemas = async () => {
    try {
      setLoading(true);
      const data = await api.getProjectOpenAPISchemas(projectId);
      setSchemas(data);
    } catch (error) {
      console.error('Failed to load OpenAPI schemas:', error);
      setSnackbar({
        open: true,
        message: 'Failed to load OpenAPI schemas',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddSchema = () => {
    setEditingSchema(null);
    setSchemaDialogOpen(true);
  };

  const handleEditSchema = (schema: ProjectOpenAPISchema) => {
    setEditingSchema(schema);
    setSchemaDialogOpen(true);
    handleCloseMenu();
  };

  const handleDeleteSchema = async (schemaId: string) => {
    if (!window.confirm('Are you sure you want to delete this OpenAPI schema?')) {
      return;
    }

    try {
      await api.deleteProjectOpenAPISchema(projectId, schemaId);
      await loadSchemas();
      setSnackbar({
        open: true,
        message: 'Schema deleted successfully',
        severity: 'success',
      });
    } catch (error) {
      console.error('Failed to delete schema:', error);
      setSnackbar({
        open: true,
        message: 'Failed to delete schema',
        severity: 'error',
      });
    }
    handleCloseMenu();
  };

  const handleGenerateFlows = (schema: ProjectOpenAPISchema) => {
    setSelectedSchema(schema);
    setGenerateDialogOpen(true);
    handleCloseMenu();
  };

  const handleSchemaDialogClose = (saved?: boolean) => {
    setSchemaDialogOpen(false);
    setEditingSchema(null);
    if (saved) {
      loadSchemas();
    }
  };

  const handleGenerateDialogClose = (generated?: boolean) => {
    setGenerateDialogOpen(false);
    setSelectedSchema(null);
    if (generated) {
      setSnackbar({
        open: true,
        message: 'Flows generated successfully',
        severity: 'success',
      });
    }
  };

  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>, schemaId: string) => {
    setMenuAnchor(event.currentTarget);
    setMenuSchemaId(schemaId);
  };

  const handleCloseMenu = () => {
    setMenuAnchor(null);
    setMenuSchemaId(null);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString();
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ApiIcon />
            OpenAPI Schemas - {projectName}
          </Box>
        </DialogTitle>

        <DialogContent>
          {schemas.length === 0 && !loading ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <ApiIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No OpenAPI Schemas
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Add OpenAPI schemas to reuse them across multiple flows in this project.
              </Typography>
              <Button variant="contained" startIcon={<AddIcon />} onClick={handleAddSchema}>
                Add Schema
              </Button>
            </Box>
          ) : (
            <List>
              {schemas.map((schema, index) => (
                <React.Fragment key={schema.id}>
                  {index > 0 && <Divider />}
                  <ListItem>
                    <ListItemIcon>
                      <ApiIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <Typography variant="subtitle1" component="span">
                            {schema.name}
                          </Typography>
                          <Chip
                            label={`v${schema.version}`}
                            size="small"
                            variant="outlined"
                            color="primary"
                          />
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            {schema.title}
                          </Typography>
                          {schema.description && (
                            <Typography variant="caption" color="text.secondary">
                              {schema.description}
                            </Typography>
                          )}
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                            Created: {formatDate(schema.createdAt)}
                            {schema.baseUrl && ` • Base URL: ${schema.baseUrl}`}
                          </Typography>
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        edge="end"
                        onClick={(e) => handleOpenMenu(e, schema.id)}
                        size="small"
                      >
                        <MoreVertIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                </React.Fragment>
              ))}
            </List>
          )}

          {schemas.length > 0 && (
            <Box sx={{ position: 'relative', height: 80 }}>
              <Fab
                color="primary"
                size="medium"
                onClick={handleAddSchema}
                sx={{
                  position: 'absolute',
                  bottom: 16,
                  right: 16,
                }}
              >
                <AddIcon />
              </Fab>
            </Box>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>

      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleCloseMenu}
      >
        <MenuItem
          onClick={() => {
            const schema = schemas.find(s => s.id === menuSchemaId);
            if (schema) handleEditSchema(schema);
          }}
        >
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          Edit Schema
        </MenuItem>
        <MenuItem
          onClick={() => {
            const schema = schemas.find(s => s.id === menuSchemaId);
            if (schema) handleGenerateFlows(schema);
          }}
        >
          <ListItemIcon>
            <PlayArrowIcon fontSize="small" />
          </ListItemIcon>
          Generate Flows
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => {
            if (menuSchemaId) handleDeleteSchema(menuSchemaId);
          }}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          Delete Schema
        </MenuItem>
      </Menu>

      {schemaDialogOpen && (
        <OpenAPISchemaDialog
          open={schemaDialogOpen}
          onClose={handleSchemaDialogClose}
          projectId={projectId}
          schema={editingSchema}
        />
      )}

      {generateDialogOpen && selectedSchema && (
        <OpenAPIGenerateFlowsDialog
          open={generateDialogOpen}
          onClose={handleGenerateDialogClose}
          projectId={projectId}
          schema={selectedSchema}
          projectFolders={projectFolders}
        />
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity || 'info'}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}