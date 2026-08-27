// Supabase public browser configuration for Velan View.
// Safe to expose the publishable key in frontend code. Never put a service-role/secret key here.
const SUPABASE_URL = "https://ujvyqvlglaacnmtlrhao.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_9b_V7MNuISJYIREqFBv1-Q_ZB0H2a8V";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);
