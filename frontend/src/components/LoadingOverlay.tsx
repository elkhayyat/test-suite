import React from 'react';
import { 
  Box, 
  CircularProgress, 
  Typography, 
  Backdrop,
  Paper
} from '@mui/material';

interface LoadingOverlayProps {
  open: boolean;
  message?: string;
  backdrop?: boolean;
}

export default function LoadingOverlay({ 
  open, 
  message = 'Loading...', 
  backdrop = true 
}: LoadingOverlayProps) {
  if (!open) return null;

  const content = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        p: 3,
      }}
    >
      <CircularProgress size={40} />
      <Typography variant="body1" color="text.secondary">
        {message}
      </Typography>
    </Box>
  );

  if (backdrop) {
    return (
      <Backdrop
        open={open}
        sx={{
          color: '#fff',
          zIndex: (theme) => theme.zIndex.drawer + 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
        }}
      >
        <Paper
          elevation={8}
          sx={{
            borderRadius: 2,
            backgroundColor: 'background.paper',
          }}
        >
          {content}
        </Paper>
      </Backdrop>
    );
  }

  return (
    <Box
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        zIndex: 1000,
      }}
    >
      {content}
    </Box>
  );
}