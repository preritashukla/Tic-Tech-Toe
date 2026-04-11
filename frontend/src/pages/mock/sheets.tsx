import { useState, useEffect } from 'react';
import { FileSpreadsheet } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import Layout from '@/components/Layout';

export default function MockSheets() {
  const [rows, setRows] = useState<{id: string, time: string, data: any}[]>([
    { id: '1', time: '09:00 AM', data: { tool: "system", action: "init", payload_received: { message: "Sheet bound successfully" } } }
  ]);
  const [showNotification, setShowNotification] = useState(false);

  useEffect(() => {
    const knownTimestamps = new Set<string>();

    const fetchMockData = async () => {
      try {
        const res = await fetch('http://localhost:8000/mock-db');
        if (!res.ok) return;
        const data = await res.json();
        
        let hasNew = false;
        const newRows: typeof rows = [];
        
        data.forEach((entry: any) => {
          if ((entry.tool === 'sheets' || entry.tool === 'sheets_mcp') || entry.action === 'append_row' || entry.action === 'log_data' || entry.action === 'update_row') {
            if (!knownTimestamps.has(entry.timestamp)) {
              knownTimestamps.add(entry.timestamp);
              const date = new Date(entry.timestamp);
              newRows.push({
                id: entry.timestamp,
                time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                data: entry
              });
              hasNew = true;
            }
          }
        });

        if (hasNew) {
          setRows(prev => {
              // only add if it doesn't already exist
              const existingIds = new Set(prev.map(r => r.id));
              const filteredNew = newRows.filter(r => !existingIds.has(r.id));
              if (filteredNew.length === 0) return prev;
              return [...prev, ...filteredNew];
          });
          setShowNotification(true);
          setTimeout(() => setShowNotification(false), 5000);
        }
      } catch (err) {
        console.error("Sheets mock polling error:", err);
      }
    };

    fetchMockData();
    const interval = setInterval(fetchMockData, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Layout>
      <div className="h-full w-full bg-[#f9fbfd] text-[#202124] font-sans flex flex-col overflow-hidden">
        {/* Google Sheets Header Area */}
        <header className="bg-white border-b border-[#dadce0] px-4 py-3 flex items-center justify-between z-10 shrink-0">
          <div className="flex items-center gap-3">
             <Link to="/dashboard" className="mr-2">
                 <div className="w-10 h-10 bg-[#0f9d58]/10 rounded-md flex items-center justify-center hover:bg-[#0f9d58]/20 transition-colors">
                    <FileSpreadsheet size={24} className="text-[#0f9d58]" />
                 </div>
             </Link>
             <div>
                <h1 className="text-[18px] font-medium text-[#202124] leading-tight">Workflow Maestro Database</h1>
                <div className="flex items-center gap-3 text-xs text-[#5f6368] mt-1 hidden sm:flex">
                  <span className="hover:bg-[#f1f3f4] px-1.5 py-0.5 rounded cursor-pointer">File</span>
                  <span className="hover:bg-[#f1f3f4] px-1.5 py-0.5 rounded cursor-pointer">Edit</span>
                  <span className="hover:bg-[#f1f3f4] px-1.5 py-0.5 rounded cursor-pointer">View</span>
                  <span className="hover:bg-[#f1f3f4] px-1.5 py-0.5 rounded cursor-pointer">Insert</span>
                </div>
             </div>
          </div>
          <div className="flex items-center gap-4">
             <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold">
               A
             </div>
          </div>
        </header>

        {/* Toolbar */}
        <div className="bg-[#edf2fa] border-b border-[#c2c2c2] px-4 py-1 flex items-center gap-4 shrink-0 text-[#202124] overflow-x-auto">
           <span className="text-sm font-bold shrink-0">100%</span>
           <div className="w-px h-4 bg-[#dadce0] shrink-0"></div>
           <span className="text-sm font-bold shrink-0">$</span>
           <span className="text-sm font-bold shrink-0">%</span>
           <span className="text-sm font-bold shrink-0">.00</span>
           <div className="w-px h-4 bg-[#dadce0] shrink-0"></div>
           <span className="text-sm font-bold shrink-0">Arial</span>
           <span className="text-sm shrink-0">10</span>
        </div>

        {/* Formula bar */}
        <div className="bg-white border-b border-[#c2c2c2] flex items-center shrink-0">
            <div className="w-12 h-6 border-r border-[#c2c2c2] flex items-center justify-center text-xs font-mono text-[#5f6368] bg-[#f8f9fa]">
               fx
            </div>
            <div className="flex-1 px-3 py-1 text-sm font-mono text-[#202124] overflow-hidden text-ellipsis whitespace-nowrap">
               Live Agentic Append Output Log
            </div>
        </div>

        {/* Spreadsheet Area */}
        <div className="flex-1 overflow-auto bg-white flex relative">
            <div className="flex flex-col min-w-full pb-10">
              {/* Header Row */}
              <div className="flex border-b border-[#c2c2c2] sticky top-0 bg-[#f8f9fa] z-10 shrink-0 shadow-sm">
                <div className="w-12 min-w-[3rem] max-w-[3rem] border-r border-[#c2c2c2] bg-[#f8f9fa]"></div>
                {['A (Timestamp)', 'B (Action)', 'C (Tool)', 'D (Payload / Data)'].map((col) => (
                  <div key={col} className="w-64 min-w-[12rem] flex-1 px-2 py-1 text-xs text-[#202124] font-medium border-r border-[#c2c2c2] flex items-center justify-center">
                    {col}
                  </div>
                ))}
              </div>

              {/* Data Rows */}
              <div className="flex flex-col">
                {rows.map((row, index) => (
                    <div key={row.id} className="flex border-b border-[#e2e3e3] hover:bg-[#e6f4ea] transition-colors group">
                        <div className="w-12 min-w-[3rem] max-w-[3rem] border-r border-[#c2c2c2] bg-[#f8f9fa] text-[11px] text-[#5f6368] flex items-center justify-center group-hover:bg-[#d3e3fd] group-hover:text-blue-800 font-medium">
                            {index + 1}
                        </div>
                        <div className="w-64 min-w-[12rem] flex-1 px-3 py-1.5 text-sm text-[#202124] border-r border-[#e2e3e3] truncate">
                            {row.time}
                        </div>
                        <div className="w-64 min-w-[12rem] flex-1 px-3 py-1.5 text-sm text-[#202124] border-r border-[#e2e3e3] truncate">
                            {row.data.action || "APPEND"}
                        </div>
                        <div className="w-64 min-w-[12rem] flex-1 px-3 py-1.5 text-sm text-[#202124] border-r border-[#e2e3e3] truncate">
                            {row.data.tool || "Sheets Agent"}
                        </div>
                        <div className="w-64 min-w-[12rem] flex-1 px-3 py-1.5 text-sm text-[#202124] border-r border-[#e2e3e3] font-mono text-[11px] overflow-hidden text-ellipsis whitespace-nowrap">
                            {JSON.stringify(row.data.payload_received ?? row.data)}
                        </div>
                    </div>
                ))}
                
                {/* Empty rows filler */}
                {Array.from({length: 30}).map((_, i) => (
                    <div key={`empty-${i}`} className="flex border-b border-[#e2e3e3]">
                        <div className="w-12 min-w-[3rem] max-w-[3rem] border-r border-[#c2c2c2] bg-[#f8f9fa] text-[11px] text-[#5f6368] flex items-center justify-center font-medium">
                            {rows.length + i + 1}
                        </div>
                        <div className="w-64 min-w-[12rem] flex-1 border-r border-[#e2e3e3] h-[31px]"></div>
                        <div className="w-64 min-w-[12rem] flex-1 border-r border-[#e2e3e3]"></div>
                        <div className="w-64 min-w-[12rem] flex-1 border-r border-[#e2e3e3]"></div>
                        <div className="w-64 min-w-[12rem] flex-1 border-r border-[#e2e3e3]"></div>
                    </div>
                ))}
              </div>
            </div>
        </div>

        {/* Notification Popup */}
        <AnimatePresence>
          {showNotification && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              className="fixed bottom-8 left-[50%] ml-[128px] -translate-x-[50%] bg-[#323232] shadow-xl rounded-full px-6 py-3 flex items-center gap-3 z-50 text-white"
            >
               <FileSpreadsheet className="text-[#34a853]" size={18} />
               <span className="text-sm font-medium">Row appended via Sheets API</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
}
