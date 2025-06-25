import React, { useEffect, useState } from 'react';
import { 
  Grid, 
  Card, 
  CardContent, 
  CardActions, 
  Typography, 
  Button, 
  Box,
  Fab
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { useNavigate } from 'react-router-dom';
import { TestFlow } from '../../../shared/src/types';
import { api } from '../services/api';

export default function Dashboard() {
  const navigate = useNavigate();
  const [flows, setFlows] = useState<TestFlow[]>([]);

  useEffect(() => {
    loadFlows();
  }, []);

  const loadFlows = async () => {
    try {
      const data = await api.getFlows();
      setFlows(data);
    } catch (error) {
      console.error('Failed to load flows:', error);
    }
  };

  const handleRunFlow = async (flowId: string) => {
    try {
      const { runId } = await api.startRun(flowId);
      navigate('/runs');
    } catch (error) {
      console.error('Failed to start run:', error);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Test Flows
      </Typography>
      
      <Grid container spacing={3}>
        {flows.map((flow) => (
          <Grid item xs={12} sm={6} md={4} key={flow.id}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {flow.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {flow.description || 'No description'}
                </Typography>
                <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                  Steps: {flow.steps.length}
                </Typography>
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
                  startIcon={<PlayArrowIcon />}
                  onClick={() => handleRunFlow(flow.id)}
                  color="primary"
                >
                  Run
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Fab
        color="primary"
        aria-label="add"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={() => navigate('/flows/new')}
      >
        <AddIcon />
      </Fab>
    </Box>
  );
}