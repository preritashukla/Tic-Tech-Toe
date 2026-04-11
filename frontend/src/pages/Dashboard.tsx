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
              className="shrink-0 overflow-hidden border-r border-[hsl(217,33%,15%)] flex flex-col h-full bg-[hsl(222,47%,6%)]"
            >
              <div className="w-[300px] flex flex-col h-full">

          {/* Workflow Input */}
          <div className="p-4 border-b border-[hsl(217,33%,15%)] bg-[hsl(222,47%,8%)] shrink-0">
            <p className="text-[hsl(213,31%,91%)] font-semibold text-sm mb-3">
              Run Parallel Workflow
            </p>
            <div className={`input-glow-wrapper rounded-xl p-[1px] transition-all duration-500 ${text.trim() ? 'input-glow-active' : ''}`}>
              <div className="flex items-start gap-2 rounded-xl bg-[hsl(222,47%,4%)] p-2 border border-[hsl(217,33%,15%)]">
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
                  className="flex-1 bg-transparent text-[hsl(213,31%,91%)] text-sm resize-none outline-none placeholder:text-[hsl(215,20%,40%)] font-['Inter',system-ui,sans-serif] px-1 py-0.5 leading-relaxed"
                />
                <button
                  onClick={handleSubmit}
                  disabled={!text.trim() || loading}
                  className="submit-btn w-9 h-9 shrink-0 flex items-center justify-center rounded-lg mt-0.5 disabled:submit-btn-disabled disabled:opacity-50"
                >
                  {loading
                    ? <CircularProgress size={14} sx={{ color: 'hsl(222, 47%, 6%)' }} />
                    : <RocketLaunchIcon sx={{ fontSize: 16, color: 'hsl(222, 47%, 6%)' }} />
                  }
                </button>
              </div>
            </div>
            
            {/* Quick Suggestions */}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {[
                "Critical bug filed in Jira",
                "Competitor dropped prices",
                "AWS CloudWatch high CPU",
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setText(suggestion)}
                  className="text-[10px] text-[hsl(215,20%,65%)] bg-[hsl(217,33%,12%)] hover:bg-[hsl(217,33%,18%)] hover:text-white px-2 py-1 rounded border border-[hsl(217,33%,18%)] transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>

            {error && <p className="text-red-400 text-xs mt-3">{error}</p>}
          </div>

          {/* History */}
          <div className="flex-1 overflow-y-auto">
            <p className="text-[hsl(215,20%,55%)] text-[10px] font-bold uppercase tracking-widest px-4 pt-4 pb-2">
              Workflow History
            </p>
            <div className="divide-y divide-[hsl(217,33%,12%)]">
              {history.map((item, index) => (
                <button
                  key={index}
                  onClick={() => navigate('/dashboard/' + item.id)}
                  className={`w-full text-left px-4 py-3 transition-colors hover:bg-[hsl(217,33%,15%)] ${
                    id === item.id
                      ? 'bg-[hsl(217,91%,60%,0.08)] border-l-2 border-[hsl(217,91%,60%)]'
                      : ''
                  }`}
                >
                  <p className={`text-sm font-medium line-clamp-2 ${id === item.id ? 'text-[hsl(217,91%,70%)]' : 'text-[hsl(213,31%,91%)]'}`}>
                    {item.name}
                  </p>
                  <p className="text-[10px] text-[hsl(215,20%,55%)] mt-1 font-mono">
                    {new Date(item.timestamp).toLocaleString()}
                  </p>
                </button>
              ))}
              {history.length === 0 && (
                <p className="text-[hsl(215,20%,45%)] text-xs px-4 py-6 text-center">
                  No workflows yet. Type a command above to start one!
                </p>
              )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

        {/* ── Center + Right: DAG + Logs ─────────────────────── */}
        <div className="flex-1 h-full min-h-0 flex flex-col overflow-hidden bg-[hsl(222,47%,4%)] relative">
          
          {/* Toggle History Button */}
          <button
            onClick={() => setHistoryOpen(!historyOpen)}
            className="absolute left-2 top-2 z-[100] w-7 h-7 flex items-center justify-center rounded-md bg-[hsl(222,47%,8%)] border border-[hsl(217,33%,15%)] text-[hsl(215,20%,55%)] hover:text-white hover:bg-[hsl(217,33%,15%)] transition-all shadow-sm"
            title={historyOpen ? "Hide History" : "Show History"}
          >
            {historyOpen ? <PanelLeftCloseIcon size={14} /> : <PanelLeftOpenIcon size={14} />}
          </button>
          {id ? (
            <WorkflowDashboard />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-fade-in">
              <div className="w-20 h-20 rounded-full border-2 border-dashed border-[hsl(217,33%,25%)] flex items-center justify-center mb-5">
                <RocketLaunchIcon sx={{ fontSize: 30, color: 'hsl(215,20%,40%)' }} />
              </div>
              <p className="text-[hsl(213,31%,91%)] text-lg font-semibold mb-2">No Workflow Selected</p>
              <p className="text-[hsl(215,20%,55%)] text-sm max-w-xs">
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
