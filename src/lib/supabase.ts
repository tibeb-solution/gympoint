import { createClient } from '@supabase/supabase-js'

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  (import.meta.env as any).NEXT_PUBLIC_SUPABASE_URL ||
  'https://cdlijypwnzaxbwovpzks.supabase.co'

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  (import.meta.env as any).NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'sb_publishable_uCcBtlC06DyaR_ArCr005Q_zp4elg6i'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

