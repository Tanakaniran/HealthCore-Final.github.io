const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

// Inisialisasi Client
const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;