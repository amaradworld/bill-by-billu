import { createContext, useContext, useState, useEffect } from 'react';
import { Preferences } from '@capacitor/preferences';
import { api, setTokenGetter, setUnauthorizedHandler } from '../lib/api';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

async function getToken() {
  const result = await Preferences.get({ key: 'bbToken' });
  return result.value;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  const setTokenSync = (newToken) => {
    setToken(newToken);
    setTokenGetter(() => newToken);
  };

  useEffect(() => {
    // Handle 401s from anywhere in the app: clear the session so route guards
    // send the user back to /login.
    setUnauthorizedHandler(async () => {
      await Preferences.remove({ key: 'bbToken' });
      setTokenSync(null);
      setUser(null);
    });

    getToken().then((storedToken) => {
      if (storedToken) {
        setTokenSync(storedToken);
        api.get('/api/auth/me', { headers: { Authorization: `Bearer ${storedToken}` } })
          .then(setUser)
          .catch(async () => {
            await Preferences.remove({ key: 'bbToken' });
            setTokenSync(null);
            toast.error('Session expired. Please log in again.');
          })
          .finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });
  }, []);

  const login = async (email, password) => {
    const data = await api.post('/api/auth/login', { email, password });
    await Preferences.set({ key: 'bbToken', value: data.token });
    setTokenSync(data.token);
    setUser(data.user);
    return data.user;
  };

  const register = async (formData) => {
    const data = await api.post('/api/auth/register', formData);
    await Preferences.set({ key: 'bbToken', value: data.token });
    setTokenSync(data.token);
    setUser(data.user);
    return data.user;
  };

  // Establish a session from an already-issued token (e.g. Google Sign-In).
  const loginWithToken = async (newToken) => {
    await Preferences.set({ key: 'bbToken', value: newToken });
    setTokenSync(newToken);
    const me = await api.get('/api/auth/me', { headers: { Authorization: `Bearer ${newToken}` } });
    setUser(me);
    return me;
  };

  const updateProfile = async (formData) => {
    const updated = await api.put('/api/auth/profile', formData);
    setUser(prev => ({ ...prev, ...updated }));
    return updated;
  };

  const logout = async () => {
    await Preferences.remove({ key: 'bbToken' });
    setTokenSync(null);
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const updated = await api.get('/api/auth/me');
      setUser(updated);
      return updated;
    } catch (err) {
      return null;
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, loginWithToken, updateProfile, refreshUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
