import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTools } from "./context/ToolsContext";

const SUGGESTED_PROMPTS = [
  "Critical bug in Jira → create GitHub branch → notify Slack",
  "Fetch latest commits from GitHub and send summary to Slack",
  "Fetch GitHub commits and Jira issues in parallel, then send combined summary",
  "Create a new feature branch and open a draft PR",
];

const CONNECTED_TOOLS = [
  { name: "GitHub Integration", path: "/connect-tools" },
  { name: "Jira Integration", path: "/connect-tools" },
  { name: "Slack Integration", path: "/connect-tools" },
  { name: "Google Sheets", path: "/connect-tools" }
];

function LogsView({ logs }) {
  return (
    <div style={{
      background: "#0d1117", border: "1px solid #30363d", borderRadius: 6,
      padding: "10px", marginTop: 8, fontFamily: "monospace", fontSize: 11,
      color: "#8b949e", maxHeight: 150, overflowY: "auto"
    }}>
      {logs.map((log, i) => <div key={i} style={{ marginBottom: 2 }}>{log}</div>)}
    </div>
  );
}

function SuccessBadge() {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      background: "#0d3320", color: "#4ade80", fontSize: 11,
      padding: "2px 8px", borderRadius: 99, fontFamily: "monospace"
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80", display: "inline-block" }} />
      Success
    </span>
  );
}

function StatusBadge({ status }) {
  const colors = {
    done: { bg: "#0d3320", color: "#4ade80", dot: "#4ade80" },
    success: { bg: "#0d3320", color: "#4ade80", dot: "#4ade80" },
    failed: { bg: "#3d1117", color: "#f85149", dot: "#f85149" },
    running: { bg: "#0d2744", color: "#58a6ff", dot: "#58a6ff" },
    pending: { bg: "#1c1c1c", color: "#7d8590", dot: "#7d8590" },
  };
  const c = colors[status] || colors.pending;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      background: c.bg, color: c.color, fontSize: 11,
      padding: "2px 8px", borderRadius: 99, fontFamily: "monospace"
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: c.dot, display: "inline-block" }} />
      {status}
    </span>
  );
}

function DAGNode({ label, sublabel, server, left, top, status }) {
  const isSuccess = status === "done" || status === "success";
  const isFailed = status === "failed";
  const borderColor = isSuccess ? "#2ea043" : isFailed ? "#f85149" : "#30363d";
  const bgColor = isSuccess ? "#1a2a1a" : isFailed ? "#2d1117" : "#161b22";
  return (
    <div style={{
      position: "absolute", left, top,
      background: bgColor,
      border: `1px solid ${borderColor}`,
      borderRadius: 10, padding: "10px 14px", width: 170,
      fontSize: 12, color: "#e6edf3"
    }}>
      <div style={{ color: "#7d8590", fontSize: 10, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>{server}</div>
      <div style={{ fontFamily: "monospace", color: "#79c0ff", marginBottom: 2 }}>{label}</div>
      <div style={{ color: "#7d8590", fontSize: 11, marginBottom: 8 }}>{sublabel}</div>
      <StatusBadge status={status} />
    </div>
  );
}

function DAGVisualization({ dag }) {
  if (!dag || !dag.nodes) return null;
  return (
    <div style={{ position: "relative", height: 160, margin: "12px 0", overflowX: "auto", overflowY: "hidden", whiteSpace: "nowrap" }}>
      {dag.nodes.map((n, i) => {
        const left = i * 200;
        return (
          <DAGNode 
            key={n.id} 
            label={`${n.tool} → ${n.action}`} 
            sublabel={`Tool: ${n.tool} Action: ${n.action}`} 
            server={`Executing on ${n.tool} Server`} 
            left={left} 
            top={20} 
            status={n.status || "done"}
          />
        );
      })}
      <svg style={{ position: "absolute", top: 0, left: 0, width: "100%", minWidth: dag.nodes.length * 200, height: "100%", pointerEvents: "none" }}>
        <defs>
          <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L0,6 L6,3 z" fill="#2ea043" />
          </marker>
        </defs>
        {dag.nodes.map((n, i) => {
          if (i === dag.nodes.length - 1) return null;
          return (
            <line 
              key={i} 
              x1={i * 200 + 172} 
              y1={60} 
              x2={(i + 1) * 200 - 2} 
              y2={60} 
              stroke="#2ea043" 
              strokeWidth={1.5} 
              markerEnd="url(#arrow)" 
              strokeDasharray="4 2" 
            />
          );
        })}
      </svg>
    </div>
  );
}

function AuditLog({ steps }) {
  return (
    <div style={{
      background: "#0d1117", border: "1px solid #30363d", borderRadius: 10,
      padding: "12px 16px", marginTop: 8, fontSize: 12
    }}>
      <div style={{ color: "#7d8590", fontSize: 11, marginBottom: 8, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
        Audit Log — {steps.length}/{steps.length}
      </div>
      {steps.map((s, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", borderBottom: i < steps.length - 1 ? "1px solid #21262d" : "none" }}>
          <span style={{ color: "#2ea043", fontSize: 14 }}>✓</span>
          <span style={{ fontFamily: "monospace", color: "#79c0ff" }}>{s}</span>
        </div>
      ))}
    </div>
  );
}

function ChatMessage({ msg, onEdit }) {
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
                alignSelf: "center", whiteSpace: "nowrap"
              }}
            >
              ✏️ Edit
            </button>
          )}
          <div style={{
            background: "#21262d", borderRadius: "18px 18px 4px 18px",
            padding: "10px 16px", color: "#e6edf3", fontSize: 14, lineHeight: 1.6
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
          fontSize: 12, color: "#4ade80", fontWeight: 700, flexShrink: 0
        }}>A</div>
        <span style={{ color: "#7d8590", fontSize: 12 }}>Agentic MCP</span>
      </div>
      <div style={{ paddingLeft: 38 }}>
        {msg.thinking && (
          <div style={{
            color: "#7d8590", fontSize: 12, fontStyle: "italic",
            marginBottom: 10, padding: "6px 12px",
            borderLeft: "2px solid #30363d"
          }}>
            {msg.thinking}
          </div>
        )}
        <div style={{ color: "#e6edf3", fontSize: 14, lineHeight: 1.7 }}>{msg.content}</div>
        {msg.dagData && <DAGVisualization dag={msg.dagData} />}
        {msg.audit && <AuditLog steps={msg.audit} />}
      </div>
    </div>
  );
}

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [editingMsg, setEditingMsg] = useState(null);
  const [chatStarted, setChatStarted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeNav, setActiveNav] = useState("dashboard");
  const [sessionId, setSessionId] = useState(null);  // Multi-turn conversation session
  const { tools } = useTools();
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);
  const navigate = useNavigate();

  const [history, setHistory] = useState([]);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch("/api/active-workflows");
        if (res.ok) {
          const data = await res.json();
          // Sort newest first
          const wfs = (data.workflows || []).sort((a, b) => b.created_at - a.created_at);
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

  const autoResize = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 200) + "px";
  };

  const handleSend = async (text) => {
    const content = (text || input).trim();
    if (!content) return;

    if (editingMsg) {
      const idx = messages.findIndex(m => m.id === editingMsg.id);
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

    try {
      // Compute edit_index for edit/regeneration support
      let editIndex = undefined;
      if (editingMsg) {
        const idx = messages.findIndex(m => m.id === editingMsg.id);
        if (idx >= 0) editIndex = idx;
      }

      // Step 1: Generate Plan (DAG) — with session context for multi-turn
      const planRes = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          user_input: content,
          session_id: sessionId || undefined,
          edit_index: editIndex,
        })
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

      // Track session for multi-turn conversation
      if (planData.session_id && !sessionId) {
        setSessionId(planData.session_id);
      }

      // Extract real credentials from context to bridge to backend
      const userCredentials = {};
      Object.entries(tools).forEach(([name, state]) => {
        if (state.status === 'connected' && state.token) {
          try {
            userCredentials[name] = JSON.parse(state.token);
          } catch {
            userCredentials[name] = { token: state.token };
          }
        }
      });

      // Step 2: Execute the Plan — with session_id for feedback injection
      const execRes = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          dag: dag,
          session_id: sessionId || planData.session_id || undefined,
          auto_approve: true, // Auto-approve for demo
          dry_run: false,      // RUN FOR REAL
          rollback_policy: 'auto', // Auto-rollback on failure
          credentials: userCredentials
        })
      });

      if (!execRes.ok) {
        const errData = await execRes.json().catch(() => ({}));
        throw new Error(errData.detail || "Execution failed: " + execRes.status);
      }

      const execData = await execRes.json();
      
      // Map backend results to UI friendly DAG visualization
      const dagData = {
        nodes: execData.results.map(r => ({
          id: r.node_id,
          tool: r.tool || "generic",
          action: r.action || r.name,
          status: r.status,
        }))
      };

      // Extract audit strings
      const auditLogStrings = (execData.audit_log || []).map(log => {
        if (log.event_type === "tool_success") {
          return `${log.details.tool} → ${log.details.action} [success]`;
        }
        if (log.event_type === "tool_failure") {
          return `${log.details.tool} → ${log.details.action} [failed: ${log.details.error}]`;
        }
        return log.message;
      });

      setMessages(prev => [
        ...prev,
        {
          id: Date.now() + 1,
          role: "assistant",
          thinking: `Executed workflow "${execData.execution_id}" — ${execData.total_nodes} nodes processed`,
          content: `Workflow completed — ${execData.succeeded}/${execData.total_nodes} succeeded${execData.failed > 0 ? `, ${execData.failed} failed` : ""}.`,
          dagData,
          audit: auditLogStrings.length > 0 ? auditLogStrings : execData.results.map(r => `${r.tool} → ${r.action} [${r.status}]`)
        }
      ]);

    } catch (e) {
      console.error("Workflow Engine Error:", e);
      const errorMsg = e.message 
        ? (typeof e.message === 'object' ? JSON.stringify(e.message) : e.message)
        : String(e);

      setMessages(prev => [
        ...prev,
        {
          id: Date.now() + 1,
          role: "assistant",
          content: "⚠️ Integration Error: " + errorMsg,
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (msg) => {
    setEditingMsg(msg);
    setInput(msg.content);
    setChatStarted(true);
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const handleSuggestion = (text) => {
    handleSend(text);
  };

  const startWithHistory = async (item) => {
    setChatStarted(true);
    setIsLoading(true);
    setInput("");
    setMessages([
      { id: Date.now(), role: "user", content: item.title }
    ]);

    try {
      const res = await fetch("/api/status?id=" + encodeURIComponent(item.workflow_id));
      if (res.ok) {
        const statusData = await res.json();
        const nodes = statusData.nodes || [];
        const succeeded = nodes.filter(n => n.status === "done" || n.status === "success").length;
        const failed = nodes.filter(n => n.status === "failed").length;

        const dagData = {
          nodes: nodes.map(n => ({
            id: n.id,
            tool: n.tool || "generic",
            action: n.title || n.id,
            status: n.status || "done",
          }))
        };

        setMessages(prev => [
          ...prev,
          {
            id: Date.now() + 1,
            role: "assistant",
            thinking: "Restoring view for workflow \"" + item.workflow_id + "\"",
            content: "Execution completed — " + succeeded + "/" + nodes.length + " succeeded" + (failed > 0 ? ", " + failed + " failed" : "") + ".",
            dagData,
            audit: nodes.map(n => (n.tool || "generic") + " → " + (n.title || n.id) + " [" + n.status + "]")
          }
        ]);
      }
    } catch (e) {}
    setIsLoading(false);
  };

  return (
    <div style={{
      display: "flex", height: "100vh", background: "#0d1117",
      fontFamily: "'Segoe UI', system-ui, sans-serif", color: "#e6edf3",
      overflow: "hidden"
    }}>
      {/* ── SIDEBAR ── */}
      <div style={{
        width: 260, flexShrink: 0, background: "#010409",
        borderRight: "1px solid #21262d", display: "flex",
        flexDirection: "column", overflow: "hidden"
      }}>
        {/* Logo */}
        <div style={{ padding: "20px 16px 12px", borderBottom: "1px solid #21262d" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: "#0d3320", border: "1px solid #2ea043",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#4ade80", fontSize: 14, fontWeight: 700
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
            onClick={() => { setMessages([]); setChatStarted(false); setInput(""); setEditingMsg(null); }}
            style={{
              width: "100%", padding: "8px 12px", background: "#161b22",
              border: "1px solid #30363d", borderRadius: 8, color: "#e6edf3",
              fontSize: 13, cursor: "pointer", textAlign: "left",
              display: "flex", alignItems: "center", gap: 8
            }}
          >
            <span style={{ fontSize: 16 }}>+</span> New workflow
          </button>
        </div>

        {/* Nav */}
        <div style={{ padding: "0 8px 8px" }}>
          {[
            { id: "dashboard", icon: "⊞", label: "Dashboard" },
            { id: "logs", icon: "≡", label: "System Logs" }
          ].map((nav) => (
            <div
              key={nav.id}
              onClick={() => setActiveNav(nav.id)}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "8px 10px", borderRadius: 6, cursor: "pointer",
                background: activeNav === nav.id ? "#161b22" : "transparent",
                color: activeNav === nav.id ? "#e6edf3" : "#7d8590",
                fontSize: 13, marginBottom: 2
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
                marginBottom: 2
              }}
              onMouseEnter={e => e.currentTarget.style.background = "#161b22"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80", flexShrink: 0, boxShadow: "0 0 8px rgba(74, 222, 128, 0.4)" }} />
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
            history.map(item => {
              const timeStr = new Date(item.created_at * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
              return (
                <div
                  key={item.workflow_id}
                  onClick={() => startWithHistory(item)}
                  style={{
                    padding: "7px 8px", borderRadius: 6, cursor: "pointer",
                    fontSize: 12, color: "#7d8590", marginBottom: 2,
                    lineHeight: 1.4, transition: "background 0.15s"
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "#161b22"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <div style={{ color: "#c9d1d9", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {item.title}
                  </div>
                  <div style={{ fontSize: 10, display: "flex", justifyContent: "space-between" }}>
                    <span>{item.workflow_id}</span>
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
              {history.map(wf => (
                <div key={wf.workflow_id} style={{ marginBottom: 12 }}>
                  <div style={{ color: "#58a6ff", fontWeight: 600 }}>[{wf.workflow_id}] {wf.title}</div>
                  {(wf.nodes || []).map(n => (
                    <div key={n.id} style={{ marginLeft: 16, color: n.status === "failed" ? "#f85149" : n.status === "done" || n.status === "success" ? "#2ea043" : "#7d8590" }}>
                      ↳ [{n.status.toUpperCase()}] {n.tool || 'generic'} → {n.action || n.title}
                    </div>
                  ))}
                </div>
              ))}
              {history.length === 0 && <div style={{ color: "#7d8590" }}>Waiting for workflow executions...</div>}
            </div>
          </div>
        ) : (
          <>
            {/* Messages or Home */}
            <div style={{ flex: 1, overflowY: "auto", padding: chatStarted ? "24px 0" : 0 }}>
          {!chatStarted ? (
            /* ── HOME SCREEN ── */
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", height: "100%", padding: "0 24px"
            }}>
              <div style={{ marginBottom: 8 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 12,
                  background: "#0d3320", border: "1px solid #2ea043",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto 20px", color: "#4ade80", fontSize: 22, fontWeight: 700
                }}>A</div>
              </div>
              <h1 style={{ fontSize: 28, fontWeight: 600, margin: "0 0 8px", textAlign: "center" }}>
                Hello, Tejas 👋
              </h1>
              <p style={{ color: "#7d8590", fontSize: 15, margin: "0 0 40px", textAlign: "center" }}>
                What workflow would you like to run today?
              </p>

              {/* Suggestion chips */}
              <div style={{
                display: "grid", gridTemplateColumns: "1fr 1fr",
                gap: 10, maxWidth: 640, width: "100%", marginBottom: 32
              }}>
                {SUGGESTED_PROMPTS.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => handleSuggestion(p)}
                    style={{
                      background: "#161b22", border: "1px solid #30363d",
                      borderRadius: 10, padding: "12px 14px", cursor: "pointer",
                      color: "#c9d1d9", fontSize: 12, textAlign: "left",
                      lineHeight: 1.5, transition: "border-color 0.15s"
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = "#58a6ff"}
                    onMouseLeave={e => e.currentTarget.style.borderColor = "#30363d"}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* ── CHAT MESSAGES ── */
            <div style={{ maxWidth: 760, margin: "0 auto", padding: "0 24px" }}>
              {messages.map(msg => (
                <ChatMessage key={msg.id} msg={msg} onEdit={handleEdit} />
              ))}
              {isLoading && (
                <div style={{ paddingLeft: 38, marginBottom: 16 }}>
                  <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    {[0, 1, 2].map(i => (
                      <div key={i} style={{
                        width: 6, height: 6, borderRadius: "50%", background: "#4ade80",
                        animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                        opacity: 0.7
                      }} />
                    ))}
                    <style>{`@keyframes pulse { 0%,100%{transform:scale(1);opacity:0.4} 50%{transform:scale(1.4);opacity:1} }`}</style>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* ── INPUT BOX ── */}
        <div style={{
          padding: "16px 24px 20px",
          borderTop: chatStarted ? "1px solid #21262d" : "none",
          background: "#0d1117"
        }}>
          <div style={{ maxWidth: 760, margin: "0 auto" }}>
            {editingMsg && (
              <div style={{
                fontSize: 11, color: "#f0883e", marginBottom: 6,
                display: "flex", alignItems: "center", gap: 6
              }}>
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
              borderRadius: 14, padding: "12px 14px",
              transition: "border-color 0.2s"
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
                placeholder="Describe a workflow... (e.g. Create Jira ticket → GitHub branch → Slack alert)"
                style={{
                  flex: 1, background: "transparent", border: "none", outline: "none",
                  color: "#e6edf3", fontSize: 14, lineHeight: 1.6, resize: "none",
                  minHeight: 24, maxHeight: 200, fontFamily: "inherit", padding: 0
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
                  transition: "background 0.15s"
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