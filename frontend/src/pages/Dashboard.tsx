import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CircularProgress } from '@mui/material';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import Layout from '@/components/Layout';
import WorkflowDashboard from '@/pages/WorkflowDashboard';
import { createWorkflow } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { PanelLeftClose as PanelLeftCloseIcon, PanelLeftOpen as PanelLeftOpenIcon } from 'lucide-react';

const Dashboard = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [historyOpen, setHistoryOpen] = useState(true);

  const loadHistory = () => {
    setHistory(JSON.parse(localStorage.getItem('workflow_history') || '[]'));
  };

  useEffect(() => {
    loadHistory();
    const interval = setInterval(loadHistory, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async () => {
    if (!text.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const { workflow_id } = await createWorkflow(text);
      setText('');
      loadHistory();
      navigate(`/dashboard/${workflow_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create workflow.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="flex w-full flex-1 overflow-hidden h-full min-h-0">

        {/* ── Left Panel: Input + History ────────────────────── */}
        <AnimatePresence initial={false}>
          {historyOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 300, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="shrink-0 overflow-hidden border-r border-border flex flex-col h-full bg-card"
            >
              <div className="w-[300px] flex flex-col h-full">

          {/* Workflow Input */}
          <div className="p-4 border-b border-border bg-card shrink-0">
            <p className="text-foreground font-semibold text-sm mb-3">
              Run Parallel Workflow
            </p>
            <div className={`input-glow-wrapper rounded-xl p-[1px] transition-all duration-500 ${text.trim() ? 'input-glow-active' : ''}`}>
              <div className="flex items-start gap-2 rounded-xl bg-background p-2 border border-border">
                <textarea
                  rows={2}
                  placeholder="Describe new workflow..."
                  value={text}
                  disabled={loading}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit();
                    }
                  }}
                  className="flex-1 bg-transparent text-foreground text-sm resize-none outline-none placeholder:text-muted-foreground font-['Inter',system-ui,sans-serif] px-1 py-0.5 leading-relaxed"
                />
                <button
                  onClick={handleSubmit}
                  disabled={!text.trim() || loading}
                  className="submit-btn w-9 h-9 shrink-0 flex items-center justify-center rounded-lg mt-0.5 disabled:submit-btn-disabled disabled:opacity-50"
                  style={{ color: "black" }}
                >
                  {loading
                    ? <CircularProgress size={14} className="text-current" />
                    : <RocketLaunchIcon sx={{ fontSize: 16 }} className="text-current" />
                  }
                </button>
              </div>
            </div>
            
            {/* Quick Suggestions */}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {[
                "Send a Slack message saying Hello from my workflow system",
                "Fetch latest commits from GitHub and send a summary to Slack",
                "Fetch GitHub commits and Jira issues in parallel, then send a combined summary to Slack",
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setText(suggestion)}
                  className="text-[10px] text-muted-foreground bg-secondary hover:bg-secondary/80 hover:text-foreground px-2 py-1 rounded border border-border transition-colors text-left"
                >
                  {suggestion}
                </button>
              ))}
            </div>

            {error && <p className="text-destructive text-xs mt-3">{error}</p>}
          </div>

          {/* History */}
          <div className="flex-1 overflow-y-auto">
            <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest px-4 pt-4 pb-2">
              Workflow History
            </p>
            <div className="divide-y divide-border">
              {history.map((item, index) => (
                <button
                  key={index}
                  onClick={() => navigate('/dashboard/' + item.id)}
                  className={`w-full text-left px-4 py-3 transition-colors hover:bg-secondary/50 ${
                    id === item.id
                      ? 'bg-primary/5 border-l-2 border-primary'
                      : ''
                  }`}
                >
                  <p className={`text-sm font-medium line-clamp-2 ${id === item.id ? 'text-primary' : 'text-foreground'}`}>
                    {item.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1 font-mono">
                    {new Date(item.timestamp).toLocaleString()}
                  </p>
                </button>
              ))}
              {history.length === 0 && (
                <p className="text-muted-foreground text-xs px-4 py-6 text-center">
                  No workflows yet. Type a command above to start one!
                </p>
              )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>

        {/* ── Center + Right: DAG + Logs ─────────────────────── */}
        <div className="flex-1 h-full min-h-0 flex flex-col overflow-hidden bg-background relative">
          
          {/* Toggle History Button */}
          <button
            onClick={() => setHistoryOpen(!historyOpen)}
            className="absolute left-2 top-2 z-[100] w-7 h-7 flex items-center justify-center rounded-md bg-secondary border border-border text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-all shadow-sm"
            title={historyOpen ? "Hide History" : "Show History"}
          >
            {historyOpen ? <PanelLeftCloseIcon size={14} /> : <PanelLeftOpenIcon size={14} />}
          </button>
          {id ? (
            <WorkflowDashboard />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-fade-in">
              <div className="w-20 h-20 rounded-full border-2 border-dashed border-border flex items-center justify-center mb-5">
                <RocketLaunchIcon sx={{ fontSize: 30 }} className="text-muted-foreground" />
              </div>
              <p className="text-foreground text-lg font-semibold mb-2">No Workflow Selected</p>
              <p className="text-muted-foreground text-sm max-w-xs">
                Select a workflow from the panel or create a new one to view its execution graph and live telemetry.
              </p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
