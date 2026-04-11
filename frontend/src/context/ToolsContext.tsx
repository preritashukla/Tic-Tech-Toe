import { createContext, useContext, useState, ReactNode } from 'react';

export type ToolStatus = 'idle' | 'connecting' | 'connected' | 'error';

export interface ToolState {
  status: ToolStatus;
  token: string;
  errorMsg?: string;
  detail?: string;
}

export type ToolName = 'github' | 'jira' | 'slack' | 'sheets';

export interface ToolsContextType {
  tools: Record<ToolName, ToolState>;
  connect: (tool: ToolName, credentialsJson: string) => Promise<void>;
  reset: (tool: ToolName) => void;
  allConnected: boolean;
}

const DEFAULT: ToolState = { status: 'idle', token: '' };

const ToolsContext = createContext<ToolsContextType | null>(null);

// ─── Validators ───────────────────────────────────────────────────
// Each validator receives a parsed credentials object.

async function validateGitHub(creds: Record<string, string>): Promise<{ ok: boolean; detail: string }> {
  // Use username + personal access token to call GitHub API
  const { username, password } = creds;
  try {
    const res = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Basic ${btoa(`${username}:${password}`)}`,
        'User-Agent': 'MCPGateway/1.0',
      },
    });
    if (res.ok) {
      const data = await res.json();
      return { ok: true, detail: `Signed in as @${data.login} (${data.name || data.login})` };
    }
    const err = await res.json().catch(() => ({}));
    return { ok: false, detail: `HTTP ${res.status}: ${(err as any).message || 'Authentication failed'}` };
  } catch (e) {
    return { ok: false, detail: `Network error: ${String(e)}` };
  }
}

async function validateSlack(creds: Record<string, string>): Promise<{ ok: boolean; detail: string }> {
  const { token } = creds;
  try {
    const res = await fetch('https://slack.com/api/auth.test', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    const data = await res.json();
    if (data.ok) return { ok: true, detail: `Workspace: ${data.team}, User: ${data.user}` };
    return { ok: false, detail: `Slack error: ${data.error}` };
  } catch (e) {
    return { ok: false, detail: `Network error: ${String(e)}` };
  }
}

async function validateJira(creds: Record<string, string>): Promise<{ ok: boolean; detail: string }> {
  // Mock: simulate account login check
  await new Promise(r => setTimeout(r, 900));
  const { email, password } = creds;
  if (email && password && password.length >= 6) {
    return { ok: true, detail: `Jira account ${email} connected (mock)` };
  }
  return { ok: false, detail: 'Invalid credentials. Password must be at least 6 characters.' };
}

async function validateSheets(creds: Record<string, string>): Promise<{ ok: boolean; detail: string }> {
  // Mock: simulate Google account login
  await new Promise(r => setTimeout(r, 800));
  const { email, password } = creds;
  if (email && password && password.length >= 6) {
    return { ok: true, detail: `Google account ${email} connected (mock)` };
  }
  return { ok: false, detail: 'Invalid credentials. Please use your Google account password.' };
}

const VALIDATORS: Record<ToolName, (creds: Record<string, string>) => Promise<{ ok: boolean; detail: string }>> = {
  github: validateGitHub,
  slack:  validateSlack,
  jira:   validateJira,
  sheets: validateSheets,
};

// ─── Provider ─────────────────────────────────────────────────────

export const ToolsProvider = ({ children }: { children: ReactNode }) => {
  const [tools, setTools] = useState<Record<ToolName, ToolState>>({
    github: { ...DEFAULT },
    jira:   { ...DEFAULT },
    slack:  { ...DEFAULT },
    sheets: { ...DEFAULT },
  });

  const connect = async (tool: ToolName, credentialsJson: string) => {
    setTools(p => ({ ...p, [tool]: { status: 'connecting', token: credentialsJson } }));

    let creds: Record<string, string> = {};
    try { creds = JSON.parse(credentialsJson); } catch { creds = { token: credentialsJson }; }

    const { ok, detail } = await VALIDATORS[tool](creds);

    setTools(p => ({
      ...p,
      [tool]: {
        status: ok ? 'connected' : 'error',
        token: credentialsJson,
        detail,
        errorMsg: ok ? undefined : detail,
      },
    }));
  };

  const reset = (tool: ToolName) => {
    setTools(p => ({ ...p, [tool]: { ...DEFAULT } }));
  };

  const allConnected = Object.values(tools).every(t => t.status === 'connected');

  return (
    <ToolsContext.Provider value={{ tools, connect, reset, allConnected }}>
      {children}
    </ToolsContext.Provider>
  );
};

export const useTools = () => {
  const ctx = useContext(ToolsContext);
  if (!ctx) throw new Error('useTools must be used within ToolsProvider');
  return ctx;
};
