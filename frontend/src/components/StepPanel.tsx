import React from 'react';
import { Box, Paper, Typography, List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import HttpIcon from '@mui/icons-material/Http';
import WebIcon from '@mui/icons-material/Web';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import TimerIcon from '@mui/icons-material/Timer';
import CodeIcon from '@mui/icons-material/Code';
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
  ];

  return (
    <Paper sx={{ width: 240, p: 2, mr: 2 }}>
      <Typography variant="h6" gutterBottom>
        Step Types
      </Typography>
      <List>
        {stepTypes.map((stepType) => (
          <ListItem
            key={stepType.type}
            button
            onClick={() => onAddStep(stepType.type)}
          >
            <ListItemIcon>{stepType.icon}</ListItemIcon>
            <ListItemText primary={stepType.label} />
          </ListItem>
        ))}
      </List>
    </Paper>
  );
}