import React, { useContext } from 'react';
import { AppBar, Toolbar, Typography, Drawer, List, ListItem, ListItemIcon, ListItemText, Box, IconButton } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SettingsIcon from '@mui/icons-material/Settings';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import ScienceIcon from '@mui/icons-material/Science';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import { styled, useTheme } from '@mui/material/styles';
import { ColorModeContext } from '../App';

const drawerWidth = 240;

const Main = styled('main', { shouldForwardProp: (prop) => prop !== 'open' })<{
  open?: boolean;
}>(({ theme }) => ({
  flexGrow: 1,
  padding: theme.spacing(3),
  transition: theme.transitions.create('margin', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  marginLeft: `-${drawerWidth}px`,
  marginLeft: 0,
}));

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const theme = useTheme();
  const colorMode = useContext(ColorModeContext);

  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
    { text: 'Projects', icon: <AccountTreeIcon />, path: '/projects' },
    { text: 'Test Runs', icon: <PlayArrowIcon />, path: '/runs' },
    { text: 'Environments', icon: <SettingsIcon />, path: '/environments' },
  ];

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar 
        position="fixed" 
        className={theme.palette.mode === 'dark' ? 'gradient-dark' : ''}
        sx={{ 
          zIndex: (theme) => theme.zIndex.drawer + 1,
          background: theme.palette.mode === 'light' 
            ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
            : undefined,
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        }}
      >
        <Toolbar>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexGrow: 1 }}>
            <AccountTreeIcon sx={{ 
              fontSize: 28,
              color: 'white',
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
              animation: 'pulse 3s ease-in-out infinite'
            }} />
            <Typography variant="h6" noWrap component="div">
              Test Flow Suite
            </Typography>
          </Box>
          <IconButton sx={{ ml: 1 }} onClick={colorMode.toggleColorMode} color="inherit">
            {theme.palette.mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
          </IconButton>
        </Toolbar>
      </AppBar>
      <Drawer
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            overflowX: 'hidden',
          },
        }}
        variant="permanent"
        anchor="left"
      >
        <Toolbar />
        <Box sx={{ overflowX: 'hidden', overflowY: 'auto' }}>
          <List sx={{ padding: 0 }}>
            {menuItems.map((item, index) => (
              <ListItem 
                key={item.text}
                onClick={() => navigate(item.path)}
                className="animate-slideInLeft"
                sx={{ 
                  cursor: 'pointer',
                  px: 2,
                  mx: 1,
                  width: 'calc(100% - 16px)',
                  animationDelay: `${index * 0.1}s`,
                  animationFillMode: 'both',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateX(5px)',
                    backgroundColor: theme.palette.mode === 'dark'
                      ? 'rgba(255,255,255,0.12)'
                      : 'rgba(0,0,0,0.08)',
                  },
                  '&:hover .MuiListItemIcon-root': {
                    transform: 'scale(1.2)',
                  }
                }}
              >
                <ListItemIcon sx={{ 
                  minWidth: 40,
                  transition: 'transform 0.3s ease'
                }}>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>
      <Main>
        <Toolbar />
        {children}
      </Main>
    </Box>
  );
}