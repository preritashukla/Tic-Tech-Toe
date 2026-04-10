import type { WorkflowStatus, WorkflowNode } from './types';

// ─── Mock Workflows ──────────────────────────────────────────────────────────
// These represent realistic MCP Gateway scenarios matching the problem statement.
// Each workflow shows cross-service orchestration with proper data flow.

const MOCK_WORKFLOWS: Record<string, WorkflowStatus> = {
  'wf-jira-incident': {
    workflow_id: 'wf-jira-incident',
    title: 'Critical Bug → GitHub Branch → Slack Alert → Tracker Update',
    nodes: [
      {
        id: 'n1',
        title: 'Detect Jira Issue',
        description: 'Monitor Jira for new critical bugs via MCP connector',
        status: 'done',
        tool: 'jira',
        timestamp: new Date(Date.now() - 45000).toISOString(),
        duration: '1.2s',
        result: 'JIRA-4521: Auth service returning 500 on token refresh',
        inputs: { project: 'PROD', priority: 'Critical' },
        outputs: { issue_key: 'JIRA-4521', summary: 'Auth 500 on token refresh', assignee: 'on-call' },
      },
      {
        id: 'n2',
        title: 'Create GitHub Branch',
        description: 'Create a hotfix branch from main with Jira reference',
        status: 'done',
        tool: 'github',
        timestamp: new Date(Date.now() - 38000).toISOString(),
        duration: '2.8s',
        result: 'Branch hotfix/JIRA-4521-auth-fix created from main',
        inputs: { repo: 'acme/auth-service', base: 'main' },
        outputs: { branch: 'hotfix/JIRA-4521-auth-fix', sha: 'a3b7c9d' },
      },
      {
        id: 'n3',
        title: 'Notify Slack On-Call',
        description: 'Send alert to #incidents channel and DM on-call engineer',
        status: 'running',
        tool: 'slack',
        inputs: { channel: '#incidents', mention: '@oncall' },
      },
      {
        id: 'n4',
        title: 'Approve Deploy',
        description: 'Human-in-the-loop gate: approve hotfix deployment to staging',
        status: 'waiting_approval',
        tool: 'generic',
        inputs: { environment: 'staging', branch: 'hotfix/JIRA-4521-auth-fix' },
      },
      {
        id: 'n5',
        title: 'Update Incident Tracker',
        description: 'Log resolution timeline in Google Sheets tracker',
        status: 'pending',
        tool: 'sheets',
        inputs: { spreadsheet: 'Incident Tracker 2026', tab: 'April' },
      },
    ],
    edges: [
      { source: 'n1', target: 'n2' },
      { source: 'n2', target: 'n3' },
      { source: 'n3', target: 'n4' },
      { source: 'n4', target: 'n5' },
    ],
  },
  'wf-competitor-monitor': {
    workflow_id: 'wf-competitor-monitor',
    title: 'Scrape Prices → Analyze Trends → Alert on Changes → Update Dashboard',
    nodes: [
      {
        id: 'c1',
        title: 'Scrape Competitor Prices',
        description: 'Fetch latest pricing data from competitor product pages',
        status: 'done',
        tool: 'generic',
        timestamp: new Date(Date.now() - 60000).toISOString(),
        duration: '4.1s',
        result: 'Scraped 47 products from 3 competitors',
        outputs: { products_count: '47', competitors: '3' },
      },
      {
        id: 'c2',
        title: 'Analyze with GPT',
        description: 'Compare against historical data and identify significant changes',
        status: 'done',
        tool: 'generic',
        timestamp: new Date(Date.now() - 50000).toISOString(),
        duration: '3.5s',
        result: '5 significant price changes detected (> 10% delta)',
        outputs: { changes_detected: '5', avg_delta: '14.2%' },
      },
      {
        id: 'c3',
        title: 'Post to Discord',
        description: 'Send price change alerts to #market-intel Discord channel',
        status: 'running',
        tool: 'discord',
        inputs: { channel: '#market-intel', mentions: '@pricing-team' },
      },
      {
        id: 'c4',
        title: 'Update Airtable',
        description: 'Log price history and trend analysis to Airtable base',
        status: 'pending',
        tool: 'airtable',
        inputs: { base: 'Price Intelligence', table: 'Competitor Prices' },
      },
      {
        id: 'c5',
        title: 'Create Trello Card',
        description: 'Create action item for pricing team to review changes',
        status: 'pending',
        tool: 'trello',
        inputs: { board: 'Pricing Ops', list: 'To Review' },
      },
    ],
    edges: [
      { source: 'c1', target: 'c2' },
      { source: 'c2', target: 'c3' },
      { source: 'c2', target: 'c4' },
      { source: 'c3', target: 'c5' },
    ],
  },
};

// ─── Simulation Engine ───────────────────────────────────────────────────────
// Simulates real-time execution by advancing node statuses over time.

const simulationState: Record<string, { nodes: WorkflowNode[]; startTime: number }> = {};

function getSimulatedStatus(workflowId: string): WorkflowStatus {
  const base = MOCK_WORKFLOWS[workflowId];
  if (!base) {
    // Default to first workflow for any unknown ID
    const defaultWf = MOCK_WORKFLOWS['wf-jira-incident'];
    return simulateProgress(defaultWf);
  }
  return simulateProgress(base);
}

function simulateProgress(wf: WorkflowStatus): WorkflowStatus {
  const key = wf.workflow_id;
  if (!simulationState[key]) {
    simulationState[key] = {
      nodes: wf.nodes.map((n) => ({ ...n })),
      startTime: Date.now(),
    };
    // Reset all to pending for simulation
    simulationState[key].nodes.forEach((n) => {
      n.status = 'pending';
      n.timestamp = undefined;
      n.duration = undefined;
      n.result = undefined;
    });
  }

  const state = simulationState[key];
  const elapsed = Date.now() - state.startTime;

  // Each node takes ~4s. Sequential based on edges.
  const nodeTimings = [0, 4000, 8000, 12000, 18000]; // start times for each node
  const nodeDurations = [3000, 3500, 3000, 5000, 3000]; // how long each runs

  state.nodes.forEach((node, i) => {
    const startAt = nodeTimings[i] || i * 4000;
    const dur = nodeDurations[i] || 3000;
    const original = wf.nodes[i];

    if (elapsed < startAt) {
      node.status = 'pending';
      node.timestamp = undefined;
      node.duration = undefined;
      node.result = undefined;
    } else if (elapsed < startAt + dur) {
      // Check if this node should be waiting_approval
      if (original.status === 'waiting_approval' || original.description?.toLowerCase().includes('approve')) {
        node.status = 'waiting_approval';
      } else {
        node.status = 'running';
      }
      node.timestamp = new Date(state.startTime + startAt).toISOString();
    } else {
      node.status = 'done';
      node.timestamp = new Date(state.startTime + startAt).toISOString();
      node.duration = `${(dur / 1000).toFixed(1)}s`;
      node.result = original.result || `Completed successfully`;
      if (original.outputs) node.outputs = original.outputs;
    }
  });

  return {
    ...wf,
    nodes: state.nodes.map((n) => ({ ...n })),
  };
}

// ─── Exports ─────────────────────────────────────────────────────────────────

export function getRandomWorkflowId(): string {
  const keys = Object.keys(MOCK_WORKFLOWS);
  return keys[Math.floor(Math.random() * keys.length)];
}

export function getMockWorkflowStatus(id: string): WorkflowStatus {
  return getSimulatedStatus(id);
}

export function resetSimulation(id: string): void {
  delete simulationState[id];
}

export { MOCK_WORKFLOWS };
