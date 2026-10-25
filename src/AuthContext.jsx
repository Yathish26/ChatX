import { createContext, useContext, useEffect, useState } from 'react';
import { apiRequest } from './api';

const TOKEN_KEY = 'chatToken';
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(null);
  // Only "loading" while a stored token is being checked on first load.
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem(TOKEN_KEY)));

  useEffect(() => {
    if (!token || user) return;

    apiRequest('/auth/me', { token })
      .then((data) => setUser(data.user))
      .catch((error) => {
        // Only drop the token if the server rejected it, not on a network blip.
        if (error.status === 401 || error.status === 404) signOut();
      })
      .finally(() => setLoading(false));
  }, [token]);

  const saveSession = ({ token: newToken, user: newUser }) => {
    localStorage.setItem(TOKEN_KEY, newToken);
    setToken(newToken);
    setUser(newUser);
  };

  const register = async (details) => saveSession(await apiRequest('/auth/register', { method: 'POST', body: details }));

  const signIn = async (credentials) => saveSession(await apiRequest('/auth/signin', { method: 'POST', body: credentials }));

  const updateProfile = async (changes) => {
    const data = await apiRequest('/auth/me', { method: 'PATCH', body: changes, token });
    setUser(data.user);
  };

  // The server signs out other sessions on a password change and returns a fresh token for this one.
  const changePassword = async (passwords) => {
    const data = await apiRequest('/auth/change-password', { method: 'POST', body: passwords, token });
    localStorage.setItem(TOKEN_KEY, data.token);
    setToken(data.token);
  };

  const signOut = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, register, signIn, signOut, updateProfile, changePassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
