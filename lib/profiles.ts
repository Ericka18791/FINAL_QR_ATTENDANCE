import { supabase } from './supabase';

export type Role = 'student' | 'teacher' | 'admin';

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: Role;
};

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as Profile;
}

/**
 * Updates the signed-in user's own profile.
 * Role is NOT accepted here — role changes go through
 * an admin-only function, never from the client.
 */
export async function updateProfile(
  userId: string,
  updates: { full_name?: string }
): Promise<{ error: string | null }> {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select('id, email, full_name, role')
    .maybeSingle();

  if (error) {
    return { error: error.message };
  }

  if (!data) {
    return { error: 'Profile could not be updated. No profile row was found.' };
  }

  return { error: null };
}

/**
 * Admin-only. Changes another user's role.
 * The rules live in the database function admin_set_role():
 * only admins may call it, and an admin cannot change their own role.
 */
export async function adminSetRole(
  userId: string,
  role: Role
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_set_role', {
    p_user_id: userId,
    p_role: role,
  });

  return { error: error?.message ?? null };
}
