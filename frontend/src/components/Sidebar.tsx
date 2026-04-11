import { Link } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import { LayoutDashboard, Activity, GitBranch, MessageSquare, Kanban, Server, FileSpreadsheet } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'System Logs', href: '/logs', icon: Activity },
];

const mockTools = [
  { name: 'GitHub Mock', href: '/mock/github', icon: GitBranch },
  { name: 'Jira Mock', href: '/mock/jira', icon: Kanban },
  { name: 'Slack Mock', href: '/mock/slack', icon: MessageSquare },
  { name: 'Sheets Mock', href: '/mock/sheets', icon: FileSpreadsheet },
];

export default function Sidebar() {
  const pathname = useLocation().pathname;

  return (
    <aside className="flex flex-col h-full bg-card">
      <Link to="/" className="p-6 flex items-center gap-3 border-b border-border hover:bg-secondary transition-colors">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center shrink-0">
          <Server size={18} className="text-white" />
        </div>
        <h1 className="font-semibold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-muted-foreground to-foreground">
          Agentic MCP
        </h1>
      </Link>

      <div className="flex-1 overflow-y-auto py-6 flex flex-col gap-8">
        {/* Main Navigation */}
        <div className="px-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 px-2">Core</p>
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => {
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

        {/* Mock Tools */}
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
      </div>
      
      {/* Status Footer */}
      <div className="p-4 border-t border-border bg-card flex justify-between items-center">
        <div className="flex items-center gap-3 px-2">
          <div className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </div>
          <span className="text-xs text-muted-foreground font-medium">Gateway Active</span>
        </div>
        <ThemeToggle />
      </div>
    </aside>
  );
}
