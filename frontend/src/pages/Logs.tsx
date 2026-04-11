
import { useState, useEffect, useRef } from 'react';
import { Terminal } from 'lucide-react';
import { motion } from 'framer-motion';
import Layout from '@/components/Layout';

const MOCK_LOGS = [
  { level: 'INFO', msg: 'Starting system gateway...' },
  { level: 'DEBUG', msg: 'Loaded MCP configuration from /etc/gateway.yaml' },
  { level: 'INFO', msg: 'Connecting to Jira instance...' },
  { level: 'INFO', msg: 'Connecting to GitHub worker...' },
  { level: 'INFO', msg: 'Executing DAG: "Bug Triage Pipeline"' },
  { level: 'DEBUG', msg: 'Polling Jira for new tickets with status="Open"' },
  { level: 'INFO', msg: 'Found new Jira ticket: PROJ-1045' },
  { level: 'INFO', msg: 'Triggering GitHub branch creation' },
  { level: 'ERROR', msg: 'GitHub rate limit exceeded. Retrying...' },
  { level: 'RETRY', msg: 'Retrying GitHub API call (1/3)' },
  { level: 'INFO', msg: 'Branch "fix/PROJ-1045" created successfully' },
  { level: 'INFO', msg: 'Sending Slack notification to #engineering' },
  { level: 'INFO', msg: 'Workflow completed successfully.' },
];

export default function LogsPage() {
  const [logs, setLogs] = useState<{ level: string; msg: string; time: string }[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let index = 0;
    
    // Auto-feed mock logs every 1-2 seconds
    const interval = setInterval(() => {
      if (index < MOCK_LOGS.length) {
        const currentLog = MOCK_LOGS[index];
        const time = new Date().toISOString().split('T')[1].slice(0, -1); // HH:MM:SS.mmm
        
        setLogs((prev) => [...prev, { ...currentLog, time }]);
        index++;
      } else {
        // Reset or just loop back for infinite real-time feel
        index = 0; 
      }
    }, Math.random() * 1000 + 1000); // 1-2s

    return () => clearInterval(interval);
  }, []);

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const getLogColor = (level: string) => {
    switch (level) {
      case 'INFO': return 'text-cyan-400';
      case 'ERROR': return 'text-red-400';
      case 'DEBUG': return 'text-gray-400';
      case 'RETRY': return 'text-purple-400';
      default: return 'text-white';
    }
  };

  return (
    <Layout>
    <div className="flex flex-col h-full min-h-0 p-8 w-full max-w-full">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-outfit font-bold tracking-tight text-white mb-2 flex items-center gap-3">
            <Terminal className="text-cyan-400" /> System Logs
          </h1>
          <p className="text-gray-400">Live orchestration execution logs</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
          <span className="text-sm font-medium text-green-400">Connected</span>
        </div>
      </div>

      <div className="flex-1 bg-[#09090b] border border-[#27272a] rounded-xl overflow-hidden relative shadow-2xl">
        <div className="bg-[#18181b] border-b border-[#27272a] px-4 py-3 flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
          </div>
          <span className="text-xs text-gray-400 font-mono ml-2">tail -f /var/log/mcp-gateway.log</span>
        </div>
        
        <div 
          ref={scrollRef}
          className="p-4 overflow-y-auto h-[calc(100%-48px)] font-mono text-sm space-y-1.5"
        >
          {logs.length === 0 ? (
            <div className="text-gray-500">Waiting for logs...</div>
          ) : (
            logs.map((log, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-start gap-4 hover:bg-[#18181b] px-2 py-1 rounded transition-colors"
              >
                <span className="text-gray-500 shrink-0 select-none">[{log.time}]</span>
                <span className={`font-semibold shrink-0 w-16 ${getLogColor(log.level)}`}>
                  [{log.level}]
                </span>
                <span className="text-gray-300 break-all">{log.msg}</span>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
    </Layout>
  );
}
