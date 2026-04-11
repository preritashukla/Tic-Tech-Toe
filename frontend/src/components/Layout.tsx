import { ReactNode, useState } from 'react';
import { Box } from '@mui/material';
import Sidebar from './Sidebar';
import { motion, AnimatePresence } from 'framer-motion';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <Box className="h-screen bg-black text-white flex overflow-hidden font-sans relative">

      {/* ── Navigation Sidebar ───────────────────────────── */}
      <AnimatePresence initial={false}>
        {sidebarOpen && (
          <motion.div
            key="sidebar"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 256, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="shrink-0 overflow-hidden border-r border-[#27272a] bg-[#09090b] flex flex-col h-full"
          >
            {/* Extra padding so content doesn't clip during animation */}
            <div className="w-64 flex flex-col h-full">
              <Sidebar />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Toggle Button ────────────────────────────────── */}
      <button
        onClick={() => setSidebarOpen((o) => !o)}
        title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        className="absolute top-3 z-50 flex items-center justify-center w-7 h-7 rounded-md bg-[#18181b] border border-[#27272a] text-gray-400 hover:text-white hover:bg-[#27272a] transition-all duration-200 shadow-md"
        style={{ left: sidebarOpen ? '244px' : '8px' }}
      >
        {sidebarOpen
          ? <PanelLeftClose size={15} />
          : <PanelLeftOpen  size={15} />
        }
      </button>

      {/* ── Main Content ─────────────────────────────────── */}
      <main className="flex-1 overflow-hidden relative bg-[#0a0a0a] flex flex-col min-h-0">
        {children}
      </main>
    </Box>
  );
};

export default Layout;
