import React from 'react';
import { Handle, Position } from 'react-flow-renderer';
import { Box, Paper, Typography } from '@mui/material';
import HttpIcon from '@mui/icons-material/Http';
import WebIcon from '@mui/icons-material/Web';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import TimerIcon from '@mui/icons-material/Timer';
import CodeIcon from '@mui/icons-material/Code';
import { TestStep } from '../../../shared/src/types';

interface StepNodeProps {
  data: TestStep;
}

export default function StepNode({ data }: StepNodeProps) {
  const getIcon = () => {
    switch (data.type) {
      case 'http':
        return <HttpIcon />;
      case 'browser':
        return <WebIcon />;
      case 'assertion':
        return <CheckCircleIcon />;
      case 'delay':
        return <TimerIcon />;
      case 'condition':
        return <CodeIcon />;
      default:
        return null;
    }
  };

  const getTypeColor = () => {
    switch (data.type) {
      case 'http':
        return 'gradient-info';
      case 'browser':
        return 'gradient-primary';
      case 'assertion':
        return 'gradient-success';
      case 'delay':
        return 'gradient-warning';
      case 'condition':
        return 'gradient-error';
      default:
        return 'gradient-dark';
    }
  };

  return (
    <Paper 
      className="animate-scaleIn"
      sx={{ 
        p: 2, 
        minWidth: 200,
        cursor: 'move',
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'scale(1.05)',
          boxShadow: (theme) => theme.palette.mode === 'dark' 
            ? '0 8px 32px rgba(255,255,255,0.1)' 
            : '0 8px 32px rgba(0,0,0,0.15)',
        }
      }}
    >
      <Handle type="target" position={Position.Top} />
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
          ID: {data.id.substring(0, 8)}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box 
            className={getTypeColor()}
            sx={{ 
              p: 0.5,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'transform 0.3s ease',
              '.MuiPaper-root:hover &': {
                transform: 'rotate(360deg) scale(1.1)',
              }
            }}
          >
            <Box sx={{ color: 'white', display: 'flex' }}>
              {getIcon()}
            </Box>
          </Box>
          <Typography variant="body2">{data.name}</Typography>
        </Box>
      </Box>
      <Handle type="source" position={Position.Bottom} />
    </Paper>
  );
}