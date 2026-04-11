// @ts-nocheck
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import ToolCard from '@/components/ToolCard';
import { useTools } from '@/context/ToolsContext';
import { useAuth } from '@/context/AuthContext';

const TOOLS = [
  {
    tool: 'github',
    label: 'GitHub',
    description: 'Code repository & branch management',
    icon: '🐙',
    fields: [
      { key: 'username', label: 'GitHub Username', placeholder: 'your-username', type: 'text' },
      { key: 'password', label: 'Personal Access Token', placeholder: 'ghp_xxxxxxxxxxxx', type: 'password' },
    ],
  },
  {
    tool: 'jira',
    label: 'Jira',
    description: 'Issue tracking & project management',
    icon: '📋',
    fields: [
      { key: 'domain', label: 'Jira Workspace URL', placeholder: 'team.atlassian.net', type: 'text' },
      { key: 'email', label: 'Atlassian Email', placeholder: 'you@yourteam.com', type: 'email' },
      { key: 'password', label: 'Account Password', placeholder: '••••••••', type: 'password' },
    ],
  },
  {
    tool: 'slack',
    label: 'Slack',
    description: 'Team communication & notifications',
    icon: '💬',
    fields: [
      { key: 'email', label: 'Slack Email', placeholder: 'you@yourworkspace.com', type: 'email' },
      { key: 'password', label: 'Account Password', placeholder: 'Demo pass: admin123', type: 'password' },
    ],
  },
  {
    tool: 'sheets',
    label: 'Google Sheets',
    description: 'Automated reporting & logging',
    icon: '📊',
    fields: [
      { key: 'email', label: 'Google Account Email', placeholder: 'you@gmail.com', type: 'email' },
      { key: 'password', label: 'Account Password', placeholder: 'Demo pass: admin123', type: 'password' },
    ],
  },
];

const ConnectTools = () => {
  const navigate = useNavigate();
  const { tools, allConnected } = useTools();
  const { user } = useAuth();

  const connectedCount = Object.values(tools).filter(t => t.status === 'connected').length;
  const total = TOOLS.length;
  const progressPct = Math.round((connectedCount / total) * 100);

  return (
    <div style={{
      height: "100vh", background: "#0d1117", color: "#e6edf3",
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      display: "flex", flexDirection: "column", overflow: "hidden", position: "relative"
    }}>
      {/* Glow */}
      <div style={{ position: "absolute", top: "15%", left: "25%", width: 400, height: 400, background: "radial-gradient(circle, rgba(46,160,67,0.04) 0%, transparent 70%)", borderRadius: "50%", pointerEvents: "none" }} />

      {/* Top bar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 24px", borderBottom: "1px solid #21262d",
        background: "#010409", flexShrink: 0
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: "#0d3320", border: "1px solid #2ea043",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#4ade80", fontSize: 12, fontWeight: 700
          }}>A</div>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Agentic MCP Gateway</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
          <span style={{ color: "#e6edf3", fontWeight: 600 }}>{user?.name}</span>
          <span style={{
            padding: "2px 8px", borderRadius: 99, fontSize: 10, fontWeight: 700,
            textTransform: "uppercase", letterSpacing: 0.5,
            background: user?.role === "developer" ? "#0d3320" : "#1c1c3a",
            color: user?.role === "developer" ? "#4ade80" : "#a78bfa",
            border: `1px solid ${user?.role === "developer" ? "#2ea04350" : "#a78bfa30"}`
          }}>{user?.role}</span>
        </div>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: "auto", position: "relative", zIndex: 10 }}>
        <div style={{ maxWidth: 580, margin: "0 auto", padding: "32px 16px 100px" }}>
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ textAlign: "center", marginBottom: 28 }}
          >
            <h1 style={{ fontSize: 28, fontWeight: 700, margin: "0 0 8px" }}>Connect Your Tools</h1>
            <p style={{ color: "#7d8590", fontSize: 14, margin: 0, maxWidth: 400, marginLeft: "auto", marginRight: "auto" }}>
              Connect once — automate everything. Your credentials are stored locally and never sent to our servers.
            </p>
          </motion.div>

          {/* Progress bar */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            style={{ marginBottom: 24 }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#7d8590" }}>{connectedCount} of {total} tools connected</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#4ade80" }}>{progressPct}%</span>
            </div>
            <div style={{ height: 6, borderRadius: 99, background: "#21262d", overflow: "hidden" }}>
              <motion.div
                style={{ height: "100%", borderRadius: 99, background: "linear-gradient(90deg, #2ea043, #4ade80)" }}
                initial={{ width: "0%" }}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              />
            </div>
          </motion.div>

          {/* Tool cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {TOOLS.map((t, i) => (
              <motion.div
                key={t.tool}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.06 }}
              >
                <ToolCard {...t} />
              </motion.div>
            ))}
          </div>

          {/* Info */}
          {!allConnected && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              style={{
                marginTop: 16, display: "flex", alignItems: "center", gap: 8,
                padding: "12px 16px", borderRadius: 12,
                border: "1px solid #21262d", background: "#161b22",
                fontSize: 12, color: "#7d8590"
              }}
            >
              <span style={{ color: "#4ade80", fontWeight: 600 }}>ℹ️</span>
              Connect all tools to unlock the full dashboard. Partial connections are saved automatically.
            </motion.div>
          )}
        </div>
      </div>

      {/* Sticky footer */}
      <div style={{
        borderTop: "1px solid #21262d", background: "#010409",
        padding: "14px 24px", flexShrink: 0
      }}>
        <div style={{ maxWidth: 580, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button
            onClick={() => navigate('/dashboard')}
            style={{ background: "none", border: "none", color: "#7d8590", cursor: "pointer", fontSize: 13, transition: "color 0.2s" }}
            onMouseEnter={e => e.currentTarget.style.color = "#e6edf3"}
            onMouseLeave={e => e.currentTarget.style.color = "#7d8590"}
          >Skip for now</button>
          <button
            onClick={() => navigate('/dashboard')}
            disabled={!allConnected}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "10px 22px", borderRadius: 10, border: "none",
              background: allConnected ? "#2ea043" : "#21262d",
              color: allConnected ? "#fff" : "#484f58",
              fontSize: 13, fontWeight: 600,
              cursor: allConnected ? "pointer" : "default",
              transition: "all 0.2s",
              opacity: allConnected ? 1 : 0.5
            }}
            onMouseEnter={e => { if (allConnected) { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 0 20px rgba(46,160,67,0.3)"; }}}
            onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
          >
            {allConnected ? "✓ All Connected — Go to Dashboard" : "Continue →"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConnectTools;
