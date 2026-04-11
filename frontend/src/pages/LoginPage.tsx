import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Eye, EyeOff, Loader2, AlertCircle, Code2, BarChart3 } from 'lucide-react';
import { useAuth, UserRole } from '@/context/AuthContext';

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole]         = useState<UserRole>('developer');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const from = (location.state as any)?.from?.pathname || '/connect-tools';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError('Please fill in all fields.'); return; }
    setLoading(true);
    setError(null);
    try {
      await login(email, password, role);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen bg-background text-foreground flex items-center justify-center relative overflow-hidden">
      {/* Background */}
      <div className="grid-bg" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md px-4"
      >
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="p-4 rounded-2xl bg-[hsl(222,47%,8%)] border border-[hsl(217,33%,15%)] mb-4 shadow-xl ai-icon-glow">
            <Zap size={36} className="text-[hsl(217,91%,60%)] ai-icon-spin" />
          </div>
          <h1 className="text-2xl font-black tracking-tight mb-1"
            style={{
              background: 'linear-gradient(135deg, hsl(213,31%,95%), hsl(217,91%,70%), hsl(270,91%,75%))',
              backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
            Agentic MCP Gateway
          </h1>
          <p className="text-[hsl(215,20%,50%)] text-sm">Sign in to your workspace</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-[hsl(217,33%,18%)] bg-[hsl(222,47%,6%)] shadow-2xl p-8">

          {/* Role Selector */}
          <div className="flex gap-2 mb-6 p-1 rounded-xl bg-[hsl(222,47%,4%)] border border-[hsl(217,33%,15%)]">
            {([
              { value: 'developer', label: 'Developer', Icon: Code2 },
              { value: 'manager',   label: 'Manager',   Icon: BarChart3 },
            ] as { value: UserRole; label: string; Icon: any }[]).map(({ value, label, Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setRole(value)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  role === value
                    ? 'bg-[hsl(217,91%,60%)] text-black shadow-md shadow-blue-500/20'
                    : 'text-[hsl(215,20%,55%)] hover:text-foreground'
                }`}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-[hsl(215,20%,55%)] uppercase tracking-wider mb-1.5">
                Email
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={role === 'developer' ? 'dev@daiict.ac.in' : 'manager@daiict.ac.in'}
                disabled={loading}
                className="w-full px-4 py-3 rounded-xl bg-[hsl(222,47%,4%)] border border-[hsl(217,33%,18%)] text-foreground text-sm placeholder:text-[hsl(215,20%,35%)] outline-none focus:border-[hsl(217,91%,60%)] transition-colors"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-[hsl(215,20%,55%)] uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPass ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={loading}
                  className="w-full px-4 py-3 pr-12 rounded-xl bg-[hsl(222,47%,4%)] border border-[hsl(217,33%,18%)] text-foreground text-sm placeholder:text-[hsl(215,20%,35%)] outline-none focus:border-[hsl(217,91%,60%)] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(215,20%,45%)] hover:text-foreground transition-colors"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
                >
                  <AlertCircle size={15} className="shrink-0" />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit */}
            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-bold text-sm text-black transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_0_20px_hsl(217,91%,60%,0.4)] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 mt-1"
              style={{ background: 'linear-gradient(135deg, hsl(217,91%,60%), hsl(240,91%,65%))' }}
            >
              {loading
                ? <span className="flex items-center justify-center gap-2"><Loader2 size={15} className="animate-spin" /> Signing in...</span>
                : `Sign in as ${role === 'developer' ? 'Developer' : 'Manager'}`
              }
            </button>
          </form>

          {/* Demo credentials hint */}
          <div className="mt-5 pt-5 border-t border-[hsl(217,33%,12%)]">
            <p className="text-[hsl(215,20%,40%)] text-xs text-center mb-2">Demo Credentials</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setEmail('dev@daiict.ac.in'); setPassword('dev123'); setRole('developer'); }}
                className="flex-1 py-1.5 px-2 rounded-lg border border-[hsl(217,33%,15%)] text-[hsl(215,20%,50%)] text-xs hover:border-[hsl(217,91%,60%)] hover:text-foreground transition-colors"
              >
                Dev: dev@daiict.ac.in / dev123
              </button>
              <button
                type="button"
                onClick={() => { setEmail('manager@daiict.ac.in'); setPassword('manager123'); setRole('manager'); }}
                className="flex-1 py-1.5 px-2 rounded-lg border border-[hsl(217,33%,15%)] text-[hsl(215,20%,50%)] text-xs hover:border-[hsl(270,91%,75%)]/50 hover:text-foreground transition-colors"
              >
                Mgr: manager@daiict.ac.in / manager123
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;
