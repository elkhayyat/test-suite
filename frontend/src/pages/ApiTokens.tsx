import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Alert,
  Chip,
  FormControlLabel,
  Checkbox,
  FormGroup,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Tooltip,
  Snackbar,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Block as BlockIcon,
  ContentCopy as CopyIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Key as KeyIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { api } from '../services/api';
import { ApiToken } from '../../../shared/src/types';

export default function ApiTokens() {
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newTokenDialog, setNewTokenDialog] = useState<{
    open: boolean;
    token?: string;
  }>({ open: false });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<string | null>(null);
  const [showTokens, setShowTokens] = useState<Record<string, boolean>>({});
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });

  // Form state
  const [tokenForm, setTokenForm] = useState({
    name: '',
    permissions: ['read', 'write', 'execute'],
    expiresInDays: 90,
  });

  useEffect(() => {
    fetchTokens();
  }, []);

  const fetchTokens = async () => {
    try {
      const tokensData = await api.getApiTokens();
      setTokens(tokensData);
    } catch (error) {
      console.error('Error fetching tokens:', error);
      showSnackbar('Failed to fetch API tokens', 'error');
    } finally {
      setLoading(false);
    }
  };

  const createToken = async () => {
    try {
      const response = await api.createApiToken(tokenForm);
      setNewTokenDialog({ open: true, token: response.token });
      setCreateDialogOpen(false);
      setTokenForm({ name: '', permissions: ['read', 'write', 'execute'], expiresInDays: 90 });
      fetchTokens();
    } catch (error) {
      console.error('Error creating token:', error);
      showSnackbar('Failed to create API token', 'error');
    }
  };

  const revokeToken = async (tokenId: string) => {
    try {
      await api.revokeApiToken(tokenId);
      showSnackbar('Token revoked successfully', 'success');
      fetchTokens();
    } catch (error) {
      console.error('Error revoking token:', error);
      showSnackbar('Failed to revoke token', 'error');
    }
  };

  const deleteToken = async (tokenId: string) => {
    try {
      await api.deleteApiToken(tokenId);
      showSnackbar('Token deleted successfully', 'success');
      setDeleteDialogOpen(null);
      fetchTokens();
    } catch (error) {
      console.error('Error deleting token:', error);
      showSnackbar('Failed to delete token', 'error');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showSnackbar('Copied to clipboard', 'success');
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const toggleShowToken = (tokenId: string) => {
    setShowTokens(prev => ({ ...prev, [tokenId]: !prev[tokenId] }));
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        API Tokens
      </Typography>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          API tokens allow you to authenticate with Test Flow Suite from external applications like Claude Desktop.
          Keep your tokens secure and never share them publicly.
        </Typography>
      </Alert>

      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={() => setCreateDialogOpen(true)}
        sx={{ mb: 3 }}
      >
        Generate New Token
      </Button>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Token</TableCell>
              <TableCell>Permissions</TableCell>
              <TableCell>Last Used</TableCell>
              <TableCell>Expires</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tokens.map((token) => (
              <TableRow key={token.id}>
                <TableCell>{token.name}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {showTokens[token.id] ? (
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        {token.token}
                      </Typography>
                    ) : (
                      <Typography variant="body2">••••••••</Typography>
                    )}
                    <IconButton
                      size="small"
                      onClick={() => toggleShowToken(token.id)}
                    >
                      {showTokens[token.id] ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                    {token.token !== '***' && (
                      <IconButton
                        size="small"
                        onClick={() => copyToClipboard(token.token)}
                      >
                        <CopyIcon />
                      </IconButton>
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {token.permissions.map((perm) => (
                      <Chip key={perm} label={perm} size="small" />
                    ))}
                  </Box>
                </TableCell>
                <TableCell>
                  {token.lastUsedAt
                    ? format(new Date(token.lastUsedAt), 'PPp')
                    : 'Never'}
                </TableCell>
                <TableCell>
                  {token.expiresAt
                    ? format(new Date(token.expiresAt), 'PP')
                    : 'Never'}
                </TableCell>
                <TableCell>
                  <Chip
                    label={token.isActive ? 'Active' : 'Revoked'}
                    color={token.isActive ? 'success' : 'error'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {token.isActive && (
                      <Tooltip title="Revoke Token">
                        <IconButton
                          size="small"
                          color="warning"
                          onClick={() => revokeToken(token.id)}
                        >
                          <BlockIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip title="Delete Token">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => setDeleteDialogOpen(token.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create Token Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Generate New API Token</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Token Name"
            value={tokenForm.name}
            onChange={(e) => setTokenForm({ ...tokenForm, name: e.target.value })}
            margin="normal"
            helperText="A descriptive name for this token (e.g., 'Claude Desktop')"
          />
          
          <FormControl fullWidth margin="normal">
            <InputLabel>Expires In</InputLabel>
            <Select
              value={tokenForm.expiresInDays}
              onChange={(e) => setTokenForm({ ...tokenForm, expiresInDays: Number(e.target.value) })}
            >
              <MenuItem value={30}>30 days</MenuItem>
              <MenuItem value={90}>90 days</MenuItem>
              <MenuItem value={180}>180 days</MenuItem>
              <MenuItem value={365}>1 year</MenuItem>
              <MenuItem value={0}>Never</MenuItem>
            </Select>
          </FormControl>

          <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
            Permissions
          </Typography>
          <FormGroup>
            {['read', 'write', 'execute', 'admin'].map((perm) => (
              <FormControlLabel
                key={perm}
                control={
                  <Checkbox
                    checked={tokenForm.permissions.includes(perm)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setTokenForm({
                          ...tokenForm,
                          permissions: [...tokenForm.permissions, perm],
                        });
                      } else {
                        setTokenForm({
                          ...tokenForm,
                          permissions: tokenForm.permissions.filter((p) => p !== perm),
                        });
                      }
                    }}
                  />
                }
                label={perm.charAt(0).toUpperCase() + perm.slice(1)}
              />
            ))}
          </FormGroup>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={createToken}
            variant="contained"
            disabled={!tokenForm.name}
          >
            Generate Token
          </Button>
        </DialogActions>
      </Dialog>

      {/* New Token Display Dialog */}
      <Dialog
        open={newTokenDialog.open}
        onClose={() => setNewTokenDialog({ open: false })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <KeyIcon />
            New API Token Created
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Save this token securely! It will not be shown again.
          </Alert>
          
          <Paper sx={{ 
            p: 2, 
            bgcolor: (theme) => theme.palette.mode === 'dark' ? 'grey.900' : 'grey.100',
            border: (theme) => theme.palette.mode === 'dark' ? '1px solid' : 'none',
            borderColor: 'grey.700'
          }}>
            <Typography variant="body1" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
              {newTokenDialog.token}
            </Typography>
          </Paper>
          
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              startIcon={<CopyIcon />}
              onClick={() => {
                if (newTokenDialog.token) {
                  copyToClipboard(newTokenDialog.token);
                }
              }}
            >
              Copy Token
            </Button>
          </Box>

          <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>
            Claude Desktop Configuration
          </Typography>
          <Typography variant="body2" gutterBottom>
            Add this to your Claude Desktop configuration file:
          </Typography>
          <Paper sx={{ 
            p: 2, 
            bgcolor: (theme) => theme.palette.mode === 'dark' ? 'grey.900' : 'grey.100',
            border: (theme) => theme.palette.mode === 'dark' ? '1px solid' : 'none',
            borderColor: 'grey.700',
            mt: 1 
          }}>
            <pre style={{ 
              margin: 0, 
              overflow: 'auto',
              color: 'inherit' 
            }}>
{`{
  "mcpServers": {
    "test-flow-suite": {
      "command": "docker",
      "args": [
        "run", "--rm", "-i",
        "-e", "TEST_FLOW_API_URL=${window.location.origin}",
        "-e", "TEST_FLOW_AUTH_TOKEN=${newTokenDialog.token}",
        "test-flow-mcp-server:local"
      ]
    }
  }
}`}
            </pre>
          </Paper>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewTokenDialog({ open: false })}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(null)}
      >
        <DialogTitle>Delete API Token?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this token? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(null)}>Cancel</Button>
          <Button
            onClick={() => deleteDialogOpen && deleteToken(deleteDialogOpen)}
            color="error"
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}