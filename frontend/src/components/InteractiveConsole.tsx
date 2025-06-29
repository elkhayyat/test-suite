import { useRef, useEffect, useState, KeyboardEvent } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Tooltip,
  Chip,
  TextField,
  InputAdornment,
} from '@mui/material';
import ClearIcon from '@mui/icons-material/Clear';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DownloadIcon from '@mui/icons-material/Download';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { ConsoleLog } from '../../../shared/src/types';

interface InteractiveConsoleProps {
  logs: ConsoleLog[];
  onClear?: () => void;
  onCommand?: (command: string) => void;
  maxHeight?: number;
  autoScroll?: boolean;
  context?: Record<string, any>;
}

export default function InteractiveConsole({ 
  logs, 
  onClear, 
  onCommand,
  maxHeight = 300,
  autoScroll = true
}: InteractiveConsoleProps) {
  const consoleRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [command, setCommand] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showHelp, setShowHelp] = useState(false);

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

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && command.trim()) {
      // Add to history
      setCommandHistory(prev => [...prev, command]);
      setHistoryIndex(-1);
      
      // Execute command
      if (onCommand) {
        onCommand(command.trim());
      }
      
      // Clear input
      setCommand('');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0 && historyIndex < commandHistory.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setCommand(commandHistory[commandHistory.length - 1 - newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setCommand(commandHistory[commandHistory.length - 1 - newIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setCommand('');
      }
    }
  };

  const helpContent = (
    <Box sx={{ p: 2, backgroundColor: '#2d2d30', borderRadius: 1, mb: 2 }}>
      <Typography variant="body2" sx={{ color: '#ce9178', fontFamily: 'monospace', mb: 1 }}>
        Available Commands:
      </Typography>
      <Box sx={{ ml: 2, fontFamily: 'monospace', fontSize: '0.875rem' }}>
        <Typography variant="body2" sx={{ color: '#d4d4d4' }}>
          <strong style={{ color: '#9cdcfe' }}>vars</strong> - List all available variables
        </Typography>
        <Typography variant="body2" sx={{ color: '#d4d4d4' }}>
          <strong style={{ color: '#9cdcfe' }}>get [variable]</strong> - Get value of a variable (e.g., get baseUrl)
        </Typography>
        <Typography variant="body2" sx={{ color: '#d4d4d4' }}>
          <strong style={{ color: '#9cdcfe' }}>steps</strong> - List all executed steps
        </Typography>
        <Typography variant="body2" sx={{ color: '#d4d4d4' }}>
          <strong style={{ color: '#9cdcfe' }}>step [id]</strong> - Get details of a specific step
        </Typography>
        <Typography variant="body2" sx={{ color: '#d4d4d4' }}>
          <strong style={{ color: '#9cdcfe' }}>output [stepId]</strong> - Get output of a specific step
        </Typography>
        <Typography variant="body2" sx={{ color: '#d4d4d4' }}>
          <strong style={{ color: '#9cdcfe' }}>json [path]</strong> - Parse JSON from last output (e.g., json data.id)
        </Typography>
        <Typography variant="body2" sx={{ color: '#d4d4d4' }}>
          <strong style={{ color: '#9cdcfe' }}>clear</strong> - Clear console
        </Typography>
        <Typography variant="body2" sx={{ color: '#d4d4d4' }}>
          <strong style={{ color: '#9cdcfe' }}>help</strong> - Show this help
        </Typography>
      </Box>
    </Box>
  );

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
          Interactive Console
        </Typography>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="Show help">
            <IconButton 
              size="small" 
              onClick={() => setShowHelp(!showHelp)} 
              sx={{ color: showHelp ? '#2196f3' : '#cccccc' }}
            >
              <HelpOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
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
        {showHelp && helpContent}
        
        {logs.length === 0 && !showHelp ? (
          <Typography 
            variant="body2" 
            sx={{ 
              color: '#666', 
              fontStyle: 'italic',
              p: 2,
              textAlign: 'center' 
            }}
          >
            No console output yet... Type 'help' for available commands.
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
                {log.level === 'command' ? (
                  <>
                    <ChevronRightIcon sx={{ fontSize: 16, color: '#9cdcfe', mt: 0.25 }} />
                    <Typography 
                      component="span" 
                      sx={{ 
                        color: '#9cdcfe',
                        fontSize: 'inherit',
                        fontFamily: 'inherit',
                        flex: 1
                      }}
                    >
                      {log.message}
                    </Typography>
                  </>
                ) : (
                  <>
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
                  </>
                )}
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

      {/* Command Input */}
      <Box 
        sx={{ 
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          p: 1,
          backgroundColor: '#252526'
        }}
      >
        <TextField
          ref={inputRef}
          fullWidth
          size="small"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter command (type 'help' for available commands)"
          sx={{
            '& .MuiInputBase-root': {
              backgroundColor: '#1e1e1e',
              color: '#d4d4d4',
              fontFamily: 'monospace',
              fontSize: '0.875rem',
              '& fieldset': {
                borderColor: '#3e3e42'
              },
              '&:hover fieldset': {
                borderColor: '#4e4e52'
              },
              '&.Mui-focused fieldset': {
                borderColor: '#007acc'
              }
            },
            '& .MuiInputBase-input': {
              padding: '6px 12px',
              '&::placeholder': {
                color: '#858585',
                opacity: 1
              }
            }
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <ChevronRightIcon sx={{ fontSize: 16, color: '#858585' }} />
              </InputAdornment>
            ),
          }}
        />
      </Box>
    </Paper>
  );
}