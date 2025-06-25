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

  return (
    <Paper sx={{ p: 2, minWidth: 200 }}>
      <Handle type="target" position={Position.Top} />
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {getIcon()}
        <Typography variant="body2">{data.name}</Typography>
      </Box>
      <Handle type="source" position={Position.Bottom} />
    </Paper>
  );
}