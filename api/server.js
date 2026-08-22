// [SANGAT PENTING]: Buka file .env DI BARIS PALING PERTAMA sebelum yang lain!
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const express = require('express');
const cors = require('cors');
const supabase = require('./supabaseClient');
const Groq = require('groq-sdk');

const app = express();
app.use(cors());

// Limit JSON untuk menerima Base64 gambar (Cegah Error 413)
app.use(express.json({ limit: '10mb' })); 

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// =====================================================================
// --- 1. ENDPOINT KESEHATAN FISIK (Diabetes) ---
// =====================================================================
// --- 1. ENDPOINT KESEHATAN FISIK (DIAGNOSTIK VERSION) ---
app.post('/api/sugar-check', async (req, res) => {
    const { sugarLevel } = req.body;
    if (!sugarLevel) return res.status(400).json({ error: "Input angka gula darah kosong!" });

    try {
        let status = sugarLevel > 140 ? "Tinggi" : (sugarLevel < 70 ? "Rendah" : "Normal");

        // AI Logic
        const chatCompletion = await groq.chat.completions.create({
            messages: [{ role: "user", content: `Pasien gula darah ${sugarLevel} mg/dL. Berikan 2 saran pendek. Format: Makanan: [isi] | Aktivitas: [isi]` }],
            model: "llama-3.1-8b-instant",
        });

        const aiResponse = chatCompletion.choices[0].message.content;
        const [food, act] = aiResponse.split('|');

        console.log("DEBUG: Mencoba insert ke glucose_logs...");

        // PENTING: Periksa apakah nama kolom ini sama persis dengan yang ada di Supabase Anda!
        const { data, error } = await supabase
            .from('glucose_logs')
            .insert([{ 
                sugar_level: sugarLevel, 
                status: status,
                food_advice: food ? food.trim() : "Perhatikan pola makan.",
                activity_advice: act ? act.trim() : "Tetap aktif bergerak."
            }])
            .select();

        if (error) {
            console.error("DEBUG SUPABASE ERROR DETAIL:", JSON.stringify(error, null, 2));
            return res.status(500).json({ error: "DB Error: " + error.message });
        }

        res.status(200).json({ success: true, data: data[0] });

    } catch (err) {
        console.error("DEBUG CATCH ERROR:", err);
        res.status(500).json({ error: "Sistem Error: " + err.message });
    }
});

// =====================================================================
// --- 2. ENDPOINT KESEHATAN MENTAL (Detoks) ---
// =====================================================================
app.post('/api/mental-check', async (req, res) => {
    const { category, feeling } = req.body;
    if (!feeling) return res.status(400).json({ error: "Ceritakan apa yang Anda rasakan!" });

    try {
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: `Anda adalah pakar psikologi dari aplikasi HealthCore (Tim PitaHijauPejuang). Berikan saran medis dan psikologis singkat (maks 60 kata) untuk masalah ${category}. Gunakan nada yang empati, mendukung, dan profesional.`
                },
                {
                    role: "user",
                    content: feeling
                }
            ],
            model: "llama-3.1-8b-instant",
        });

        const aiAdvice = chatCompletion.choices[0].message.content;

        res.status(200).json({ success: true, advice: aiAdvice });

    } catch (err) {
        console.error("ERROR MENTAL:", err.message);
        res.status(500).json({ error: "Gagal memproses panduan AI mental." });
    }
});

// =====================================================================
// --- 3. [BARU] ENDPOINT NUTRIVISION AI (Kamera Makanan) ---
// =====================================================================
app.post('/api/scan-food', async (req, res) => {
    const { base64Image, userId } = req.body;
    
    if (!base64Image) return res.status(400).json({ error: "Gambar makanan tidak ditemukan!" });

    try {
        // [PERBAIKAN MODEL]: Menggunakan Llama 4 Scout (Model Vision Resmi Groq Terbaru eaaaa)
        const chatCompletion = await groq.chat.completions.create({
            model: "meta-llama/llama-4-scout-17b-16e-instruct",
            messages: [
                {
                    role: "system",
                    content: `Anda adalah Ahli Gizi Klinis. Analisis gambar makanan ini. Output HANYA format JSON valid tanpa markdown, dengan struktur:
                    { "nama_makanan": "String", "estimasi_indeks_glikemik": "Tinggi/Sedang/Rendah", "prediksi_lonjakan_gula": "Maks 20 kata", "saran_substitusi": "Maks 15 kata" }`
                },
                {
                    role: "user",
                    content: [{ type: "image_url", image_url: { url: base64Image } }]
                }
            ],
            response_format: { type: "json_object" },
            temperature: 0.3
        });

        const aiAnalysis = JSON.parse(chatCompletion.choices[0].message.content);

        // Menyimpan log ke Supabase
        const { data: dbData, error: dbError } = await supabase
            .from('nutrivision_logs')
            .insert([{
                user_id: userId || 'anonymous',
                food_name: aiAnalysis.nama_makanan,
                glycemic_index: aiAnalysis.estimasi_indeks_glikemik,
                medical_prediction: aiAnalysis.prediksi_lonjakan_gula,
                suggestion: aiAnalysis.saran_substitusi
            }]);

        if (dbError) console.error("Peringatan: Gagal menyimpan riwayat ke DB:", dbError.message);

        res.status(200).json({ success: true, data: aiAnalysis });

    } catch (err) {
        console.error("ERROR VISION AI:", err.message);
        res.status(500).json({ error: "Sistem gagal memproses gambar makanan." });
    }
});

// =====================================================================
// --- KONFIGURASI SERVER ---
// =====================================================================
// Blok ini TIDAK bermasalah. Ini wajib ada agar Vercel dan Localhost sama-sama bisa hidup.
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`🚀 HealthCore Engine Ready by Team PitaHijauPejuang on Port ${PORT}`));
}

module.exports = app;
