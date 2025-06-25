import React, { useEffect, useState } from 'react';
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
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { Environment, EnvironmentVariable } from '../../../shared/src/types';
import { api } from '../services/api';

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

  const displayValue = (variable: EnvironmentVariable) => {
    if (variable.isSecret && !showSecrets) {
      return '••••••••';
    }
    return variable.value;
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {environment ? `Variables for ${environment.name}` : 'Environment Variables'}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Use variables in your test steps with {'{{variableName}}'} syntax
          </Typography>
          
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
                    {'{{'}{variable.key}{'}}'}
                  </TableCell>
                  <TableCell sx={{ fontFamily: 'monospace' }}>
                    {displayValue(variable)}
                  </TableCell>
                  <TableCell>
                    {variable.isSecret ? 'Secret' : 'Plain'}
                  </TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteVariable(variable.key)}
                    >
                      <DeleteIcon />
                    </IconButton>
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
  );
}