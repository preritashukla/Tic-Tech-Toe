import { useMemo } from 'react';
import { ReactFlow, Background, Controls, MarkerType } from '@xyflow/react';
import NodeCard from './NodeCard';
import type { WorkflowNode } from '@/lib/types';
import { Box, Skeleton } from '@mui/material';

interface DAGViewerProps {
  nodes: WorkflowNode[];
  edges: { source: string; target: string }[];
  loading?: boolean;
}

const nodeTypes = { custom: NodeCard };

const DAGViewer = ({ nodes, edges, loading }: DAGViewerProps) => {
  const flowNodes = useMemo(
    () =>
      nodes.map((n, i) => ({
        id: n.id,
        type: 'custom' as const,
        position: { x: i * 260, y: 100 },
        data: { title: n.title, status: n.status },
      })),
    [nodes]
  );

  const flowEdges = useMemo(
    () =>
      edges.map((e) => ({
        id: `${e.source}-${e.target}`,
        source: e.source,
        target: e.target,
        markerEnd: { type: MarkerType.ArrowClosed, color: 'hsl(217, 33%, 30%)' },
        animated: true,
      })),
    [edges]
  );

  if (loading) {
    return (
      <Box className="flex-1 flex items-center justify-center gap-6 p-8">
        {[1, 2, 3].map((i) => (
          <Skeleton
            key={i}
            variant="rounded"
            width={180}
            height={80}
            sx={{ bgcolor: 'hsl(217, 33%, 15%)', borderRadius: 3 }}
          />
        ))}
      </Box>
    );
  }

  return (
    <Box className="flex-1" sx={{ minHeight: 400 }}>
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        fitView
        proOptions={{ hideAttribution: true }}
        nodesDraggable={false}
        nodesConnectable={false}
        panOnDrag
        zoomOnScroll
      >
        <Background gap={24} size={1} color="hsl(217, 33%, 15%)" />
        <Controls
          style={{ background: 'hsl(222, 47%, 9%)', borderColor: 'hsl(217, 33%, 20%)', borderRadius: 12 }}
        />
      </ReactFlow>
    </Box>
  );
};

export default DAGViewer;
