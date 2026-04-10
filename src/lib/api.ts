const API_BASE = 'http://localhost:8000';

export async function createWorkflow(input: string): Promise<{ workflow_id: string }> {
  const res = await fetch(`${API_BASE}/plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input }),
  });
  if (!res.ok) throw new Error(`Failed to create workflow: ${res.statusText}`);
  return res.json();
}

export async function getWorkflowStatus(id: string) {
  const res = await fetch(`${API_BASE}/status?id=${id}`);
  if (!res.ok) throw new Error(`Failed to fetch status: ${res.statusText}`);
  return res.json();
}

export async function approveNode(nodeId: string) {
  const res = await fetch(`${API_BASE}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ node_id: nodeId }),
  });
  if (!res.ok) throw new Error(`Failed to approve node: ${res.statusText}`);
  return res.json();
}
