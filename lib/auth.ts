
import type { Session, User } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { supabase } from './supabase';

type AuthState = {
  session: Session | null;
  user: User | null;
  loading: boolean;
};

export type SignUpProfile = {
  full_name: string;
  role: 'student' | 'teacher';
};

let globalSession: Session | null = null;
let globalUser: User | null = null;
let globalLoading = true;
let authInitialized = false;

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

export function setAuth(session: Session | null) {
  globalSession = session;
  globalUser = session?.user ?? null;
  globalLoading = false;
  notify();
}

function initializeAuth() {
  if (authInitialized) {
    return;
  }

  authInitialized = true;

  // Listen for sign-in, sign-out, and session changes.
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    setAuth(session);
  });

  // Prevent the initial loading screen from lasting forever.
  let completed = false;

  const finishInitialization = (session: Session | null) => {
    if (completed) {
      return;
    }

    completed = true;
    clearTimeout(timeout);
    setAuth(session);
  };

  const timeout = setTimeout(() => {
    if (!completed) {
      console.warn(
        '[AUTH] Session initialization timed out. Showing the login screen.'
      );
      finishInitialization(null);
    }
  }, 10000);

  supabase.auth
    .getSession()
    .then(({ data, error }) => {
      if (error) {
        console.error('[AUTH] Failed to restore session:', error.message);
        finishInitialization(null);
        return;
      }

      finishInitialization(data.session);
    })
    .catch((error: unknown) => {
      console.error('[AUTH] Session initialization failed:', error);
      finishInitialization(null);
    });

  // Keep the listener active for the app's lifetime.
  // The subscription is intentionally retained.
  void subscription;
}

export function useAuth(): AuthState {
  const [, forceRender] = useState(0);

  useEffect(() => {
    const listener = () => {
      forceRender((value) => value + 1);
    };

    listeners.add(listener);
    initializeAuth();

    return () => {
      listeners.delete(listener);
    };
  }, []);

  return {
    session: globalSession,
    user: globalUser,
    loading: globalLoading,
  };
}

export async function signUp(
  email: string,
  password: string,
  profile?: SignUpProfile
) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: profile?.full_name ?? null,
        role: profile?.role ?? 'student',
      },
    },
  });

  if (error) {
    return { data, error };
  }

  if (data.session) {
    setAuth(data.session);
  }

  return { data, error: null };
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (!error && data.session) {
    setAuth(data.session);
  }

  return { data, error };
}

export async function signOut() {
  // Clear the local authentication state.
  setAuth(null);

  const { error } = await supabase.auth.signOut();

  return { error };
}
