import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import HistoryIcon from '@mui/icons-material/History';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import RunCircleIcon from '@mui/icons-material/RunCircle';
import { TestRun } from '../../../shared/src/types';
import { api } from '../services/api';
import { useSocket } from '../hooks/useSocket';
import StatusIndicator from '../components/StatusIndicator';

export default function TestRuns() {
  const navigate = useNavigate();
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

  const getStatusIcon = (status: TestRun['status']) => {
    switch (status) {
      case 'pending':
        return <HourglassEmptyIcon fontSize="small" />;
      case 'running':
        return <RunCircleIcon fontSize="small" />;
      case 'completed':
        return <CheckCircleIcon fontSize="small" />;
      case 'failed':
        return <ErrorIcon fontSize="small" />;
      default:
        return null;
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <Box 
          className="gradient-indigo"
          sx={{ 
            p: 1, 
            borderRadius: 2, 
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <HistoryIcon sx={{ fontSize: 32, color: 'white' }} />
        </Box>
        <Typography variant="h4" className="text-gradient">
          Test Runs
        </Typography>
      </Box>

      <TableContainer 
        component={Paper}
        className="animate-fadeIn"
        sx={{ 
          boxShadow: (theme) => theme.palette.mode === 'dark' 
            ? '0 8px 32px rgba(102, 126, 234, 0.1)' 
            : '0 8px 32px rgba(102, 126, 234, 0.08)',
          border: (theme) => theme.palette.mode === 'dark'
            ? '1px solid rgba(102, 126, 234, 0.2)'
            : 'none'
        }}
      >
        <Table>
          <TableHead>
            <TableRow sx={{ 
              background: (theme) => theme.palette.mode === 'dark'
                ? 'linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1))'
                : 'linear-gradient(135deg, rgba(102, 126, 234, 0.05), rgba(118, 75, 162, 0.05))'
            }}>
              <TableCell sx={{ fontWeight: 600 }}>Run ID</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Flow ID</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Start Time</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Duration</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {runs.map((run, index) => (
              <TableRow 
                key={run.id}
                className="animate-slideInLeft"
                sx={{ 
                  animationDelay: `${index * 0.05}s`,
                  animationFillMode: 'both',
                  '&:hover': {
                    backgroundColor: (theme) => theme.palette.mode === 'dark'
                      ? 'rgba(102, 126, 234, 0.08)'
                      : 'rgba(102, 126, 234, 0.04)',
                    transform: 'translateX(4px)',
                    transition: 'all 0.3s ease'
                  }
                }}
              >
                <TableCell>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', color: '#667eea' }}>
                    {run.id.substring(0, 8)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', color: '#764ba2' }}>
                    {run.flowId.substring(0, 8)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <StatusIndicator 
                    status={run.status === 'completed' ? 'success' : 
                            run.status === 'failed' ? 'error' : 
                            run.status === 'running' ? 'running' : 'pending'}
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
                  <IconButton 
                    size="small"
                    onClick={() => navigate(`/runs/${run.id}`)}
                    sx={{
                      color: '#667eea',
                      '&:hover': {
                        backgroundColor: 'rgba(102, 126, 234, 0.1)',
                        transform: 'scale(1.1)'
                      }
                    }}
                  >
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