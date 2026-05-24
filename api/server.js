const express = require('express');
const cors = require('cors');
const supabase = require('./supabaseClient');
const Groq = require('groq-sdk');
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const app = express();
app.use(cors());

// [SANGAT PENTING] Naikkan limit JSON untuk menerima Base64 gambar agar tidak Error 413
app.use(express.json({ limit: '10mb' })); 

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// =====================================================================
// --- 1. ENDPOINT KESEHATAN FISIK (Diabetes) ---
// =====================================================================
app.post('/api/sugar-check', async (req, res) => {
    const { sugarLevel } = req.body;
    if (!sugarLevel) return res.status(400).json({ error: "Input angka gula darah!" });

    try {
        let status = "Normal";
        if (sugarLevel > 140) status = "Tinggi";
        if (sugarLevel < 70) status = "Rendah";

        const chatCompletion = await groq.chat.completions.create({
            messages: [{
                role: "user",
                content: `Pasien gula darah ${sugarLevel} mg/dL. Berikan 2 saran pendek (maks 30 kata): 1. Makanan, 2. Aktivitas. Format: Makanan: [isi] | Aktivitas: [isi]`
            }],
            model: "llama-3.1-8b-instant",
        });

        const aiResponse = chatCompletion.choices[0].message.content;
        const [food, act] = aiResponse.split('|');

        const { data, error } = await supabase
            .from('glucose_logs')
            .insert([{ 
                sugar_level: sugarLevel, 
                status: status,
                food_advice: food ? food.trim() : "Perhatikan pola makan.",
                activity_advice: act ? act.trim() : "Tetap aktif bergerak."
            }])
            .select();

        if (error) throw error;
        res.status(200).json({ success: true, data: data[0] });

    } catch (err) {
        console.error("ERROR FISIK:", err.message);
        res.status(500).json({ error: "Sistem AI sedang sibuk" });
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

        res.status(200).json({ 
            success: true, 
            advice: aiAdvice 
        });

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
        // Tembak Llama 3.2 Vision
        const chatCompletion = await groq.chat.completions.create({
            model: "llama-3.2-11b-vision-instruct",
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

        // Simpan ke Supabase agar menjadi rekam medis jangka panjang
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

        // Kirim balikan ke Frontend
        res.status(200).json({ success: true, data: aiAnalysis });

    } catch (err) {
        console.error("ERROR VISION AI:", err.message);
        res.status(500).json({ error: "Sistem gagal memproses gambar makanan." });
    }
});

if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`🚀 HealthCore Engine Ready by Team PitaHijauPejuang on Port ${PORT}`));
}

// Ekspor untuk environment Vercel (Serverless)
module.exports = app;