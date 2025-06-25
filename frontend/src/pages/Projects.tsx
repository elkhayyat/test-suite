import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Chip,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';
import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder';
import BusinessIcon from '@mui/icons-material/Business';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import { Project, Folder } from '../../../shared/src/types';
import { api } from '../services/api';

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [folders, setFolders] = useState<{ [projectId: string]: Folder[] }>({});
  const [expandedProjects, setExpandedProjects] = useState<{ [projectId: string]: boolean }>({});
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const data = await api.getProjects();
      setProjects(data);
      
      // Expand all projects by default
      const expanded: { [projectId: string]: boolean } = {};
      data.forEach(project => {
        expanded[project.id] = true;
      });
      setExpandedProjects(expanded);
      
      // Load folders for each project
      for (const project of data) {
        const projectFolders = await api.getProjectFolders(project.id);
        setFolders(prev => ({ ...prev, [project.id]: projectFolders }));
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  };

  const handleToggleProject = (projectId: string) => {
    setExpandedProjects(prev => ({
      ...prev,
      [projectId]: !prev[projectId]
    }));
  };

  const handleOpenProjectDialog = (project?: Project) => {
    if (project) {
      setEditingProject(project);
      setFormData({
        name: project.name,
        description: project.description || '',
      });
    } else {
      setEditingProject(null);
      setFormData({ name: '', description: '' });
    }
    setProjectDialogOpen(true);
  };

  const handleCloseProjectDialog = () => {
    setProjectDialogOpen(false);
    setEditingProject(null);
    setFormData({ name: '', description: '' });
  };

  const handleSaveProject = async () => {
    try {
      if (editingProject) {
        await api.updateProject(editingProject.id, formData);
      } else {
        await api.createProject(formData);
      }
      handleCloseProjectDialog();
      loadProjects();
    } catch (error) {
      console.error('Failed to save project:', error);
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this project and all its contents?')) {
      try {
        await api.deleteProject(id);
        loadProjects();
      } catch (error) {
        console.error('Failed to delete project:', error);
      }
    }
  };

  const handleOpenFolderDialog = (projectId: string) => {
    setSelectedProjectId(projectId);
    setFormData({ name: '', description: '' });
    setFolderDialogOpen(true);
  };

  const handleCloseFolderDialog = () => {
    setFolderDialogOpen(false);
    setSelectedProjectId('');
    setFormData({ name: '', description: '' });
  };

  const handleSaveFolder = async () => {
    try {
      await api.createFolder(selectedProjectId, {
        name: formData.name,
        description: formData.description,
      });
      handleCloseFolderDialog();
      loadProjects();
    } catch (error) {
      console.error('Failed to save folder:', error);
    }
  };

  const handleDeleteFolder = async (folderId: string, projectId: string) => {
    if (window.confirm('Are you sure you want to delete this folder and all its contents?')) {
      try {
        await api.deleteFolder(projectId, folderId);
        const projectFolders = await api.getProjectFolders(projectId);
        setFolders(prev => ({ ...prev, [projectId]: projectFolders }));
      } catch (error) {
        console.error('Failed to delete folder:', error);
      }
    }
  };

  return (
    <Box className="animate-fadeIn">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box 
            className="gradient-indigo"
            sx={{ 
              p: 1, 
              borderRadius: 2, 
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 20px rgba(95, 114, 189, 0.3)'
            }}
          >
            <BusinessIcon sx={{ fontSize: 32, color: 'white' }} />
          </Box>
          <Typography variant="h4" className="text-gradient">
            Projects & Folders
          </Typography>
        </Box>
        <Button
          variant="contained"
          className="gradient-primary"
          startIcon={<AddIcon />}
          onClick={() => handleOpenProjectDialog()}
          sx={{ 
            color: 'white',
            boxShadow: '0 4px 20px rgba(102, 126, 234, 0.3)',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: '0 8px 32px rgba(102, 126, 234, 0.4)',
            }
          }}
        >
          New Project
        </Button>
      </Box>

      <Grid container spacing={3}>
        {projects.map((project, index) => (
          <Grid item xs={12} md={6} lg={4} key={project.id}>
            <Card 
              className="animate-scaleIn hover-lift"
              sx={{ 
                animationDelay: `${index * 0.1}s`,
                animationFillMode: 'both',
                height: '100%',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <CardContent sx={{ flexGrow: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <AccountTreeIcon sx={{ color: '#5f72bd' }} />
                  <Typography variant="h6">
                    {project.name}
                  </Typography>
                </Box>
                
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {project.description || 'No description'}
                </Typography>

                <Paper 
                    variant="outlined" 
                    sx={{ 
                      p: 1, 
                      mt: 2,
                      backgroundColor: (theme) => theme.palette.mode === 'dark'
                        ? 'rgba(255,255,255,0.02)'
                        : 'rgba(0,0,0,0.02)'
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        Folders
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={() => handleOpenFolderDialog(project.id)}
                        sx={{ color: '#11998e' }}
                      >
                        <CreateNewFolderIcon />
                      </IconButton>
                    </Box>
                    <List dense sx={{ py: 0 }}>
                      {folders[project.id]?.map((folder) => (
                        <ListItem
                          key={folder.id}
                          sx={{
                            py: 0.5,
                            '&:hover': {
                              backgroundColor: (theme) => theme.palette.mode === 'dark'
                                ? 'rgba(102, 126, 234, 0.08)'
                                : 'rgba(102, 126, 234, 0.04)',
                            }
                          }}
                          secondaryAction={
                            <IconButton
                              edge="end"
                              size="small"
                              onClick={() => handleDeleteFolder(folder.id, project.id)}
                              sx={{ color: '#f5576c' }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          }
                        >
                          <ListItemIcon sx={{ minWidth: 36 }}>
                            <FolderIcon sx={{ color: '#ffa726', fontSize: 20 }} />
                          </ListItemIcon>
                          <ListItemText 
                            primary={folder.name}
                            primaryTypographyProps={{ variant: 'body2' }}
                          />
                        </ListItem>
                      ))}
                      {(!folders[project.id] || folders[project.id].length === 0) && (
                        <Typography variant="caption" color="text.secondary" sx={{ pl: 2 }}>
                          No folders yet
                        </Typography>
                      )}
                    </List>
                  </Paper>
              </CardContent>
              
              <CardActions>
                <Button
                  size="small"
                  startIcon={<EditIcon />}
                  onClick={() => handleOpenProjectDialog(project)}
                  sx={{ color: '#667eea' }}
                >
                  Edit
                </Button>
                <Button
                  size="small"
                  startIcon={<DeleteIcon />}
                  onClick={() => handleDeleteProject(project.id)}
                  sx={{ color: '#f5576c' }}
                >
                  Delete
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Project Dialog */}
      <Dialog open={projectDialogOpen} onClose={handleCloseProjectDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingProject ? 'Edit Project' : 'New Project'}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Project Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            margin="normal"
            multiline
            rows={3}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseProjectDialog}>Cancel</Button>
          <Button 
            onClick={handleSaveProject} 
            variant="contained" 
            disabled={!formData.name}
            className="gradient-primary"
            sx={{ color: 'white' }}
          >
            {editingProject ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Folder Dialog */}
      <Dialog open={folderDialogOpen} onClose={handleCloseFolderDialog} maxWidth="sm" fullWidth>
        <DialogTitle>New Folder</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Folder Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            margin="normal"
            multiline
            rows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseFolderDialog}>Cancel</Button>
          <Button 
            onClick={handleSaveFolder} 
            variant="contained" 
            disabled={!formData.name}
            className="gradient-teal"
            sx={{ color: 'white' }}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}