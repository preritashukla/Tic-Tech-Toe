import { useState, useRef, useEffect } from "react";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import { useTools } from "./context/ToolsContext";

const SUGGESTED_PROMPTS = [
  "Critical bug in Jira → create GitHub branch → notify #all-daiict on Slack",
  "Send a message to #all-daiict on Slack: 'System is live!'",
  "Fetch latest GitHub commits and post a summary to Slack #all-daiict",
  "Create Jira ticket → append row to Google Sheets → notify Slack #all-daiict",
];

const CONNECTED_TOOLS = [
  { name: "GitHub Integration", path: "/connect-tools" },
  { name: "Jira Integration", path: "/connect-tools" },
  { name: "Slack Integration", path: "/connect-tools" },
  { name: "Google Sheets", path: "/connect-tools" },
];

const TOOL_ICONS: Record<string, string> = {
  slack: "💬",
  github: "🐙",
  jira: "🔵",
  sheets: "📊",
  generic: "⚙️",
};

const TOOL_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  slack:   { bg: "#1a0f2e", border: "#4a1a7a", text: "#a78bfa" },
  github:  { bg: "#0d1117", border: "#2ea043", text: "#56d364" },
  jira:    { bg: "#0a1a3a", border: "#1e6fd6", text: "#79c0ff" },
  sheets:  { bg: "#0a2a1a", border: "#1a7a4a", text: "#4ade80" },
  generic: { bg: "#161b22", border: "#30363d", text: "#8b949e" },
};

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; color: string; dot: string }> = {
    done:    { bg: "#0d3320", color: "#4ade80", dot: "#4ade80" },
    success: { bg: "#0d3320", color: "#4ade80", dot: "#4ade80" },
    failed:  { bg: "#3d1117", color: "#f85149", dot: "#f85149" },
    running: { bg: "#0d2744", color: "#58a6ff", dot: "#58a6ff" },
    pending: { bg: "#1c1c1c", color: "#7d8590", dot: "#7d8590" },
    skipped: { bg: "#212121", color: "#8b949e", dot: "#8b949e" },
  };
  const c = colors[status] || colors.pending;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      background: c.bg, color: c.color, fontSize: 11,
      padding: "2px 8px", borderRadius: 99, fontFamily: "monospace",
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: c.dot, display: "inline-block" }} />
      {status}
    </span>
  );
}

function DAGNode({ label, sublabel, server, left, top, status, tool }: any) {
  const isSuccess = status === "done" || status === "success";
  const isFailed  = status === "failed";
  const tc = TOOL_COLORS[tool] || TOOL_COLORS.generic;
  const borderColor = isSuccess ? tc.border : isFailed ? "#f85149" : "#30363d";
  const bgColor     = isSuccess ? tc.bg     : isFailed ? "#2d1117" : "#161b22";
  return (
    <div style={{
      position: "absolute", left, top,
      background: bgColor, border: `1px solid ${borderColor}`,
      borderRadius: 10, padding: "10px 14px", width: 175, fontSize: 12, color: "#e6edf3",
      boxShadow: isSuccess ? `0 0 12px ${tc.border}44` : "none",
      transition: "box-shadow 0.4s",
    }}>
      <div style={{ color: "#7d8590", fontSize: 10, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>
        {TOOL_ICONS[tool] || "⚙️"} {server}
      </div>
      <div style={{ fontFamily: "monospace", color: tc.text, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {label}
      </div>
      <div style={{ color: "#7d8590", fontSize: 11, marginBottom: 8 }}>{sublabel}</div>
      <StatusBadge status={status} />
    </div>
  );
}

function DAGVisualization({ dag }: { dag: any }) {
  if (!dag || !dag.nodes) return null;
  return (
    <div style={{ position: "relative", height: 160, margin: "12px 0", overflowX: "auto", overflowY: "hidden", whiteSpace: "nowrap" }}>
      {dag.nodes.map((n: any, i: number) => (
        <DAGNode
          key={n.id}
          label={`${n.action}`}
          sublabel={`${n.tool} · ${n.action}`}
          server={`${n.tool} Server`}
          left={i * 205}
          top={20}
          status={n.status || "done"}
          tool={n.tool || "generic"}
        />
      ))}
      <svg style={{ position: "absolute", top: 0, left: 0, width: "100%", minWidth: dag.nodes.length * 205, height: "100%", pointerEvents: "none" }}>
        <defs>
          <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L0,6 L6,3 z" fill="#2ea043" />
          </marker>
        </defs>
        {dag.nodes.map((_: any, i: number) => {
          if (i === dag.nodes.length - 1) return null;
          return (
            <line key={i} x1={i * 205 + 177} y1={62} x2={(i + 1) * 205 - 2} y2={62}
              stroke="#2ea043" strokeWidth={1.5} markerEnd="url(#arrow)" strokeDasharray="4 2" />
          );
        })}
      </svg>
    </div>
  );
}

/** Rich card showing per-node real platform output */
function NodeResultCard({ r }: { r: any }) {
  const tool  = r.tool || "generic";
  const isOk  = r.status === "success" || r.status === "done";
  const out   = r.output || {};
  const tc    = TOOL_COLORS[tool] || TOOL_COLORS.generic;

  // build the highlight
  let url: string | null = null;
  let primaryLine = "";
  let secondaryLine = "";

  if (tool === "slack" && isOk) {
    primaryLine   = `Message sent to ${out.channel || "#channel"}`;
    secondaryLine = out.ts ? `ts: ${out.ts}` : "";
  } else if (tool === "jira" && isOk) {
    const key = out.key || out.issue_id;
    url         = out.url || (key ? `https://agenticmcpgateway.atlassian.net/browse/${key}` : null);
    primaryLine   = key ? `Ticket created: ${key}` : "Jira action completed";
    secondaryLine = url ? "Click to open in Jira" : "";
  } else if (tool === "github" && isOk) {
    url = out.branch_url || out.pr_url || out.issue_url || out.commit_url || out.file_html_url || out.release_url || null;
    if (out.branch_name)   primaryLine = `Branch created: ${out.branch_name}`;
    else if (out.pr_number) primaryLine = `PR #${out.pr_number}: ${out.pr_title || ""}`;
    else if (out.issue_number) primaryLine = `Issue #${out.issue_number} created`;
    else if (out.merge_sha) primaryLine = `Merged — sha: ${out.merge_sha?.slice(0, 8)}`;
    else if (out.release_tag) primaryLine = `Release: ${out.release_tag}`;
    else if (out.commit_count != null) primaryLine = `${out.commit_count} commits fetched`;
    else primaryLine = "GitHub action completed";
    secondaryLine = out.branch_ref || out.pr_url || "";
  } else if (tool === "sheets" && isOk) {
    primaryLine   = out.row_updated != null ? `Row ${out.row_updated} updated` : out.row_id ? `Row ${out.row_id} appended` : "Sheet updated";
    secondaryLine = "";
  } else if (!isOk) {
    primaryLine   = r.error || "Action failed";
    secondaryLine = "";
  } else {
    primaryLine   = `${r.action} completed`;
    secondaryLine = "";
  }

  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 10,
      background: isOk ? tc.bg : "#3d1117",
      border: `1px solid ${isOk ? tc.border : "#f85149"}`,
      borderRadius: 8, padding: "8px 12px", marginBottom: 6,
    }}>
      <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>{TOOL_ICONS[tool] || "⚙️"}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: tc.text, textTransform: "uppercase", letterSpacing: 0.5 }}>
            {tool}
          </span>
          <span style={{ fontSize: 11, color: "#7d8590" }}>·</span>
          <span style={{ fontSize: 11, color: "#7d8590", fontFamily: "monospace" }}>{r.action}</span>
          <span style={{ marginLeft: "auto" }}><StatusBadge status={r.status} /></span>
        </div>
        <div style={{ fontSize: 12, color: isOk ? "#e6edf3" : "#f85149", fontWeight: 500 }}>{primaryLine}</div>
        {secondaryLine && (
          <div style={{ fontSize: 11, color: "#7d8590", fontFamily: "monospace", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {secondaryLine}
          </div>
        )}
        {url && (
          <a href={url} target="_blank" rel="noopener noreferrer" style={{
            display: "inline-flex", alignItems: "center", gap: 4, marginTop: 4,
            fontSize: 11, color: tc.text, textDecoration: "none",
            background: `${tc.border}22`, border: `1px solid ${tc.border}55`,
            borderRadius: 6, padding: "2px 8px", fontFamily: "monospace",
          }}>
            🔗 Open live link ↗
          </a>
        )}
        {r.duration_ms > 0 && (
          <span style={{ fontSize: 10, color: "#484f58", marginTop: 2, display: "block" }}>
            ⏱ {Math.round(r.duration_ms)}ms{r.retries > 0 ? ` · ${r.retries} retries` : ""}
          </span>
        )}
      </div>
    </div>
  );
}

function AuditLog({ steps }: { steps: string[] }) {
  return (
    <div style={{
      background: "#0d1117", border: "1px solid #30363d", borderRadius: 10,
      padding: "12px 16px", marginTop: 8, fontSize: 12,
    }}>
      <div style={{ color: "#7d8590", fontSize: 11, marginBottom: 8, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
        Audit Log — {steps.length} events
      </div>
      {steps.map((s, i) => {
        const isObject = typeof s === 'object';
        const label = isObject ? s.label : s;
        const status = isObject ? s.status : (s.includes('[failed') ? 'failed' : s.includes('[skipped') ? 'skipped' : 'success');
        
        const icon = status === 'failed' ? '✕' : status === 'skipped' ? '⊘' : '✓';
        const color = status === 'failed' ? '#f85149' : status === 'skipped' ? '#7d8590' : '#2ea043';

        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", borderBottom: i < steps.length - 1 ? "1px solid #21262d" : "none" }}>
            <span style={{ color, fontSize: 14, fontWeight: 700 }}>{icon}</span>
            <span style={{ fontFamily: "monospace", color: status === 'failed' ? '#f85149' : '#79c0ff' }}>{label}</span>
          </div>
        );
      })}
    </div>
  );
}

function ThinkingDots() {
  return (
    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 6, height: 6, borderRadius: "50%", background: "#4ade80",
          animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`, opacity: 0.7,
        }} />
      ))}
      <style>{`@keyframes pulse { 0%,100%{transform:scale(1);opacity:0.4} 50%{transform:scale(1.4);opacity:1} }`}</style>
    </div>
  );
}

function ChatMessage({ msg, onEdit }: { msg: any; onEdit: (msg: any) => void }) {
  const [hovering, setHovering] = useState(false);

  if (msg.role === "user") {
    return (
      <div
        style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, maxWidth: "75%" }}>
          {hovering && (
            <button
              onClick={() => onEdit(msg)}
              style={{
                background: "transparent", border: "1px solid #30363d", color: "#7d8590",
                borderRadius: 6, padding: "4px 8px", cursor: "pointer", fontSize: 11,
                alignSelf: "center", whiteSpace: "nowrap",
              }}
            >
              ✏️ Edit
            </button>
          )}
          <div style={{
            background: "#21262d", borderRadius: "18px 18px 4px 18px",
            padding: "10px 16px", color: "#e6edf3", fontSize: 14, lineHeight: 1.6,
          }}>
            {msg.content}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <div style={{
          width: 28, height: 28, borderRadius: "50%",
          background: "linear-gradient(135deg, #0d3320, #1a5c3a)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 12, color: "#4ade80", fontWeight: 700, flexShrink: 0,
        }}>A</div>
        <span style={{ color: "#7d8590", fontSize: 12 }}>Agentic MCP</span>
      </div>
      <div style={{ paddingLeft: 38 }}>
        {/* Thinking / status line */}
        {msg.thinking && (
          <div style={{
            color: "#7d8590", fontSize: 12, fontStyle: "italic",
            marginBottom: 10, padding: "6px 12px",
            borderLeft: "2px solid #30363d",
          }}>
            {msg.thinking}
          </div>
        )}

        {/* Main content or spinner */}
        {msg.isThinking ? (
          <ThinkingDots />
        ) : (
          <>
            {msg.content && (
              <div style={{ color: "#e6edf3", fontSize: 14, lineHeight: 1.7, marginBottom: 8 }}>
                {msg.content}
              </div>
            )}

            {/* DAG visualization */}
            {msg.dagData && <DAGVisualization dag={msg.dagData} />}

            {/* Per-node live platform result cards */}
            {msg.nodeDetails && msg.nodeDetails.length > 0 && (
              <div style={{ marginTop: 10, marginBottom: 4 }}>
                <div style={{ fontSize: 11, color: "#7d8590", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
                  Live Platform Results
                </div>
                {msg.nodeDetails.map((r: any) => <NodeResultCard key={r.node_id} r={r} />)}
              </div>
            )}

            {/* Audit log */}
            {msg.audit && msg.audit.length > 0 && <AuditLog steps={msg.audit} />}
          </>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [editingMsg, setEditingMsg] = useState<any>(null);
  const [chatStarted, setChatStarted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeNav, setActiveNav] = useState("dashboard");
  const [slackMsg, setSlackMsg] = useState("");
  const [slackSending, setSlackSending] = useState(false);
  const [slackResult, setSlackResult] = useState<{ ok: boolean; text: string } | null>(null);
  const { tools } = useTools();
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { id } = useParams();
  
  // Capture Jira OAuth credentials from URL on mount
    const jiraToken = searchParams.get("jira_token");
    const jiraCloudId = searchParams.get("jira_cloud_id");
    const slackToken = searchParams.get("slack_token");
    const googleToken = searchParams.get("google_token");

    if (jiraToken && jiraCloudId) {
      localStorage.setItem("jira_access_token", jiraToken);
      localStorage.setItem("jira_cloud_id", jiraCloudId);
    }
    if (slackToken) {
      localStorage.setItem("slack_access_token", slackToken);
    }
    if (googleToken) {
      localStorage.setItem("google_access_token", googleToken);
    }

    if (jiraToken || slackToken || googleToken) {
      // Clean URL
      setSearchParams({});
    }

  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch("/api/active-workflows");
        if (res.ok) {
          const data = await res.json();
          const wfs = (data.workflows || []).sort((a: any, b: any) => b.created_at - a.created_at);
          setHistory(wfs);
        }
      } catch (err) { }
    };
    fetchHistory();
    const intv = setInterval(fetchHistory, 3000);
    return () => clearInterval(intv);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-load history from URL ID
  useEffect(() => {
    if (id && history.length > 0) {
      // Don't auto-load if we're already viewing this workflow (prevents infinite loop)
      const isAlreadyBrowsing = messages.some(m => m.thinking?.includes(id));
      const isAlreadyPlanning = messages.some(m => m.isThinking && m.thinking?.includes(id));
      
      if (!isAlreadyBrowsing && !isAlreadyPlanning) {
        const item = history.find(h => h.workflow_id === id);
        if (item) startWithHistory(item);
      }
    }
  }, [id, history]);

  const autoResize = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 200) + "px";
  };

  // ─── Main workflow execution ─────────────────────────────────────
  const handleSend = async (text?: string) => {
    const content = (text || input).trim();
    if (!content) return;

    if (editingMsg) {
      const idx = messages.findIndex((m: any) => m.id === editingMsg.id);
      const sliced = messages.slice(0, idx);
      const newUserMsg = { id: Date.now(), role: "user", content };
      setMessages([...sliced, newUserMsg]);
      setEditingMsg(null);
    } else {
      setMessages(prev => [...prev, { id: Date.now(), role: "user", content }]);
    }

    setInput("");
    setChatStarted(true);
    setIsLoading(true);

    const thinkingId = Date.now() + 1;
    setMessages(prev => [...prev, {
      id: thinkingId, role: "assistant",
      thinking: "🧠 Generating execution plan via LLM…",
      content: "", isThinking: true,
    }]);

    try {
      // Extract sliding window of history (last 10 messages)
      const chatHistory = messages
        .filter(m => !m.isThinking && m.content)
        .slice(-10)
        .map(m => ({ role: m.role, content: m.content }));

      const planRes = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          user_input: content,
          context: { history: chatHistory }
        }),
      });

      if (!planRes.ok) {
        const errData = await planRes.json().catch(() => ({}));
        throw new Error(errData.detail || "Planning failed: " + planRes.status);
      }

      const planData = await planRes.json();
      if (!planData.success || !planData.dag) {
        throw new Error(planData.errors?.join(", ") || "Failed to generate execution plan");
      }

      const dag = planData.dag;

      setMessages(prev => prev.map((m: any) => m.id === thinkingId ? {
        ...m,
        thinking: `✅ Plan ready — ${dag.nodes?.length || 0} steps planned. Dispatching to live platforms…`,
      } : m));

      const jiraToken = localStorage.getItem("jira_access_token");
      const jiraCloudId = localStorage.getItem("jira_cloud_id");
      const slackToken = localStorage.getItem("slack_access_token");
      const googleToken = localStorage.getItem("google_access_token");
      const googleSheetId = localStorage.getItem("google_sheets_id");
      
      const userCredentials: Record<string, any> = {};
      
      // Preferred: OAuth credentials from localStorage
      if (jiraToken && jiraCloudId) {
        userCredentials.jira = {
          access_token: jiraToken,
          cloud_id: jiraCloudId
        };
      }
      if (slackToken) {
        userCredentials.slack = { access_token: slackToken };
      }
      if (googleToken) {
        userCredentials.sheets = { 
          access_token: googleToken,
          spreadsheet_id: googleSheetId
        };
        userCredentials.google = { access_token: googleToken };
      }

      // Fallback: Manually entered credentials from ToolsContext
      Object.entries(tools).forEach(([name, state]: [string, any]) => {
        if (state.status === 'connected' && state.token) {
          // Only add if not already set by OAuth
          if (!userCredentials[name]) {
            try {
              userCredentials[name] = JSON.parse(state.token);
            } catch {
              userCredentials[name] = { token: state.token };
            }
          }
        }
      });

      // ── Step 2: Execute the Plan ──
      const execRes = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dag,
          auto_approve: true,
          dry_run: false,
          credentials: userCredentials,
        }),
      });

      if (!execRes.ok) {
        const errData = await execRes.json().catch(() => ({}));
        throw new Error(errData.detail || "Execution failed: " + execRes.status);
      }

      const execData = await execRes.json();

      // Build DAG visualization data (include output for rich display)
      const dagData = {
        nodes: (execData.results || []).map((r: any) => ({
          id: r.node_id,
          tool: r.tool || "generic",
          action: r.action || r.name,
          status: r.status,
          output: r.output,
        })),
      };

      // Build per-node rich detail cards
      const nodeDetails = (execData.results || []).map((r: any) => ({
        ...r,
        output: r.output || {},
      }));

      // Build audit strings
      const auditLogStrings: string[] = (execData.audit_log || []).map((log: any) => {
        if (log.event_type === "tool_success")
          return `${log.tool || log.details?.tool} → ${log.action || log.details?.action} [success]`;
        if (log.event_type === "tool_failure")
          return `${log.tool || log.details?.tool} → ${log.action || log.details?.action} [failed: ${log.details?.error || log.error}]`;
        return log.message || JSON.stringify(log);
      });

      const fallbackAudit = (execData.results || []).map((r: any) =>
        `${r.tool} → ${r.action} [${r.status}]`
      );

      const allOk = execData.failed === 0 && execData.succeeded > 0;
      let summary = "";
      if (allOk) {
        summary = `✅ All ${execData.total_nodes} step${execData.total_nodes !== 1 ? "s" : ""} executed on live platforms. (SUCCESS)`;
      } else {
        const failedNode = (execData.results || []).find((r: any) => r.status === "failed");
        if (failedNode) {
          summary = `❌ Workflow failed at: ${failedNode.action || failedNode.name || failedNode.tool || failedNode.node_id}`;
        } else {
          summary = `❌ Workflow FAILED.`;
        }
      }

      setMessages(prev => prev.map((m: any) => m.id === thinkingId ? {
        id: thinkingId,
        role: "assistant",
        thinking: `Execution ${execData.execution_id} — ${execData.total_nodes} nodes`,
        content: summary,
        dagData,
        nodeDetails,
        audit: auditLogStrings.length > 0 ? auditLogStrings : fallbackAudit,
        isThinking: false,
      } : m));

    } catch (e: any) {
      console.error("Workflow Engine Error:", e);
      const errorMsg = e.message
        ? (typeof e.message === "object" ? JSON.stringify(e.message) : e.message)
        : String(e);

      setMessages(prev => prev.map((m: any) => m.id === thinkingId ? {
        id: thinkingId,
        role: "assistant",
        content: "⚠️ Integration Error: " + errorMsg,
        isThinking: false,
      } : m));
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (msg: any) => {
    setEditingMsg(msg);
    setInput(msg.content);
    setChatStarted(true);
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const handleSuggestion = (text: string) => handleSend(text);

  // ── Slack Quick-Send ──────────────────────────────────────────────
  const handleSlackQuickSend = async () => {
    const text = slackMsg.trim();
    if (!text || slackSending) return;
    setSlackSending(true);
    setSlackResult(null);
    try {
      const res = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dag: {
            workflow_id: `slack-quick-${Date.now()}`,
            workflow_name: "Slack Quick Message",
            description: "Direct Slack message from dashboard",
            nodes: [{
              id: "node_1",
              name: "Send Slack Message",
              tool: "slack",
              action: "send_message",
              params: { channel: "#all-daiict", message: text },
              depends_on: [],
              requires_approval: false,
              retry: { max_attempts: 2, backoff_factor: 2, initial_delay: 1, timeout: 15 },
            }],
          },
          auto_approve: true,
          dry_run: false,
          credentials: {},
        }),
      });
      const data = await res.json();
      const nodeResult = data.results?.[0];
      const out = nodeResult?.output || {};
      if (nodeResult?.status === "success" || nodeResult?.status === "done") {
        setSlackResult({ ok: true, text: `✅ Message sent to ${out.channel || "#all-daiict"} (ts: ${out.ts || "ok"})` });
        setSlackMsg("");
      } else {
        setSlackResult({ ok: false, text: `❌ ${nodeResult?.error || data.detail || "Failed to send"}` });
      }
    } catch (e: any) {
      setSlackResult({ ok: false, text: `❌ ${e.message}` });
    } finally {
      setSlackSending(false);
    }
  };

  const startWithHistory = async (item: any) => {
    setChatStarted(true);
    setActiveNav("dashboard"); // Force back to chat if in logs
    setIsLoading(true);
    setInput("");
    setMessages([{ id: Date.now(), role: "user", content: item.title }]);
    
    // Sync URL if needed
    if (id !== item.workflow_id) {
      navigate(`/dashboard/${item.workflow_id}`);
    }

    try {
      const res = await fetch("/api/status?id=" + encodeURIComponent(item.workflow_id));
      if (res.ok) {
        const statusData = await res.json();
        const nodes = statusData.nodes || [];
        const succeeded = nodes.filter((n: any) => n.status === "done" || n.status === "success").length;
        const failed = nodes.filter((n: any) => n.status === "failed").length;

        const dagData = {
          nodes: nodes.map((n: any) => ({
            id: n.id,
            tool: n.tool || "generic",
            action: n.title || n.action || n.id,
            status: n.status || "done",
            output: n.output || n.outputs || {},
          })),
        };

        const nodeDetails = nodes.map((n: any) => ({
          node_id: n.id,
          tool: n.tool || "generic",
          action: n.action || n.title || n.id,
          status: n.status || "done",
          output: n.output || n.outputs || {},
          error: n.error,
          duration_ms: n.duration_ms || 0,
          retries: n.retries || 0,
        }));

        setMessages(prev => [...prev, {
          id: Date.now() + 1,
          role: "assistant",
          thinking: `Workflow ${item.workflow_id} — restoring view`,
          content: `${succeeded}/${nodes.length} steps succeeded${failed > 0 ? `, ${failed} failed` : ""}.`,
          dagData,
          nodeDetails,
          audit: nodes.map((n: any) => `${n.tool || "generic"} → ${n.action || n.title} [${n.status}]`),
          isThinking: false,
        }]);
      }
    } catch (e) { }
    setIsLoading(false);
  };

  // ─── Render ───────────────────────────────────────────────────────
  return (
    <div style={{
      display: "flex", height: "100vh", background: "#0d1117",
      fontFamily: "'Segoe UI', system-ui, sans-serif", color: "#e6edf3",
      overflow: "hidden",
    }}>
      {/* ── SIDEBAR ── */}
      <div style={{
        width: 260, flexShrink: 0, background: "#010409",
        borderRight: "1px solid #21262d", display: "flex",
        flexDirection: "column", overflow: "hidden",
      }}>
        {/* Logo */}
        <div style={{ padding: "20px 16px 12px", borderBottom: "1px solid #21262d" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: "#0d3320", border: "1px solid #2ea043",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#4ade80", fontSize: 14, fontWeight: 700,
            }}>A</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Agentic MCP</div>
              <div style={{ fontSize: 10, color: "#7d8590" }}>Gateway Active</div>
            </div>
          </div>
        </div>

        {/* New Chat */}
        <div style={{ padding: "12px 12px 8px" }}>
          <button
            onClick={() => { setMessages([]); setChatStarted(false); setInput(""); setEditingMsg(null); navigate("/dashboard"); }}
            style={{
              width: "100%", padding: "8px 12px", background: "#161b22",
              border: "1px solid #30363d", borderRadius: 8, color: "#e6edf3",
              fontSize: 13, cursor: "pointer", textAlign: "left",
              display: "flex", alignItems: "center", gap: 8,
            }}
          >
            <span style={{ fontSize: 16 }}>+</span> New workflow
          </button>
        </div>

        {/* Jira OAuth Login */}
        <div style={{ padding: "0 12px 12px" }}>
          <button
            onClick={() => window.location.href = "http://localhost:8000/auth/jira/login"}
            style={{
              width: "100%", padding: "8px 12px", 
              background: localStorage.getItem("jira_access_token") ? "#0d3320" : "#1f6feb",
              border: "1px solid #30363d", borderRadius: 8, color: "#fff",
              fontSize: 13, cursor: "pointer", textAlign: "center",
              fontWeight: 600, transition: "background 0.2s"
            }}
          >
            {localStorage.getItem("jira_access_token") ? "✅ Jira Connected" : "Connect Jira (OAuth)"}
          </button>
        </div>

        {/* Nav */}
        <div style={{ padding: "0 8px 8px" }}>
          {[
            { id: "dashboard", icon: "⊞", label: "Dashboard" },
            { id: "logs",      icon: "≡", label: "System Logs" },
          ].map((nav) => (
            <div
              key={nav.id}
              onClick={() => setActiveNav(nav.id)}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "8px 10px", borderRadius: 6, cursor: "pointer",
                background: activeNav === nav.id ? "#161b22" : "transparent",
                color: activeNav === nav.id ? "#e6edf3" : "#7d8590",
                fontSize: 13, marginBottom: 2,
              }}
            >
              <span style={{ fontSize: 14 }}>{nav.icon}</span> {nav.label}
            </div>
          ))}
        </div>

        {/* Connected Tools */}
        <div style={{ padding: "8px 12px 6px", borderTop: "1px solid #21262d" }}>
          <div style={{ fontSize: 10, color: "#7d8590", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8, fontWeight: 600 }}>
            Connected MCP Settings
          </div>
          {CONNECTED_TOOLS.map(t => (
            <div
              key={t.name}
              onClick={() => navigate(t.path)}
              style={{
                display: "flex", alignItems: "center", gap: 8, padding: "6px 8px",
                borderRadius: 6, cursor: "pointer", fontSize: 12, color: "#7d8590",
                marginBottom: 2,
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "#161b22")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80", flexShrink: 0, boxShadow: "0 0 8px rgba(74,222,128,0.4)" }} />
              {t.name}
            </div>
          ))}
        </div>

        {/* Workflow History */}
        <div style={{ flex: 1, overflow: "auto", padding: "8px 12px", borderTop: "1px solid #21262d" }}>
          <div style={{ fontSize: 10, color: "#7d8590", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8, fontWeight: 600 }}>
            Workflow History
          </div>
          {history.length === 0 ? (
            <div style={{ fontSize: 11, color: "#484f58", fontStyle: "italic", padding: "0 8px" }}>No active workflows</div>
          ) : (
            history.map((item: any) => {
              const date = new Date(item.created_at);
              const timeStr = isNaN(date.getTime()) ? "Pending" : date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
              return (
                <div
                  key={item.workflow_id}
                  onClick={() => startWithHistory(item)}
                  style={{
                    padding: "7px 8px", borderRadius: 6, cursor: "pointer",
                    fontSize: 12, marginBottom: 2,
                    lineHeight: 1.4, transition: "background 0.15s",
                    background: id === item.workflow_id ? "#161b22" : "transparent",
                    color: id === item.workflow_id ? "#58a6ff" : "#7d8590",
                    borderLeft: id === item.workflow_id ? "2px solid #58a6ff" : "none",
                    paddingLeft: id === item.workflow_id ? "6px" : "8px",
                  }}
                  onMouseEnter={e => { if (id !== item.workflow_id) e.currentTarget.style.background = "#0d1117"; }}
                  onMouseLeave={e => { if (id !== item.workflow_id) e.currentTarget.style.background = "transparent"; }}
                >
                  <div style={{ color: "#c9d1d9", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {item.title}
                  </div>
                  <div style={{ fontSize: 10, display: "flex", justifyContent: "space-between" }}>
                    <span>{item.workflow_id?.slice(0, 16)}…</span>
                    <span>{timeStr}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {activeNav === "logs" ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: 24, overflow: "hidden" }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 8px", color: "#e6edf3" }}>System Logs</h2>
            <p style={{ color: "#7d8590", fontSize: 14, margin: "0 0 20px" }}>Live orchestration execution logs</p>
            <div style={{ flex: 1, background: "#010409", border: "1px solid #30363d", borderRadius: 12, padding: 16, overflowY: "auto", fontFamily: "monospace", fontSize: 13, color: "#c9d1d9" }}>
              {history.map((wf: any) => (
                <div key={wf.workflow_id} style={{ marginBottom: 12 }}>
                  <div style={{ color: "#58a6ff", fontWeight: 600 }}>[{wf.workflow_id}] {wf.title}</div>
                  {(wf.nodes || []).map((n: any) => (
                    <div key={n.id} style={{
                      marginLeft: 16,
                      color: n.status === "failed" ? "#f85149" :
                        (n.status === "done" || n.status === "success") ? "#2ea043" :
                        n.status === "skipped" ? "#8b949e" : "#7d8590",
                    }}>
                      {TOOL_ICONS[n.tool] || "⚙️"} [{n.status?.toUpperCase()}] {n.tool || "generic"} → {n.action || n.title}
                    </div>
                  ))}
                </div>
              ))}
              {history.length === 0 && <div style={{ color: "#7d8590" }}>Waiting for workflow executions…</div>}
            </div>
          </div>
        ) : (
          <>
            <div style={{ flex: 1, overflowY: "auto", padding: chatStarted ? "24px 0" : 0 }}>
              {!chatStarted ? (
                /* ── HOME SCREEN ── */
                <div style={{
                  display: "flex", flexDirection: "column", alignItems: "center",
                  justifyContent: "center", height: "100%", padding: "0 24px",
                }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: 12,
                    background: "#0d3320", border: "1px solid #2ea043",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    margin: "0 auto 20px", color: "#4ade80", fontSize: 22, fontWeight: 700,
                  }}>A</div>

                  <h1 style={{ fontSize: 28, fontWeight: 600, margin: "0 0 8px", textAlign: "center" }}>
                    Hello, Tejas 👋
                  </h1>
                  <p style={{ color: "#7d8590", fontSize: 15, margin: "0 0 40px", textAlign: "center" }}>
                    What workflow would you like to run today?
                  </p>

                  {/* Suggestion chips */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, maxWidth: 640, width: "100%", marginBottom: 24 }}>
                    {SUGGESTED_PROMPTS.map((p, i) => (
                      <button
                        key={i}
                        onClick={() => handleSuggestion(p)}
                        style={{
                          background: "#161b22", border: "1px solid #30363d",
                          borderRadius: 10, padding: "12px 14px", cursor: "pointer",
                          color: "#c9d1d9", fontSize: 12, textAlign: "left",
                          lineHeight: 1.5, transition: "border-color 0.15s",
                        }}
                        onMouseEnter={e => (e.currentTarget.style.borderColor = "#58a6ff")}
                        onMouseLeave={e => (e.currentTarget.style.borderColor = "#30363d")}
                      >
                        {p}
                      </button>
                    ))}
                  </div>

                  {/* ── Slack Quick-Send Panel ── */}
                  <div style={{
                    maxWidth: 640, width: "100%",
                    background: "#161b22", border: "1px solid #30363d",
                    borderRadius: 12, padding: "16px 18px",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                      <span style={{ fontSize: 18 }}>💬</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#e6edf3" }}>Slack Quick-Send</span>
                      <span style={{
                        marginLeft: "auto", fontSize: 11, color: "#4ade80",
                        background: "#0d3320", border: "1px solid #2ea04330",
                        padding: "2px 8px", borderRadius: 99, fontFamily: "monospace",
                      }}>#all-daiict</span>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input
                        type="text"
                        placeholder="Type a message to send to #all-daiict…"
                        value={slackMsg}
                        onChange={e => setSlackMsg(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") handleSlackQuickSend(); }}
                        disabled={slackSending}
                        style={{
                          flex: 1, background: "#0d1117", border: "1px solid #30363d",
                          borderRadius: 8, padding: "9px 12px", color: "#e6edf3",
                          fontSize: 13, outline: "none", fontFamily: "inherit",
                          opacity: slackSending ? 0.6 : 1,
                        }}
                        onFocus={e => (e.target.style.borderColor = "#58a6ff")}
                        onBlur={e => (e.target.style.borderColor = "#30363d")}
                      />
                      <button
                        onClick={handleSlackQuickSend}
                        disabled={!slackMsg.trim() || slackSending}
                        style={{
                          padding: "9px 16px", borderRadius: 8, border: "none",
                          background: slackMsg.trim() && !slackSending ? "#2ea043" : "#21262d",
                          color: "#fff", fontSize: 13, fontWeight: 600,
                          cursor: slackMsg.trim() && !slackSending ? "pointer" : "default",
                          transition: "background 0.15s", whiteSpace: "nowrap",
                        }}
                      >
                        {slackSending ? "⏳ Sending…" : "Send ↗"}
                      </button>
                    </div>
                    {slackResult && (
                      <div style={{
                        marginTop: 10, fontSize: 12, fontFamily: "monospace",
                        color: slackResult.ok ? "#4ade80" : "#f85149",
                        padding: "6px 10px",
                        background: slackResult.ok ? "#0d3320" : "#3d1117",
                        borderRadius: 6,
                        border: `1px solid ${slackResult.ok ? "#2ea04330" : "#f8514930"}`,
                      }}>
                        {slackResult.text}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* ── CHAT MESSAGES ── */
                <div style={{ maxWidth: 780, margin: "0 auto", padding: "0 24px" }}>
                  {messages.map((msg: any) => (
                    <ChatMessage key={msg.id} msg={msg} onEdit={handleEdit} />
                  ))}
                  <div ref={bottomRef} />
                </div>
              )}
            </div>

            {/* ── INPUT BOX ── */}
            <div style={{ padding: "16px 24px 20px", borderTop: chatStarted ? "1px solid #21262d" : "none", background: "#0d1117" }}>
              <div style={{ maxWidth: 780, margin: "0 auto" }}>
                {editingMsg && (
                  <div style={{ fontSize: 11, color: "#f0883e", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                    <span>✏️ Editing message — response will regenerate from this point</span>
                    <button
                      onClick={() => { setEditingMsg(null); setInput(""); }}
                      style={{ background: "none", border: "none", color: "#7d8590", cursor: "pointer", fontSize: 12 }}
                    >✕ cancel</button>
                  </div>
                )}
                <div style={{
                  display: "flex", alignItems: "flex-end", gap: 10,
                  background: "#161b22", border: `1px solid ${editingMsg ? "#f0883e" : "#30363d"}`,
                  borderRadius: 14, padding: "12px 14px", transition: "border-color 0.2s",
                }}>
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={e => { setInput(e.target.value); autoResize(); }}
                    onKeyDown={e => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder="Describe a workflow… (e.g. Create Jira ticket → GitHub branch → Slack alert)"
                    style={{
                      flex: 1, background: "transparent", border: "none", outline: "none",
                      color: "#e6edf3", fontSize: 14, lineHeight: 1.6, resize: "none",
                      minHeight: 24, maxHeight: 200, fontFamily: "inherit", padding: 0,
                    }}
                    rows={1}
                  />
                  <button
                    onClick={() => handleSend()}
                    disabled={!input.trim() || isLoading}
                    style={{
                      width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                      background: input.trim() && !isLoading ? "#2ea043" : "#21262d",
                      border: "none", cursor: input.trim() && !isLoading ? "pointer" : "default",
                      color: "#fff", fontSize: 16, display: "flex",
                      alignItems: "center", justifyContent: "center",
                      transition: "background 0.15s",
                    }}
                  >
                    ↑
                  </button>
                </div>
                <p style={{ textAlign: "center", fontSize: 11, color: "#484f58", marginTop: 8 }}>
                  Enter to send · Shift+Enter for new line · Hover messages to edit
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}