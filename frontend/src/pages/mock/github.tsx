
import { useState, useEffect } from 'react';
import { GitBranch, Terminal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import Layout from '@/components/Layout';

export default function MockGitHub() {
  const [branches, setBranches] = useState([
    { name: 'main', time: '2 hours ago' },
    { name: 'dev', time: '5 hours ago' },
  ]);
  const [showNotification, setShowNotification] = useState(false);

  useEffect(() => {
    // Simulate webhooks/polling after 3 seconds: Add new branch created by Gateway
    const timer = setTimeout(() => {
      setBranches((prev) => [
        { name: 'fix/PROJ-1045', time: 'Just now' },
        ...prev
      ]);
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 5000);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Layout>
    <div className="h-full bg-[#0d1117] text-[#c9d1d9] font-sans">
      {/* Mock GitHub Header */}
      <header className="bg-[#161b22] px-6 py-4 flex items-center justify-between border-b border-[#30363d]">
        <div className="flex items-center gap-4">
          <GitBranch size={32} className="text-white" />
          <div className="text-sm font-semibold text-blue-400 cursor-pointer">
            agentic-mcp / gateway-demo
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/dashboard" className="text-xs text-[#8b949e] hover:text-white transition-colors">
            Return to Dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto py-8 px-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="px-4 py-1.5 bg-[#21262d] border border-[#30363d] rounded-md text-sm font-medium flex items-center gap-2 cursor-pointer shadow-sm">
            <GitBranch size={16} className="text-[#8b949e]" />
            Branches
            <span className="bg-[#30363d] px-2 py-0.5 rounded-full text-xs">{branches.length}</span>
          </div>
        </div>

        <div className="border border-[#30363d] rounded-md bg-[#0d1117] overflow-hidden">
          <div className="bg-[#161b22] px-4 py-3 border-b border-[#30363d] text-sm font-semibold flex items-center gap-2">
            <Terminal size={14} className="text-[#8b949e]" />
            Active Branches
          </div>
          <div className="divide-y divide-[#30363d]">
            <AnimatePresence>
              {branches.map((branch, idx) => (
                <motion.div
                  key={branch.name}
                  initial={{ opacity: 0, height: 0, backgroundColor: 'rgba(56, 139, 253, 0)' }}
                  animate={{ opacity: 1, height: 'auto', backgroundColor: idx === 0 && branch.name.startsWith('fix/') ? 'rgba(56, 139, 253, 0.1)' : 'rgba(0,0,0,0)' }}
                  transition={{ duration: 0.5 }}
                  className="px-4 py-3 flex items-center justify-between hover:bg-[#161b22] transition-colors"
                >
                  <div className="flex items-center gap-3 text-sm">
                    <span className="font-medium text-[#58a6ff] hover:underline cursor-pointer">{branch.name}</span>
                    <span className="text-[#8b949e] text-xs">Updated {branch.time}</span>
                  </div>
                  {idx === 0 && branch.name.startsWith('fix/') && (
                    <span className="px-2 py-0.5 text-xs bg-green-500/10 text-green-400 border border-green-500/20 rounded-xl">
                      Automated by MCP
                    </span>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Futuristic Notification Popup */}
      <AnimatePresence>
        {showNotification && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-8 right-8 bg-[#161b22] border border-blue-500/50 shadow-[0_0_20px_rgba(56,139,253,0.3)] rounded-lg p-4 flex items-start gap-4 z-50 w-80"
          >
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
              <GitBranch className="text-blue-400" size={20} />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-1">New Branch Created</h4>
              <p className="text-xs text-[#8b949e]">The DAG executor created exactly what you asked for: <span className="text-blue-400 font-mono">fix/PROJ-1045</span></p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </Layout>
  );
}
