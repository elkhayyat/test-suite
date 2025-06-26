import React from 'react';
import { Box, Paper, Typography, List, ListItem, ListItemIcon, ListItemText, Divider } from '@mui/material';
import HttpIcon from '@mui/icons-material/Http';
import WebIcon from '@mui/icons-material/Web';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import TimerIcon from '@mui/icons-material/Timer';
import CodeIcon from '@mui/icons-material/Code';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import StorageIcon from '@mui/icons-material/Storage';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import { TestStep } from '../../../shared/src/types';

interface StepPanelProps {
  onAddStep: (type: TestStep['type']) => void;
}

export default function StepPanel({ onAddStep }: StepPanelProps) {
  const stepTypes = [
    { type: 'http' as const, label: 'HTTP Request', icon: <HttpIcon /> },
    { type: 'browser' as const, label: 'Browser Action', icon: <WebIcon /> },
    { type: 'assertion' as const, label: 'Assertion', icon: <CheckCircleIcon /> },
    { type: 'delay' as const, label: 'Delay', icon: <TimerIcon /> },
    { type: 'condition' as const, label: 'Condition', icon: <CodeIcon /> },
    { type: 'sql' as const, label: 'SQL Query', icon: <StorageIcon /> },
    { type: 'subflow' as const, label: 'Sub-Flow', icon: <AccountTreeIcon /> },
  ];

  return (
    <Paper sx={{ width: 240, p: 2, mr: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <AddCircleOutlineIcon color="primary" />
        <Typography variant="h6">
          Add Steps
        </Typography>
      </Box>
      <Divider sx={{ mb: 2 }} />
      <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
        <DragIndicatorIcon fontSize="small" />
        Drag to flow editor
      </Typography>
      <List>
        {stepTypes.map((stepType, index) => (
          <ListItem
            key={stepType.type}
            button
            onClick={() => onAddStep(stepType.type)}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('application/reactflow', stepType.type);
              e.dataTransfer.effectAllowed = 'move';
            }}
            className="animate-slideInLeft"
            sx={{ 
              borderRadius: 1,
              mb: 1,
              animationDelay: `${index * 0.1}s`,
              animationFillMode: 'both',
              transition: 'all 0.3s ease',
              cursor: 'grab',
              '&:active': {
                cursor: 'grabbing',
              },
              '&:hover': {
                backgroundColor: (theme) => theme.palette.mode === 'dark' 
                  ? 'rgba(255,255,255,0.08)' 
                  : 'rgba(0,0,0,0.04)',
                transform: 'translateX(5px)',
              },
              '&:hover .MuiListItemIcon-root': {
                transform: 'scale(1.2) rotate(10deg)',
              }
            }}
          >
            <ListItemIcon sx={{ transition: 'transform 0.3s ease' }}>
              {stepType.icon}
            </ListItemIcon>
            <ListItemText primary={stepType.label} />
          </ListItem>
        ))}
      </List>
    </Paper>
  );
}