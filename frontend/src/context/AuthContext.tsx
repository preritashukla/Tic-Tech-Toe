import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type UserRole = 'developer' | 'manager';

export interface AuthUser {
  email: string;
  role: UserRole;
  name: string;
}

interface AuthContextType {
  user: AuthUser | null;
  login: (email: string, password: string, role: UserRole) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Mock user database
const MOCK_USERS: Record<string, { password: string; name: string }> = {
  'dev@daiict.ac.in':     { password: 'dev123',     name: 'Developer' },
  'manager@daiict.ac.in': { password: 'manager123', name: 'Manager' },
  'demo@mcp.dev':         { password: 'demo',        name: 'Demo User' },
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const stored = localStorage.getItem('mcp_auth_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const login = async (email: string, password: string, role: UserRole) => {
    // Simulate async auth
    await new Promise((r) => setTimeout(r, 700));

    const found = MOCK_USERS[email.toLowerCase()];
    if (!found || found.password !== password) {
      throw new Error('Invalid email or password.');
    }

    const authUser: AuthUser = { email: email.toLowerCase(), role, name: found.name };
    setUser(authUser);
    localStorage.setItem('mcp_auth_user', JSON.stringify(authUser));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('mcp_auth_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
