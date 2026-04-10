export type NodeStatus = 'pending' | 'running' | 'done' | 'failed' | 'waiting_approval';

export interface WorkflowNode {
  id: string;
  title: string;
  status: NodeStatus;
  timestamp?: string;
}

export interface WorkflowStatus {
  workflow_id: string;
  nodes: WorkflowNode[];
  edges: { source: string; target: string }[];
}

export interface AuditEntry {
  node_id: string;
  title: string;
  status: NodeStatus;
  timestamp: string;
}
