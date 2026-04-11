import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Box, Typography, Chip } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import HourglassTopIcon from '@mui/icons-material/HourglassTop';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import PanToolIcon from '@mui/icons-material/PanTool';
import BugReportIcon from '@mui/icons-material/BugReport';
import GitHubIcon from '@mui/icons-material/GitHub';
import ChatIcon from '@mui/icons-material/Chat';
import TableChartIcon from '@mui/icons-material/TableChart';
import ForumIcon from '@mui/icons-material/Forum';
import CloudIcon from '@mui/icons-material/Cloud';
import ViewKanbanIcon from '@mui/icons-material/ViewKanban';
import StorageIcon from '@mui/icons-material/Storage';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import type { NodeStatus, MCPTool } from '@/lib/types';

const statusConfig: Record<NodeStatus, { color: string; bg: string; border: string; icon: React.ReactNode; label: string }> = {
  pending: {
    color: 'hsl(220, 13%, 46%)',
    bg: 'hsl(220, 13%, 46% / 0.1)',
    border: 'hsl(220, 13%, 25%)',
    icon: <HourglassTopIcon sx={{ fontSize: 14 }} />,
    label: 'Pending',
  },
  running: {
    color: 'hsl(217, 91%, 60%)',
    bg: 'hsl(217, 91%, 60% / 0.1)',
    border: 'hsl(217, 91%, 40%)',
    icon: <PlayCircleIcon sx={{ fontSize: 14 }} />,
    label: 'Running',
  },
  done: {
    color: 'hsl(142, 71%, 45%)',
    bg: 'hsl(142, 71%, 45% / 0.1)',
    border: 'hsl(142, 71%, 30%)',
    icon: <CheckCircleIcon sx={{ fontSize: 14 }} />,
    label: 'Done',
  },
  failed: {
    color: 'hsl(0, 84%, 60%)',
    bg: 'hsl(0, 84%, 60% / 0.1)',
    border: 'hsl(0, 84%, 35%)',
    icon: <ErrorIcon sx={{ fontSize: 14 }} />,
    label: 'Failed',
  },
  waiting_approval: {
    color: 'hsl(38, 92%, 50%)',
    bg: 'hsl(38, 92%, 50% / 0.1)',
    border: 'hsl(38, 92%, 35%)',
    icon: <PanToolIcon sx={{ fontSize: 14 }} />,
    label: 'Needs Approval',
  },
  success: {
    color: 'hsl(142, 71%, 45%)',
    bg: 'hsl(142, 71%, 45% / 0.1)',
    border: 'hsl(142, 71%, 30%)',
    icon: <CheckCircleIcon sx={{ fontSize: 14 }} />,
    label: 'Success',
  },
  skipped: {
    color: 'hsl(215, 20%, 45%)',
    bg: 'hsl(215, 20%, 45% / 0.1)',
    border: 'hsl(215, 20%, 25%)',
    icon: <PanToolIcon sx={{ fontSize: 14 }} />,
    label: 'Skipped',
  },
};

const toolIcons: Record<MCPTool, React.ReactNode> = {
  jira: <BugReportIcon sx={{ fontSize: 16, color: 'hsl(217, 91%, 60%)' }} />,
  github: <GitHubIcon sx={{ fontSize: 16, color: 'hsl(0, 0%, 85%)' }} />,
  slack: <ChatIcon sx={{ fontSize: 16, color: 'hsl(340, 82%, 55%)' }} />,
  sheets: <TableChartIcon sx={{ fontSize: 16, color: 'hsl(142, 71%, 50%)' }} />,
  discord: <ForumIcon sx={{ fontSize: 16, color: 'hsl(235, 86%, 65%)' }} />,
  aws: <CloudIcon sx={{ fontSize: 16, color: 'hsl(30, 100%, 50%)' }} />,
  trello: <ViewKanbanIcon sx={{ fontSize: 16, color: 'hsl(200, 82%, 55%)' }} />,
  airtable: <StorageIcon sx={{ fontSize: 16, color: 'hsl(265, 67%, 55%)' }} />,
  generic: <SmartToyIcon sx={{ fontSize: 16, color: 'hsl(215, 20%, 55%)' }} />,
};

interface NodeCardProps {
  data: { title: string; status: NodeStatus; description?: string; tool?: MCPTool; duration?: string };
}

const NodeCard = memo(({ data }: NodeCardProps) => {
  const config = statusConfig[data.status];
  const isRunning = data.status === 'running';
  const isApproval = data.status === 'waiting_approval';

  return (
    <>
      <Handle type="target" position={Position.Left} style={{ background: 'hsl(217, 33%, 30%)', border: 'none', width: 8, height: 8 }} />
      <Box
        className={`rounded-xl border transition-all duration-300 ${isRunning ? 'node-running' : ''} ${isApproval ? 'node-approval' : ''}`}
        sx={{
          bgcolor: 'hsl(222, 47%, 9%)',
          borderColor: config.border,
          borderWidth: isApproval ? 2 : 1,
          minWidth: 210,
          maxWidth: 240,
          p: 2,
          '&:hover': {
            borderColor: config.color,
            bgcolor: 'hsl(222, 47%, 11%)',
            transform: 'translateY(-1px)',
            boxShadow: `0 4px 20px ${config.color}22`,
          },
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* Server Label */}
        {data.tool && (
          <Box sx={{ mb: 1.5, display: 'flex', alignItems: 'center' }}>
            <Typography sx={{ 
              fontSize: 9, 
              fontWeight: 700, 
              textTransform: 'uppercase', 
              letterSpacing: 0.5, 
              color: config.color, 
              bgcolor: config.bg, 
              px: 1, 
              py: 0.25, 
              borderRadius: 1 
            }}>
               Executing on {data.tool.toUpperCase()} Server
            </Typography>
          </Box>
        )}

        {/* Header: tool icon + title */}
        <Box className="flex items-center gap-2 mb-1.5">
          {data.tool && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 28,
                height: 28,
                borderRadius: '8px',
                bgcolor: 'hsl(217, 33%, 15%)',
                flexShrink: 0,
              }}
            >
              {toolIcons[data.tool]}
            </Box>
          )}
          <Typography sx={{ color: 'hsl(213, 31%, 91%)', fontWeight: 600, fontSize: 13, lineHeight: 1.3 }}>
            {data.title}
          </Typography>
        </Box>

        {/* Description */}
        {data.description && (
          <Typography sx={{ color: 'hsl(215, 20%, 45%)', fontSize: 11, lineHeight: 1.4, mb: 1.5, pl: data.tool ? '36px' : 0 }}>
            {data.description}
          </Typography>
        )}

        {/* Status + Duration row */}
        <Box className="flex items-center justify-between gap-2">
          <Chip
            icon={<Box sx={{ color: config.color, display: 'flex' }}>{config.icon}</Box>}
            label={config.label}
            size="small"
            sx={{
              bgcolor: config.bg,
              color: config.color,
              fontWeight: 600,
              fontSize: 10,
              height: 22,
              '& .MuiChip-icon': { ml: 0.5 },
            }}
          />
          {data.duration && (
            <Typography sx={{ color: 'hsl(215, 20%, 45%)', fontSize: 10, fontFamily: '"JetBrains Mono", monospace' }}>
              {data.duration}
            </Typography>
          )}
        </Box>
      </Box>
      <Handle type="source" position={Position.Right} style={{ background: 'hsl(217, 33%, 30%)', border: 'none', width: 8, height: 8 }} />
    </>
  );
});

NodeCard.displayName = 'NodeCard';

export default NodeCard;
