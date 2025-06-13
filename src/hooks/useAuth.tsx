
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type UserRole = 'ADMIN' | 'PREMIUM' | 'BASIC';

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  company: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string, company?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isPremium: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  console.log('AuthProvider: Component rendered, loading:', loading);

  useEffect(() => {
    console.log('AuthProvider: Setting up auth state listener');
    
    let mounted = true;

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email || 'no user');
        
        if (!mounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          console.log('User found, fetching profile for:', session.user.id);
          // Use setTimeout to avoid potential deadlock
          setTimeout(async () => {
            if (!mounted) return;
            
            try {
              const { data: profileData, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('user_id', session.user.id)
                .single();
              
              if (error) {
                console.error('Error fetching profile:', error);
                setProfile(null);
              } else {
                console.log('Profile loaded:', profileData);
                setProfile(profileData);
              }
            } catch (error) {
              console.error('Profile fetch error:', error);
              setProfile(null);
            } finally {
              if (mounted) {
                setLoading(false);
              }
            }
          }, 0);
        } else {
          console.log('No user, clearing profile');
          setProfile(null);
          setLoading(false);
        }
      }
    );

    // Check for existing session
    console.log('AuthProvider: Checking for existing session');
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Error getting session:', error);
      }
      console.log('Initial session check:', session?.user?.email || 'no session');
      
      if (!mounted) return;
      
      if (!session) {
        console.log('No existing session found, setting loading to false');
        setLoading(false);
      }
      // If there is a session, the onAuthStateChange will handle it
    });

    return () => {
      console.log('AuthProvider: Cleaning up subscription');
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, fullName: string, company?: string) => {
    console.log('signUp called for:', email);
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
          company: company || ''
        }
      }
    });
    
    if (error) {
      console.error('SignUp error:', error);
    } else {
      console.log('SignUp successful');
    }
    
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    console.log('signIn called for:', email);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      console.error('SignIn error:', error);
    } else {
      console.log('SignIn successful');
    }
    
    return { error };
  };

  const signOut = async () => {
    console.log('signOut called');
    await supabase.auth.signOut();
    setProfile(null);
  };

  const isAdmin = profile?.role === 'ADMIN';
  const isPremium = profile?.role === 'PREMIUM' || profile?.role === 'ADMIN';

  console.log('AuthProvider: Current state - user:', !!user, 'profile:', !!profile, 'loading:', loading);

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      loading,
      signUp,
      signIn,
      signOut,
      isAdmin,
      isPremium
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
