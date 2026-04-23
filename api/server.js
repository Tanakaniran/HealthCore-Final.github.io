const express = require('express');
const cors = require('cors');
const supabase = require('./supabaseClient');
const Groq = require('groq-sdk');
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const app = express();
app.use(cors());
app.use(express.json());

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// --- ENDPOINT KESEHATAN FISIK (Diabetes) ---
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

// --- ENDPOINT KESEHATAN MENTAL ---
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

const PORT = process.env.PORT || 5000;
//app.listen(PORT, () => console.log(` HealthCore Engine Ready by Team PitaHijauPejuang on Port ${PORT}`));
module.exports = app;
