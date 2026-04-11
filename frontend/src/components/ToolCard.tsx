import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, Loader2, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { ToolName, ToolStatus, useTools } from '@/context/ToolsContext';
import { useAuth } from '@/context/AuthContext';

export interface ToolField {
  key: string;
  label: string;
  placeholder: string;
  type: 'text' | 'password' | 'email';
}

interface ToolCardProps {
  tool: ToolName;
  icon: React.ReactNode;
  label: string;
  accentColor: string;
  accentBg: string;
  description: string;
  fields: ToolField[];
}

const STATUS_CONFIG: Record<ToolStatus, { label: string; icon: React.ReactNode; style: string }> = {
  idle:       { label: 'Not connected',  icon: null,                                                style: 'text-muted-foreground' },
  connecting: { label: 'Connecting…',   icon: <Loader2 size={14} className="animate-spin" />,      style: 'text-blue-400' },
  connected:  { label: 'Connected',     icon: <CheckCircle2 size={14} />,                           style: 'text-green-400' },
  error:      { label: 'Failed',        icon: <XCircle size={14} />,                                style: 'text-red-400' },
};

export default function ToolCard({ tool, icon, label, accentColor, accentBg, description, fields }: ToolCardProps) {
  const { tools, connect, reset } = useTools();
  const { user } = useAuth();
  const isDeveloper = user?.role === 'developer';

  const state  = tools[tool];
  const status = state.status;
  const { label: statusLabel, icon: statusIcon, style } = STATUS_CONFIG[status];

  // One state entry per field
  const [values, setValues]   = useState<Record<string, string>>(
    Object.fromEntries(fields.map(f => [f.key, '']))
  );
  const [showPwd, setShowPwd] = useState<Record<string, boolean>>(
    Object.fromEntries(fields.filter(f => f.type === 'password').map(f => [f.key, false]))
  );

  const isConnecting = status === 'connecting';
  const isConnected  = status === 'connected';
  const allFilled    = fields.every(f => values[f.key]?.trim());

  const handleConnect = () => {
    if (!allFilled || isConnecting) return;
    // Pass all field values as JSON; validators can parse as needed
    connect(tool, JSON.stringify(values));
  };

  const handleReset = () => {
    reset(tool);
    setValues(Object.fromEntries(fields.map(f => [f.key, ''])));
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border bg-[hsl(222,47%,6%)] p-5 flex flex-col gap-4 transition-all duration-300 ${
        isConnected
          ? 'border-green-500/40 shadow-[0_0_18px_hsl(142,76%,36%,0.08)]'
          : status === 'error'
          ? 'border-red-500/30'
          : 'border-[hsl(217,33%,18%)]'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${accentBg} shrink-0`}>
            {icon}
          </div>
          <div>
            <p className="font-semibold text-foreground text-sm">{label}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
        <div className={`flex items-center gap-1.5 text-xs font-semibold ${style} shrink-0`}>
          {statusIcon}
          <span className="hidden sm:inline">{statusLabel}</span>
        </div>
      </div>

      {/* Fields or success */}
      {!isConnected ? (
        <div className="flex flex-col gap-2.5">
          {fields.map((field) => {
            const isPass = field.type === 'password';
            const visible = showPwd[field.key];
            return (
              <div key={field.key}>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  {field.label}
                </label>
                <div className="relative">
                  <input
                    id={`tool-${tool}-${field.key}`}
                    type={isPass ? (visible ? 'text' : 'password') : field.type}
                    placeholder={field.placeholder}
                    value={values[field.key]}
                    disabled={isConnecting}
                    autoComplete={isPass ? 'current-password' : field.type === 'email' ? 'email' : 'username'}
                    onChange={e => setValues(v => ({ ...v, [field.key]: e.target.value }))}
                    onKeyDown={e => { if (e.key === 'Enter' && allFilled) handleConnect(); }}
                    className="w-full px-3 py-2.5 pr-9 rounded-xl bg-[hsl(222,47%,4%)] border border-[hsl(217,33%,15%)] text-foreground text-sm placeholder:text-[hsl(215,20%,30%)] outline-none focus:border-[hsl(217,91%,60%)] transition-colors"
                  />
                  {isPass && (
                    <button
                      type="button"
                      onClick={() => setShowPwd(s => ({ ...s, [field.key]: !s[field.key] }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {visible ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          <button
            id={`tool-connect-${tool}`}
            onClick={handleConnect}
            disabled={!allFilled || isConnecting}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed hover:-translate-y-0.5 border ${accentColor}`}
          >
            {isConnecting
              ? <><Loader2 size={14} className="animate-spin" /> Signing in…</>
              : `Sign in to ${label}`
            }
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2">
          <p className="text-green-400 text-sm font-medium flex items-center gap-1.5">
            <CheckCircle2 size={14} />
            {isDeveloper ? state.detail : 'Account connected successfully'}
          </p>
          <button
            onClick={handleReset}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-red-400 transition-colors"
          >
            <RefreshCw size={11} /> Disconnect
          </button>
        </div>
      )}

      {/* Error */}
      <AnimatePresence>
        {status === 'error' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 flex items-start gap-2"
          >
            <XCircle size={13} className="text-red-400 mt-0.5 shrink-0" />
            <p className="text-xs text-red-400">
              {isDeveloper
                ? state.detail
                : 'Could not sign in. Please check your username and password.'
              }
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
