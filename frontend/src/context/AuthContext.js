import React, { createContext, useContext, useState, useEffect } from 'react';
const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser]   = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const t = localStorage.getItem('sv_token');
    const u = localStorage.getItem('sv_user');
    if (t && u) { setToken(t); setUser(JSON.parse(u)); }
    setLoading(false);
  }, []);
  const login = (u, t) => {
    setUser(u); setToken(t);
    localStorage.setItem('sv_token', t);
    localStorage.setItem('sv_user', JSON.stringify(u));
  };
  const logout = () => {
    setUser(null); setToken(null);
    localStorage.removeItem('sv_token');
    localStorage.removeItem('sv_user');
  };
  return <AuthContext.Provider value={{ user, token, login, logout, loading }}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
