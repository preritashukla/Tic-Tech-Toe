import { Box, Typography, Skeleton } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import type { WorkflowNode } from '@/lib/types';

interface AuditLogProps {
  nodes: WorkflowNode[];
  loading?: boolean;
}

const AuditLog = ({ nodes, loading }: AuditLogProps) => {
  const completed = nodes.filter((n) => n.status === 'done' || n.status === 'failed');

  return (
    <Box className="flex flex-col h-full">
      <Typography sx={{ fontWeight: 700, fontSize: 14, color: 'hsl(215, 20%, 55%)', mb: 2, px: 1, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Audit Log
      </Typography>
      <Box className="flex-1 overflow-y-auto space-y-2 pr-1" sx={{ maxHeight: 'calc(100vh - 200px)' }}>
        {loading
          ? [1, 2, 3].map((i) => (
              <Skeleton key={i} variant="rounded" height={56} sx={{ bgcolor: 'hsl(217, 33%, 15%)', borderRadius: 2 }} />
            ))
          : completed.length === 0
          ? (
            <Typography sx={{ color: 'hsl(215, 20%, 40%)', fontSize: 13, px: 1 }}>
              No completed steps yet.
            </Typography>
          )
          : completed.map((n) => (
              <Box key={n.id} className="flex items-start gap-3 rounded-lg border border-border bg-card p-3 transition-all duration-300">
                {n.status === 'done' ? (
                  <CheckCircleIcon sx={{ color: 'hsl(142, 71%, 45%)', fontSize: 18, mt: 0.3 }} />
                ) : (
                  <ErrorIcon sx={{ color: 'hsl(0, 84%, 60%)', fontSize: 18, mt: 0.3 }} />
                )}
                <Box>
                  <Typography sx={{ fontWeight: 600, fontSize: 13, color: 'hsl(213, 31%, 91%)' }}>
                    {n.title}
                  </Typography>
                  {n.timestamp && (
                    <Typography sx={{ fontSize: 11, color: 'hsl(215, 20%, 45%)', mt: 0.25 }}>
                      {n.timestamp}
                    </Typography>
                  )}
                </Box>
              </Box>
            ))}
      </Box>
    </Box>
  );
};

export default AuditLog;
