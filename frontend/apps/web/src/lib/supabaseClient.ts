import { createClient } from '@supabase/supabase-js'
import { createLocalSupabase, isLocalSeedEnabled } from './localSupabase'

function createAppSupabase() {
  if (isLocalSeedEnabled()) {
    return createLocalSupabase()
  }

  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

  if (!url || !key) {
    throw new Error(
      'Missing Supabase env vars. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in frontend/.env',
    )
  }

  return createClient(url, key)
}

export const supabase = createAppSupabase()
