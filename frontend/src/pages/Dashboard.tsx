import { useEffect, useState } from 'react';
import { 
  Grid, 
  Card, 
  CardContent, 
  CardActions, 
  Typography, 
  Button, 
  Box,
  Fab,
  CircularProgress
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import FolderIcon from '@mui/icons-material/Folder';
import DescriptionIcon from '@mui/icons-material/Description';
import LayersIcon from '@mui/icons-material/Layers';
import DeleteIcon from '@mui/icons-material/Delete';
import { useNavigate } from 'react-router-dom';
import { TestFlow } from '../../../shared/src/types';
import { api } from '../services/api';
import EnvironmentSelector from '../components/EnvironmentSelector';
import RunResultsDialog from '../components/RunResultsDialog';
import LoadingOverlay from '../components/LoadingOverlay';

export default function Dashboard() {
  const navigate = useNavigate();
  const [flows, setFlows] = useState<TestFlow[]>([]);
  const [selectedEnvironment, setSelectedEnvironment] = useState<string>('');
  const [runResultsOpen, setRunResultsOpen] = useState(false);
  const [currentRunId, setCurrentRunId] = useState<string | null>(null);
  const [currentFlowName, setCurrentFlowName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [runningFlows, setRunningFlows] = useState<Set<string>>(new Set());
  const [deletingFlows, setDeletingFlows] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadFlows();
  }, []);

  const loadFlows = async () => {
    try {
      setLoading(true);
      const data = await api.getFlows();
      setFlows(data);
    } catch (error) {
      console.error('Failed to load flows:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRunFlow = async (flowId: string, flowName: string) => {
    try {
      setRunningFlows(prev => new Set(prev).add(flowId));
      const { runId } = await api.startRun(flowId, selectedEnvironment);
      setCurrentRunId(runId);
      setCurrentFlowName(flowName);
      setRunResultsOpen(true);
    } catch (error) {
      console.error('Failed to start run:', error);
    } finally {
      setRunningFlows(prev => {
        const newSet = new Set(prev);
        newSet.delete(flowId);
        return newSet;
      });
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
      loadFlows(); // Reload flows to show the duplicate
    } catch (error) {
      console.error('Failed to duplicate flow:', error);
    }
  };

  const handleDeleteFlow = async (flowId: string, flowName: string) => {
    if (window.confirm(`Are you sure you want to delete the flow "${flowName}"?`)) {
      try {
        setDeletingFlows(prev => new Set(prev).add(flowId));
        await api.deleteFlow(flowId);
        loadFlows(); // Reload flows after deletion
      } catch (error) {
        console.error('Failed to delete flow:', error);
      } finally {
        setDeletingFlows(prev => {
          const newSet = new Set(prev);
          newSet.delete(flowId);
          return newSet;
        });
      }
    }
  };

  return (
    <Box sx={{ position: 'relative' }}>
      <LoadingOverlay loading={loading} message="Loading flows..." />
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          Test Flows
        </Typography>
        <EnvironmentSelector 
          value={selectedEnvironment}
          onChange={setSelectedEnvironment}
        />
      </Box>
      
      <Grid container spacing={3}>
        {flows.map((flow, index) => (
          <Grid item xs={12} sm={6} md={4} key={flow.id}>
            <Card 
              className="animate-fadeIn hover-lift"
              sx={{ 
                animationDelay: `${index * 0.1}s`,
                animationFillMode: 'both'
              }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Box 
                    className="gradient-primary"
                    sx={{ 
                      p: 0.5, 
                      borderRadius: 1, 
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <FolderIcon sx={{ color: 'white', fontSize: 20 }} />
                  </Box>
                  <Typography variant="h6">
                    {flow.name}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1 }}>
                  <DescriptionIcon fontSize="small" color="action" />
                  <Typography variant="body2" color="text.secondary">
                    {flow.description || 'No description'}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
                  <LayersIcon fontSize="small" color="action" />
                  <Typography variant="caption" color="text.secondary">
                    {flow.steps.length} steps
                  </Typography>
                </Box>
              </CardContent>
              <CardActions>
                <Button 
                  size="small" 
                  startIcon={<EditIcon />}
                  onClick={() => navigate(`/flows/${flow.id}`)}
                >
                  Edit
                </Button>
                <Button 
                  size="small" 
                  startIcon={<ContentCopyIcon />}
                  onClick={() => handleDuplicateFlow(flow)}
                >
                  Duplicate
                </Button>
                <Button 
                  size="small" 
                  startIcon={runningFlows.has(flow.id) ? <CircularProgress size={16} /> : <PlayArrowIcon />}
                  onClick={() => handleRunFlow(flow.id, flow.name)}
                  color="primary"
                  disabled={runningFlows.has(flow.id)}
                >
                  {runningFlows.has(flow.id) ? 'Running...' : 'Run'}
                </Button>
                <Button 
                  size="small" 
                  startIcon={deletingFlows.has(flow.id) ? <CircularProgress size={16} /> : <DeleteIcon />}
                  onClick={() => handleDeleteFlow(flow.id, flow.name)}
                  color="error"
                  disabled={deletingFlows.has(flow.id)}
                >
                  {deletingFlows.has(flow.id) ? 'Deleting...' : 'Delete'}
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

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