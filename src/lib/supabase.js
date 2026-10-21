import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://qyzcvydtsdryjdlyyjyf.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_krKEyL389rj_jNFGXJrZzQ_qkaK56QS'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export const TABLES = {
  sessions: 'sessions',
  players: 'players',
  matches: 'matches',
}

export function getSupabaseError(error) {
  if (error?.code === 'PGRST202') {
    return 'The match transaction functions are missing from Supabase. Run the latest supabase/schema.sql, then retry.'
  }
  if (error?.code === '42P01' || error?.code === 'PGRST205') {
    return 'Supabase tables are not set up yet. Run the SQL in supabase/schema.sql in your Supabase SQL Editor.'
  }
  if (error?.code === '42501' || error?.code === 'PGRST301') {
    return 'Supabase denied this request. Run the latest supabase/schema.sql in the Supabase SQL Editor, then reload the app. If it still fails, check that anon has table privileges and the demo RLS policies are enabled.'
  }
  return error?.message || 'Unable to connect to Supabase.'
}

export async function getActiveSession() {
  const { data, error } = await supabase
    .from(TABLES.sessions)
    .select('*, players(*), matches(*)')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data
}

export function subscribeToSession(sessionId, onChange) {
  return supabase
    .channel(`session-${sessionId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.sessions, filter: `id=eq.${sessionId}` }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.players, filter: `session_id=eq.${sessionId}` }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.matches, filter: `session_id=eq.${sessionId}` }, onChange)
    .subscribe()
}
