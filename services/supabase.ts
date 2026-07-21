import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://neajcfjhpkyqccntahha.supabase.co';
const supabaseKey = 'sb_publishable_fIiGnPcEg9YlgV59t-xiyg_CBt2J0gx';

export const supabase = createClient(supabaseUrl, supabaseKey);