import { createContext, useContext, useState } from 'react';
import { apiPost } from '../api/client.js';

const TOKEN_KEY = 'tfh_admin_token';

const AdminContext = createContext(null);

export function AdminProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));

  const login = async (loginValue, password) => {
    const data = await apiPost('/api/admin/login', { login: loginValue, password });
    localStorage.setItem(TOKEN_KEY, data.token);
    setToken(data.token);
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
  };

  return (
    <AdminContext.Provider value={{ isAdmin: Boolean(token), token, login, logout }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin должен вызываться внутри AdminProvider');
  return ctx;
}
