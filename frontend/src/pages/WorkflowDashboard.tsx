import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, Alert, Chip, IconButton, Tooltip } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import RefreshIcon from '@mui/icons-material/Refresh';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import Layout from '@/components/Layout';
import DAGViewer from '@/components/DAGViewer';
import AuditLog from '@/components/AuditLog';
import HITLModal from '@/components/HITLModal';
import { getWorkflowStatus, approveNode, WS_BASE } from '@/lib/api';
import type { WorkflowNode, WorkflowStatus } from '@/lib/types';

const WorkflowDashboard = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [status, setStatus] = useState<WorkflowStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    if (!id) return;
    try {
      const data = await getWorkflowStatus(id);
      setStatus(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch workflow status');
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Connect to WebSocket for real-time updates
  useEffect(() => {
    if (!id) return;
    
    // Initial fetch
    fetchStatus();

    const ws = new WebSocket(`${WS_BASE}/ws/status/${id}`);
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setStatus(data);
        setError(null);
        setLoading(false);
      } catch (err) {
        console.error('Failed to parse websocket message', err);
      }
    };
    
    ws.onerror = (err) => {
      console.error('WebSocket error', err);
      // Fallback to polling if WS fails
      const interval = setInterval(fetchStatus, 2000);
      ws.close();
      return () => clearInterval(interval);
    };

    return () => {
      ws.close();
    };
  }, [id, fetchStatus]);

  const approvalNode: WorkflowNode | null =
    status?.nodes.find((n) => n.status === 'waiting_approval') ?? null;

  const handleApprove = async (nodeId: string) => {
    if (!id) return;
    try {
      await approveNode(id, nodeId, true);
      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve node');
    }
  };

  const handleReject = async (nodeId: string) => {
    if (!id) return;
    try {
      await approveNode(id, nodeId, false);
      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject node');
    }
  };

  // Status summary counts
  const statusCounts = status?.nodes.reduce(
    (acc, n) => {
      acc[n.status] = (acc[n.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  ) ?? {};

  const isAllDone = status?.nodes.every((n) => n.status === 'done') ?? false;
  const hasFailed = status?.nodes.some((n) => n.status === 'failed') ?? false;

  return (
    <Box className="flex-1 flex flex-col lg:flex-row gap-0 h-full min-h-0 overflow-hidden relative z-10 animate-fade-in bg-background">
      {/* DAG Section */}
      <Box className="flex-1 flex flex-col min-h-0 bg-[hsl(222,47%,4%)] relative">
        <Box className="grid-bg" />
        
        {/* Header Bar */}
        <Box
          className="px-4 md:px-6 py-3 border-b flex items-center justify-between gap-3 relative z-10 bg-[hsl(222,47%,6%/0.8)] backdrop-blur-md"
          sx={{ borderColor: 'hsl(217, 33%, 15%)' }}
        >
          <Box className="flex items-center gap-3 min-w-0">
            <Tooltip title="Close workflow">
              <IconButton
                size="small"
                onClick={() => navigate('/dashboard')}
                sx={{ color: 'hsl(215, 20%, 55%)', '&:hover': { color: 'hsl(213, 31%, 91%)' } }}
              >
                <ArrowBackIcon sx={{ fontSize: 20 }} />
              </IconButton>
            </Tooltip>
            <Box className="min-w-0">
              <Typography sx={{ fontWeight: 700, fontSize: 16, color: 'hsl(213, 31%, 91%)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {status?.title || 'Execution Graph'}
              </Typography>
              <Typography sx={{ fontSize: 11, color: 'hsl(215, 20%, 40%)', fontFamily: '"JetBrains Mono", monospace' }}>
                {id}
              </Typography>
            </Box>
          </Box>

          {/* Status badges */}
          <Box className="flex items-center gap-2 flex-shrink-0">
            {isAllDone && (
              <Chip
                label="Completed"
                size="small"
                sx={{
                  bgcolor: 'hsl(142, 71%, 45% / 0.15)',
                  color: 'hsl(142, 71%, 50%)',
                  fontWeight: 600,
                  fontSize: 11,
                  height: 26,
                  borderRadius: '8px',
                }}
              />
            )}
            {hasFailed && (
              <Chip
                label="Has Failures"
                size="small"
                sx={{
                  bgcolor: 'hsl(0, 84%, 60% / 0.15)',
                  color: 'hsl(0, 84%, 60%)',
                  fontWeight: 600,
                  fontSize: 11,
                  height: 26,
                  borderRadius: '8px',
                }}
              />
            )}
            {statusCounts['running'] && (
              <Chip
                icon={<FiberManualRecordIcon sx={{ fontSize: '8px !important', color: 'hsl(217, 91%, 60%) !important', animation: 'pulse 2s infinite' }} />}
                label={`${statusCounts['running']} running`}
                size="small"
                sx={{
                  bgcolor: 'hsl(217, 91%, 60% / 0.12)',
                  color: 'hsl(217, 91%, 70%)',
                  fontWeight: 500,
                  fontSize: 11,
                  height: 26,
                  borderRadius: '8px',
                  '& .MuiChip-icon': { ml: 0.5 },
                }}
              />
            )}
            <Tooltip title="Refresh">
              <IconButton
                size="small"
                onClick={fetchStatus}
                sx={{ color: 'hsl(215, 20%, 45%)', '&:hover': { color: 'hsl(217, 91%, 60%)' } }}
              >
                <RefreshIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Error alert */}
        {error && (
          <Alert
            severity="error"
            className="relative z-10"
            sx={{
              mx: 3,
              mt: 2,
              bgcolor: 'hsl(0, 84%, 60% / 0.08)',
              color: 'hsl(0, 84%, 70%)',
              border: '1px solid hsl(0, 84%, 60% / 0.2)',
              borderRadius: 2,
              '& .MuiAlert-icon': { color: 'hsl(0, 84%, 60%)' },
            }}
          >
            {error}
          </Alert>
        )}

        {/* DAG Canvas */}
        <Box className="flex-1 relative z-10">
          <DAGViewer
            nodes={status?.nodes ?? []}
            edges={status?.edges ?? []}
            loading={loading}
          />
        </Box>
      </Box>

      {/* Audit Log Sidebar */}
      <Box
        className="w-full lg:w-80 xl:w-96 border-t lg:border-t-0 lg:border-l flex flex-col h-full min-h-0 overflow-hidden flex-shrink-0 relative z-10 bg-background p-4"
        sx={{ borderColor: 'hsl(217, 33%, 12%)' }}
      >
        <AuditLog nodes={status?.nodes ?? []} loading={loading} />
      </Box>

      <HITLModal node={approvalNode} onApprove={handleApprove} onReject={handleReject} />
    </Box>
  );
};

export default WorkflowDashboard;
