import { Box, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import { keyframes } from '@mui/material/styles';

interface StatusIndicatorProps {
  status: 'success' | 'error' | 'running' | 'pending';
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
}

const pulse = keyframes`
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.8;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
`;

const spin = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`;

export default function StatusIndicator({ status, size = 'medium', showLabel = true }: StatusIndicatorProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'success':
        return {
          icon: <CheckCircleIcon />,
          gradient: 'gradient-success',
          color: '#00ff00',
          label: 'Success',
          animation: pulse,
        };
      case 'error':
        return {
          icon: <ErrorIcon />,
          gradient: 'gradient-error',
          color: '#ff0066',
          label: 'Error',
          animation: pulse,
        };
      case 'running':
        return {
          icon: <PlayCircleIcon />,
          gradient: 'gradient-info',
          color: '#00d4ff',
          label: 'Running',
          animation: spin,
        };
      case 'pending':
        return {
          icon: <HourglassEmptyIcon />,
          gradient: 'gradient-warning',
          color: '#ffd700',
          label: 'Pending',
          animation: pulse,
        };
    }
  };

  const config = getStatusConfig();
  const iconSize = size === 'small' ? 20 : size === 'medium' ? 28 : 36;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Box
        className={config.gradient}
        sx={{
          width: iconSize + 16,
          height: iconSize + 16,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          animation: `${config.animation} ${status === 'running' ? '1s' : '2s'} ease-in-out infinite`,
          boxShadow: `0 0 20px ${config.color}40`,
          '&::before': {
            content: '""',
            position: 'absolute',
            top: -2,
            left: -2,
            right: -2,
            bottom: -2,
            borderRadius: '50%',
            background: `linear-gradient(45deg, ${config.color}40, transparent)`,
            animation: `${spin} 3s linear infinite`,
          },
        }}
      >
        <Box sx={{ color: 'white', display: 'flex', fontSize: iconSize, zIndex: 1 }}>
          {config.icon}
        </Box>
      </Box>
      {showLabel && (
        <Typography
          variant={size === 'small' ? 'caption' : 'body2'}
          sx={{
            fontWeight: 600,
            background: config.gradient.includes('gradient') ? 
              `linear-gradient(135deg, ${config.color}, ${config.color}dd)` : 
              config.color,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          {config.label}
        </Typography>
      )}
    </Box>
  );
}