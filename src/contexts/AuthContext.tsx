import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { AppRole, Employee, Profile } from '@/types/hr';

interface AuthUser {
  id: string;
  email: string;
  roles: AppRole[];
  employee: Employee | null;
  profile: Profile | null;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  profile: Profile | null;
  employee: Employee | null;
  roles: AppRole[];
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<void>;
  signOut: () => Promise<void>;
  signInWithOAuth: () => Promise<void>;
  hasRole: (role: AppRole) => boolean;
  isHROrAdmin: boolean;
  isManager: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  const setAuthData = (data: any) => {
    setUser(data.user);
    setRoles(data.user?.roles || []);
    setEmployee(data.user?.employee || null);
    setProfile(data.user?.profile || null);
  };

  const refreshProfile = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        if (res.status === 401) {
          signOut();
        }
        throw new Error('Failed to fetch profile');
      }

      const data = await res.json();
      setAuthData(data);
    } catch (error) {
      console.error('Error refreshing profile:', error);
    }
  };

  const syncOAuthUser = async (supabaseUserId: string) => {
    try {
      const res = await fetch(`/api/employees/user/${supabaseUserId}`);
      if (!res.ok) return;

      const employee = await res.json();
      const roleRes = await fetch(`/api/user_roles/user/${supabaseUserId}`);
      const roles = roleRes.ok ? await roleRes.json() : [];

      const oauthUser: AuthUser = {
        id: supabaseUserId,
        email: employee.email || '',
        roles,
        employee,
        profile: { id: employee.user_id || supabaseUserId, email: employee.email, first_name: employee.first_name, last_name: employee.last_name, avatar_url: '' },
      };

      setUser(oauthUser);
      setRoles(roles);
      setEmployee(employee);
      setProfile(oauthUser.profile);
    } catch (error) {
      console.error('Error syncing OAuth user:', error);
    }
  };

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      if (token) {
        await refreshProfile();
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await syncOAuthUser(session.user.id);
      }

      if (mounted) {
        setLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (event === 'SIGNED_IN' && session?.user) {
        await syncOAuthUser(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        if (!token) {
          signOut();
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [token]);

  const signIn = async (email: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error || 'Login failed');
    }

    localStorage.setItem('token', data.token);
    setToken(data.token);
    setAuthData(data);
  };

  const signUp = async (email: string, password: string, firstName: string, lastName: string) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, first_name: firstName, last_name: lastName }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error || 'Signup failed');
    }

    localStorage.setItem('token', data.token);
    setToken(data.token);
    setAuthData(data);
  };

  const signInWithOAuth = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'azure',
      options: {
        redirectTo: window.location.origin,
        queryParams: { prompt: 'login' },
      },
    });

    if (error) {
      throw new Error(error.message);
    }
  };

  const signOut = async () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setRoles([]);
    setEmployee(null);
    setProfile(null);
  };

  const hasRole = (role: AppRole) => roles.includes(role);
  const isHROrAdmin = hasRole('admin') || hasRole('hr');
  const isManager = hasRole('manager') || isHROrAdmin;

  return (
    <AuthContext.Provider value={{
      user,
      token,
      profile,
      employee,
      roles,
      loading,
      signIn,
      signUp,
      signInWithOAuth,
      signOut,
      hasRole,
      isHROrAdmin,
      isManager,
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
