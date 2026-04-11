
import { useState, useEffect } from 'react';
import { Kanban, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import Layout from '@/components/Layout';

export default function MockJira() {
  const [tickets, setTickets] = useState([
    { id: 'PROJ-1042', title: 'Update README docs', status: 'Done', priority: 'Low' },
    { id: 'PROJ-1043', title: 'Fix login screen timeout', status: 'In Progress', priority: 'High' },
  ]);
  const [highlighted, setHighlighted] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      const newTicket = { id: 'PROJ-1045', title: 'Workflow failure on production gateway', status: 'To Do', priority: 'Critical' };
      setTickets((prev) => [newTicket, ...prev]);
      setHighlighted('PROJ-1045');
      
      setTimeout(() => setHighlighted(null), 6000);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Layout>
    <div className="h-full w-full bg-[#f4f5f7] dark:bg-[#1d2125] text-[#172b4d] dark:text-[#b6c2cf] font-sans overflow-y-auto">
      {/* Mock Jira Navbar */}
      <header className="bg-white dark:bg-[#1d2125] border-b border-[#dfe1e6] dark:border-[#282e33] px-6 py-3 flex items-center justify-between shadow-sm relative z-10 w-full">
        <div className="flex items-center gap-4">
          <Kanban className="text-[#0052cc] dark:text-[#579dff]" size={28} />
          <h1 className="font-bold text-lg text-[#172b4d] dark:text-[#cfd4db]">MockJira Software</h1>
          <nav className="hidden md:flex items-center gap-6 ml-6 text-sm font-medium text-[#42526e] dark:text-[#b6c2cf]">
            <span className="cursor-pointer hover:text-[#0052cc] dark:hover:text-[#579dff]">Projects</span>
            <span className="cursor-pointer hover:text-[#0052cc] dark:hover:text-[#579dff]">Filters</span>
            <span className="cursor-pointer hover:text-[#0052cc] dark:hover:text-[#579dff]">Dashboards</span>
          </nav>
        </div>
        <Link to="/dashboard" className="text-xs font-medium text-[#0052cc] dark:text-[#579dff] hover:underline">
          Return to Dashboard
        </Link>
      </header>

      <main className="max-w-6xl mx-auto py-8 px-6 flex gap-8">
        {/* Sidebar */}
        <div className="w-64 hidden lg:block">
          <div className="mb-6 flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-md"></div>
            <div>
              <h2 className="font-semibold text-sm text-[#172b4d] dark:text-white">Agentic Project</h2>
              <p className="text-xs text-[#6b778c] dark:text-[#8c9bab]">Software project</p>
            </div>
          </div>
          <nav className="space-y-1 text-sm font-medium text-[#42526e] dark:text-[#b6c2cf]">
            <div className="bg-[#ebecf0] dark:bg-[#282e33] text-[#0052cc] dark:text-[#579dff] px-3 py-2 rounded-md cursor-pointer">Board</div>
            <div className="px-3 py-2 hover:bg-[#ebecf0] dark:hover:bg-[#282e33] rounded-md cursor-pointer transition-colors">Issues</div>
          </nav>
        </div>

        {/* Board */}
        <div className="flex-1">
          <h2 className="text-2xl font-semibold text-[#172b4d] dark:text-white mb-6">Kanban Board</h2>
          
          <div className="flex gap-4 items-start overflow-x-auto pb-4">
            {/* TO DO Column */}
            <div className="bg-[#f4f5f7] dark:bg-[#161a1d] min-w-[300px] rounded-xl p-3">
              <h3 className="text-xs font-semibold text-[#5e6c84] dark:text-[#8c9bab] uppercase mb-3 px-1">To Do <span className="ml-1 text-[#0052cc] dark:text-[#579dff]">{tickets.filter(t => t.status === 'To Do').length}</span></h3>
              <div className="space-y-3">
                <AnimatePresence>
                  {tickets.filter(t => t.status === 'To Do').map(ticket => (
                    <motion.div
                      key={ticket.id}
                      initial={{ opacity: 0, scale: 0.9, y: -20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      className={`bg-white dark:bg-[#22272b] p-4 rounded-lg shadow-sm border-l-4 cursor-pointer relative overflow-hidden transition-all
                        ${ticket.priority === 'Critical' ? 'border-red-500' : 'border-transparent'}
                        ${highlighted === ticket.id ? 'ring-2 ring-[#579dff] shadow-[0_0_15px_rgba(87,157,255,0.4)]' : ''}
                      `}
                    >
                      {highlighted === ticket.id && (
                        <div className="absolute inset-0 bg-blue-500/5 pointer-events-none" />
                      )}
                      <p className="text-sm text-[#172b4d] dark:text-[#cfd4db] font-medium mb-3 relative z-10">{ticket.title}</p>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#dfe1e6] dark:border-[#282e33]">
                        <div className="flex items-center gap-1.5 bg-[#dfe1e6] dark:bg-[#282e33] px-2 py-0.5 rounded text-xs font-semibold text-[#42526e] dark:text-[#b6c2cf]">
                          {ticket.id}
                        </div>
                        {ticket.priority === 'Critical' && <AlertCircle size={14} className="text-red-500" />}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>

            {/* IN PROGRESS Column */}
            <div className="bg-[#f4f5f7] dark:bg-[#161a1d] min-w-[300px] rounded-xl p-3">
              <h3 className="text-xs font-semibold text-[#5e6c84] dark:text-[#8c9bab] uppercase mb-3 px-1">In Progress <span className="ml-1 text-[#0052cc] dark:text-[#579dff]">{tickets.filter(t => t.status === 'In Progress').length}</span></h3>
              <div className="space-y-3">
                {tickets.filter(t => t.status === 'In Progress').map(ticket => (
                  <div key={ticket.id} className="bg-white dark:bg-[#22272b] p-4 rounded-lg shadow-sm border-l-4 border-yellow-500">
                    <p className="text-sm text-[#172b4d] dark:text-[#cfd4db] font-medium mb-3">{ticket.title}</p>
                    <div className="flex items-center justify-between border-t border-[#dfe1e6] dark:border-[#282e33] pt-2 mt-2">
                       <span className="text-xs font-semibold text-[#42526e] dark:text-[#b6c2cf]">{ticket.id}</span>
                       <Clock size={14} className="text-yellow-500" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* DONE Column */}
             <div className="bg-[#f4f5f7] dark:bg-[#161a1d] min-w-[300px] rounded-xl p-3">
              <h3 className="text-xs font-semibold text-[#5e6c84] dark:text-[#8c9bab] uppercase mb-3 px-1">Done <span className="ml-1 text-[#0052cc] dark:text-[#579dff]">{tickets.filter(t => t.status === 'Done').length}</span></h3>
              <div className="space-y-3">
                {tickets.filter(t => t.status === 'Done').map(ticket => (
                  <div key={ticket.id} className="bg-white dark:bg-[#22272b] p-4 rounded-lg shadow-sm border-l-4 border-green-500 opacity-60">
                    <p className="text-sm line-through text-[#6b778c] dark:text-[#8c9bab] font-medium mb-3">{ticket.title}</p>
                    <div className="flex items-center justify-between border-t border-[#dfe1e6] dark:border-[#282e33] pt-2 mt-2">
                       <span className="text-xs font-semibold text-[#6b778c] dark:text-[#505f79]">{ticket.id}</span>
                       <CheckCircle2 size={14} className="text-green-500" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Futuristic Notification Popup */}
      <AnimatePresence>
        {highlighted && (
          <motion.div
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.9 }}
            className="fixed top-20 right-8 bg-[#1d2125] border border-[#579dff]/50 shadow-[0_0_20px_rgba(87,157,255,0.3)] rounded-lg p-4 flex items-start gap-4 z-50 w-80 text-[#b6c2cf]"
          >
            <div className="w-10 h-10 rounded-full bg-[#579dff]/20 flex items-center justify-center shrink-0">
              <AlertCircle className="text-[#579dff]" size={20} />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-1">Incoming Ticket Detected</h4>
              <p className="text-xs">DAG executor has flagged <span className="text-[#579dff] font-bold">PROJ-1045</span> for immediate action.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </Layout>
  );
}
