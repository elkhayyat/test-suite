import React, { useContext, useState, useEffect } from 'react';
import { AppBar, Toolbar, Typography, Drawer, Box, IconButton, Tabs, Tab } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SettingsIcon from '@mui/icons-material/Settings';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import BusinessIcon from '@mui/icons-material/Business';
import { styled, useTheme } from '@mui/material/styles';
import { ColorModeContext } from '../App';
import FlowTree from './FlowTree';
import EnvironmentSelector from './EnvironmentSelector';
import { useEnvironment } from '../contexts/EnvironmentContext';
import { TestFlow, Project, Folder } from '../../../shared/src/types';
import { api } from '../services/api';

const drawerWidth = 240;

const Main = styled('main', { shouldForwardProp: (prop) => prop !== 'open' })<{
  open?: boolean;
}>(({ theme }) => ({
  flexGrow: 1,
  padding: theme.spacing(3),
  transition: theme.transitions.create('margin', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  marginLeft: 0,
}));

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const colorMode = useContext(ColorModeContext);
  const { selectedEnvironment, setSelectedEnvironment } = useEnvironment();
  const [flows, setFlows] = useState<TestFlow[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [folders, setFolders] = useState<{ [projectId: string]: Folder[] }>({});

  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
    { text: 'Projects', icon: <AccountTreeIcon />, path: '/projects' },
    { text: 'Test Runs', icon: <PlayArrowIcon />, path: '/runs' },
    { text: 'Environments', icon: <SettingsIcon />, path: '/environments' },
    { text: 'Organizations', icon: <BusinessIcon />, path: '/organizations' },
  ];

  // Load data for the explorer
  const loadData = async () => {
    try {
      const [flowsData, projectsData] = await Promise.all([
        api.getFlows(),
        api.getProjects()
      ]);
      setFlows(flowsData || []);
      setProjects(projectsData || []);
      
      // Load folders for all projects in parallel
      const folderPromises = (projectsData || []).map(async (project) => {
        try {
          const projectFolders = await api.getProjectFolders(project.id);
          return { projectId: project.id, folders: projectFolders || [] };
        } catch (error) {
          console.error(`Failed to load folders for project ${project.id}:`, error);
          return { projectId: project.id, folders: [] };
        }
      });
      
      const folderResults = await Promise.all(folderPromises);
      const foldersMap = folderResults.reduce((acc, { projectId, folders }) => {
        acc[projectId] = folders;
        return acc;
      }, {} as { [projectId: string]: Folder[] });
      
      setFolders(foldersMap);
    } catch (error) {
      console.error('Failed to load data for explorer:', error);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Refresh data when navigating to key pages or flow pages
  useEffect(() => {
    if (location.pathname === '/' || location.pathname === '/projects') {
      loadData();
    }
  }, [location.pathname]);

  // Listen for custom refresh events
  useEffect(() => {
    const handleRefreshExplorer = () => {
      console.log('Refreshing explorer data due to custom event');
      loadData();
    };
    
    window.addEventListener('refreshExplorer', handleRefreshExplorer);
    
    return () => {
      window.removeEventListener('refreshExplorer', handleRefreshExplorer);
    };
  }, []);
  
  // Initial refresh when entering flow pages
  useEffect(() => {
    if (location.pathname.startsWith('/flows/')) {
      console.log('Initial refresh for flow page:', location.pathname);
      loadData();
    }
  }, [location.pathname]);

  const handleFlowMove = async (flowId: string, newProjectId?: string, newFolderId?: string) => {
    try {
      await api.updateFlow(flowId, { projectId: newProjectId, folderId: newFolderId });
      // Reload flows to reflect changes
      const flowsData = await api.getFlows();
      setFlows(flowsData || []);
    } catch (error) {
      console.error('Failed to move flow:', error);
    }
  };

  const handleFlowDelete = async (flowId: string, flowName: string) => {
    if (window.confirm(`Are you sure you want to delete the flow "${flowName}"?`)) {
      try {
        await api.deleteFlow(flowId);
        setFlows(prev => prev.filter(f => f.id !== flowId));
      } catch (error) {
        console.error('Failed to delete flow:', error);
      }
    }
  };

  const handleFlowDuplicate = async (flow: TestFlow) => {
    try {
      const duplicatedFlow = { ...flow, name: `${flow.name} (Copy)`, id: '' };
      await api.createFlow(duplicatedFlow);
      // Reload flows to reflect changes
      const flowsData = await api.getFlows();
      setFlows(flowsData || []);
    } catch (error) {
      console.error('Failed to duplicate flow:', error);
    }
  };

  const handleFlowRun = async (flowId: string) => {
    try {
      const { runId } = await api.startRun(flowId, selectedEnvironment);
      // Navigate to the run details page to show real-time results
      navigate(`/runs/${runId}`);
    } catch (error) {
      console.error('Failed to start run:', error);
    }
  };

  const handleFolderCreateFlow = (folderId: string, projectId: string) => {
    console.log('handleFolderCreateFlow called:', { folderId, projectId });
    // Navigate to flow editor in create mode with folder and project context
    const url = `/flows/new?folderId=${folderId}&projectId=${projectId}`;
    console.log('Navigating to:', url);
    navigate(url);
  };

  const handleFolderRunAllFlows = async (folderId: string) => {
    try {
      const folderFlows = flows.filter(flow => flow.folderId === folderId);
      
      if (folderFlows.length === 0) {
        alert('No flows in this folder to run');
        return;
      }

      // Run all flows in the folder sequentially
      let successCount = 0;
      for (const flow of folderFlows) {
        try {
          const { runId } = await api.startRun(flow.id, selectedEnvironment);
          console.log(`Started flow ${flow.name} with run ID: ${runId}`);
          successCount++;
        } catch (error) {
          console.error(`Failed to start flow ${flow.name}:`, error);
        }
      }
      
      alert(`Started ${successCount} out of ${folderFlows.length} flows from the folder`);
      navigate('/runs');
    } catch (error) {
      console.error('Failed to run folder flows:', error);
    }
  };

  const handleFolderDuplicate = async (folder: any) => {
    try {
      // Find the project this folder belongs to
      const projectEntry = Object.entries(folders).find(([_, folderList]) => 
        folderList.some((f: any) => f.id === folder.id)
      );
      
      if (!projectEntry) {
        console.error('Could not find project for folder');
        return;
      }
      
      const projectId = projectEntry[0];
      
      // Create a duplicate folder
      const duplicatedFolder = {
        ...folder,
        name: `${folder.name} (Copy)`,
        id: undefined // Let the backend generate a new ID
      };
      
      await api.createFolder(projectId, duplicatedFolder);
      
      // Reload folders to reflect changes
      const updatedFolders: { [projectId: string]: any[] } = {};
      for (const project of projects) {
        try {
          const projectFolders = await api.getProjectFolders(project.id);
          updatedFolders[project.id] = projectFolders || [];
        } catch (error) {
          console.error(`Failed to load folders for project ${project.id}:`, error);
          updatedFolders[project.id] = [];
        }
      }
      setFolders(updatedFolders);
    } catch (error) {
      console.error('Failed to duplicate folder:', error);
    }
  };

  const handleFolderDelete = async (folderId: string, folderName: string, projectId: string) => {
    if (window.confirm(`Are you sure you want to delete the folder "${folderName}"? This will also delete all flows in this folder.`)) {
      try {
        await api.deleteFolder(projectId, folderId);
        
        // Remove flows that were in this folder
        setFlows(prev => prev.filter(f => f.folderId !== folderId));
        
        // Reload folders to reflect changes
        const updatedFolders: { [projectId: string]: any[] } = {};
        for (const project of projects) {
          try {
            const projectFolders = await api.getProjectFolders(project.id);
            updatedFolders[project.id] = projectFolders || [];
          } catch (error) {
            console.error(`Failed to load folders for project ${project.id}:`, error);
            updatedFolders[project.id] = [];
          }
        }
        setFolders(updatedFolders);
      } catch (error) {
        console.error('Failed to delete folder:', error);
      }
    }
  };

  const handleFolderImport = (folderId: string, projectId: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.multiple = true;
    input.onchange = async (event) => {
      const files = (event.target as HTMLInputElement).files;
      if (!files) return;

      for (const file of Array.from(files)) {
        try {
          const text = await file.text();
          const flowData = JSON.parse(text);
          
          // Create flow in the folder
          const flow = {
            ...flowData,
            id: '', // Let backend generate new ID
            projectId,
            folderId,
            name: flowData.name || file.name.replace('.json', '')
          };
          
          await api.createFlow(flow);
        } catch (error) {
          console.error(`Failed to import ${file.name}:`, error);
          alert(`Failed to import ${file.name}: ${error}`);
        }
      }
      
      // Reload flows
      try {
        const flowsData = await api.getFlows();
        setFlows(flowsData || []);
        alert(`Imported ${files.length} flows into folder`);
      } catch (error) {
        console.error('Failed to reload flows:', error);
      }
    };
    input.click();
  };

  const handleFolderExport = async (folderId: string) => {
    try {
      const folderFlows = flows.filter(flow => flow.folderId === folderId);
      
      if (folderFlows.length === 0) {
        alert('No flows in this folder to export');
        return;
      }

      // Export each flow as a separate file
      for (const flow of folderFlows) {
        const flowData = JSON.stringify(flow, null, 2);
        const blob = new Blob([flowData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${flow.name}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
      
      alert(`Exported ${folderFlows.length} flows from folder`);
    } catch (error) {
      console.error('Failed to export folder:', error);
    }
  };

  const handleProjectCreateFlow = (projectId: string) => {
    console.log('handleProjectCreateFlow called:', { projectId });
    // Navigate to flow editor in create mode with project context
    const url = `/flows/new?projectId=${projectId}`;
    console.log('Navigating to:', url);
    navigate(url);
  };

  const handleProjectCreateFolder = async (projectId: string) => {
    const folderName = prompt('Enter folder name:');
    if (!folderName) return;

    try {
      await api.createFolder(projectId, { name: folderName });
      
      // Reload folders
      const projectFolders = await api.getProjectFolders(projectId);
      setFolders(prev => ({ ...prev, [projectId]: projectFolders || [] }));
      
      alert(`Folder "${folderName}" created successfully`);
    } catch (error) {
      console.error('Failed to create folder:', error);
      alert('Failed to create folder');
    }
  };

  const handleProjectRunAllFlows = async (projectId: string) => {
    try {
      const projectFlows = flows.filter(flow => flow.projectId === projectId);
      
      if (projectFlows.length === 0) {
        alert('No flows in this project to run');
        return;
      }

      // Run all flows in the project sequentially
      let successCount = 0;
      for (const flow of projectFlows) {
        try {
          const { runId } = await api.startRun(flow.id, selectedEnvironment);
          console.log(`Started flow ${flow.name} with run ID: ${runId}`);
          successCount++;
        } catch (error) {
          console.error(`Failed to start flow ${flow.name}:`, error);
        }
      }
      
      alert(`Started ${successCount} out of ${projectFlows.length} flows from the project`);
      
      // Navigate to test runs page
      navigate('/runs');
    } catch (error) {
      console.error('Failed to run project flows:', error);
    }
  };

  const handleProjectDuplicate = async (project: Project) => {
    try {
      const duplicatedProject = {
        ...project,
        name: `${project.name} (Copy)`,
        id: '' // Let backend generate new ID
      };
      
      await api.createProject(duplicatedProject);
      
      // Reload projects
      const projectsData = await api.getProjects();
      setProjects(projectsData || []);
      
      alert(`Project "${duplicatedProject.name}" created successfully`);
    } catch (error) {
      console.error('Failed to duplicate project:', error);
      alert('Failed to duplicate project');
    }
  };

  const handleProjectDelete = async (projectId: string, projectName: string) => {
    if (window.confirm(`Are you sure you want to delete the project "${projectName}"? This will also delete all folders and flows in this project.`)) {
      try {
        await api.deleteProject(projectId);
        
        // Remove project flows and folders
        setFlows(prev => prev.filter(f => f.projectId !== projectId));
        setFolders(prev => {
          const updated = { ...prev };
          delete updated[projectId];
          return updated;
        });
        setProjects(prev => prev.filter(p => p.id !== projectId));
        
        alert(`Project "${projectName}" deleted successfully`);
      } catch (error) {
        console.error('Failed to delete project:', error);
        alert('Failed to delete project');
      }
    }
  };

  const handleProjectImport = (projectId: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.multiple = true;
    input.onchange = async (event) => {
      const files = (event.target as HTMLInputElement).files;
      if (!files) return;

      let importedCount = 0;
      for (const file of Array.from(files)) {
        try {
          const text = await file.text();
          const data = JSON.parse(text);
          
          // Determine if it's a single flow or project export
          if (data.steps && Array.isArray(data.steps)) {
            // Single flow
            const flow = {
              ...data,
              id: '', // Let backend generate new ID
              projectId,
              folderId: undefined,
              name: data.name || file.name.replace('.json', '')
            };
            await api.createFlow(flow);
            importedCount++;
          } else if (data.flows && Array.isArray(data.flows)) {
            // Project export with flows and folders
            // Import folders first
            if (data.folders) {
              for (const folder of data.folders) {
                try {
                  await api.createFolder(projectId, {
                    ...folder,
                    id: undefined // Let backend generate new ID
                  });
                } catch (error) {
                  console.error(`Failed to import folder ${folder.name}:`, error);
                }
              }
            }
            
            // Import flows
            for (const flow of data.flows) {
              try {
                await api.createFlow({
                  ...flow,
                  id: '', // Let backend generate new ID
                  projectId
                });
                importedCount++;
              } catch (error) {
                console.error(`Failed to import flow ${flow.name}:`, error);
              }
            }
          }
        } catch (error) {
          console.error(`Failed to import ${file.name}:`, error);
          alert(`Failed to import ${file.name}: ${error}`);
        }
      }
      
      // Reload data
      try {
        const [flowsData, projectFolders] = await Promise.all([
          api.getFlows(),
          api.getProjectFolders(projectId)
        ]);
        setFlows(flowsData || []);
        setFolders(prev => ({ ...prev, [projectId]: projectFolders || [] }));
        alert(`Imported ${importedCount} flows into project`);
      } catch (error) {
        console.error('Failed to reload data:', error);
      }
    };
    input.click();
  };

  const handleProjectExport = async (projectId: string) => {
    try {
      const projectFlows = flows.filter(flow => flow.projectId === projectId);
      const projectFolders = folders[projectId] || [];
      const project = projects.find(p => p.id === projectId);
      
      if (projectFlows.length === 0) {
        alert('No flows in this project to export');
        return;
      }

      // Export project as a complete package
      const exportData = {
        project: {
          name: project?.name || 'Unknown Project',
          description: project?.description || ''
        },
        folders: projectFolders,
        flows: projectFlows,
        exportedAt: new Date().toISOString()
      };
      
      const dataStr = JSON.stringify(exportData, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project?.name || 'project'}-export.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      alert(`Exported project with ${projectFlows.length} flows and ${projectFolders.length} folders`);
    } catch (error) {
      console.error('Failed to export project:', error);
      alert('Failed to export project');
    }
  };

  // Get current tab value based on location
  const getCurrentTab = () => {
    const currentItem = menuItems.find(item => item.path === location.pathname);
    return currentItem ? menuItems.indexOf(currentItem) : 0;
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar 
        position="fixed" 
        className={theme.palette.mode === 'dark' ? 'gradient-dark' : ''}
        sx={{ 
          zIndex: (theme) => theme.zIndex.drawer + 1,
          background: theme.palette.mode === 'light' 
            ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
            : undefined,
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        }}
      >
        <Toolbar>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AccountTreeIcon sx={{ 
              fontSize: 28,
              color: 'white',
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
              animation: 'pulse 3s ease-in-out infinite'
            }} />
            <Typography variant="h6" noWrap component="div" sx={{ mr: 3 }}>
              Test Flow Suite
            </Typography>
          </Box>
          
          {/* Navigation Tabs in Header */}
          <Box sx={{ flexGrow: 1 }}>
            <Tabs 
              value={getCurrentTab()} 
              onChange={(_, newValue) => navigate(menuItems[newValue].path)}
              textColor="inherit"
              TabIndicatorProps={{
                style: {
                  backgroundColor: 'white',
                }
              }}
              sx={{
                '& .MuiTab-root': {
                  color: 'rgba(255, 255, 255, 0.8)',
                  minHeight: 48,
                  '&:hover': {
                    color: 'white',
                  },
                  '&.Mui-selected': {
                    color: 'white',
                  },
                },
              }}
            >
              {menuItems.map((item) => (
                <Tab 
                  key={item.text}
                  label={item.text} 
                  icon={item.icon}
                  iconPosition="start"
                  sx={{ 
                    textTransform: 'none',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                  }}
                />
              ))}
            </Tabs>
          </Box>
          
          {/* Global Environment Selector */}
          <Box sx={{ mx: 2 }}>
            <EnvironmentSelector 
              value={selectedEnvironment}
              onChange={setSelectedEnvironment}
              size="small"
            />
          </Box>
          
          <IconButton sx={{ ml: 1 }} onClick={colorMode.toggleColorMode} color="inherit">
            {theme.palette.mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
          </IconButton>
        </Toolbar>
      </AppBar>
      
      {/* Sidebar with Project Explorer */}
      <Drawer
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            overflowX: 'hidden',
          },
        }}
        variant="permanent"
        anchor="left"
      >
        <Toolbar />
        <Box 
          sx={{ 
            overflowX: 'hidden', 
            overflowY: 'auto',
            p: 1,
            height: '100%'
          }}
        >
          <Typography variant="h6" sx={{ px: 1, py: 2, fontWeight: 600 }}>
            Explorer
          </Typography>
          <FlowTree
            flows={flows}
            projects={projects}
            folders={folders}
            onFlowMove={handleFlowMove}
            onFlowDelete={handleFlowDelete}
            onFlowDuplicate={handleFlowDuplicate}
            onFlowRun={handleFlowRun}
            onFolderCreateFlow={handleFolderCreateFlow}
            onFolderRunAllFlows={handleFolderRunAllFlows}
            onFolderDuplicate={handleFolderDuplicate}
            onFolderDelete={handleFolderDelete}
            onFolderImport={handleFolderImport}
            onFolderExport={handleFolderExport}
            onProjectCreateFlow={handleProjectCreateFlow}
            onProjectCreateFolder={handleProjectCreateFolder}
            onProjectRunAllFlows={handleProjectRunAllFlows}
            onProjectDuplicate={handleProjectDuplicate}
            onProjectDelete={handleProjectDelete}
            onProjectImport={handleProjectImport}
            onProjectExport={handleProjectExport}
          />
        </Box>
      </Drawer>
      
      <Main>
        <Toolbar />
        {children}
      </Main>
    </Box>
  );
}