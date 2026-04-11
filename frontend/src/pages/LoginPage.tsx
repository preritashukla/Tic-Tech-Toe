// @ts-nocheck
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('developer');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const from = location.state?.from?.pathname || '/connect-tools';

  const handleSubmit = async (e) => {
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

  const inputStyle = {
    width: "100%", padding: "12px 16px", borderRadius: 10,
    background: "#0d1117", border: "1px solid #30363d",
    color: "#e6edf3", fontSize: 14, outline: "none",
    fontFamily: "inherit", transition: "border-color 0.2s"
  };

  return (
    <div style={{
      height: "100vh", background: "#0d1117", color: "#e6edf3",
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      display: "flex", alignItems: "center", justifyContent: "center",
      position: "relative", overflow: "hidden"
    }}>
      {/* Glow */}
      <div style={{ position: "absolute", top: "20%", left: "30%", width: 400, height: 400, background: "radial-gradient(circle, rgba(46,160,67,0.05) 0%, transparent 70%)", borderRadius: "50%", pointerEvents: "none" }} />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{ position: "relative", zIndex: 10, width: "100%", maxWidth: 420, padding: "0 16px" }}
      >
        {/* Header */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 32 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: "#0d3320", border: "1px solid #2ea043",
            display: "flex", alignItems: "center", justifyContent: "center",
            marginBottom: 16, fontSize: 20, fontWeight: 700, color: "#4ade80",
            boxShadow: "0 0 30px rgba(46,160,67,0.12)"
          }}>A</div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 4px" }}>Agentic MCP Gateway</h1>
          <p style={{ color: "#7d8590", fontSize: 13, margin: 0 }}>Sign in to your workspace</p>
        </div>

        {/* Card */}
        <div style={{
          borderRadius: 16, border: "1px solid #21262d",
          background: "#161b22", padding: 32,
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)"
        }}>
          {/* Role selector */}
          <div style={{
            display: "flex", gap: 6, marginBottom: 24, padding: 4, borderRadius: 10,
            background: "#0d1117", border: "1px solid #21262d"
          }}>
            {[
              { value: "developer", label: "👨‍💻 Developer" },
              { value: "manager", label: "📊 Manager" }
            ].map(r => (
              <button
                key={r.value}
                type="button"
                onClick={() => setRole(r.value)}
                style={{
                  flex: 1, padding: "8px 12px", borderRadius: 8, border: "none",
                  fontSize: 13, fontWeight: 600, cursor: "pointer",
                  transition: "all 0.2s",
                  background: role === r.value ? "#2ea043" : "transparent",
                  color: role === r.value ? "#fff" : "#7d8590",
                }}
              >{r.label}</button>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            {/* Email */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#7d8590", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>Email</label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder={role === "developer" ? "dev@daiict.ac.in" : "manager@daiict.ac.in"}
                disabled={loading}
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = "#2ea043"}
                onBlur={e => e.target.style.borderColor = "#30363d"}
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#7d8590", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>Password</label>
              <div style={{ position: "relative" }}>
                <input
                  id="login-password"
                  type={showPass ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={loading}
                  style={{ ...inputStyle, paddingRight: 44 }}
                  onFocus={e => e.target.style.borderColor = "#2ea043"}
                  onBlur={e => e.target.style.borderColor = "#30363d"}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  style={{
                    position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", color: "#7d8590", cursor: "pointer", fontSize: 13
                  }}
                >{showPass ? "🙈" : "👁"}</button>
              </div>
            </div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "10px 12px", borderRadius: 10, marginBottom: 16,
                    background: "rgba(248,81,73,0.1)", border: "1px solid rgba(248,81,73,0.2)",
                    color: "#f85149", fontSize: 13
                  }}
                >
                  ⚠️ {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit */}
            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              style={{
                width: "100%", padding: "12px 16px", borderRadius: 10, border: "none",
                background: "#2ea043", color: "#fff", fontSize: 14, fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1,
                transition: "all 0.2s", marginBottom: 4
              }}
              onMouseEnter={e => { if (!loading) { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 0 20px rgba(46,160,67,0.3)"; }}}
              onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
            >
              {loading ? "⏳ Signing in..." : `Sign in as ${role === "developer" ? "Developer" : "Manager"}`}
            </button>
          </form>

          {/* Demo credentials */}
          <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid #21262d" }}>
            <p style={{ color: "#484f58", fontSize: 11, textAlign: "center", marginBottom: 8 }}>Demo Credentials</p>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={() => { setEmail("dev@daiict.ac.in"); setPassword("dev123"); setRole("developer"); }}
                style={{
                  flex: 1, padding: "8px", borderRadius: 8,
                  border: "1px solid #21262d", background: "transparent",
                  color: "#7d8590", fontSize: 10, cursor: "pointer", transition: "border-color 0.2s"
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = "#2ea043"}
                onMouseLeave={e => e.currentTarget.style.borderColor = "#21262d"}
              >Dev: dev@daiict.ac.in / dev123</button>
              <button
                type="button"
                onClick={() => { setEmail("manager@daiict.ac.in"); setPassword("manager123"); setRole("manager"); }}
                style={{
                  flex: 1, padding: "8px", borderRadius: 8,
                  border: "1px solid #21262d", background: "transparent",
                  color: "#7d8590", fontSize: 10, cursor: "pointer", transition: "border-color 0.2s"
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = "#2ea043"}
                onMouseLeave={e => e.currentTarget.style.borderColor = "#21262d"}
              >Mgr: manager@daiict.ac.in / mgr123</button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;
