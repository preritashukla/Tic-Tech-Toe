import { Link, useNavigate } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import { LayoutDashboard, Activity, GitBranch, MessageSquare, Kanban, Server, FileSpreadsheet, LogOut, Code2, BarChart3, Github as GithubIcon, CheckCircle2 } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { useAuth } from '@/context/AuthContext';
import { useTools } from '@/context/ToolsContext';

const devNavItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'System Logs', href: '/logs',      icon: Activity },
];



export default function Sidebar() {
  const pathname = useLocation().pathname;
  const { user, logout } = useAuth();
  const { tools } = useTools();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isDeveloper = user?.role === 'developer';

  return (
    <aside className="flex flex-col h-full bg-card">
      {/* Logo */}
      <Link to="/" className="p-6 flex items-center gap-3 border-b border-border hover:bg-secondary transition-colors">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center shrink-0">
          <Server size={18} className="text-white" />
        </div>
        <h1 className="font-semibold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-muted-foreground to-foreground">
          Agentic MCP
        </h1>
      </Link>

      {/* User info */}
      {user && (
        <div className="px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2.5 px-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${isDeveloper ? 'bg-gradient-to-br from-blue-500 to-cyan-500' : 'bg-gradient-to-br from-purple-500 to-pink-500'}`}>
              {user.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{user.name}</p>
              <div className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md mt-0.5 ${
                isDeveloper
                  ? 'bg-blue-500/15 text-blue-400 border border-blue-500/20'
                  : 'bg-purple-500/15 text-purple-400 border border-purple-500/20'
              }`}>
                {isDeveloper ? <Code2 size={8} /> : <BarChart3 size={8} />}
                {user.role}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto py-6 flex flex-col gap-8">
        {/* Core Nav — always show */}
        <div className="px-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 px-2">Core</p>
          <nav className="flex flex-col gap-1">
            {devNavItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all duration-200 ${
                    isActive
                      ? 'bg-secondary text-primary font-medium'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                  }`}
                >
                  <item.icon size={18} className={isActive ? 'text-primary' : 'text-muted-foreground'} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Integration Status */}
        <div className="px-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 px-2">Integrations</p>
          <div className="flex flex-col gap-2 px-2">
            {[
              { id: 'github', name: 'GitHub', icon: GithubIcon, color: 'text-purple-400' },
              { id: 'jira', name: 'Jira', icon: Kanban, color: 'text-blue-400' },
              { id: 'slack', name: 'Slack', icon: MessageSquare, color: 'text-green-400' },
              { id: 'sheets', name: 'Sheets', icon: FileSpreadsheet, color: 'text-yellow-400' },
            ].map((tool) => {
              const connected = tools[tool.id as any]?.status === 'connected';
              return (
                <div key={tool.id} className="flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <tool.icon size={14} className={connected ? tool.color : 'text-muted-foreground/40'} />
                    <span className={`text-xs font-medium transition-colors ${connected ? 'text-foreground' : 'text-muted-foreground/60'}`}>
                      {tool.name}
                    </span>
                  </div>
                  {connected && (
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
                  )}
                </div>
              );
            })}
          </div>
        </div>


      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border bg-card flex justify-between items-center">
        <div className="flex items-center gap-3 px-2">
          <div className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
          </div>
          <span className="text-xs text-muted-foreground font-medium">Gateway Active</span>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <button
            onClick={handleLogout}
            title="Sign out"
            className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}
