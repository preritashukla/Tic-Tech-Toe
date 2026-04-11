import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Github, Slack, Trello, FileSpreadsheet, ArrowRight, CheckCircle2, Zap } from 'lucide-react';
import ToolCard from '@/components/ToolCard';
import { useTools } from '@/context/ToolsContext';
import { useAuth } from '@/context/AuthContext';

const TOOLS = [
  {
    tool:        'github'  as const,
    label:       'GitHub',
    description: 'Code repository & branch management',
    icon:        <Github size={20} className="text-purple-400" />,
    accentColor: 'bg-purple-500/15 hover:bg-purple-500/25 border-purple-500/30 text-purple-200',
    accentBg:    'bg-purple-500/10 border-purple-500/20',
    fields: [
      { key: 'username', label: 'GitHub Username',           placeholder: 'your-username',        type: 'text'     as const },
      { key: 'password', label: 'Personal Access Token',     placeholder: 'ghp_xxxxxxxxxxxx',     type: 'password' as const },
    ],
  },
  {
    tool:        'jira'    as const,
    label:       'Jira',
    description: 'Issue tracking & project management',
    icon:        <Trello size={20} className="text-blue-400" />,
    accentColor: 'bg-blue-500/15 hover:bg-blue-500/25 border-blue-500/30 text-blue-200',
    accentBg:    'bg-blue-500/10 border-blue-500/20',
    fields: [
      { key: 'domain',   label: 'Jira Workspace URL',        placeholder: 'team.atlassian.net',   type: 'text'     as const },
      { key: 'email',    label: 'Atlassian Email',           placeholder: 'you@yourteam.com',     type: 'email'    as const },
      { key: 'password', label: 'Account Password',          placeholder: '••••••••',             type: 'password' as const },
    ],
  },
  {
    tool:        'slack'   as const,
    label:       'Slack',
    description: 'Team communication & notifications',
    icon:        <Slack size={20} className="text-green-400" />,
    accentColor: 'bg-green-500/15 hover:bg-green-500/25 border-green-500/30 text-green-200',
    accentBg:    'bg-green-500/10 border-green-500/20',
    fields: [
      { key: 'email',    label: 'Slack Email',               placeholder: 'you@yourworkspace.com', type: 'email'    as const },
      { key: 'password', label: 'Account Password',          placeholder: 'Demo pass: admin123',  type: 'password' as const },
    ],
  },
  {
    tool:        'sheets'  as const,
    label:       'Google Sheets',
    description: 'Automated reporting & logging',
    icon:        <FileSpreadsheet size={20} className="text-yellow-400" />,
    accentColor: 'bg-yellow-500/15 hover:bg-yellow-500/25 border-yellow-500/30 text-yellow-200',
    accentBg:    'bg-yellow-500/10 border-yellow-500/20',
    fields: [
      { key: 'email',    label: 'Google Account Email',      placeholder: 'you@gmail.com',        type: 'email'    as const },
      { key: 'password', label: 'Account Password',          placeholder: 'Demo pass: admin123',  type: 'password' as const },
    ],
  },
];

const ConnectTools = () => {
  const navigate        = useNavigate();
  const { tools, allConnected } = useTools();
  const { user }        = useAuth();

  const connectedCount = Object.values(tools).filter(t => t.status === 'connected').length;
  const total          = TOOLS.length;
  const progressPct    = Math.round((connectedCount / total) * 100);

  return (
    <div className="h-screen bg-background text-foreground flex flex-col overflow-hidden relative">
      {/* Background */}
      <div className="grid-bg" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/8 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-purple-600/8 rounded-full blur-3xl pointer-events-none" />

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-[hsl(217,33%,15%)] bg-[hsl(222,47%,4%)/80] backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-[hsl(222,47%,8%)] border border-[hsl(217,33%,15%)]">
            <Zap size={16} className="text-[hsl(217,91%,60%)]" />
          </div>
          <span className="font-semibold text-sm text-foreground">Agentic MCP Gateway</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{user?.name}</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
              user?.role === 'developer'
                ? 'bg-blue-500/15 text-blue-400 border-blue-500/20'
                : 'bg-purple-500/15 text-purple-400 border-purple-500/20'
            }`}
          >
            {user?.role}
          </span>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="relative z-10 flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 pt-8 pb-24">

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <h1 className="text-3xl font-black tracking-tight mb-2"
              style={{
                background: 'linear-gradient(135deg, hsl(213,31%,95%), hsl(217,91%,70%), hsl(270,91%,75%))',
                backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>
              Connect Your Tools
            </h1>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto">
              Connect once — automate everything. Your credentials are stored locally and never sent to our servers.
            </p>
          </motion.div>

          {/* Progress bar */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="mb-6"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-muted-foreground">{connectedCount} of {total} tools connected</span>
              <span className="text-xs font-bold text-[hsl(217,91%,65%)]">{progressPct}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-[hsl(217,33%,12%)] overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: 'linear-gradient(90deg, hsl(217,91%,60%), hsl(270,91%,70%))' }}
                initial={{ width: '0%' }}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              />
            </div>
          </motion.div>

          {/* Tool cards */}
          <div className="flex flex-col gap-3">
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

          {/* Access warning */}
          {!allConnected && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-5 flex items-center gap-2 px-4 py-3 rounded-xl border border-[hsl(217,33%,18%)] bg-[hsl(222,47%,5%)] text-xs text-muted-foreground"
            >
              <span className="text-[hsl(217,91%,60%)] font-semibold">ℹ️</span>
              Connect all tools to unlock the full dashboard. Partial connections are saved automatically.
            </motion.div>
          )}
        </div>
      </div>

      {/* Sticky CTA footer */}
      <div className="relative z-10 border-t border-[hsl(217,33%,15%)] bg-[hsl(222,47%,4%)] px-6 py-4 shrink-0">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
          <button
            id="skip-tools"
            onClick={() => navigate('/dashboard')}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip for now
          </button>

          <button
            id="continue-to-dashboard"
            onClick={() => navigate('/dashboard')}
            disabled={!allConnected}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm text-black transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed hover:-translate-y-0.5 hover:shadow-[0_0_20px_hsl(217,91%,60%,0.35)]"
            style={{ background: 'linear-gradient(135deg, hsl(217,91%,60%), hsl(240,91%,65%))' }}
          >
            {allConnected ? (
              <><CheckCircle2 size={15} /> All Connected — Go to Dashboard</>
            ) : (
              <>Continue <ArrowRight size={15} /></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConnectTools;
