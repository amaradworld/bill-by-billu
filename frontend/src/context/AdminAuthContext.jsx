import { createContext, useContext, useState, useEffect } from 'react';
import { Preferences } from '@capacitor/preferences';
import { api } from '../lib/api';

const AdminAuthContext = createContext(null);

async function getAdminToken() {
  try {
    const result = await Preferences.get({ key: 'bbAdminToken' });
    return result.value || localStorage.getItem('bbAdminToken');
  } catch {
    return localStorage.getItem('bbAdminToken');
  }
}

export function AdminAuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const token = await getAdminToken();
      if (token) {
        api.get('/api/admin/me', { headers: { Authorization: `Bearer ${token}` } })
          .then(setAdmin)
          .catch(async () => {
            await Preferences.remove({ key: 'bbAdminToken' });
            localStorage.removeItem('bbAdminToken');
          })
          .finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    })();
  }, []);

  const login = async (email, password) => {
    const data = await api.post('/api/admin/login', { email, password });
    await Preferences.set({ key: 'bbAdminToken', value: data.token });
    localStorage.setItem('bbAdminToken', data.token);
    setAdmin(data.user);
    return data.user;
  };

  const logout = async () => {
    await Preferences.remove({ key: 'bbAdminToken' });
    localStorage.removeItem('bbAdminToken');
    setAdmin(null);
  };

  const getToken = async () => getAdminToken();

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
