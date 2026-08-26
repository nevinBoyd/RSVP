import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  // Fails loudly instead of silently making requests to "undefined" — makes
  // a missing .env.local obvious right away instead of showing up later as
  // a confusing network error.
  throw new Error(
    'Missing Supabase env vars. Copy .env.example to .env.local and fill in ' +
      'VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from your Supabase ' +
      'project (Settings → API).',
  )
}

// Single shared Supabase client for the whole app. The anon key is safe to
// expose in frontend code — it only grants what the Row Level Security
// policies in supabase/schema.sql allow.
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
