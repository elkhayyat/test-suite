import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import KeyboardIcon from '@mui/icons-material/Keyboard';
import { KeyboardShortcutGroup, formatShortcut } from '../hooks/useKeyboardShortcuts';

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onClose: () => void;
  shortcutGroups: KeyboardShortcutGroup[];
}

export function KeyboardShortcutsDialog({
  open,
  onClose,
  shortcutGroups,
}: KeyboardShortcutsDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { maxHeight: '80vh' }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <KeyboardIcon />
          <Typography variant="h6">Keyboard Shortcuts</Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent dividers>
        {shortcutGroups.map((group, groupIndex) => (
          <Box key={group.name} sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>
              {group.name}
            </Typography>
            
            <List dense>
              {group.shortcuts
                .filter(shortcut => shortcut.enabled !== false)
                .map((shortcut, index) => (
                <ListItem key={index} sx={{ py: 0.5 }}>
                  <ListItemText
                    primary={
                      <Box sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center' 
                      }}>
                        <Typography variant="body2">
                          {shortcut.description}
                        </Typography>
                        <Chip
                          label={formatShortcut(shortcut)}
                          size="small"
                          variant="outlined"
                          sx={{ 
                            fontFamily: 'monospace',
                            fontSize: '0.75rem',
                            minWidth: 'auto'
                          }}
                        />
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
            
            {groupIndex < shortcutGroups.length - 1 && (
              <Divider sx={{ mt: 2 }} />
            )}
          </Box>
        ))}
        
        <Box sx={{ mt: 3, p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="body2" color="text.secondary">
            <strong>Tip:</strong> Press <Chip label="?" size="small" variant="outlined" sx={{ mx: 0.5 }} /> 
            to show this help dialog from anywhere in the application.
          </Typography>
        </Box>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose} variant="contained">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default KeyboardShortcutsDialog;