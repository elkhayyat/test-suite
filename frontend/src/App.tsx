import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import FlowEditor from './pages/FlowEditor';
import TestRuns from './pages/TestRuns';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/flows/:id" element={<FlowEditor />} />
            <Route path="/flows/new" element={<FlowEditor />} />
            <Route path="/runs" element={<TestRuns />} />
          </Routes>
        </Layout>
      </Router>
    </ThemeProvider>
  );
}

export default App;