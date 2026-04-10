import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  CircularProgress,
} from '@mui/material';
import PanToolIcon from '@mui/icons-material/PanTool';
import type { WorkflowNode } from '@/lib/types';

interface HITLModalProps {
  node: WorkflowNode | null;
  onApprove: (nodeId: string) => Promise<void>;
  onReject: (nodeId: string) => void;
}

const HITLModal = ({ node, onApprove, onReject }: HITLModalProps) => {
  const [loading, setLoading] = useState(false);

  if (!node) return null;

  const handleApprove = async () => {
    setLoading(true);
    try {
      await onApprove(node.id);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open
      PaperProps={{
        sx: {
          bgcolor: 'hsl(222, 47%, 9%)',
          border: '1px solid hsl(38, 92%, 50% / 0.4)',
          borderRadius: 3,
          minWidth: 400,
          color: 'hsl(213, 31%, 91%)',
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <PanToolIcon sx={{ color: 'hsl(38, 92%, 50%)' }} />
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Approval Required
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Box className="rounded-xl border border-border bg-secondary p-4 mt-1">
          <Typography sx={{ fontSize: 13, color: 'hsl(215, 20%, 55%)', mb: 0.5 }}>Node</Typography>
          <Typography sx={{ fontWeight: 600, fontSize: 16 }}>{node.title}</Typography>
          <Typography sx={{ fontSize: 13, color: 'hsl(215, 20%, 55%)', mt: 1.5, mb: 0.5 }}>ID</Typography>
          <Typography sx={{ fontFamily: 'monospace', fontSize: 13 }}>{node.id}</Typography>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
        <Button
          onClick={() => onReject(node.id)}
          variant="outlined"
          sx={{
            borderColor: 'hsl(0, 84%, 60%)',
            color: 'hsl(0, 84%, 60%)',
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 600,
            '&:hover': { bgcolor: 'hsl(0, 84%, 60% / 0.1)', borderColor: 'hsl(0, 84%, 60%)' },
          }}
        >
          Reject
        </Button>
        <Button
          onClick={handleApprove}
          disabled={loading}
          variant="contained"
          sx={{
            bgcolor: 'hsl(142, 71%, 45%)',
            color: 'hsl(222, 47%, 6%)',
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 600,
            '&:hover': { bgcolor: 'hsl(142, 71%, 38%)' },
          }}
        >
          {loading ? <CircularProgress size={20} sx={{ color: 'inherit' }} /> : 'Approve'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default HITLModal;
