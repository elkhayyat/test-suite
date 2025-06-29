import { useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Tooltip,
  Chip,
} from '@mui/material';
import ClearIcon from '@mui/icons-material/Clear';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DownloadIcon from '@mui/icons-material/Download';
import { ConsoleLog } from '../../../shared/src/types';

interface ConsoleProps {
  logs: ConsoleLog[];
  onClear?: () => void;
  maxHeight?: number;
  autoScroll?: boolean;
}

export default function Console({ 
  logs, 
  onClear, 
  maxHeight = 300,
  autoScroll = true 
}: ConsoleProps) {
  const consoleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const getLogColor = (level: ConsoleLog['level']) => {
    switch (level) {
      case 'error': return '#ff5252';
      case 'warn': return '#ff9800';
      case 'info': return '#2196f3';
      case 'debug': return '#9e9e9e';
      default: return '#ffffff';
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    } as any);
  };

  const copyLogsToClipboard = () => {
    const logText = logs.map(log => 
      `[${formatTimestamp(log.timestamp)}] [${log.level.toUpperCase()}] ${log.message}${
        log.details ? '\n' + JSON.stringify(log.details, null, 2) : ''
      }`
    ).join('\n');
    
    navigator.clipboard.writeText(logText);
  };

  const downloadLogs = () => {
    const logText = logs.map(log => 
      `[${formatTimestamp(log.timestamp)}] [${log.level.toUpperCase()}] ${log.message}${
        log.details ? '\n' + JSON.stringify(log.details, null, 2) : ''
      }`
    ).join('\n');
    
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `console-logs-${new Date().toISOString()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Paper 
      variant="outlined" 
      sx={{ 
        backgroundColor: '#1e1e1e',
        color: '#d4d4d4',
        fontFamily: '"Consolas", "Monaco", "Courier New", monospace',
        fontSize: '0.875rem',
        position: 'relative',
        height: maxHeight,
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Console Header */}
      <Box 
        sx={{ 
          px: 2, 
          py: 1, 
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#252526'
        }}
      >
        <Typography variant="body2" sx={{ fontWeight: 500, color: '#cccccc' }}>
          Console Output
        </Typography>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="Download logs">
            <IconButton size="small" onClick={downloadLogs} sx={{ color: '#cccccc' }}>
              <DownloadIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Copy all logs">
            <IconButton size="small" onClick={copyLogsToClipboard} sx={{ color: '#cccccc' }}>
              <ContentCopyIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          {onClear && (
            <Tooltip title="Clear console">
              <IconButton size="small" onClick={onClear} sx={{ color: '#cccccc' }}>
                <ClearIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>

      {/* Console Content */}
      <Box 
        ref={consoleRef}
        sx={{ 
          flex: 1,
          overflow: 'auto',
          p: 1,
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: '#1e1e1e',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: '#444',
            borderRadius: '4px',
          },
          '&::-webkit-scrollbar-thumb:hover': {
            backgroundColor: '#555',
          }
        }}
      >
        {logs.length === 0 ? (
          <Typography 
            variant="body2" 
            sx={{ 
              color: '#666', 
              fontStyle: 'italic',
              p: 2,
              textAlign: 'center' 
            }}
          >
            No console output yet...
          </Typography>
        ) : (
          logs.map((log, index) => (
            <Box 
              key={index} 
              sx={{ 
                mb: 0.5,
                fontFamily: 'inherit',
                fontSize: 'inherit',
                lineHeight: 1.5
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                <Typography 
                  component="span" 
                  sx={{ 
                    color: '#858585',
                    fontSize: 'inherit',
                    fontFamily: 'inherit',
                    flexShrink: 0
                  }}
                >
                  [{formatTimestamp(log.timestamp)}]
                </Typography>
                <Chip
                  label={log.level.toUpperCase()}
                  size="small"
                  sx={{
                    height: 18,
                    fontSize: '0.75rem',
                    backgroundColor: getLogColor(log.level),
                    color: '#fff',
                    fontWeight: 600,
                    '& .MuiChip-label': {
                      px: 1
                    }
                  }}
                />
                <Typography 
                  component="span" 
                  sx={{ 
                    color: log.level === 'error' ? '#ff5252' : 
                           log.level === 'warn' ? '#ff9800' : 
                           '#d4d4d4',
                    fontSize: 'inherit',
                    fontFamily: 'inherit',
                    wordBreak: 'break-word',
                    flex: 1
                  }}
                >
                  {log.message}
                </Typography>
              </Box>
              {log.details && (
                <Box 
                  sx={{ 
                    ml: 4, 
                    mt: 0.5,
                    p: 1,
                    backgroundColor: '#2d2d30',
                    borderRadius: 1,
                    border: '1px solid #3e3e42'
                  }}
                >
                  <pre style={{ 
                    margin: 0, 
                    whiteSpace: 'pre-wrap', 
                    wordBreak: 'break-word',
                    color: '#ce9178'
                  }}>
                    {typeof log.details === 'string' 
                      ? log.details 
                      : JSON.stringify(log.details, null, 2)}
                  </pre>
                </Box>
              )}
            </Box>
          ))
        )}
      </Box>
    </Paper>
  );
}