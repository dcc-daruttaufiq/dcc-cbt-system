import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://sidvrwffkcnrmfuypssz.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_YdpkbPKZglOwpX6h7hGpOg_7j5bJI56';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);