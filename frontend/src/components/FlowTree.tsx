import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Collapse,
  Paper,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ChevronRight as ChevronRightIcon,
  Folder as FolderIcon,
  Description as FlowIcon,
  MoreVert as MoreVertIcon,
  PlayArrow as PlayArrowIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ContentCopy as ContentCopyIcon,
} from '@mui/icons-material';
import { TestFlow, Project, Folder } from '../../../shared/src/types';
import { useNavigate } from 'react-router-dom';

interface FlowTreeProps {
  flows: TestFlow[];
  projects: Project[];
  folders: { [projectId: string]: Folder[] };
  onFlowMove: (flowId: string, newProjectId?: string, newFolderId?: string) => void;
  onFlowDelete: (flowId: string, flowName: string) => void;
  onFlowDuplicate: (flow: TestFlow) => void;
  onFlowRun: (flowId: string) => void;
}

interface DragItem {
  type: 'flow';
  flowId: string;
  sourceProjectId?: string;
  sourceFolderId?: string;
}

export default function FlowTree({
  flows,
  projects,
  folders,
  onFlowMove,
  onFlowDelete,
  onFlowDuplicate,
  onFlowRun,
}: FlowTreeProps) {
  const navigate = useNavigate();
  const [expandedProjects, setExpandedProjects] = useState<{ [projectId: string]: boolean }>({});
  const [expandedFolders, setExpandedFolders] = useState<{ [folderId: string]: boolean }>({});
  const [anchorEl, setAnchorEl] = useState<{ [flowId: string]: HTMLElement | null }>({});
  const [draggedItem, setDraggedItem] = useState<DragItem | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<{ type: 'project' | 'folder' | null; id?: string }>({ type: null });

  useEffect(() => {
    // Expand all projects by default
    const expanded: { [projectId: string]: boolean } = {};
    projects.forEach(project => {
      expanded[project.id] = true;
    });
    setExpandedProjects(expanded);
  }, [projects]);

  const handleToggleProject = (projectId: string) => {
    setExpandedProjects(prev => ({
      ...prev,
      [projectId]: !prev[projectId],
    }));
  };

  const handleToggleFolder = (folderId: string) => {
    setExpandedFolders(prev => ({
      ...prev,
      [folderId]: !prev[folderId],
    }));
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLButtonElement>, flowId: string) => {
    setAnchorEl(prev => ({ ...prev, [flowId]: event.currentTarget }));
  };

  const handleMenuClose = (flowId: string) => {
    setAnchorEl(prev => ({ ...prev, [flowId]: null }));
  };

  const handleDragStart = (e: React.DragEvent, flow: TestFlow) => {
    const dragItem: DragItem = {
      type: 'flow',
      flowId: flow.id,
      sourceProjectId: flow.projectId,
      sourceFolderId: flow.folderId,
    };
    setDraggedItem(dragItem);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', JSON.stringify(dragItem));
    
    // Add visual feedback
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5';
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    // Reset visual feedback
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
    }
    setDraggedItem(null);
    setDragOverTarget({ type: null });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (e: React.DragEvent, type: 'project' | 'folder', id: string) => {
    e.preventDefault();
    setDragOverTarget({ type, id });
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only reset if we're leaving the actual drop target
    if (e.currentTarget === e.target) {
      setDragOverTarget({ type: null });
    }
  };

  const handleDrop = (e: React.DragEvent, targetType: 'project' | 'folder', targetId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverTarget({ type: null });

    if (!draggedItem) {
      // Try to get drag data from dataTransfer if draggedItem is not set
      try {
        const data = e.dataTransfer.getData('text/plain');
        if (data) {
          const parsedData = JSON.parse(data) as DragItem;
          if (parsedData.type === 'flow') {
            if (targetType === 'project') {
              onFlowMove(parsedData.flowId, targetId, undefined);
            } else if (targetType === 'folder') {
              const folder = Object.values(folders).flat().find(f => f.id === targetId);
              if (folder) {
                onFlowMove(parsedData.flowId, folder.projectId, targetId);
              }
            }
          }
        }
      } catch (error) {
        console.error('Failed to parse drag data:', error);
      }
      return;
    }

    if (targetType === 'project') {
      onFlowMove(draggedItem.flowId, targetId, undefined);
    } else if (targetType === 'folder') {
      const folder = Object.values(folders).flat().find(f => f.id === targetId);
      if (folder) {
        onFlowMove(draggedItem.flowId, folder.projectId, targetId);
      }
    }

    setDraggedItem(null);
  };

  const getFlowsForProject = (projectId: string) => {
    return flows.filter(flow => flow.projectId === projectId && !flow.folderId);
  };

  const getFlowsForFolder = (folderId: string) => {
    return flows.filter(flow => flow.folderId === folderId);
  };

  const getUnassignedFlows = () => {
    return flows.filter(flow => !flow.projectId);
  };

  const renderFlow = (flow: TestFlow) => (
    <Box
      key={flow.id}
      draggable
      onDragStart={(e) => handleDragStart(e, flow)}
      onDragEnd={handleDragEnd}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        p: 1,
        pl: 4,
        cursor: 'move',
        '&:hover': {
          backgroundColor: 'action.hover',
        },
      }}
    >
      <FlowIcon fontSize="small" color="action" />
      <Typography variant="body2" sx={{ flex: 1 }}>
        {flow.name}
      </Typography>
      <IconButton
        size="small"
        onClick={() => navigate(`/flows/${flow.id}`)}
        sx={{ opacity: 0.7, '&:hover': { opacity: 1 } }}
      >
        <EditIcon fontSize="small" />
      </IconButton>
      <IconButton
        size="small"
        onClick={() => onFlowRun(flow.id)}
        sx={{ opacity: 0.7, '&:hover': { opacity: 1 } }}
      >
        <PlayArrowIcon fontSize="small" />
      </IconButton>
      <IconButton
        size="small"
        onClick={(e) => handleMenuOpen(e, flow.id)}
        sx={{ opacity: 0.7, '&:hover': { opacity: 1 } }}
      >
        <MoreVertIcon fontSize="small" />
      </IconButton>
      <Menu
        anchorEl={anchorEl[flow.id]}
        open={Boolean(anchorEl[flow.id])}
        onClose={() => handleMenuClose(flow.id)}
      >
        <MenuItem onClick={() => {
          onFlowDuplicate(flow);
          handleMenuClose(flow.id);
        }}>
          <ContentCopyIcon fontSize="small" sx={{ mr: 1 }} />
          Duplicate
        </MenuItem>
        <MenuItem onClick={() => {
          onFlowDelete(flow.id, flow.name);
          handleMenuClose(flow.id);
        }}>
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>
    </Box>
  );

  const renderFolder = (folder: Folder) => {
    const folderFlows = getFlowsForFolder(folder.id);
    const isExpanded = expandedFolders[folder.id];
    const isDragOver = dragOverTarget.type === 'folder' && dragOverTarget.id === folder.id;

    return (
      <Box key={folder.id}>
        <Box
          onDragOver={handleDragOver}
          onDragEnter={(e) => handleDragEnter(e, 'folder', folder.id)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, 'folder', folder.id)}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            p: 1,
            pl: 2,
            cursor: 'pointer',
            backgroundColor: isDragOver ? 'action.selected' : 'transparent',
            '&:hover': {
              backgroundColor: 'action.hover',
            },
          }}
          onClick={() => handleToggleFolder(folder.id)}
        >
          <IconButton size="small" sx={{ p: 0.5 }}>
            {isExpanded ? <ExpandMoreIcon /> : <ChevronRightIcon />}
          </IconButton>
          <FolderIcon fontSize="small" sx={{ color: '#ffa726' }} />
          <Typography variant="body2" sx={{ flex: 1 }}>
            {folder.name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {folderFlows.length} flows
          </Typography>
        </Box>
        <Collapse in={isExpanded}>
          <Box sx={{ pl: 2 }}>
            {folderFlows.map(renderFlow)}
          </Box>
        </Collapse>
      </Box>
    );
  };

  const renderProject = (project: Project) => {
    const projectFlows = getFlowsForProject(project.id);
    const projectFolders = folders[project.id] || [];
    const isExpanded = expandedProjects[project.id];
    const isDragOver = dragOverTarget.type === 'project' && dragOverTarget.id === project.id;

    return (
      <Box key={project.id} sx={{ mb: 2 }}>
        <Paper
          elevation={1}
          onDragOver={handleDragOver}
          onDragEnter={(e) => handleDragEnter(e, 'project', project.id)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, 'project', project.id)}
          sx={{
            backgroundColor: isDragOver ? 'action.selected' : 'background.paper',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              p: 1.5,
              cursor: 'pointer',
              '&:hover': {
                backgroundColor: 'action.hover',
              },
            }}
            onClick={() => handleToggleProject(project.id)}
          >
            <IconButton size="small" sx={{ p: 0.5 }}>
              {isExpanded ? <ExpandMoreIcon /> : <ChevronRightIcon />}
            </IconButton>
            <Typography variant="subtitle1" sx={{ flex: 1, fontWeight: 500 }}>
              {project.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {projectFlows.length + projectFolders.reduce((acc, folder) => 
                acc + getFlowsForFolder(folder.id).length, 0
              )} flows
            </Typography>
          </Box>
          <Collapse in={isExpanded}>
            <Box sx={{ pb: 1 }}>
              {projectFolders.map(folder => renderFolder(folder))}
              {projectFlows.map(renderFlow)}
            </Box>
          </Collapse>
        </Paper>
      </Box>
    );
  };

  const unassignedFlows = getUnassignedFlows();

  return (
    <Box>
      {projects.map(renderProject)}
      
      {unassignedFlows.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Paper elevation={1}>
            <Box sx={{ p: 1.5 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 500, mb: 1 }}>
                Unassigned Flows
              </Typography>
              {unassignedFlows.map(renderFlow)}
            </Box>
          </Paper>
        </Box>
      )}
    </Box>
  );
}