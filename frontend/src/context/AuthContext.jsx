import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('bbToken'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      api.get('/api/auth/me')
        .then(setUser)
        .catch(() => { localStorage.removeItem('bbToken'); setToken(null); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (email, password) => {
    const data = await api.post('/api/auth/login', { email, password });
    localStorage.setItem('bbToken', data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const register = async (formData) => {
    const data = await api.post('/api/auth/register', formData);
    localStorage.setItem('bbToken', data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const updateProfile = async (formData) => {
    const updated = await api.put('/api/auth/profile', formData);
    setUser(prev => ({ ...prev, ...updated }));
    return updated;
  };

  const logout = () => {
    localStorage.removeItem('bbToken');
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
