import { createContext, useContext, useState, useEffect } from 'react';
import { Preferences } from '@capacitor/preferences';
import { api } from '../lib/api';

const AuthContext = createContext(null);

async function getToken() {
  const result = await Preferences.get({ key: 'bbToken' });
  return result.value;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getToken().then((storedToken) => {
      if (storedToken) {
        setToken(storedToken);
        api.get('/api/auth/me')
          .then(setUser)
          .catch(async () => { await Preferences.remove({ key: 'bbToken' }); setToken(null); })
          .finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });
  }, []);

  const login = async (email, password) => {
    const data = await api.post('/api/auth/login', { email, password });
    await Preferences.set({ key: 'bbToken', value: data.token });
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const register = async (formData) => {
    const data = await api.post('/api/auth/register', formData);
    await Preferences.set({ key: 'bbToken', value: data.token });
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const updateProfile = async (formData) => {
    const updated = await api.put('/api/auth/profile', formData);
    setUser(prev => ({ ...prev, ...updated }));
    return updated;
  };

  const logout = async () => {
    await Preferences.remove({ key: 'bbToken' });
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, updateProfile, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
