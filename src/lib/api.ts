import type { WorkflowStatus } from './types';
import { getMockWorkflowStatus, getRandomWorkflowId, resetSimulation } from './mockData';

// ─── Configuration ───────────────────────────────────────────────────────────
// Set USE_MOCK to false when the real backend (Shivam's API) is running.
// When true, the app works fully standalone with simulated real-time execution.

const API_BASE = 'http://localhost:8000';
const USE_MOCK = true;

// ─── API Functions ───────────────────────────────────────────────────────────

export async function createWorkflow(input: string): Promise<{ workflow_id: string }> {
  if (USE_MOCK) {
    // Simulate network delay
    await new Promise((r) => setTimeout(r, 1500));
    const id = getRandomWorkflowId();
    resetSimulation(id);
    return { workflow_id: id };
  }

  const res = await fetch(`${API_BASE}/plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input }),
  });
  if (!res.ok) throw new Error(`Failed to create workflow: ${res.statusText}`);
  return res.json();
}

export async function getWorkflowStatus(id: string): Promise<WorkflowStatus> {
  if (USE_MOCK) {
    return getMockWorkflowStatus(id);
  }

  const res = await fetch(`${API_BASE}/status?id=${id}`);
  if (!res.ok) throw new Error(`Failed to fetch status: ${res.statusText}`);
  return res.json();
}

export async function approveNode(nodeId: string): Promise<{ success: boolean }> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 800));
    return { success: true };
  }

  const res = await fetch(`${API_BASE}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ node_id: nodeId }),
  });
  if (!res.ok) throw new Error(`Failed to approve node: ${res.statusText}`);
  return res.json();
}
