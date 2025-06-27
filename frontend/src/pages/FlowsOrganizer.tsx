import React, { useEffect, useState } from 'react';
import { 
  Box, 
  Typography, 
  Fab,
  ToggleButton,
  ToggleButtonGroup,
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
        onFolderRunAllFlows={(folderId) => console.log('Run all flows in folder:', folderId)}
        onFolderDuplicate={(folder) => console.log('Duplicate folder:', folder)}
        onFolderDelete={(folderId, folderName, projectId) => console.log('Delete folder:', folderId, folderName, projectId)}
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
    </Box>
  );
}