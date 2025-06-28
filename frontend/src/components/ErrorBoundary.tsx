import React, { Component, ReactNode } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Alert, 
  Card, 
  CardContent, 
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Stack,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import BugReportIcon from '@mui/icons-material/BugReport';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import HomeIcon from '@mui/icons-material/Home';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  level?: 'page' | 'component' | 'critical';
  context?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  errorId: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, errorId: '' };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { 
      hasError: true, 
      error, 
      errorId: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });

    // Log error to console for debugging
    console.error('Error caught by boundary:', error, errorInfo);

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Report to error monitoring service
    this.reportError(error, errorInfo);
  }

  private reportError = (error: Error, errorInfo: React.ErrorInfo) => {
    const errorReport = {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      errorInfo: {
        componentStack: errorInfo.componentStack,
      },
      context: this.props.context || 'unknown',
      level: this.props.level || 'component',
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      errorId: this.state.errorId,
    };

    // Log for development
    console.warn('Error Report:', errorReport);

    // In production, send to monitoring service
    // Example: Sentry.captureException(error, { extra: errorReport });
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, errorId: '' });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      const { level = 'component', context = 'Component' } = this.props;
      const { error, errorInfo, errorId } = this.state;

      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Minimal fallback for component-level errors
      if (level === 'component') {
        return (
          <Alert severity="error" sx={{ m: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              {context} Error
            </Typography>
            <Typography variant="body2" gutterBottom>
              There was an error in the {context.toLowerCase()} component.
            </Typography>
            <Button
              size="small"
              onClick={this.handleReset}
              startIcon={<RefreshIcon />}
              sx={{ mt: 1 }}
            >
              Retry
            </Button>
          </Alert>
        );
      }

      // Enhanced fallback for page-level or critical errors
      return (
        <Box 
          sx={{ 
            p: 3, 
            maxWidth: 600, 
            mx: 'auto', 
            mt: level === 'critical' ? 8 : 4,
            minHeight: level === 'critical' ? '100vh' : 'auto',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: level === 'critical' ? 'center' : 'flex-start',
          }}
        >
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <BugReportIcon color="error" sx={{ fontSize: 32 }} />
                <Typography variant="h5" color="error">
                  {level === 'critical' ? 'Application Error' : 'Something went wrong'}
                </Typography>
              </Box>
              
              <Alert severity="error" sx={{ mb: 2 }}>
                {level === 'critical' 
                  ? 'The application encountered a critical error and cannot continue.'
                  : 'An unexpected error occurred. Please try refreshing the page or contact support if the problem persists.'
                }
              </Alert>

              <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                <Chip 
                  label={`Error ID: ${errorId}`} 
                  size="small" 
                  variant="outlined" 
                />
                <Chip 
                  label={error?.name || 'Unknown Error'} 
                  size="small" 
                  color="error" 
                  variant="outlined" 
                />
              </Stack>

              <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                <Button
                  variant="contained"
                  startIcon={<RefreshIcon />}
                  onClick={this.handleReset}
                >
                  Try Again
                </Button>
                
                <Button
                  variant="outlined"
                  onClick={() => window.location.reload()}
                >
                  Reload Page
                </Button>

                {level === 'critical' && (
                  <Button
                    variant="outlined"
                    onClick={this.handleGoHome}
                    startIcon={<HomeIcon />}
                  >
                    Go Home
                  </Button>
                )}
              </Stack>

              {/* Error details with expandable accordion */}
              {error && (
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="subtitle2">
                      Error Details {process.env.NODE_ENV === 'development' && '(Development)'}
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Box>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Error Message:
                      </Typography>
                      <Typography variant="body2" sx={{ 
                        fontFamily: 'monospace', 
                        backgroundColor: 'grey.100', 
                        p: 1, 
                        borderRadius: 1,
                        fontSize: '0.8rem',
                        mb: 2,
                        wordBreak: 'break-word',
                      }}>
                        {error.message}
                      </Typography>

                      {process.env.NODE_ENV === 'development' && error.stack && (
                        <>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            Stack Trace:
                          </Typography>
                          <Typography variant="body2" sx={{ 
                            fontFamily: 'monospace', 
                            backgroundColor: 'grey.100', 
                            p: 1, 
                            borderRadius: 1,
                            fontSize: '0.7rem',
                            mb: 2,
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            maxHeight: 200,
                            overflow: 'auto',
                          }}>
                            {error.stack}
                          </Typography>
                        </>
                      )}

                      {process.env.NODE_ENV === 'development' && errorInfo?.componentStack && (
                        <>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            Component Stack:
                          </Typography>
                          <Typography variant="body2" sx={{ 
                            fontFamily: 'monospace', 
                            backgroundColor: 'grey.100', 
                            p: 1, 
                            borderRadius: 1,
                            fontSize: '0.7rem',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            maxHeight: 200,
                            overflow: 'auto',
                          }}>
                            {errorInfo.componentStack}
                          </Typography>
                        </>
                      )}
                    </Box>
                  </AccordionDetails>
                </Accordion>
              )}
            </CardContent>
          </Card>
        </Box>
      );
    }

    return this.props.children;
  }
}

// Hook version for functional components
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode,
  onReset?: () => void
) {
  return function WrappedComponent(props: P) {
    return (
      <ErrorBoundary fallback={fallback} onReset={onReset}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}

// Convenience components for different error boundary levels
export const PageErrorBoundary = ({ children, context }: { children: ReactNode; context?: string }) => (
  <ErrorBoundary level="page" context={context}>
    {children}
  </ErrorBoundary>
);

export const ComponentErrorBoundary = ({ children, context }: { children: ReactNode; context?: string }) => (
  <ErrorBoundary level="component" context={context}>
    {children}
  </ErrorBoundary>
);

export const CriticalErrorBoundary = ({ children, context }: { children: ReactNode; context?: string }) => (
  <ErrorBoundary level="critical" context={context}>
    {children}
  </ErrorBoundary>
);

export default ErrorBoundary;