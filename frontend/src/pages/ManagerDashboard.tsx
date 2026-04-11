import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, Clock, Loader2, Send, Slack, Github, Trello, FileSpreadsheet, MessageSquare, Edit3, Trash2, Check } from 'lucide-react';
import { createWorkflow } from '@/lib/api';
import { useNavigate } from 'react-router-dom';

interface Step {
  id: string;
  tool: 'jira' | 'github' | 'slack' | 'sheets';
  label: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  detail?: string;
}

interface SlackPreview {
  channel: string;
  message: string;
}

const TOOL_ICONS = {
  jira:   { Icon: Trello,          color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/20' },
  github: { Icon: Github,          color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
  slack:  { Icon: Slack,           color: 'text-green-400',  bg: 'bg-green-500/10 border-green-500/20' },
  sheets: { Icon: FileSpreadsheet, color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' },
};

const TOOL_LABELS: Record<string, string> = {
  jira:   'Task Tracker',
  github: 'Code Repository',
  slack:  'Team Messenger',
  sheets: 'Report Sheet',
};

const SUGGESTIONS = [
  "A critical login bug was found. Create a ticket and notify the team.",
  "Production is down. Start incident response and create a Slack war-room.",
  "Sprint review done. Update all resolved tickets and post a summary to Slack.",
];

const ManagerDashboard = () => {
  const navigate = useNavigate();
  const [text, setText]         = useState('');
  const [loading, setLoading]   = useState(false);
  const [steps, setSteps]       = useState<Step[]>([]);
  const [slackPreview, setSlackPreview] = useState<SlackPreview | null>(null);
  const [editMsg, setEditMsg]   = useState('');
  const [error, setError]       = useState<string | null>(null);
  const [done, setDone]         = useState(false);

  const handleSubmit = async () => {
    if (!text.trim() || loading) return;
    setLoading(true);
    setError(null);
    setDone(false);

    // 1. Parse and show planned steps immediately
    const planned: Step[] = [
      { id: '1', tool: 'jira',   label: 'Creating task in Jira',            status: 'pending' },
      { id: '2', tool: 'github', label: 'Setting up GitHub branch',          status: 'pending' },
      { id: '3', tool: 'slack',  label: 'Preparing Slack notification',      status: 'pending' },
      { id: '4', tool: 'sheets', label: 'Logging to report sheet',           status: 'pending' },
    ];
    setSteps(planned);

    try {
      // 2. Submit & simulate step-by-step execution
      const { workflow_id } = await createWorkflow(text);
      setText('');

      // Animate steps one by one
      for (let i = 0; i < planned.length; i++) {
        await new Promise(r => setTimeout(r, 600));
        setSteps(prev => prev.map((s, idx) => idx === i ? { ...s, status: 'running' } : s));

        await new Promise(r => setTimeout(r, 1200));

        if (i === 2) {
          // Slack step → show approval modal
          setSteps(prev => prev.map((s, idx) => idx === i ? { ...s, status: 'running', detail: 'Awaiting your approval...' } : s));
          setSlackPreview({
            channel: '#all-daiict',
            message: `✅ Workflow triggered by gateway:\n"${text.slice(0, 80)}${text.length > 80 ? '...' : ''}"`,
          });
          setEditMsg(`✅ Workflow triggered by gateway:\n"${text.slice(0, 80)}${text.length > 80 ? '...' : ''}"`);
          break;
        }

        setSteps(prev => prev.map((s, idx) => idx === i ? { ...s, status: 'success', detail: 'Done' } : s));
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
      setSteps(prev => prev.map(s => s.status === 'running' ? { ...s, status: 'failed' } : s));
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    setSlackPreview(null);
    setSteps(prev => prev.map((s, idx) => idx === 2 ? { ...s, status: 'success', detail: 'Sent to #all-daiict', label: 'Slack notification sent' } : s));
    await new Promise(r => setTimeout(r, 600));
    setSteps(prev => prev.map((s, idx) => idx === 3 ? { ...s, status: 'running' } : s));
    await new Promise(r => setTimeout(r, 1200));
    setSteps(prev => prev.map((s, idx) => idx === 3 ? { ...s, status: 'success', detail: 'Logged' } : s));
    setDone(true);
  };

  const handleDelete = () => {
    setSlackPreview(null);
    setSteps(prev => prev.map((s, idx) => idx === 2 ? { ...s, status: 'failed', detail: 'Cancelled by manager' } : s));
    setDone(true);
  };

  const statusIcon = (status: Step['status']) => {
    if (status === 'success') return <CheckCircle2 size={18} className="text-green-400" />;
    if (status === 'failed')  return <XCircle      size={18} className="text-red-400" />;
    if (status === 'running') return <Loader2       size={16} className="text-blue-400 animate-spin" />;
    return <Clock size={16} className="text-[hsl(215,20%,40%)]" />;
  };

  return (
    <div className="h-full flex flex-col bg-background min-h-0 overflow-hidden">
      {/* Steps progress */}
      <AnimatePresence>
        {steps.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="border-b border-border bg-card px-6 py-4 overflow-y-auto shrink-0"
          >
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
              Execution Progress
            </p>
            <div className="flex flex-col gap-2">
              {steps.map((step, i) => {
                const { Icon, color, bg } = TOOL_ICONS[step.tool];
                return (
                  <motion.div
                    key={step.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border ${bg} transition-all duration-300`}
                  >
                    <div className={`p-1.5 rounded-lg border ${bg}`}>
                      <Icon size={14} className={color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{step.label}</p>
                      {step.detail && (
                        <p className="text-xs text-muted-foreground mt-0.5">{step.detail}</p>
                      )}
                    </div>
                    <div className="shrink-0">{statusIcon(step.status)}</div>
                  </motion.div>
                );
              })}
            </div>

            {done && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-3 flex items-center gap-2 text-green-400 text-sm font-semibold"
              >
                <CheckCircle2 size={16} />
                Workflow completed successfully!
              </motion.div>
            )}
            {error && (
              <div className="mt-3 flex items-center gap-2 text-red-400 text-sm">
                <XCircle size={14} /> {error}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Slack Preview Modal */}
      <AnimatePresence>
        {slackPreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md bg-[hsl(222,47%,6%)] border border-[hsl(217,33%,18%)] rounded-2xl p-6 shadow-2xl"
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                  <MessageSquare size={16} className="text-green-400" />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">Review Slack Message</p>
                  <p className="text-xs text-muted-foreground">→ {slackPreview.channel}</p>
                </div>
              </div>

              {/* Editable message */}
              <div className="mb-4">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
                  Message
                </label>
                <textarea
                  rows={4}
                  value={editMsg}
                  onChange={(e) => setEditMsg(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[hsl(222,47%,4%)] border border-[hsl(217,33%,18%)] text-foreground text-sm resize-none outline-none focus:border-[hsl(217,91%,60%)] transition-colors"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleDelete}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-red-500/30 text-red-400 text-sm font-semibold hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 size={14} /> Cancel
                </button>
                <button
                  onClick={handleApprove}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-green-500 text-black text-sm font-bold hover:bg-green-400 transition-colors"
                >
                  <Check size={14} /> Send Now
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Center: Chat interface */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 min-h-0 overflow-y-auto">
        {steps.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <h2 className="text-2xl font-black text-foreground mb-2">What would you like to automate?</h2>
            <p className="text-muted-foreground text-sm max-w-sm">
              Describe the task in plain English. The gateway handles the rest.
            </p>
          </motion.div>
        )}

        {/* Suggestions */}
        {steps.length === 0 && (
          <div className="flex flex-col gap-2 w-full max-w-lg mb-6">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setText(s)}
                className="text-left px-4 py-3 rounded-xl border border-[hsl(217,33%,18%)] bg-[hsl(222,47%,5%)] text-sm text-muted-foreground hover:text-foreground hover:border-[hsl(217,91%,60%)] transition-all duration-200"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="w-full max-w-lg">
          <div className={`input-glow-wrapper rounded-2xl p-[1px] transition-all duration-500 ${text.trim() ? 'input-glow-active' : ''}`}>
            <div className="flex items-end gap-2 rounded-2xl bg-[hsl(222,47%,5%)] border border-[hsl(217,33%,18%)] p-3">
              <textarea
                id="manager-chat-input"
                rows={2}
                placeholder="e.g. Critical bug found in login. Start incident response..."
                value={text}
                disabled={loading}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
                className="flex-1 bg-transparent text-foreground text-sm resize-none outline-none placeholder:text-muted-foreground leading-relaxed px-1"
              />
              <button
                id="manager-chat-send"
                onClick={handleSubmit}
                disabled={!text.trim() || loading}
                className="w-10 h-10 shrink-0 flex items-center justify-center rounded-xl font-bold text-black transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:-translate-y-0.5"
                style={{ background: 'linear-gradient(135deg, hsl(217,91%,60%), hsl(240,91%,65%))' }}
              >
                {loading ? <Loader2 size={16} className="animate-spin text-black" /> : <Send size={16} />}
              </button>
            </div>
          </div>
          <p className="text-center text-[10px] text-muted-foreground mt-2">
            Powered by Agentic MCP Gateway
          </p>
        </div>
      </div>
    </div>
  );
};

export default ManagerDashboard;
