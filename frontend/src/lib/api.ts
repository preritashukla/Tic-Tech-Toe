import type { WorkflowStatus } from './types';
import { getMockWorkflowStatus, resetSimulation } from './mockData';

// ─── Configuration ───────────────────────────────────────────────────────────
// All requests go through Vite's dev proxy (/api → localhost:8000)
// This avoids all browser-level "Failed to fetch" and CORS issues.

const API_BASE = '/api';
export const WS_BASE = `ws://${window.location.host}`;
const USE_MOCK = false;

// ─── Retry Helper ─────────────────────────────────────────────────────────────
// Retries on network-level errors (e.g. backend still starting after restart).
// HTTP error codes (4xx/5xx) are NOT retried — only thrown TypeError/fetch failures.

async function fetchWithRetry(
  url: string,
  options?: RequestInit,
  maxAttempts = 5,
): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fetch(url, options);
    } catch (err) {
      lastError = err;
      // Only retry on network errors (TypeError), not logical HTTP errors
      if (!(err instanceof TypeError)) throw err;
      if (attempt < maxAttempts) {
        // Exponential backoff: 500ms, 1s, 2s, 4s
        const delay = Math.min(500 * 2 ** (attempt - 1), 4000);
        console.warn(`[api] Fetch attempt ${attempt} failed, retrying in ${delay}ms…`, url);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw new Error(
    `Backend is unreachable after ${maxAttempts} attempts. Make sure the server is running on port 8000.`
  );
}

// ─── API Functions ───────────────────────────────────────────────────────────

export async function createWorkflow(input: string): Promise<{ workflow_id: string }> {
  let resolvedId: string;

  if (USE_MOCK) {
    // Simulate network delay
    await new Promise((r) => setTimeout(r, 1500));

    // Choose based on input text instead of pure random
    const lowered = input.toLowerCase();
    let baseId = 'wf-jira-incident'; // default
    if (
      lowered.includes('competitor') ||
      lowered.includes('price') ||
      lowered.includes('scrape') ||
      lowered.includes('discord')
    ) {
      baseId = 'wf-competitor-monitor';
    } else if (
      lowered.includes('pdf') ||
      lowered.includes('invoice') ||
      lowered.includes('trello') ||
      lowered.includes('sheets')
    ) {
      baseId = 'wf-pdf-invoices';
    } else if (
      lowered.includes('aws') ||
      lowered.includes('cloudwatch') ||
      lowered.includes('alarm')
    ) {
      baseId = 'wf-aws-cloudwatch';
    } else if (lowered.includes('bug') || lowered.includes('jira') || lowered.includes('github')) {
      baseId = 'wf-jira-incident';
    } else {
      const cleanInput = input.replace(/[^a-zA-Z0-9 ]/g, '').substring(0, 60);
      baseId = 'wf-dynamic-' + encodeURIComponent(cleanInput);
    }

    // Make ID unique to allow parallel executions
    resolvedId = `${baseId}-${Date.now()}`;
    resetSimulation(resolvedId);
  } else {
    const res = await fetchWithRetry(`${API_BASE}/plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input }),
    });
    if (!res.ok) throw new Error(`Failed to create workflow: ${res.statusText}`);
    const data = await res.json();
    resolvedId = data.workflow_id;
  }

  // Store in history
  const history = JSON.parse(localStorage.getItem('workflow_history') || '[]');
  history.unshift({ id: resolvedId, name: input.substring(0, 40) + '...', timestamp: Date.now() });
  localStorage.setItem('workflow_history', JSON.stringify(history));

  return { workflow_id: resolvedId };
}

export async function getWorkflowStatus(id: string): Promise<WorkflowStatus> {
  if (USE_MOCK) {
    return getMockWorkflowStatus(id);
  }

  const res = await fetchWithRetry(`${API_BASE}/status?id=${id}`);
  if (res.status === 404) {
    // Workflow was in localStorage but server restarted — clear it
    const history: { id: string }[] = JSON.parse(localStorage.getItem('workflow_history') || '[]');
    localStorage.setItem('workflow_history', JSON.stringify(history.filter((h) => h.id !== id)));
    throw new Error(`Workflow "${id}" is no longer in server memory (server was restarted). Please run a new workflow.`);
  }
  if (!res.ok) throw new Error(`Failed to fetch status: ${res.statusText}`);
  return res.json();
}

export async function approveNode(
  workflowId: string,
  nodeId: string,
  approved: boolean = true,
): Promise<{ success: boolean }> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 800));
    return { success: true };
  }

  const res = await fetchWithRetry(`${API_BASE}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ workflow_id: workflowId, node_id: nodeId, approved }),
  });
  if (!res.ok) throw new Error(`Failed to approve node: ${res.statusText}`);
  return res.json();
}
