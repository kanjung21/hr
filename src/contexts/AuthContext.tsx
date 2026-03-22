import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { AppRole, Employee, Profile } from '@/types/hr';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  employee: Employee | null;
  roles: AppRole[];
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<void>;
  signOut: () => Promise<void>;
  hasRole: (role: AppRole) => boolean;
  isHROrAdmin: boolean;
  isManager: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (userId: string) => {
    try {
      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      
      setProfile(profileData);

      // Fetch roles
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);
      
      setRoles(rolesData?.map(r => r.role as AppRole) || []);

      // Fetch employee data
      const { data: employeeData } = await supabase
        .from('employees')
        .select('*, position:positions(*), department:departments(*)')
        .eq('user_id', userId)
        .maybeSingle();
      
      setEmployee(employeeData);
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
          if (session?.user) {
            await fetchUserData(session.user.id);
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (mounted) {
        // For OAuth sign-ins, validate that the email exists in the system
        if (event === 'SIGNED_IN' && session?.user?.app_metadata?.provider !== 'email') {
          try {
            const { data, error } = await supabase.functions.invoke('validate-oauth-email', {
              headers: {
                Authorization: `Bearer ${session.access_token}`,
              },
            });

            if (error || !data?.valid) {
              // Email not in system - sign out
              await supabase.auth.signOut();
              setSession(null);
              setUser(null);
              setProfile(null);
              setEmployee(null);
              setRoles([]);
              setLoading(false);
              // Show alert - we can't use toast here, so we'll dispatch a custom event
              window.dispatchEvent(new CustomEvent('oauth-email-not-found', {
                detail: { email: session.user.email }
              }));
              return;
            }
          } catch (err) {
            console.error('OAuth validation error:', err);
            await supabase.auth.signOut();
            setSession(null);
            setUser(null);
            setLoading(false);
            return;
          }
        }

        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(() => {
            fetchUserData(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setEmployee(null);
          setRoles([]);
        }
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string, firstName: string, lastName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
        },
      },
    });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const hasRole = (role: AppRole) => roles.includes(role);
  const isHROrAdmin = hasRole('admin') || hasRole('hr');
  const isManager = hasRole('manager') || isHROrAdmin;

  const refreshProfile = async () => {
    if (user) {
      await fetchUserData(user.id);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      employee,
      roles,
      loading,
      signIn,
      signUp,
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
