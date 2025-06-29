import {
  Box,
  Divider,
  IconButton,
  Paper,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  ContentCopy as CopyIcon,
  SelectAll as SelectAllIcon,
  ClearAll as ClearAllIcon,
  Group as GroupIcon,
  Close as CloseIcon,
} from '@mui/icons-material';

interface BulkOperationsBarProps {
  selectionCount: number;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onBulkDelete: () => void;
  onBulkCopy: () => void;
  onBulkGroup?: () => void;
  isAllSelected: boolean;
  hasItems: boolean;
}

export function BulkOperationsBar({
  selectionCount,
  onSelectAll,
  onClearSelection,
  onBulkDelete,
  onBulkCopy,
  onBulkGroup,
  isAllSelected,
  hasItems,
}: BulkOperationsBarProps) {
  if (selectionCount === 0) {
    return null;
  }

  return (
    <Paper
      elevation={3}
      sx={{
        position: 'fixed',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        px: 2,
        py: 1,
        backgroundColor: 'primary.main',
        color: 'primary.contrastText',
        borderRadius: 3,
        zIndex: 1000,
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        animation: 'slideUp 0.3s ease-out',
        '@keyframes slideUp': {
          from: {
            transform: 'translateX(-50%) translateY(100%)',
            opacity: 0,
          },
          to: {
            transform: 'translateX(-50%) translateY(0)',
            opacity: 1,
          },
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <GroupIcon />
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          {selectionCount} item{selectionCount > 1 ? 's' : ''} selected
        </Typography>
      </Box>

      <Divider orientation="vertical" flexItem sx={{ mx: 1, borderColor: 'rgba(255,255,255,0.3)' }} />

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        {hasItems && (
          <Tooltip title={isAllSelected ? "Clear selection" : "Select all"}>
            <IconButton
              size="small"
              onClick={isAllSelected ? onClearSelection : onSelectAll}
              sx={{ color: 'inherit' }}
            >
              {isAllSelected ? <ClearAllIcon fontSize="small" /> : <SelectAllIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
        )}

        <Tooltip title="Copy selected items">
          <IconButton
            size="small"
            onClick={onBulkCopy}
            sx={{ color: 'inherit' }}
          >
            <CopyIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        {onBulkGroup && selectionCount > 1 && (
          <Tooltip title="Group selected items">
            <IconButton
              size="small"
              onClick={onBulkGroup}
              sx={{ color: 'inherit' }}
            >
              <GroupIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}

        <Tooltip title="Delete selected items">
          <IconButton
            size="small"
            onClick={onBulkDelete}
            sx={{ color: 'error.main', backgroundColor: 'rgba(255,255,255,0.1)' }}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <Divider orientation="vertical" flexItem sx={{ mx: 1, borderColor: 'rgba(255,255,255,0.3)' }} />

        <Tooltip title="Clear selection">
          <IconButton
            size="small"
            onClick={onClearSelection}
            sx={{ color: 'inherit' }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    </Paper>
  );
}

export default BulkOperationsBar;