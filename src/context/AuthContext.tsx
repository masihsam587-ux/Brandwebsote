import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { authService, notificationService } from '../api';
import { subscribeToUserRealtime } from '../api/adapters/supabaseAdapter';
import { clearAllClientCaches, queryClient } from '../api/queryClient';
import type { LoginPayload, SignupPayload, User } from '../api/types';
import { clearOrderReceipts } from '../services/orderReceipts';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  unreadNotifications: number;
  refreshSession: () => Promise<void>;
  refreshUnreadCount: () => Promise<void>;
  login: (payload: LoginPayload) => Promise<User>;
  signup: (payload: SignupPayload) => Promise<User>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const refreshUnreadCount = useCallback(async () => {
    try {
      const list = await notificationService.listNotifications();
      setUnreadNotifications(list.filter((n) => !n.read).length);
    } catch {
      setUnreadNotifications(0);
    }
  }, []);

  const refreshSession = useCallback(async () => {
    setLoading(true);
    try {
      const session = await authService.getSession();
      setUserState(session?.user || null);
      if (session?.user) {
        await refreshUnreadCount();
      } else {
        setUnreadNotifications(0);
      }
    } catch {
      setUserState(null);
    } finally {
      setLoading(false);
    }
  }, [refreshUnreadCount]);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  // Subscribe to realtime notification/order pushes (zero polling)
  useEffect(() => {
    if (!user?.id) return;
    return subscribeToUserRealtime(user.id, () => {
      refreshUnreadCount();
      queryClient.invalidateQueries({ queryKey: ['orders', 'mine'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    });
  }, [user?.id, refreshUnreadCount]);

  const setUser = useCallback((nextUser: User | null) => {
    setUserState(nextUser);
    if (!nextUser) {
      setUnreadNotifications(0);
      clearAllClientCaches();
      clearOrderReceipts();
    }
  }, []);

  const login = async (payload: LoginPayload) => {
    const session = await authService.login(payload);
    setUserState(session.user);
    await refreshUnreadCount();
    return session.user;
  };

  const signup = async (payload: SignupPayload) => {
    const session = await authService.signup(payload);
    if (session.emailConfirmationRequired) {
      setUserState(null);
      setUnreadNotifications(0);
      return { ...session.user, emailConfirmationRequired: true };
    }
    setUserState(session.user);
    await refreshUnreadCount();
    return session.user;
  };

  const logout = async () => {
    await authService.logout();
    setUserState(null);
    setUnreadNotifications(0);
    clearAllClientCaches();
    clearOrderReceipts();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        unreadNotifications,
        refreshSession,
        refreshUnreadCount,
        login,
        signup,
        logout,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
