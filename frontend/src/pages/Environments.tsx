import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Checkbox,
  FormControlLabel,
  Chip,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SettingsIcon from '@mui/icons-material/Settings';
import AddIcon from '@mui/icons-material/Add';
import CloudIcon from '@mui/icons-material/Cloud';
import PublicIcon from '@mui/icons-material/Public';
import SecurityIcon from '@mui/icons-material/Security';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import DownloadIcon from '@mui/icons-material/Download';
import UploadIcon from '@mui/icons-material/Upload';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { Environment } from '../../../shared/src/types';
import { api } from '../services/api';
import VariablesDialog from '../components/VariablesDialog';

export default function Environments() {
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEnv, setEditingEnv] = useState<Environment | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isDefault: false,
  });
  const [variablesDialogOpen, setVariablesDialogOpen] = useState(false);
  const [selectedEnvironment, setSelectedEnvironment] = useState<Environment | null>(null);
  const [importingEnvId, setImportingEnvId] = useState<string>('');

  useEffect(() => {
    loadEnvironments();
  }, []);

  const loadEnvironments = async () => {
    try {
      const data = await api.getEnvironments();
      setEnvironments(data);
    } catch (error) {
      console.error('Failed to load environments:', error);
    }
  };

  const handleOpenDialog = (env?: Environment) => {
    if (env) {
      setEditingEnv(env);
      setFormData({
        name: env.name,
        description: env.description || '',
        isDefault: env.isDefault,
      });
    } else {
      setEditingEnv(null);
      setFormData({
        name: '',
        description: '',
        isDefault: false,
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingEnv(null);
    setFormData({
      name: '',
      description: '',
      isDefault: false,
    });
  };

  const handleSave = async () => {
    try {
      if (editingEnv) {
        await api.updateEnvironment(editingEnv.id, formData);
      } else {
        await api.createEnvironment(formData);
      }
      handleCloseDialog();
      loadEnvironments();
    } catch (error) {
      console.error('Failed to save environment:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this environment?')) {
      try {
        await api.deleteEnvironment(id);
        loadEnvironments();
      } catch (error) {
        console.error('Failed to delete environment:', error);
      }
    }
  };

  const handleExportEnvironment = async (envId: string, envName: string) => {
    try {
      const exportData = await api.exportEnvironment(envId);
      
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `${envName.replace(/[^a-z0-9]/gi, '_')}_environment.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    } catch (error) {
      console.error('Failed to export environment:', error);
      alert('Failed to export environment');
    }
  };

  const handleImportEnvironment = (envId: string) => {
    setImportingEnvId(envId);
    const fileInput = document.getElementById(`import-env-input-${envId}`) as HTMLInputElement;
    fileInput?.click();
  };

  const handleImportEnvFile = async (event: React.ChangeEvent<HTMLInputElement>, envId: string) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const importData = JSON.parse(e.target?.result as string);
          await api.importEnvironment(envId, importData);
          alert('Environment imported successfully!');
          loadEnvironments();
        } catch (error) {
          console.error('Failed to import environment:', error);
          alert('Failed to import environment. Please check the file format.');
        }
      };
      reader.readAsText(file);
    } catch (error) {
      console.error('Failed to read import file:', error);
      alert('Failed to read the import file.');
    }
    
    // Reset the input
    event.target.value = '';
    setImportingEnvId('');
  };

  const handleDuplicateEnvironment = async (envId: string) => {
    try {
      const duplicatedEnv = await api.duplicateEnvironment(envId);
      loadEnvironments();
      alert(`Environment "${duplicatedEnv.name}" duplicated successfully!`);
    } catch (error) {
      console.error('Failed to duplicate environment:', error);
      alert('Failed to duplicate environment');
    }
  };

  return (
    <Box className="animate-fadeIn">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box 
            className="gradient-teal"
            sx={{ 
              p: 1, 
              borderRadius: 2, 
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 20px rgba(17, 153, 142, 0.3)'
            }}
          >
            <CloudIcon sx={{ fontSize: 32, color: 'white' }} />
          </Box>
          <Typography variant="h4" className="text-gradient">
            Environments
          </Typography>
        </Box>
        <Button
          variant="contained"
          className="gradient-primary"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
          sx={{ 
            color: 'white',
            boxShadow: '0 4px 20px rgba(102, 126, 234, 0.3)',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: '0 8px 32px rgba(102, 126, 234, 0.4)',
            }
          }}
        >
          New Environment
        </Button>
      </Box>

      <TableContainer 
        component={Paper}
        className="animate-fadeIn"
        sx={{ 
          boxShadow: (theme) => theme.palette.mode === 'dark' 
            ? '0 8px 32px rgba(17, 153, 142, 0.1)' 
            : '0 8px 32px rgba(17, 153, 142, 0.08)',
          border: (theme) => theme.palette.mode === 'dark'
            ? '1px solid rgba(17, 153, 142, 0.2)'
            : 'none',
          animationDelay: '0.2s',
          animationFillMode: 'both'
        }}
      >
        <Table>
          <TableHead>
            <TableRow sx={{ 
              background: (theme) => theme.palette.mode === 'dark'
                ? 'linear-gradient(135deg, rgba(17, 153, 142, 0.1), rgba(56, 239, 125, 0.1))'
                : 'linear-gradient(135deg, rgba(17, 153, 142, 0.05), rgba(56, 239, 125, 0.05))'
            }}>
              <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Description</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Default</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {environments.map((env, index) => (
              <TableRow 
                key={env.id}
                className="animate-slideInLeft"
                sx={{ 
                  animationDelay: `${0.3 + index * 0.05}s`,
                  animationFillMode: 'both',
                  '&:hover': {
                    backgroundColor: (theme) => theme.palette.mode === 'dark'
                      ? 'rgba(17, 153, 142, 0.08)'
                      : 'rgba(17, 153, 142, 0.04)',
                    transform: 'translateX(4px)',
                    transition: 'all 0.3s ease'
                  }
                }}
              >
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PublicIcon sx={{ color: '#11998e', fontSize: 20 }} />
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {env.name}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {env.description || '-'}
                  </Typography>
                </TableCell>
                <TableCell>
                  {env.isDefault && (
                    <Chip 
                      label="Default" 
                      size="small"
                      className="gradient-teal"
                      sx={{ 
                        color: 'white',
                        fontWeight: 600,
                        boxShadow: '0 2px 8px rgba(17, 153, 142, 0.3)'
                      }}
                    />
                  )}
                </TableCell>
                <TableCell>
                  <IconButton 
                    size="small" 
                    onClick={() => handleOpenDialog(env)}
                    sx={{
                      color: '#667eea',
                      '&:hover': {
                        backgroundColor: 'rgba(102, 126, 234, 0.1)',
                        transform: 'scale(1.1)'
                      }
                    }}
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleDuplicateEnvironment(env.id)}
                    title="Duplicate Environment"
                    sx={{
                      color: '#9b59b6',
                      '&:hover': {
                        backgroundColor: 'rgba(155, 89, 182, 0.1)',
                        transform: 'scale(1.1)'
                      }
                    }}
                  >
                    <ContentCopyIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleDelete(env.id)}
                    disabled={env.isDefault}
                    sx={{
                      color: '#f5576c',
                      '&:hover': {
                        backgroundColor: 'rgba(245, 87, 108, 0.1)',
                        transform: 'scale(1.1)'
                      },
                      '&:disabled': {
                        color: 'action.disabled'
                      }
                    }}
                  >
                    <DeleteIcon />
                  </IconButton>
                  <Button
                    size="small"
                    startIcon={<VpnKeyIcon />}
                    onClick={() => {
                      setSelectedEnvironment(env);
                      setVariablesDialogOpen(true);
                    }}
                    sx={{
                      color: '#11998e',
                      '&:hover': {
                        backgroundColor: 'rgba(17, 153, 142, 0.1)',
                        transform: 'scale(1.05)'
                      }
                    }}
                  >
                    Variables
                  </Button>
                  <IconButton
                    size="small"
                    onClick={() => handleExportEnvironment(env.id, env.name)}
                    title="Export Environment"
                    sx={{
                      color: '#f39c12',
                      '&:hover': {
                        backgroundColor: 'rgba(243, 156, 18, 0.1)',
                        transform: 'scale(1.1)'
                      }
                    }}
                  >
                    <DownloadIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleImportEnvironment(env.id)}
                    title="Import to Environment"
                    sx={{
                      color: '#e67e22',
                      '&:hover': {
                        backgroundColor: 'rgba(230, 126, 34, 0.1)',
                        transform: 'scale(1.1)'
                      }
                    }}
                  >
                    <UploadIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingEnv ? 'Edit Environment' : 'New Environment'}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Name"
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
          <FormControlLabel
            control={
              <Checkbox
                checked={formData.isDefault}
                onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
              />
            }
            label="Set as default environment"
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSave} variant="contained" disabled={!formData.name}>
            {editingEnv ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      <VariablesDialog
        open={variablesDialogOpen}
        environment={selectedEnvironment}
        onClose={() => {
          setVariablesDialogOpen(false);
          setSelectedEnvironment(null);
        }}
      />

      {/* Hidden file inputs for importing */}
      {environments.map((env) => (
        <input
          key={env.id}
          id={`import-env-input-${env.id}`}
          type="file"
          accept=".json"
          style={{ display: 'none' }}
          onChange={(e) => handleImportEnvFile(e, env.id)}
        />
      ))}
    </Box>
  );
}