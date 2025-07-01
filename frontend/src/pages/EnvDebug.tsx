import React from 'react';
import { Box, Paper, Typography } from '@mui/material';

export const EnvDebug: React.FC = () => {
  const envVars = {
    MODE: import.meta.env.MODE,
    PROD: import.meta.env.PROD,
    DEV: import.meta.env.DEV,
    VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
    BASE_URL: import.meta.env.BASE_URL,
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Environment Variables Debug
      </Typography>
      <Paper sx={{ p: 2 }}>
        <pre>{JSON.stringify(envVars, null, 2)}</pre>
      </Paper>
      <Typography variant="body2" sx={{ mt: 2 }}>
        If VITE_API_BASE_URL is undefined or shows localhost in production, 
        the environment variable is not being set correctly in Cloudflare Pages.
      </Typography>
    </Box>
  );
};