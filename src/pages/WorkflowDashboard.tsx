import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Typography, Alert } from '@mui/material';
import Layout from '@/components/Layout';
import DAGViewer from '@/components/DAGViewer';
import AuditLog from '@/components/AuditLog';
import HITLModal from '@/components/HITLModal';
import { getWorkflowStatus, approveNode } from '@/lib/api';
import type { WorkflowNode, WorkflowStatus } from '@/lib/types';

const WorkflowDashboard = () => {
  const { id } = useParams<{ id: string }>();
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

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 2000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const approvalNode: WorkflowNode | null =
    status?.nodes.find((n) => n.status === 'waiting_approval') ?? null;

  const handleApprove = async (nodeId: string) => {
    try {
      await approveNode(nodeId);
      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve node');
    }
  };

  const handleReject = (_nodeId: string) => {
    // Reject could POST to a reject endpoint if available
  };

  return (
    <Layout>
      <Box className="flex-1 flex flex-col lg:flex-row gap-0 overflow-hidden">
        {/* DAG Section */}
        <Box className="flex-1 flex flex-col min-h-0">
          <Box className="px-6 py-3 border-b border-border flex items-center justify-between">
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: 18, color: 'hsl(213, 31%, 91%)' }}>
                Execution Graph
              </Typography>
              <Typography sx={{ fontSize: 12, color: 'hsl(215, 20%, 45%)', fontFamily: 'monospace' }}>
                {id}
              </Typography>
            </Box>
          </Box>
          {error && (
            <Alert severity="error" sx={{ mx: 3, mt: 2, bgcolor: 'hsl(0, 84%, 60% / 0.1)', color: 'hsl(0, 84%, 70%)' }}>
              {error}
            </Alert>
          )}
          <DAGViewer
            nodes={status?.nodes ?? []}
            edges={status?.edges ?? []}
            loading={loading}
          />
        </Box>

        {/* Audit Log Sidebar */}
        <Box
          className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-border p-4 overflow-hidden"
          sx={{ bgcolor: 'hsl(222, 47%, 7%)' }}
        >
          <AuditLog nodes={status?.nodes ?? []} loading={loading} />
        </Box>
      </Box>

      <HITLModal node={approvalNode} onApprove={handleApprove} onReject={handleReject} />
    </Layout>
  );
};

export default WorkflowDashboard;
