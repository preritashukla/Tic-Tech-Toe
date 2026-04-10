import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Box, Typography, Chip } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import HourglassTopIcon from '@mui/icons-material/HourglassTop';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import PanToolIcon from '@mui/icons-material/PanTool';
import type { NodeStatus } from '@/lib/types';

const statusConfig: Record<NodeStatus, { color: string; bg: string; icon: React.ReactNode; label: string }> = {
  pending: {
    color: 'hsl(220, 13%, 46%)',
    bg: 'hsl(220, 13%, 46% / 0.15)',
    icon: <HourglassTopIcon sx={{ fontSize: 16 }} />,
    label: 'Pending',
  },
  running: {
    color: 'hsl(217, 91%, 60%)',
    bg: 'hsl(217, 91%, 60% / 0.15)',
    icon: <PlayCircleIcon sx={{ fontSize: 16 }} />,
    label: 'Running',
  },
  done: {
    color: 'hsl(142, 71%, 45%)',
    bg: 'hsl(142, 71%, 45% / 0.15)',
    icon: <CheckCircleIcon sx={{ fontSize: 16 }} />,
    label: 'Done',
  },
  failed: {
    color: 'hsl(0, 84%, 60%)',
    bg: 'hsl(0, 84%, 60% / 0.15)',
    icon: <ErrorIcon sx={{ fontSize: 16 }} />,
    label: 'Failed',
  },
  waiting_approval: {
    color: 'hsl(38, 92%, 50%)',
    bg: 'hsl(38, 92%, 50% / 0.15)',
    icon: <PanToolIcon sx={{ fontSize: 16 }} />,
    label: 'Needs Approval',
  },
};

interface NodeCardProps {
  data: { title: string; status: NodeStatus };
}

const NodeCard = memo(({ data }: NodeCardProps) => {
  const config = statusConfig[data.status];
  const isRunning = data.status === 'running';

  return (
    <>
      <Handle type="target" position={Position.Left} style={{ background: 'hsl(217, 33%, 30%)', border: 'none', width: 8, height: 8 }} />
      <Box
        className={`rounded-xl border transition-all duration-300 ${isRunning ? 'node-running' : ''}`}
        sx={{
          bgcolor: 'hsl(222, 47%, 9%)',
          borderColor: config.color,
          borderWidth: data.status === 'waiting_approval' ? 2 : 1,
          minWidth: 180,
          p: 2,
        }}
      >
        <Typography sx={{ color: 'hsl(213, 31%, 91%)', fontWeight: 600, fontSize: 14, mb: 1 }}>
          {data.title}
        </Typography>
        <Chip
          icon={<Box sx={{ color: config.color, display: 'flex' }}>{config.icon}</Box>}
          label={config.label}
          size="small"
          sx={{
            bgcolor: config.bg,
            color: config.color,
            fontWeight: 600,
            fontSize: 11,
            height: 24,
            '& .MuiChip-icon': { ml: 0.5 },
          }}
        />
      </Box>
      <Handle type="source" position={Position.Right} style={{ background: 'hsl(217, 33%, 30%)', border: 'none', width: 8, height: 8 }} />
    </>
  );
});

NodeCard.displayName = 'NodeCard';

export default NodeCard;
