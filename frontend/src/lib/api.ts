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
    
    // Choose based on input text instead of pure random
    const lowered = input.toLowerCase();
    let baseId = 'wf-jira-incident'; // default
    if (lowered.includes('competitor') || lowered.includes('price') || lowered.includes('scrape') || lowered.includes('discord')) {
      baseId = 'wf-competitor-monitor';
    } else if (lowered.includes('pdf') || lowered.includes('invoice') || lowered.includes('trello') || lowered.includes('sheets')) {
      baseId = 'wf-pdf-invoices';
    } else if (lowered.includes('aws') || lowered.includes('cloudwatch') || lowered.includes('alarm')) {
      baseId = 'wf-aws-cloudwatch';
    } else if (lowered.includes('bug') || lowered.includes('jira') || lowered.includes('github')) {
      baseId = 'wf-jira-incident';
    } else {
      const cleanInput = input.replace(/[^a-zA-Z0-9 ]/g, "").substring(0, 60);
      baseId = 'wf-dynamic-' + encodeURIComponent(cleanInput);
    }
    
    // Make ID unique to allow parallel executions
    const id = `${baseId}-${Date.now()}`;
    resetSimulation(id);
    
    // Store in history
    const history = JSON.parse(localStorage.getItem('workflow_history') || '[]');
    history.unshift({ id, name: input.substring(0, 40) + '...', timestamp: Date.now() });
    localStorage.setItem('workflow_history', JSON.stringify(history));

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
