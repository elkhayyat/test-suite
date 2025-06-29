import { Box, Paper, Button, TextField, Switch, FormControlLabel, Typography, CircularProgress } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import DownloadIcon from '@mui/icons-material/Download';
import UploadIcon from '@mui/icons-material/Upload';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CloudDoneIcon from '@mui/icons-material/CloudDone';
import CloudQueueIcon from '@mui/icons-material/CloudQueue';
import CloudOffIcon from '@mui/icons-material/CloudOff';
import ApiIcon from '@mui/icons-material/Api';

interface FlowToolbarProps {
  flowName: string;
  flowDescription: string;
  onFlowNameChange: (name: string) => void;
  onFlowDescriptionChange: (description: string) => void;
  autoSaveEnabled: boolean;
  saveStatus: 'saved' | 'saving' | 'unsaved';
  lastSaved: Date | null;
  onToggleAutoSave: () => void;
  onSave: () => void;
  onExport: () => void;
  onImport: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onOpenAPIImport: () => void;
  onRunFlow: () => void;
  canRunFlow: boolean;
  isSaving?: boolean;
  isRunning?: boolean;
}

export default function FlowToolbar({
  flowName,
  flowDescription,
  onFlowNameChange,
  onFlowDescriptionChange,
  autoSaveEnabled,
  saveStatus,
  lastSaved,
  onToggleAutoSave,
  onSave,
  onExport,
  onImport,
  onOpenAPIImport,
  onRunFlow,
  canRunFlow,
  isSaving = false,
  isRunning = false,
}: FlowToolbarProps) {
  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
        <TextField
          label="Flow Name"
          value={flowName}
          onChange={(e) => onFlowNameChange(e.target.value)}
          size="small"
        />
        <TextField
          label="Description"
          value={flowDescription}
          onChange={(e) => onFlowDescriptionChange(e.target.value)}
          size="small"
          sx={{ flex: 1 }}
        />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FormControlLabel
            control={
              <Switch
                checked={autoSaveEnabled}
                onChange={onToggleAutoSave}
                size="small"
              />
            }
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography variant="body2">Auto-save</Typography>
                {autoSaveEnabled && (
                  <>
                    {saveStatus === 'saved' && <CloudDoneIcon sx={{ fontSize: 16, color: 'success.main' }} />}
                    {saveStatus === 'saving' && <CircularProgress size={14} thickness={2} />}
                    {saveStatus === 'unsaved' && <CloudQueueIcon sx={{ fontSize: 16, color: 'warning.main' }} />}
                  </>
                )}
                {!autoSaveEnabled && <CloudOffIcon sx={{ fontSize: 16, color: 'text.disabled' }} />}
              </Box>
            }
          />
          {lastSaved && autoSaveEnabled && saveStatus === 'saved' && (
            <Typography variant="caption" color="text.secondary">
              {new Date(lastSaved).toLocaleTimeString()}
            </Typography>
          )}
        </Box>
        <Button
          variant="contained"
          className="gradient-success"
          startIcon={isSaving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
          onClick={onSave}
          disabled={isSaving}
          sx={{ 
            color: 'white',
            boxShadow: '0 4px 20px rgba(132, 250, 176, 0.3)',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: '0 8px 32px rgba(132, 250, 176, 0.4)',
            }
          }}
        >
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
        <Button
          variant="contained"
          className="gradient-info"
          startIcon={<DownloadIcon />}
          onClick={onExport}
          sx={{ 
            color: 'white',
            boxShadow: '0 4px 20px rgba(79, 172, 254, 0.3)',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: '0 8px 32px rgba(79, 172, 254, 0.4)',
            }
          }}
        >
          Export
        </Button>
        <input
          type="file"
          id="import-flow"
          accept=".json"
          style={{ display: 'none' }}
          onChange={onImport}
        />
        <label htmlFor="import-flow">
          <Button
            variant="outlined"
            startIcon={<UploadIcon />}
            component="span"
          >
            Import
          </Button>
        </label>
        <Button
          variant="outlined"
          startIcon={<ApiIcon />}
          onClick={onOpenAPIImport}
          sx={{
            borderColor: '#9c27b0',
            color: '#9c27b0',
            '&:hover': {
              borderColor: '#7b1fa2',
              backgroundColor: 'rgba(156, 39, 176, 0.08)',
            }
          }}
        >
          Import OpenAPI
        </Button>
        <Box sx={{ borderLeft: 1, borderColor: 'divider', pl: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
          <Button
            variant="contained"
            className="gradient-primary"
            startIcon={isRunning ? <CircularProgress size={16} color="inherit" /> : <PlayArrowIcon />}
            onClick={onRunFlow}
            disabled={!canRunFlow || isRunning}
            sx={{ 
              color: 'white',
              boxShadow: '0 4px 20px rgba(102, 126, 234, 0.3)',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 8px 32px rgba(102, 126, 234, 0.4)',
              }
            }}
          >
            {isRunning ? 'Starting...' : 'Run Flow'}
          </Button>
        </Box>
      </Box>
    </Paper>
  );
}