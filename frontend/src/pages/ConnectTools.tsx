import React, { useState, useEffect } from 'react';
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
      { key: 'username', label: 'GitHub Username', placeholder: 'your-username (optional — uses .env)', type: 'text' },
      { key: 'password', label: 'Personal Access Token', placeholder: 'ghp_xxxxxxxxxxxx (optional — uses .env)', type: 'password' },
    ],
  },
  {
    tool: 'jira',
    label: 'Jira',
    description: 'Issue tracking & project management',
    icon: '📋',
    fields: [
      { key: 'domain', label: 'Jira Workspace URL', placeholder: 'team.atlassian.net (optional — uses .env)', type: 'text' },
      { key: 'email', label: 'Atlassian Email', placeholder: 'you@yourteam.com (optional — uses .env)', type: 'email' },
      { key: 'password', label: 'API Token', placeholder: 'ATATT3x... (optional — uses .env)', type: 'password' },
    ],
  },
  {
    tool: 'slack',
    label: 'Slack',
    description: 'Team communication & notifications',
    icon: '💬',
    isOAuth: true,
    authUrl: 'http://localhost:8000/auth/slack/login',
    fields: [
      { key: 'token', label: 'Bot Token', placeholder: 'xoxb-... (manual override)', type: 'password' },
    ],
  },
  {
    tool: 'sheets',
    label: 'Google Sheets',
    description: 'Automated reporting & logging',
    icon: '📊',
    isOAuth: true,
    authUrl: 'http://localhost:8000/auth/google/login',
    fields: [
      { key: 'sheet_id', label: 'Spreadsheet ID', placeholder: '1NZ0DljGTjF2RsEU... (manual override)', type: 'text' },
    ],
  },
];

const ConnectTools = () => {
  const navigate = useNavigate();
  const { tools, allConnected, refreshFromBackend } = useTools();
  const { user } = useAuth();

  const connectedCount = Object.values(tools).filter(t => t.status === 'connected').length;
  const total = TOOLS.length;
  const progressPct = Math.round((connectedCount / total) * 100);
  const isLoading = Object.values(tools).some(t => t.status === 'connecting');

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
            <p style={{ color: "#7d8590", fontSize: 14, margin: 0, maxWidth: 440, marginLeft: "auto", marginRight: "auto" }}>
              Pre-configured integrations are verified automatically from your server environment.
              You can also enter custom credentials below to override them.
            </p>
          </motion.div>

          {/* Progress bar */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            style={{ marginBottom: 20 }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#7d8590" }}>{connectedCount} of {total} tools connected</span>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#4ade80" }}>{progressPct}%</span>
                <button
                  onClick={refreshFromBackend}
                  disabled={isLoading}
                  style={{
                    background: "none", border: "1px solid #30363d", borderRadius: 6,
                    color: "#7d8590", cursor: isLoading ? "default" : "pointer",
                    fontSize: 11, padding: "3px 8px", transition: "all 0.2s",
                    opacity: isLoading ? 0.5 : 1
                  }}
                  onMouseEnter={e => { if (!isLoading) e.currentTarget.style.borderColor = "#4ade80"; e.currentTarget.style.color = "#4ade80"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "#30363d"; e.currentTarget.style.color = "#7d8590"; }}
                >
                  {isLoading ? "⏳ Verifying…" : "↺ Re-verify"}
                </button>
              </div>
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

          {/* Pre-configured note */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            style={{
              marginBottom: 20, padding: "10px 14px", borderRadius: 10,
              background: "#0d3320", border: "1px solid #2ea04330",
              fontSize: 12, color: "#4ade80", display: "flex", alignItems: "center", gap: 8
            }}
          >
            <span>ℹ️</span>
            <span style={{ color: "#7d8590" }}>
              Integrations marked <span style={{ color: "#4ade80", fontWeight: 600 }}>Connected</span> are using
              pre-configured credentials from the server <code style={{ background: "#0d1117", padding: "1px 5px", borderRadius: 4 }}>.env</code> file.
              Leave fields empty to use them, or enter custom credentials to override.
            </span>
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
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "10px 22px", borderRadius: 10, border: "none",
              background: allConnected ? "#2ea043" : "#1a7f37",
              color: "#fff",
              fontSize: 13, fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 0 20px rgba(46,160,67,0.3)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
          >
            {allConnected ? "✓ All Connected — Go to Dashboard" : "Go to Dashboard →"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConnectTools;
