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
  // GitHub API requires the PAT as a Bearer token — Basic Auth is deprecated
  const { password } = creds; // 'password' field = Personal Access Token
  try {
    const res = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `token ${password}`,
        'User-Agent': 'MCPGateway/1.0',
        'Accept': 'application/vnd.github+json',
      },
    });
    if (res.ok) {
      const data = await res.json();
      return { ok: true, detail: `Signed in as @${data.login} (${data.name || data.login})` };
    }
    const err = await res.json().catch(() => ({}));
    return { ok: false, detail: `HTTP ${res.status}: ${(err as any).message || 'Authentication failed. Check your PAT.'}` };
  } catch (e) {
    return { ok: false, detail: `Network error: ${String(e)}` };
  }
}

async function validateSlack(creds: Record<string, string>): Promise<{ ok: boolean; detail: string }> {
  // Mock: Slack doesn't expose password login via API — validate account format
  await new Promise(r => setTimeout(r, 900));
  const { email, password } = creds;
  if (email && password === 'admin123') {
    return { ok: true, detail: `Slack account ${email} connected (mock validation)` };
  }
  return { ok: false, detail: 'Invalid credentials. Password must be \'admin123\' for this demo.' };
}

async function validateJira(creds: Record<string, string>): Promise<{ ok: boolean; detail: string }> {
  // Mock validation: the user wants to securely collect the Account Password now
  // without triggering real frontend API calls, saving them for the backend later.
  const { domain, email, password } = creds;
  if (!domain || !email || !password) return { ok: false, detail: 'Missing required configuration fields.' };

  // Simulate network handshake
  await new Promise(r => setTimeout(r, 1200));

  if (password.length >= 6) {
    return { ok: true, detail: `Signed into Jira workspace ${domain} as ${email}` };
  }
  
  return { ok: false, detail: 'Invalid password. Must be at least 6 characters.' };
}

async function validateSheets(creds: Record<string, string>): Promise<{ ok: boolean; detail: string }> {
  // Mock: simulate Google account login
  await new Promise(r => setTimeout(r, 800));
  const { email, password } = creds;
  if (email && password === 'admin123') {
    return { ok: true, detail: `Google account ${email} connected (mock)` };
  }
  return { ok: false, detail: 'Invalid credentials. Password must be \'admin123\' for this demo.' };
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
