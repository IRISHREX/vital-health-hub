import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { getAuthToken, setAuthToken, removeAuthToken, getUser, setUser, removeUser } from './api-client';
import { loginApi } from './auth';

interface User {
  id: string;
  email: string;
  fullName: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (credentials: any) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUserState] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
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

  const login = async (credentials: any) => {
    const { data } = await loginApi(credentials);
    if (data.token && data.user) {
        setAuthToken(data.token);
        setUser(data.user);
        setTokenState(data.token);
        setUserState(data.user);
    } else {
        throw new Error("Login failed: No token or user returned.");
    }
  };

  const logout = () => {
    removeAuthToken();
    removeUser();
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
