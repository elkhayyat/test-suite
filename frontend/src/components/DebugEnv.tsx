import React from 'react';

export const DebugEnv: React.FC = () => {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
  const nodeEnv = import.meta.env.NODE_ENV;
  const mode = import.meta.env.MODE;
  
  console.log('Environment Debug:', {
    VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
    apiBaseUrl,
    nodeEnv,
    mode,
    allEnv: import.meta.env
  });
  
  return (
    <div style={{ 
      position: 'fixed', 
      bottom: 10, 
      right: 10, 
      background: 'rgba(0,0,0,0.8)', 
      color: 'white', 
      padding: '10px',
      fontSize: '12px',
      fontFamily: 'monospace',
      borderRadius: '5px',
      maxWidth: '400px'
    }}>
      <div>API URL: {apiBaseUrl}</div>
      <div>Mode: {mode}</div>
      <div>Login URL: {apiBaseUrl}/auth/login</div>
    </div>
  );
};