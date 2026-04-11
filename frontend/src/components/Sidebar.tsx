import { Link, useNavigate } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import { LayoutDashboard, Activity, GitBranch, MessageSquare, Kanban, Server, FileSpreadsheet, LogOut, Code2, BarChart3 } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { useAuth } from '@/context/AuthContext';

const devNavItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'System Logs', href: '/logs',      icon: Activity },
];

const mockTools = [
  { name: 'GitHub Mock', href: '/mock/github', icon: GitBranch },
  { name: 'Jira Mock',   href: '/mock/jira',   icon: Kanban },
  { name: 'Slack Mock',  href: '/mock/slack',  icon: MessageSquare },
  { name: 'Sheets Mock', href: '/mock/sheets', icon: FileSpreadsheet },
];

export default function Sidebar() {
  const pathname = useLocation().pathname;
  const { user, logout } = useAuth();
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

        {/* Mock Tools — Developer only */}
        {isDeveloper && (
          <div className="px-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 px-2">Simulated Tools</p>
            <nav className="flex flex-col gap-1">
              {mockTools.map((item) => {
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
        )}
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
