import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Zap, LayoutDashboard, Play, ArrowRight } from 'lucide-react';

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="h-screen bg-background text-foreground flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background grid */}
      <div className="grid-bg" />

      {/* Gradient orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        className="relative z-10 flex flex-col items-center text-center px-6 max-w-3xl"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        {/* Icon */}
        <motion.div
          className="ai-icon-glow p-5 rounded-3xl bg-[hsl(222,47%,8%)] border border-[hsl(217,33%,15%)] mb-8 shadow-xl"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.5 }}
        >
          <Zap size={52} className="ai-icon-spin text-[hsl(217,91%,60%)]" />
        </motion.div>

        {/* Badge */}
        <motion.div
          className="flex items-center gap-2 px-3 py-1 rounded-full border border-[hsl(217,33%,20%)] bg-[hsl(217,33%,10%)] text-xs font-semibold text-[hsl(217,91%,70%)] mb-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
          Gateway Active · Multi-Agent Orchestration
        </motion.div>

        {/* Title */}
        <motion.h1
          className="text-5xl md:text-6xl font-black tracking-tight mb-4 leading-none"
          style={{
            background: 'linear-gradient(135deg, hsl(213,31%,95%), hsl(217,91%,70%), hsl(270,91%,75%))',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          Agentic MCP Gateway
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          className="text-[hsl(215,20%,55%)] text-lg leading-relaxed max-w-xl mb-10"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          The next-generation orchestration engine. Run parallel, multi-agent workflows across Jira, GitHub & Slack with intelligent DAG execution and real-time observability.
        </motion.p>

        {/* CTAs */}
        <motion.div
          className="flex flex-col sm:flex-row gap-3 items-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
        >
          <button
            onClick={() => navigate('/dashboard')}
            className="group flex items-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-base text-black transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_0_24px_hsl(217,91%,60%,0.5)]"
            style={{ background: 'linear-gradient(135deg, hsl(217,91%,60%), hsl(240,91%,65%))' }}
          >
            <Play size={18} />
            Start Workflow
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
          </button>

          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-base text-[hsl(213,31%,91%)] border border-[hsl(217,33%,25%)] bg-[hsl(222,47%,8%)] transition-all duration-200 hover:border-[hsl(217,91%,60%)] hover:bg-[hsl(217,91%,60%,0.08)] hover:-translate-y-0.5"
          >
            <LayoutDashboard size={18} />
            Go to Dashboard
          </button>
        </motion.div>

        {/* Stats Row */}
        <motion.div
          className="flex items-center gap-8 mt-14 pt-8 border-t border-[hsl(217,33%,15%)] w-full justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55 }}
        >
          {[
            { label: 'DAG Nodes', value: '50+' },
            { label: 'Tool Integrations', value: '3' },
            { label: 'Execution Mode', value: 'Parallel' },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-2xl font-black text-[hsl(217,91%,65%)]">{stat.value}</div>
              <div className="text-xs text-[hsl(215,20%,50%)] mt-0.5">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Landing;
