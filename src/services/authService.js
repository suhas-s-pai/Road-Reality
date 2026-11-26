/**
 * Production Authentication Services
 * Road Reality utilizes Supabase Google OAuth and JWT-based session management.
 * Real sessions and profiles are managed via AuthContext and Supabase Auth.
 */
import { supabase } from '../lib/supabase';

export async function getCurrentUser() {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function getSession() {
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export async function signOutUser() {
  if (!supabase) return;
  await supabase.auth.signOut();
}
