import React, { useState } from 'react';
import { Handle, Position } from 'react-flow-renderer';
import { Box, Paper, Typography, CircularProgress, Chip, LinearProgress, Fade, Button } from '@mui/material';
import HttpIcon from '@mui/icons-material/Http';
import WebIcon from '@mui/icons-material/Web';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import TimerIcon from '@mui/icons-material/Timer';
import CodeIcon from '@mui/icons-material/Code';
import ErrorIcon from '@mui/icons-material/Error';
import StorageIcon from '@mui/icons-material/Storage';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import PauseIcon from '@mui/icons-material/Pause';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import InfoIcon from '@mui/icons-material/Info';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import { TestStep, StepResult } from '../../../shared/src/types';
import StepDetailsModal from './StepDetailsModal';

interface StepNodeData extends TestStep {
  result?: StepResult;
  isRunning?: boolean;
  isSelected?: boolean;
  selectionMode?: boolean;
}

interface StepNodeProps {
  data: StepNodeData;
}

export default function StepNode({ data }: StepNodeProps) {
  const [modalOpen, setModalOpen] = useState(false);

  // Auto-open modal when step fails
  React.useEffect(() => {
    if (data.result?.status === 'failed') {
      setModalOpen(true);
    }
  }, [data.result?.status]);

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
      case 'sql':
        return <StorageIcon />;
      case 'subflow':
        return <AccountTreeIcon />;
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
      case 'sql':
        return 'gradient-secondary';
      case 'subflow':
        return 'gradient-info';
      default:
        return 'gradient-dark';
    }
  };

  const getStatusColor = () => {
    if (!data.result) return 'default';
    switch (data.result.status) {
      case 'passed':
        return 'success';
      case 'failed':
        return 'error';
      case 'running':
        return 'primary';
      case 'skipped':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusIcon = () => {
    if (!data.result) return null;
    switch (data.result.status) {
      case 'passed':
        return <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} />;
      case 'failed':
        return <ErrorIcon sx={{ fontSize: 16, color: 'error.main' }} />;
      case 'running':
        return <CircularProgress size={16} thickness={4} />;
      default:
        return null;
    }
  };

  const formatDuration = (start: Date, end?: Date) => {
    if (!end) return 'Running...';
    const duration = new Date(end).getTime() - new Date(start).getTime();
    if (duration < 1000) return `${duration}ms`;
    return `${(duration / 1000).toFixed(2)}s`;
  };

  const getStatusBackground = () => {
    // Always return a solid background, never transparent
    const alpha = 0.15; // Increased alpha for better visibility
    
    if (!data.result) {
      // Default background for steps without results
      return {
        backgroundColor: 'background.paper', // Use theme background
      };
    }
    
    switch (data.result.status) {
      case 'passed':
        return {
          backgroundColor: `rgba(76, 175, 80, ${alpha})`,
          borderColor: 'success.main',
        };
      case 'failed':
        return {
          backgroundColor: `rgba(244, 67, 54, ${alpha})`,
          borderColor: 'error.main',
        };
      case 'running':
        return {
          backgroundColor: `rgba(33, 150, 243, ${alpha * 2})`, // More prominent background
          borderColor: 'primary.main',
          borderWidth: 2,
          animation: 'pulse-border 1.5s infinite',
          '@keyframes pulse-border': {
            '0%': { 
              boxShadow: '0 0 0 0 rgba(33, 150, 243, 0.7), inset 0 0 0 0 rgba(33, 150, 243, 0.2)' 
            },
            '70%': { 
              boxShadow: '0 0 0 10px rgba(33, 150, 243, 0), inset 0 0 0 3px rgba(33, 150, 243, 0)' 
            },
            '100%': { 
              boxShadow: '0 0 0 0 rgba(33, 150, 243, 0), inset 0 0 0 0 rgba(33, 150, 243, 0)' 
            }
          }
        };
      case 'skipped':
        return {
          backgroundColor: `rgba(255, 152, 0, ${alpha})`,
          borderColor: 'warning.main',
        };
      default:
        // Fallback to solid background
        return {
          backgroundColor: 'background.paper',
        };
    }
  };

  return (
    <Paper 
      className="animate-scaleIn"
      sx={{ 
        p: 0,
        minWidth: 250,
        cursor: 'move',
        transition: 'all 0.3s ease',
        border: data.isSelected ? '3px solid' : data.result ? `2px solid` : '1px solid',
        borderColor: data.isSelected ? 'primary.main' : data.result ? 
          (data.result.status === 'passed' ? 'success.main' : 
           data.result.status === 'failed' ? 'error.main' :
           data.result.status === 'running' ? 'primary.main' : 
           data.result.status === 'skipped' ? 'warning.main' : 'divider') 
          : 'divider',
        position: 'relative',
        overflow: 'hidden',
        ...getStatusBackground(),
        ...(data.isSelected && {
          boxShadow: '0 0 0 2px rgba(25, 118, 210, 0.5)',
          backgroundColor: 'rgba(25, 118, 210, 0.08)',
        }),
        '&:hover': {
          transform: 'scale(1.05)',
          boxShadow: (theme) => data.isSelected 
            ? '0 0 0 2px rgba(25, 118, 210, 0.5), 0 8px 32px rgba(0,0,0,0.15)'
            : theme.palette.mode === 'dark' 
              ? '0 8px 32px rgba(255,255,255,0.1)' 
              : '0 8px 32px rgba(0,0,0,0.15)',
        }
      }}
    >
      <Handle type="target" position={Position.Top} />
      
      {/* Status Progress Bar */}
      {data.result?.status === 'running' && (
        <>
          <LinearProgress 
            sx={{ 
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 4,
              '& .MuiLinearProgress-bar': {
                backgroundColor: 'primary.main',
              }
            }} 
          />
          {/* Animated border effect */}
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              pointerEvents: 'none',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                borderRadius: 'inherit',
                background: 'linear-gradient(45deg, transparent 30%, rgba(33, 150, 243, 0.1) 50%, transparent 70%)',
                backgroundSize: '200% 200%',
                animation: 'shimmer 2s linear infinite',
                '@keyframes shimmer': {
                  '0%': { backgroundPosition: '200% 200%' },
                  '100%': { backgroundPosition: '-200% -200%' }
                }
              }
            }}
          />
        </>
      )}
      
      {/* Status Banner for Failed/Passed */}
      {data.result && data.result.status !== 'running' && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            backgroundColor: data.result.status === 'passed' ? 'success.main' : 
                           data.result.status === 'failed' ? 'error.main' : 
                           data.result.status === 'skipped' ? 'warning.main' : 'transparent'
          }}
        />
      )}

      {/* Selection Checkbox */}
      {data.selectionMode && (
        <Box
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            zIndex: 10,
            backgroundColor: 'background.paper',
            borderRadius: '4px',
            border: '1px solid',
            borderColor: data.isSelected ? 'primary.main' : 'divider',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 24,
            height: 24,
            boxShadow: 1
          }}
        >
          {data.isSelected ? (
            <CheckBoxIcon sx={{ fontSize: 18, color: 'primary.main' }} />
          ) : (
            <CheckBoxOutlineBlankIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
          )}
        </Box>
      )}
      
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
            ID: {data.id.substring(0, 8)}
          </Typography>
          {data.result && (
            <Fade in={true}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {getStatusIcon()}
                <Chip 
                  label={data.result.status === 'running' ? 'RUNNING' : data.result.status.toUpperCase()} 
                  size="small" 
                  color={getStatusColor() as any}
                  variant={data.result.status === 'running' ? 'filled' : 'filled'}
                  sx={{ 
                    height: 20, 
                    fontSize: '0.65rem',
                    fontWeight: 'bold',
                    letterSpacing: '0.5px',
                    ...(data.result.status === 'running' && {
                      backgroundColor: 'primary.main',
                      color: 'white',
                      animation: 'pulse-chip 1.5s ease-in-out infinite',
                      '@keyframes pulse-chip': {
                        '0%': { 
                          transform: 'scale(1)',
                          boxShadow: '0 0 0 0 rgba(33, 150, 243, 0.7)'
                        },
                        '70%': { 
                          transform: 'scale(1.05)',
                          boxShadow: '0 0 0 10px rgba(33, 150, 243, 0)'
                        },
                        '100%': { 
                          transform: 'scale(1)',
                          boxShadow: '0 0 0 0 rgba(33, 150, 243, 0)'
                        }
                      }
                    })
                  }}
                  icon={data.result.status === 'running' ? 
                        <CircularProgress size={10} thickness={5} sx={{ color: 'white' }} /> : 
                        data.result.status === 'passed' ? <CheckCircleIcon sx={{ fontSize: 12 }} /> :
                        data.result.status === 'failed' ? <ErrorIcon sx={{ fontSize: 12 }} /> :
                        data.result.status === 'skipped' ? <PauseIcon sx={{ fontSize: 12 }} /> : undefined}
                />
                {data.result.startTime && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                    <AccessTimeIcon sx={{ fontSize: 12, color: 'text.secondary' }} />
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                      {formatDuration(data.result.startTime, data.result.endTime)}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Fade>
          )}
        </Box>
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
              position: 'relative',
              ...(data.result?.status === 'running' && {
                animation: 'spin 2s linear infinite',
                '@keyframes spin': {
                  '0%': { transform: 'rotate(0deg)' },
                  '100%': { transform: 'rotate(360deg)' }
                }
              }),
              '.MuiPaper-root:hover &': {
                transform: data.result?.status === 'running' ? 'rotate(0deg) scale(1.1)' : 'rotate(360deg) scale(1.1)',
              }
            }}
          >
            <Box sx={{ color: 'white', display: 'flex' }}>
              {getIcon()}
            </Box>
            
            {/* Status Overlay */}
            {data.result && data.result.status !== 'running' && (
              <Box
                sx={{
                  position: 'absolute',
                  top: -2,
                  right: -2,
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  backgroundColor: data.result.status === 'passed' ? 'success.main' : 
                                 data.result.status === 'failed' ? 'error.main' : 
                                 data.result.status === 'skipped' ? 'warning.main' : 'transparent',
                  border: '1px solid white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {data.result.status === 'passed' && <CheckCircleIcon sx={{ fontSize: 8, color: 'white' }} />}
                {data.result.status === 'failed' && <ErrorIcon sx={{ fontSize: 8, color: 'white' }} />}
                {data.result.status === 'skipped' && <PauseIcon sx={{ fontSize: 8, color: 'white' }} />}
              </Box>
            )}
          </Box>
          <Typography variant="body2" sx={{ flex: 1 }}>{data.name}</Typography>
          {data.result && (data.result.output || data.result.error || data.result.status === 'passed') && (
            <Button 
              size="small" 
              variant="outlined"
              onClick={(e) => {
                e.stopPropagation();
                setModalOpen(true);
              }}
              startIcon={<InfoIcon />}
              sx={{ 
                minWidth: 'auto',
                px: 1,
                py: 0.5,
                fontSize: '0.75rem'
              }}
            >
              Details
            </Button>
          )}
        </Box>

      </Box>
      <Handle type="source" position={Position.Bottom} />
      
      {/* Step Details Modal */}
      <StepDetailsModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        step={data}
        result={data.result}
      />
    </Paper>
  );
}