import React, { useEffect, useState } from 'react';
import { 
  Box, 
  Typography, 
  Fab,
  ToggleButton,
  ToggleButtonGroup,
  Alert,
  Snackbar,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import { useNavigate } from 'react-router-dom';
import { TestFlow, Project, Folder } from '../../../shared/src/types';
import { api } from '../services/api';
import EnvironmentSelector from '../components/EnvironmentSelector';
import FlowTree from '../components/FlowTree';
import Dashboard from './Dashboard';
import RunResultsDialog from '../components/RunResultsDialog';

export default function FlowsOrganizer() {
  const navigate = useNavigate();
  const [flows, setFlows] = useState<TestFlow[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [folders, setFolders] = useState<{ [projectId: string]: Folder[] }>({});
  const [selectedEnvironment, setSelectedEnvironment] = useState<string>('');
  const [viewMode, setViewMode] = useState<'tree' | 'grid'>('tree');
  const [runResultsOpen, setRunResultsOpen] = useState(false);
  const [currentRunId, setCurrentRunId] = useState<string | null>(null);
  const [currentFlowName, setCurrentFlowName] = useState<string>('');
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity?: 'success' | 'info' | 'warning' | 'error' }>({ open: false, message: '' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load flows
      const flowsData = await api.getFlows();
      setFlows(flowsData);

      // Load projects
      const projectsData = await api.getProjects();
      setProjects(projectsData);

      // Load folders for each project
      const foldersData: { [projectId: string]: Folder[] } = {};
      for (const project of projectsData) {
        const projectFolders = await api.getProjectFolders(project.id);
        foldersData[project.id] = projectFolders;
      }
      setFolders(foldersData);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const handleFlowMove = async (flowId: string, newProjectId?: string, newFolderId?: string) => {
    try {
      const flow = flows.find(f => f.id === flowId);
      if (!flow) return;

      // Don't do anything if the flow is already in the target location
      if (flow.projectId === newProjectId && flow.folderId === newFolderId) {
        return;
      }

      // Update the flow with new project/folder
      // Only send the fields that need to be updated
      await api.updateFlow(flowId, {
        projectId: newProjectId,
        folderId: newFolderId,
      });

      // Reload flows to reflect the change
      await loadData();
    } catch (error) {
      console.error('Failed to move flow:', error);
      alert('Failed to move flow. Please try again.');
    }
  };

  const handleDeleteFlow = async (flowId: string, flowName: string) => {
    if (window.confirm(`Are you sure you want to delete the flow "${flowName}"?`)) {
      try {
        await api.deleteFlow(flowId);
        loadData();
      } catch (error) {
        console.error('Failed to delete flow:', error);
      }
    }
  };

  const handleDuplicateFlow = async (flow: TestFlow) => {
    try {
      await api.createFlow({
        ...flow,
        id: undefined,
        name: `${flow.name} (Copy)`,
        createdAt: undefined,
        updatedAt: undefined,
      });
      loadData();
    } catch (error) {
      console.error('Failed to duplicate flow:', error);
    }
  };

  const handleRunFlow = async (flowId: string) => {
    try {
      const flow = flows.find(f => f.id === flowId);
      const flowName = flow?.name || 'Unknown Flow';
      const { runId } = await api.startRun(flowId, selectedEnvironment);
      setCurrentRunId(runId);
      setCurrentFlowName(flowName);
      setRunResultsOpen(true);
    } catch (error) {
      console.error('Failed to start run:', error);
    }
  };

  const handleBulkProjectRun = async (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    const projectName = project?.name || 'Unknown Project';
    
    if (!window.confirm(`Are you sure you want to run all flows in project "${projectName}"?`)) {
      return;
    }
    
    try {
      const result = await api.startBulkProjectRun(projectId, selectedEnvironment);
      
      const successCount = result.results.filter(r => r.runId).length;
      const failCount = result.results.filter(r => r.error).length;
      
      setSnackbar({
        open: true,
        message: `Started ${successCount} flow run(s) in project "${projectName}"${failCount > 0 ? `, ${failCount} failed` : ''}`,
        severity: failCount > 0 ? 'warning' : 'success'
      });
      
      // If any runs started successfully, show results for the first one
      const firstSuccess = result.results.find(r => r.runId);
      if (firstSuccess) {
        setCurrentRunId(firstSuccess.runId!);
        setCurrentFlowName(`${projectName} - Bulk Run`);
        setRunResultsOpen(true);
      }
      
    } catch (error) {
      console.error('Failed to start bulk project run:', error);
      setSnackbar({
        open: true,
        message: `Failed to start bulk run for project "${projectName}": ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error'
      });
    }
  };

  const handleBulkFolderRun = async (folderId: string) => {
    // Find the folder name across all projects
    let folderName = 'Unknown Folder';
    for (const projectId in folders) {
      const folder = folders[projectId].find(f => f.id === folderId);
      if (folder) {
        folderName = folder.name;
        break;
      }
    }
    
    if (!window.confirm(`Are you sure you want to run all flows in folder "${folderName}"?`)) {
      return;
    }
    
    try {
      const result = await api.startBulkFolderRun(folderId, selectedEnvironment);
      
      const successCount = result.results.filter(r => r.runId).length;
      const failCount = result.results.filter(r => r.error).length;
      
      setSnackbar({
        open: true,
        message: `Started ${successCount} flow run(s) in folder "${folderName}"${failCount > 0 ? `, ${failCount} failed` : ''}`,
        severity: failCount > 0 ? 'warning' : 'success'
      });
      
      // If any runs started successfully, show results for the first one
      const firstSuccess = result.results.find(r => r.runId);
      if (firstSuccess) {
        setCurrentRunId(firstSuccess.runId!);
        setCurrentFlowName(`${folderName} - Bulk Run`);
        setRunResultsOpen(true);
      }
      
    } catch (error) {
      console.error('Failed to start bulk folder run:', error);
      setSnackbar({
        open: true,
        message: `Failed to start bulk run for folder "${folderName}": ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error'
      });
    }
  };

  const handleViewModeChange = (_event: React.MouseEvent<HTMLElement>, newMode: 'tree' | 'grid' | null) => {
    if (newMode !== null) {
      setViewMode(newMode);
    }
  };

  if (viewMode === 'grid') {
    return <Dashboard />;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          Test Flows
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={handleViewModeChange}
            size="small"
          >
            <ToggleButton value="tree">
              <AccountTreeIcon sx={{ mr: 0.5 }} />
              Tree View
            </ToggleButton>
            <ToggleButton value="grid">
              <ViewModuleIcon sx={{ mr: 0.5 }} />
              Grid View
            </ToggleButton>
          </ToggleButtonGroup>
          <EnvironmentSelector 
            value={selectedEnvironment}
            onChange={setSelectedEnvironment}
          />
        </Box>
      </Box>
      
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Drag and drop flows between projects and folders to organize them
        </Typography>
      </Box>

      <FlowTree
        flows={flows}
        projects={projects}
        folders={folders}
        onFlowMove={handleFlowMove}
        onFlowDelete={handleDeleteFlow}
        onFlowDuplicate={handleDuplicateFlow}
        onFlowRun={handleRunFlow}
        onFolderCreateFlow={(folderId, projectId) => navigate(`/flows/new?folderId=${folderId}&projectId=${projectId}`)}
        onFolderRunAllFlows={handleBulkFolderRun}
        onFolderDuplicate={(folder) => console.log('Duplicate folder:', folder)}
        onFolderDelete={(folderId, folderName, projectId) => console.log('Delete folder:', folderId, folderName, projectId)}
        onFolderImport={(folderId, projectId) => console.log('Import to folder:', folderId, projectId)}
        onFolderExport={(folderId) => console.log('Export folder:', folderId)}
        onProjectCreateFlow={(projectId) => navigate(`/flows/new?projectId=${projectId}`)}
        onProjectCreateFolder={(projectId) => console.log('Create folder in project:', projectId)}
        onProjectRunAllFlows={handleBulkProjectRun}
        onProjectDuplicate={(project) => console.log('Duplicate project:', project)}
        onProjectDelete={(projectId, projectName) => console.log('Delete project:', projectId, projectName)}
        onProjectImport={(projectId) => console.log('Import to project:', projectId)}
        onProjectExport={(projectId) => console.log('Export project:', projectId)}
      />

      <Fab
        aria-label="add"
        className="animate-scaleIn gradient-primary"
        sx={{ 
          position: 'fixed', 
          bottom: 16, 
          right: 16,
          transition: 'all 0.3s ease',
          color: 'white',
          border: '2px solid rgba(255,255,255,0.3)',
          '&:hover': {
            transform: 'scale(1.1) rotate(90deg)',
            boxShadow: '0 8px 32px rgba(102, 126, 234, 0.4)',
          }
        }}
        onClick={() => navigate('/flows/new')}
      >
        <AddIcon />
      </Fab>

      <RunResultsDialog
        open={runResultsOpen}
        onClose={() => {
          setRunResultsOpen(false);
          setCurrentRunId(null);
          setCurrentFlowName('');
        }}
        runId={currentRunId}
        flowName={currentFlowName}
      />

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
    </Box>
  );
}