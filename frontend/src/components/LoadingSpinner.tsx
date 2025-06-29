import { Box, CircularProgress } from '@mui/material';

interface LoadingSpinnerProps {
  size?: number;
  color?: 'primary' | 'secondary' | 'inherit';
}

export default function LoadingSpinner({ size = 40, color = 'primary' }: LoadingSpinnerProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 200,
      }}
      className="animate-fadeIn"
    >
      <CircularProgress 
        size={size} 
        color={color}
        sx={{
          animation: 'rotate 1s linear infinite',
        }}
      />
    </Box>
  );
}