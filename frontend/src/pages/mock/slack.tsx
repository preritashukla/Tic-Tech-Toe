
import { useState, useEffect, useRef } from 'react';
import { MessageSquare, Hash, Search, Bell, Bot, FileText, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import Layout from '@/components/Layout';

const formatText = (t: string) => {
    return t.replace('🚨', '🚨 ').replace(/\*(.*?)\*/g, '<strong>$1</strong>').replace(/`(.*?)`/g, '<code class="bg-[#222529] text-red-400 px-1 py-0.5 rounded text-sm font-mono">$1</code>');
};

const renderSlackMessage = (text: string) => {
    const codeBlockRegex = /```(?:csv|json|data|text)?\n([\s\S]*?)```/;
    const match = text.match(codeBlockRegex);

    if (match) {
        const preText = text.substring(0, match.index).trim();
        const postText = text.substring(match.index! + match[0].length).trim();
        const fileContent = match[1].trim();
        
        const lines = fileContent.split('\n').length;
        const fileSize = Math.max(0.1, (fileContent.length / 1024)).toFixed(1);

        const isCsv = fileContent.includes(',') && !fileContent.trim().startsWith('{');
        const fileExtension = isCsv ? 'csv' : 'json';
        const fileName = `workflow_summary_export.${fileExtension}`;

        return (
            <div className="flex flex-col gap-2">
                {preText && <div dangerouslySetInnerHTML={{__html: formatText(preText)}} />}
                
                <div className="flex items-center gap-4 bg-[#222529] border border-[#3f4145] rounded-xl pl-3 pr-4 py-3 max-w-sm mt-1 hover:bg-[#2a2d32] transition-colors cursor-pointer group shadow-sm">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${isCsv ? 'bg-green-500/20 text-green-500' : 'bg-emerald-500/20 text-emerald-500'}`}>
                        <FileText size={20} />
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <div className="text-[#d1d2d3] font-bold text-sm truncate">{fileName}</div>
                        <div className="text-[#ababad] text-xs mt-1">{fileSize} KB • {lines} rows</div>
                    </div>
                    <div className="text-[#ababad] opacity-0 group-hover:opacity-100 transition-opacity">
                        <Download size={18} />
                    </div>
                </div>

                {postText && <div dangerouslySetInnerHTML={{__html: formatText(postText)}} />}
            </div>
        );
    }
    return <div dangerouslySetInnerHTML={{__html: formatText(text)}} />;
};

export default function MockSlack() {
  const [messages, setMessages] = useState([
    { id: 1, user: 'John Doe', text: 'Hey team, any updates on the deploy?', time: '10:00 AM', isBot: false },
    { id: 2, user: 'Jane Smith', text: 'Working on it right now. Giving it 5 more mins.', time: '10:05 AM', isBot: false },
  ]);
  const [showNotification, setShowNotification] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Poll the backend mock database every 2 seconds to fetch live mock data
    const knownTimestamps = new Set<string>();

    const fetchMockMessages = async () => {
      try {
        const res = await fetch('http://localhost:8000/mock-db');
        if (!res.ok) return;
        const data = await res.json();
        
        let hasNew = false;
        const newMessages: typeof messages = [];
        
        data.forEach((entry: any) => {
          if ((entry.tool === 'slack' || entry.tool === 'slack_mcp') && (entry.action === 'send_message' || entry.action === 'post_message')) {
            if (!knownTimestamps.has(entry.timestamp)) {
              knownTimestamps.add(entry.timestamp);
              const date = new Date(entry.timestamp);
              newMessages.push({
                id: entry.timestamp as any,
                user: 'Agentic Gateway',
                text: entry.payload_received?.message || "No content",
                time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                isBot: true,
              });
              hasNew = true;
            }
          }
        });

        if (hasNew) {
          setMessages(prev => [...prev, ...newMessages]);
          setShowNotification(true);
          setTimeout(() => setShowNotification(false), 5000);
        }
      } catch (err) {
        console.error("Slack mock polling error:", err);
      }
    };

    fetchMockMessages();
    const interval = setInterval(fetchMockMessages, 2000);

    return () => clearInterval(interval);
  }, []);

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <Layout>
    <div className="h-full w-full bg-[#1a1d21] text-[#d1d2d3] font-sans flex flex-col overflow-hidden">
      {/* Mock Slack Header */}
      <header className="bg-[#121417] border-b border-[#222529] px-4 py-2 flex items-center justify-between shadow-sm z-10 shrink-0">
        <div className="w-1/3 flex items-center justify-start">
          <Link to="/dashboard" className="text-xs font-medium text-[#d1d2d3] hover:text-white transition-colors mr-4">
            Exit to Dashboard
          </Link>
        </div>
        <div className="flex-1 flex justify-center">
          <div className="bg-[#2a2d32] border border-[#3f4145] rounded-md px-3 py-1 flex items-center gap-2 w-96 max-w-full">
            <Search size={14} className="text-[#ababad]" />
            <span className="text-xs text-[#ababad]">Search MockSlack</span>
          </div>
        </div>
        <div className="w-1/3 flex justify-end">
          <MessageSquare className="text-[#e2e2e2]" size={24} />
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 bg-[#19171d] border-r border-[#222529] flex flex-col pt-4 shrink-0">
          <div className="px-4 mb-6 cursor-pointer hover:bg-[#350d36] py-1 transition-colors">
            <h2 className="font-bold text-white text-lg flex items-center gap-2">Engineering <Bell size={14} className="text-[#ababad]" /></h2>
          </div>
          
          <div className="flex-1 overflow-y-auto px-2">
            <p className="text-xs font-semibold text-[#ababad] px-2 mb-2">Channels</p>
            <div className="bg-[#1164A3] text-white rounded-md px-2 py-1 flex items-center gap-2 cursor-pointer mb-1 shadow-sm font-medium">
              <Hash size={16} /> alerts
            </div>
            <div className="text-[#ababad] hover:bg-[#350d36] rounded-md px-2 py-1 flex items-center gap-2 cursor-pointer mb-1 transition-colors">
              <Hash size={16} /> general
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-[#1a1d21] overflow-hidden">
          {/* Channel Header */}
          <div className="px-5 py-3 border-b border-[#222529] shrink-0 bg-[#1a1d21]/95 backdrop-blur z-10 flex items-center gap-2">
            <Hash size={20} className="text-[#ababad]" />
            <h3 className="font-bold text-white">alerts</h3>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
            <div className="flex items-center gap-4 text-xs font-bold text-[#ababad] my-4 before:h-px before:flex-1 before:bg-[#222529] after:h-px after:flex-1 after:bg-[#222529]">
               Today
            </div>
            {messages.map((msg, idx) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 group px-4 py-2 -mx-4 hover:bg-[#222529]/50 transition-colors ${
                  msg.isBot && idx === messages.length - 1 ? 'ring-1 ring-inset ring-amber-500/30 bg-amber-500/5 glow-purple rounded-md' : ''
                }`}
              >
                {/* Avatar */}
                <div className={`w-10 h-10 rounded shadow-sm flex items-center justify-center shrink-0 ${
                  msg.isBot ? 'bg-gradient-to-br from-amber-500 to-orange-500' : 'bg-gradient-to-br from-cyan-600 to-blue-700'
                }`}>
                  {msg.isBot ? <Bot size={24} className="text-white" /> : <span className="font-bold text-white">{msg.user.charAt(0)}</span>}
                </div>
                
                {/* Content */}
                <div>
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="font-bold text-[#d1d2d3]">{msg.user}</span>
                    {msg.isBot && <span className="text-[10px] bg-[#222529] px-1 rounded text-[#ababad]">APP</span>}
                    <span className="text-xs text-[#ababad]">{msg.time}</span>
                  </div>
                  <div className="text-[15px] leading-relaxed text-[#d1d2d3]">
                    {renderSlackMessage(msg.text)}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Input Box */}
          <div className="px-5 pb-5 pt-2 shrink-0">
             <div className="bg-[#222529] border border-[#565856] rounded-xl px-4 py-3 pb-8 cursor-not-allowed">
               <span className="text-[#ababad] text-sm">Send a message to #alerts</span>
             </div>
          </div>
        </div>
      </div>

      {/* Futuristic Notification Popup wrapper */}
      <AnimatePresence>
        {showNotification && (
          <motion.div
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.9 }}
            className="fixed top-16 right-8 bg-[#222529] border border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.3)] rounded-lg p-4 flex items-start gap-4 z-50 w-80 text-white"
          >
            <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
              <Bot className="text-amber-400" size={20} />
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-1">Message Sent to #alerts</h4>
              <p className="text-xs text-[#ababad]">The DAG executor successfully delivered the incident report.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </Layout>
  );
}
