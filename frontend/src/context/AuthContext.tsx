import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types/index.js';
import { api } from '../api/client.js';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (identifier: string, pass: string) => Promise<void>;
  register: (name: string, email: string, phone: string, pass: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('securebelong_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkAuth = async () => {
      const storedToken = localStorage.getItem('securebelong_token');
      if (storedToken) {
        try {
          const res = await api.getMe();
          setUser(res.data);
          setToken(storedToken);
        } catch (err) {
          console.warn('Session expired or invalid token');
          localStorage.removeItem('securebelong_token');
          setToken(null);
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (identifier: string, pass: string) => {
    const res = await api.login({ identifier, password: pass });
    const { token: newToken, user: userData } = res.data;
    localStorage.setItem('securebelong_token', newToken);
    setToken(newToken);
    setUser(userData);
  };

  const register = async (name: string, email: string, phone: string, pass: string) => {
    const res = await api.register({ name, email, phone: phone || undefined, password: pass });
    const { token: newToken, user: userData } = res.data;
    localStorage.setItem('securebelong_token', newToken);
    setToken(newToken);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('securebelong_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
