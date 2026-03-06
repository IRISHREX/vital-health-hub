import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import {
  getAuthToken,
  setAuthToken,
  removeAuthToken,
  getUser,
  setUser,
  removeUser,
  setOrgSlug,
  removeOrgSlug,
} from './api-client';
import { loginApi } from './auth';

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const [user, setUserState] = useState(null);
  const [token, setTokenState] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = getAuthToken();
    const storedUser = getUser();
    if (storedToken && storedUser) {
      setTokenState(storedToken);
      setUserState(storedUser);
    }
    setIsLoading(false);
  }, []);

  const login = async (credentials) => {
    const hintedOrgSlug = String(credentials?.orgSlug || '').trim().toLowerCase();
    if (hintedOrgSlug) {
      setOrgSlug(hintedOrgSlug);
    }

    const { data } = await loginApi(credentials);
    const resolvedOrgSlug = String(data?.organization?.slug || hintedOrgSlug || '').trim().toLowerCase();
    setOrgSlug(resolvedOrgSlug);

    const resolvedUser = data?.organization
      ? { ...data.user, organization: data.organization }
      : data.user;

    if (data.token && data.user) {
        setAuthToken(data.token);
        setUser(resolvedUser);
        setTokenState(data.token);
        setUserState(resolvedUser);
    } else {
        throw new Error("Login failed: No token or user returned.");
    }
  };

  const logout = () => {
    removeAuthToken();
    removeUser();
    removeOrgSlug();
    setTokenState(null);
    setUserState(null);
  };

  const value = useMemo(() => ({
    user,
    token,
    isLoading,
    login,
    logout
  }), [user, token, isLoading]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
