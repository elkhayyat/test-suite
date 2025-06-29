import { useState, useMemo, createContext } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Layout from './components/Layout';
import FlowsOrganizer from './pages/FlowsOrganizer';
import FlowEditor from './pages/FlowEditor';
import TestRuns from './pages/TestRuns';
import TestRunDetails from './pages/TestRunDetails';
import Environments from './pages/Environments';
import Projects from './pages/Projects';
import Organizations from './pages/Organizations';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { EnvironmentProvider } from './contexts/EnvironmentContext';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';

interface ThemeContextType {
  toggleColorMode: () => void;
  mode: 'light' | 'dark';
}

export const ColorModeContext = createContext<ThemeContextType>({
  toggleColorMode: () => {},
  mode: 'light',
});

function App() {
  const [mode, setMode] = useState<'light' | 'dark'>(() => {
    const savedMode = localStorage.getItem('themeMode');
    return (savedMode as 'light' | 'dark') || 'light';
  });

  const colorMode = useMemo(
    () => ({
      toggleColorMode: () => {
        setMode((prevMode) => {
          const newMode = prevMode === 'light' ? 'dark' : 'light';
          localStorage.setItem('themeMode', newMode);
          return newMode;
        });
      },
      mode,
    }),
    [mode]
  );

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          primary: {
            main: mode === 'dark' ? '#90caf9' : '#1976d2',
            light: '#42a5f5',
            dark: '#1565c0',
          },
          secondary: {
            main: mode === 'dark' ? '#f48fb1' : '#dc004e',
            light: '#f06292',
            dark: '#c2185b',
          },
          success: {
            main: '#66bb6a',
            light: '#81c784',
            dark: '#388e3c',
          },
          info: {
            main: '#29b6f6',
            light: '#4fc3f7',
            dark: '#0288d1',
          },
          warning: {
            main: '#ffa726',
            light: '#ffb74d',
            dark: '#f57c00',
          },
          background: {
            default: mode === 'dark' ? '#0a0a0a' : '#f5f5f5',
            paper: mode === 'dark' ? '#1a1a1a' : '#ffffff',
          },
          text: {
            primary: mode === 'dark' ? '#ffffff' : '#000000',
            secondary: mode === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)',
          },
        },
        typography: {
          fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
          h4: {
            fontWeight: 600,
            letterSpacing: '-0.02em',
          },
          h6: {
            fontWeight: 600,
            letterSpacing: '-0.01em',
          },
          button: {
            textTransform: 'none',
            fontWeight: 500,
          },
        },
        shape: {
          borderRadius: 12,
        },
        components: {
          MuiButton: {
            styleOverrides: {
              root: {
                borderRadius: 8,
                padding: '8px 16px',
                boxShadow: 'none',
                '&:hover': {
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                },
              },
              contained: {
                '&:hover': {
                  transform: 'translateY(-1px)',
                  transition: 'all 0.2s ease-in-out',
                },
              },
            },
          },
          MuiCard: {
            styleOverrides: {
              root: {
                boxShadow: mode === 'dark' 
                  ? '0 4px 20px rgba(0,0,0,0.5)' 
                  : '0 2px 12px rgba(0,0,0,0.08)',
                border: mode === 'dark' ? '1px solid rgba(255,255,255,0.1)' : 'none',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: mode === 'dark'
                    ? '0 8px 32px rgba(0,0,0,0.6)'
                    : '0 8px 24px rgba(0,0,0,0.12)',
                  transition: 'all 0.3s ease-in-out',
                },
              },
            },
          },
          MuiPaper: {
            styleOverrides: {
              root: {
                backgroundImage: 'none',
                boxShadow: mode === 'dark'
                  ? '0 1px 3px rgba(0,0,0,0.5)'
                  : '0 1px 3px rgba(0,0,0,0.1)',
              },
            },
          },
          MuiAppBar: {
            styleOverrides: {
              root: {
                backgroundImage: 'none',
                backgroundColor: mode === 'dark' ? '#1a1a1a' : '#ffffff',
                color: mode === 'dark' ? '#ffffff' : '#000000',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              },
            },
          },
          MuiDrawer: {
            styleOverrides: {
              paper: {
                backgroundImage: 'none',
                backgroundColor: mode === 'dark' ? '#1a1a1a' : '#ffffff',
                borderRight: mode === 'dark' 
                  ? '1px solid rgba(255,255,255,0.1)' 
                  : '1px solid rgba(0,0,0,0.1)',
              },
            },
          },
          MuiListItem: {
            styleOverrides: {
              root: {
                borderRadius: 8,
                margin: '4px 8px',
                '&:hover': {
                  backgroundColor: mode === 'dark'
                    ? 'rgba(255,255,255,0.08)'
                    : 'rgba(0,0,0,0.04)',
                },
              },
            },
          },
          MuiChip: {
            styleOverrides: {
              root: {
                borderRadius: 6,
                fontWeight: 500,
              },
            },
          },
          MuiTextField: {
            styleOverrides: {
              root: {
                '& .MuiOutlinedInput-root': {
                  borderRadius: 8,
                },
              },
            },
          },
        },
      }),
    [mode]
  );

  return (
    <ColorModeContext.Provider value={colorMode}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <ErrorBoundary>
          <Router>
            <AuthProvider>
              <EnvironmentProvider>
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route element={<Layout />}>
                    <Route path="/" element={
                      <ProtectedRoute>
                        <ErrorBoundary>
                          <FlowsOrganizer />
                        </ErrorBoundary>
                      </ProtectedRoute>
                    } />
                    <Route path="/projects" element={
                      <ProtectedRoute>
                        <ErrorBoundary>
                          <Projects />
                        </ErrorBoundary>
                      </ProtectedRoute>
                    } />
                    <Route path="/flows/new" element={
                      <ProtectedRoute>
                        <ErrorBoundary>
                          <FlowEditor />
                        </ErrorBoundary>
                      </ProtectedRoute>
                    } />
                    <Route path="/flows/:id" element={
                      <ProtectedRoute>
                        <ErrorBoundary>
                          <FlowEditor />
                        </ErrorBoundary>
                      </ProtectedRoute>
                    } />
                    <Route path="/runs" element={
                      <ProtectedRoute>
                        <ErrorBoundary>
                          <TestRuns />
                        </ErrorBoundary>
                      </ProtectedRoute>
                    } />
                    <Route path="/runs/:runId" element={
                      <ProtectedRoute>
                        <ErrorBoundary>
                          <TestRunDetails />
                        </ErrorBoundary>
                      </ProtectedRoute>
                    } />
                    <Route path="/environments" element={
                      <ProtectedRoute>
                        <ErrorBoundary>
                          <Environments />
                        </ErrorBoundary>
                      </ProtectedRoute>
                    } />
                    <Route path="/organizations" element={
                      <ProtectedRoute requiredRole={['admin']}>
                        <ErrorBoundary>
                          <Organizations />
                        </ErrorBoundary>
                      </ProtectedRoute>
                    } />
                  </Route>
                </Routes>
              </EnvironmentProvider>
            </AuthProvider>
          </Router>
        </ErrorBoundary>
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}

export default App;