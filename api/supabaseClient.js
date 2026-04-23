const { createClient } = require('@supabase/supabase-js');

// Hanya panggil dotenv jika BUKAN di Vercel (Production)
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

// Lapis Pertahanan Tambahan (Mencegah Crash Fatal)
if (!supabaseUrl || !supabaseKey) {
    console.error("CRITICAL ERROR: Supabase Keys tidak ditemukan dalam Environment Variables.");
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;