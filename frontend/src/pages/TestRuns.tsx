import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
} from '@mui/material';
import StopIcon from '@mui/icons-material/Stop';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { TestRun } from '../../../shared/src/types';
import { api } from '../services/api';
import { useSocket } from '../hooks/useSocket';

export default function TestRuns() {
  const [runs, setRuns] = useState<TestRun[]>([]);
  const socket = useSocket();

  useEffect(() => {
    loadRuns();
  }, []);

  useEffect(() => {
    if (!socket) return;

    socket.on('run:started', (run: TestRun) => {
      setRuns((prev) => [run, ...prev]);
    });

    socket.on('run:updated', (updatedRun: TestRun) => {
      setRuns((prev) =>
        prev.map((run) => (run.id === updatedRun.id ? updatedRun : run))
      );
    });

    return () => {
      socket.off('run:started');
      socket.off('run:updated');
    };
  }, [socket]);

  const loadRuns = async () => {
    try {
      const data = await api.getRuns();
      setRuns(data);
    } catch (error) {
      console.error('Failed to load runs:', error);
    }
  };

  const handleStopRun = async (runId: string) => {
    try {
      await api.stopRun(runId);
    } catch (error) {
      console.error('Failed to stop run:', error);
    }
  };

  const getStatusColor = (status: TestRun['status']) => {
    switch (status) {
      case 'pending':
        return 'default';
      case 'running':
        return 'primary';
      case 'completed':
        return 'success';
      case 'failed':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Test Runs
      </Typography>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Run ID</TableCell>
              <TableCell>Flow ID</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Start Time</TableCell>
              <TableCell>Duration</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {runs.map((run) => (
              <TableRow key={run.id}>
                <TableCell>{run.id.substring(0, 8)}</TableCell>
                <TableCell>{run.flowId.substring(0, 8)}</TableCell>
                <TableCell>
                  <Chip
                    label={run.status}
                    color={getStatusColor(run.status)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {new Date(run.startTime).toLocaleString()}
                </TableCell>
                <TableCell>
                  {run.endTime
                    ? `${Math.round(
                        (new Date(run.endTime).getTime() -
                          new Date(run.startTime).getTime()) /
                          1000
                      )}s`
                    : '-'}
                </TableCell>
                <TableCell>
                  {run.status === 'running' && (
                    <IconButton
                      size="small"
                      onClick={() => handleStopRun(run.id)}
                    >
                      <StopIcon />
                    </IconButton>
                  )}
                  <IconButton size="small">
                    <VisibilityIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}