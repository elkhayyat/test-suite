import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  TextField,
  Box,
  Typography,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { Environment, EnvironmentVariable } from '../../../shared/src/types';
import { api } from '../services/api';
import { GENERATOR_FUNCTIONS } from '../utils/randomGenerators';

interface VariablesDialogProps {
  open: boolean;
  environment: Environment | null;
  onClose: () => void;
}

export default function VariablesDialog({ open, environment, onClose }: VariablesDialogProps) {
  const [variables, setVariables] = useState<EnvironmentVariable[]>([]);
  const [newVariable, setNewVariable] = useState({ key: '', value: '', isSecret: false });
  const [showSecrets, setShowSecrets] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingVariable, setEditingVariable] = useState<{ originalKey: string; key: string; value: string } | null>(null);
  const [randomHelpOpen, setRandomHelpOpen] = useState(false);

  useEffect(() => {
    if (open && environment) {
      loadVariables();
    }
  }, [open, environment]);

  const loadVariables = async () => {
    if (!environment) return;
    
    setLoading(true);
    try {
      const data = await api.getEnvironmentVariables(environment.id);
      setVariables(data);
    } catch (error) {
      console.error('Failed to load variables:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddVariable = async () => {
    if (!environment || !newVariable.key || !newVariable.value) return;
    
    try {
      await api.setEnvironmentVariable(
        environment.id,
        newVariable.key,
        newVariable.value,
        newVariable.isSecret
      );
      setNewVariable({ key: '', value: '', isSecret: false });
      loadVariables();
    } catch (error) {
      console.error('Failed to add variable:', error);
    }
  };

  const handleDeleteVariable = async (key: string) => {
    if (!environment) return;
    
    if (window.confirm(`Delete variable "${key}"?`)) {
      try {
        await api.deleteEnvironmentVariable(environment.id, key);
        loadVariables();
      } catch (error) {
        console.error('Failed to delete variable:', error);
      }
    }
  };

  const handleStartEdit = (variable: EnvironmentVariable) => {
    setEditingVariable({ originalKey: variable.key, key: variable.key, value: variable.value });
  };

  const handleCancelEdit = () => {
    setEditingVariable(null);
  };

  const handleSaveEdit = async (variable: EnvironmentVariable) => {
    if (!environment || !editingVariable) return;
    
    try {
      // If the key has changed, we need to delete the old one and create a new one
      if (editingVariable.originalKey !== editingVariable.key) {
        // Create new variable with new key
        await api.setEnvironmentVariable(
          environment.id,
          editingVariable.key,
          editingVariable.value,
          variable.isSecret
        );
        // Delete old variable
        await api.deleteEnvironmentVariable(environment.id, editingVariable.originalKey);
      } else {
        // Just update the value
        await api.setEnvironmentVariable(
          environment.id,
          variable.key,
          editingVariable.value,
          variable.isSecret
        );
      }
      setEditingVariable(null);
      loadVariables();
    } catch (error) {
      console.error('Failed to update variable:', error);
    }
  };

  const displayValue = (variable: EnvironmentVariable) => {
    if (variable.isSecret && !showSecrets) {
      return '••••••••';
    }
    return variable.value;
  };

  const handleCopyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // You could add a snackbar notification here if you have one set up
      console.log(`Copied ${label} to clipboard`);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  return (
    <>
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {environment ? `Variables for ${environment.name}` : 'Environment Variables'}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Use variables in your test steps with {'{{variableName}}'} syntax or $random.type() for dynamic values
            </Typography>
            <IconButton 
              size="small" 
              onClick={() => setRandomHelpOpen(true)}
              sx={{ padding: 0.5 }}
            >
              <HelpOutlineIcon fontSize="small" />
            </IconButton>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <TextField
              size="small"
              label="Variable Name"
              value={newVariable.key}
              onChange={(e) => setNewVariable({ ...newVariable, key: e.target.value })}
              sx={{ flex: 1 }}
            />
            <TextField
              size="small"
              label="Value"
              type={newVariable.isSecret ? 'password' : 'text'}
              value={newVariable.value}
              onChange={(e) => setNewVariable({ ...newVariable, value: e.target.value })}
              sx={{ flex: 2 }}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={newVariable.isSecret}
                  onChange={(e) => setNewVariable({ ...newVariable, isSecret: e.target.checked })}
                />
              }
              label="Secret"
            />
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAddVariable}
              disabled={!newVariable.key || !newVariable.value}
            >
              Add
            </Button>
          </Box>
        </Box>

        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Variable Name</TableCell>
                <TableCell>
                  Value
                  <IconButton
                    size="small"
                    onClick={() => setShowSecrets(!showSecrets)}
                    sx={{ ml: 1 }}
                  >
                    {showSecrets ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                </TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {variables.map((variable) => (
                <TableRow key={variable.id}>
                  <TableCell sx={{ fontFamily: 'monospace' }}>
                    {editingVariable?.originalKey === variable.key ? (
                      <TextField
                        size="small"
                        fullWidth
                        value={editingVariable.key}
                        onChange={(e) => setEditingVariable({ ...editingVariable, key: e.target.value })}
                        sx={{ fontFamily: 'monospace' }}
                        placeholder="Variable name"
                      />
                    ) : (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <span>{`{{${variable.key}}}`}</span>
                        <IconButton
                          size="small"
                          onClick={() => handleCopyToClipboard(`{{${variable.key}}}`, 'variable name')}
                          sx={{ padding: 0.5 }}
                          title="Copy variable name"
                        >
                          <ContentCopyIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    )}
                  </TableCell>
                  <TableCell sx={{ fontFamily: 'monospace' }}>
                    {editingVariable?.originalKey === variable.key ? (
                      <TextField
                        size="small"
                        fullWidth
                        type={variable.isSecret && !showSecrets ? 'password' : 'text'}
                        value={editingVariable.value}
                        onChange={(e) => setEditingVariable({ ...editingVariable, value: e.target.value })}
                        sx={{ fontFamily: 'monospace' }}
                      />
                    ) : (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <span>{displayValue(variable)}</span>
                        {(!variable.isSecret || showSecrets) && (
                          <IconButton
                            size="small"
                            onClick={() => handleCopyToClipboard(variable.value, 'variable value')}
                            sx={{ padding: 0.5 }}
                            title="Copy value"
                          >
                            <ContentCopyIcon fontSize="small" />
                          </IconButton>
                        )}
                      </Box>
                    )}
                  </TableCell>
                  <TableCell>
                    {variable.isSecret ? 'Secret' : 'Plain'}
                  </TableCell>
                  <TableCell>
                    {editingVariable?.originalKey === variable.key ? (
                      <>
                        <IconButton
                          size="small"
                          onClick={() => handleSaveEdit(variable)}
                          sx={{ color: '#66bb6a' }}
                        >
                          <SaveIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={handleCancelEdit}
                          sx={{ color: '#f5576c' }}
                        >
                          <CancelIcon />
                        </IconButton>
                      </>
                    ) : (
                      <>
                        <IconButton
                          size="small"
                          onClick={() => handleStartEdit(variable)}
                          sx={{ color: '#667eea' }}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteVariable(variable.key)}
                          sx={{ color: '#f5576c' }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>

    {/* Random Generators Help Dialog */}
    <Dialog open={randomHelpOpen} onClose={() => setRandomHelpOpen(false)} maxWidth="md" fullWidth>
      <DialogTitle>Random Value Generators</DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Use these generators in your environment variable values to generate random values at runtime.
            Values will be generated each time the variable is used in a test step.
          </Typography>
        </Box>
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
    </>
  );
}