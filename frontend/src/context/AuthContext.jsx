import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Preferences } from '@capacitor/preferences';
import { setTokenGetter, setOnAuthError } from '../lib/api';
import { Capacitor } from '@capacitor/core';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);
const API_URL = import.meta.env.VITE_API_URL || '';

async function getToken() {
  const result = await Preferences.get({ key: 'bbToken' });
  return result.value;
}

async function fetchMe(token, timeout = 45000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(`${API_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    });
    clearTimeout(id);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

async function fetchMeWithRetry(token, retries = 3, delayMs = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fetchMe(token, i === 0 ? 15000 : 45000);
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise(r => setTimeout(r, delayMs * (i + 1)));
    }
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  const setTokenSync = useCallback((newToken) => {
    setToken(newToken);
    setTokenGetter(() => newToken);
  }, []);

  // Auto-logout on 401
  useEffect(() => {
    setOnAuthError(async () => {
      await Preferences.remove({ key: 'bbToken' });
      setToken(null);
      setUser(null);
    });
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const storedToken = await getToken();
      if (!storedToken || !mountedRef.current) {
        if (mountedRef.current) setLoading(false);
        return;
      }
      try {
        const userData = await fetchMeWithRetry(storedToken);
        if (!cancelled && mountedRef.current) {
          setTokenSync(storedToken);
          setUser(userData);
        }
      } catch (err) {
        console.error('Session restore failed after retries:', err);
        if (!cancelled && mountedRef.current) {
          // Keep token — don't delete on failure, show degraded state
          setTokenSync(storedToken);
        }
      } finally {
        if (!cancelled && mountedRef.current) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let listenerHandle;
    const setup = async () => {
      try {
        const { App } = await import('@capacitor/app');
        listenerHandle = await App.addListener('appStateChange', async ({ isActive }) => {
          if (!isActive) return;
          const storedToken = await getToken();
          if (storedToken) {
            setTokenSync(storedToken);
            try {
              const userData = await fetchMeWithRetry(storedToken, 2, 1500);
              if (userData) setUser(userData);
            } catch {
              console.error('Foreground refresh failed, keeping cached user');
            }
          }
        });
      } catch { /* not native */ }
    };
    setup();
    return () => { listenerHandle?.remove?.(); };
  }, []);

  const login = async (email, password) => {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    await Preferences.set({ key: 'bbToken', value: data.token });
    setTokenSync(data.token);
    setUser(data.user);
    return data.user;
  };

  const register = async (formData) => {
    const res = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed');
    await Preferences.set({ key: 'bbToken', value: data.token });
    setTokenSync(data.token);
    setUser(data.user);
    return data.user;
  };

  const updateProfile = async (formData) => {
    const storedToken = token || await getToken();
    const res = await fetch(`${API_URL}/api/auth/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${storedToken}` },
      body: JSON.stringify(formData),
    });
    const updated = await res.json();
    if (!res.ok) throw new Error(updated.error || 'Update failed');
    setUser(prev => ({ ...prev, ...updated }));
    return updated;
  };

  const refreshUser = useCallback(async () => {
    const storedToken = token || await getToken();
    if (!storedToken) return null;
    try {
      const userData = await fetchMe(storedToken, 15000);
      setUser(userData);
      return userData;
    } catch {
      return null;
    }
  }, [token]);

  const logout = async () => {
    await Preferences.remove({ key: 'bbToken' });
    setTokenSync(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, updateProfile, refreshUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
