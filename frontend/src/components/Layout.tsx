import { ReactNode } from 'react';
import { Box } from '@mui/material';
import Sidebar from './Sidebar';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <Box className="h-screen bg-black text-white flex overflow-hidden font-sans">
      <Sidebar className="w-64 border-r border-[#27272a] bg-[#09090b] hidden md:flex" />
      <main className="flex-1 overflow-hidden relative bg-[#0a0a0a] flex flex-col min-h-0">
        {children}
      </main>
    </Box>
  );
};

export default Layout;
