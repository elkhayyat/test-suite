import React from 'react';
import { Menu, MenuItem, Divider, ListItemIcon, ListItemText } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ContentPasteIcon from '@mui/icons-material/ContentPaste';
import DeleteIcon from '@mui/icons-material/Delete';
import CopyAllIcon from '@mui/icons-material/CopyAll';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';

interface ContextMenuProps {
  anchorPosition: { mouseX: number; mouseY: number } | null;
  onClose: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onRun?: () => void;
  canPaste: boolean;
}

export default function ContextMenu({
  anchorPosition,
  onClose,
  onCopy,
  onPaste,
  onDuplicate,
  onDelete,
  onRun,
  canPaste,
}: ContextMenuProps) {
  return (
    <Menu
      open={anchorPosition !== null}
      onClose={onClose}
      anchorReference="anchorPosition"
      anchorPosition={
        anchorPosition !== null
          ? { top: anchorPosition.mouseY, left: anchorPosition.mouseX }
          : undefined
      }
      sx={{
        '& .MuiPaper-root': {
          borderRadius: 2,
          minWidth: 180,
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          '& .MuiMenuItem-root': {
            px: 2,
            py: 1,
            '&:hover': {
              backgroundColor: (theme) =>
                theme.palette.mode === 'dark'
                  ? 'rgba(255,255,255,0.08)'
                  : 'rgba(0,0,0,0.04)',
            },
          },
        },
      }}
    >
      {onRun && (
        <MenuItem onClick={() => { onRun(); onClose(); }}>
          <ListItemIcon>
            <PlayArrowIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Run Step</ListItemText>
        </MenuItem>
      )}
      {onRun && <Divider />}
      <MenuItem onClick={() => { onCopy(); onClose(); }}>
        <ListItemIcon>
          <ContentCopyIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>Copy</ListItemText>
      </MenuItem>
      <MenuItem onClick={() => { onPaste(); onClose(); }} disabled={!canPaste}>
        <ListItemIcon>
          <ContentPasteIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>Paste</ListItemText>
      </MenuItem>
      <MenuItem onClick={() => { onDuplicate(); onClose(); }}>
        <ListItemIcon>
          <CopyAllIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>Duplicate</ListItemText>
      </MenuItem>
      <Divider />
      <MenuItem 
        onClick={() => { onDelete(); onClose(); }}
        sx={{ color: 'error.main' }}
      >
        <ListItemIcon>
          <DeleteIcon fontSize="small" color="error" />
        </ListItemIcon>
        <ListItemText>Delete</ListItemText>
      </MenuItem>
    </Menu>
  );
}