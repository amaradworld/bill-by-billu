import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../lib/api';

const AdminAuthContext = createContext(null);

export function AdminAuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('bbAdminToken');
    if (token) {
      api.get('/api/admin/me', { headers: { Authorization: `Bearer ${token}` } })
        .then(setAdmin)
        .catch(() => localStorage.removeItem('bbAdminToken'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const data = await api.post('/api/admin/login', { email, password });
    localStorage.setItem('bbAdminToken', data.token);
    setAdmin(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem('bbAdminToken');
    setAdmin(null);
  };

  const getToken = () => localStorage.getItem('bbAdminToken');

  return (
    <AdminAuthContext.Provider value={{ admin, loading, login, logout, getToken }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export const useAdminAuth = () => {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used within AdminAuthProvider');
  return ctx;
};
