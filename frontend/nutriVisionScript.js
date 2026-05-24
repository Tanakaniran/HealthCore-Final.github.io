// [BARU] Fungsi Pintar untuk membuat atau mengambil ID Perangkat (Device Fingerprinting)
function getOrCreateDeviceId() {
    let deviceId = localStorage.getItem('healthcore_device_id');
    if (!deviceId) {
        // Jika belum ada, buat ID unik (contoh: hc_usr_8f72a9)
        deviceId = 'hc_usr_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('healthcore_device_id', deviceId);
    }
    return deviceId;
}

document.getElementById('foodScannerInput').addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (!file) return;

    const previewArea = document.getElementById('previewArea');
    const foodPreview = document.getElementById('foodPreview');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const aiResultArea = document.getElementById('aiResultArea');
    
    // Reset state UI saat foto baru diambil
    previewArea.classList.remove('hidden');
    aiResultArea.classList.add('hidden');
    loadingIndicator.classList.remove('hidden');
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.src = e.target.result;
        img.onload = function() {
            foodPreview.src = img.src; // Tampilkan pratinjau mentah
            
            // --- ARSITEKTUR KOMPRESI: CANVAS SISI KLIEN ---
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 800; // Batas resolusi ideal untuk Llama Vision
            const scaleSize = MAX_WIDTH / img.width;
            canvas.width = MAX_WIDTH;
            canvas.height = img.height * scaleSize;
            
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            // Mengonversi menjadi Base64 berformat JPEG dengan kualitas kompresi 60%
            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.6);
            
            // Kirim payload ringan ke Backend
            sendToNutriVisionAPI(compressedBase64);
        }
    };
    reader.readAsDataURL(file);
});

async function sendToNutriVisionAPI(base64Image) {
    const loadingIndicator = document.getElementById('loadingIndicator');
    const aiResultArea = document.getElementById('aiResultArea');
    const resultHeader = document.getElementById('resultHeader');
    const badgeGI = document.getElementById('badgeGI');
    
    // Ambil Device ID
    const myDeviceId = getOrCreateDeviceId();

    try {
        // Penentu URL API dinamis (Mendukung Localhost saat maintenance VSCode)
        const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
            ? 'http://localhost:3000/api/scan-food' 
            : '/api/scan-food';

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                base64Image: base64Image,
                currentSugarLevel: 115, // Dummy metadata, nanti bisa dari dashboard
                userId: myDeviceId // [PENTING] Mengirim ID User ke Backend
            })
        });
        
        const resData = await response.json();
        loadingIndicator.classList.add('hidden'); // Sembunyikan loading animasi
        
        if (resData.success) {
            aiResultArea.classList.remove('hidden');
            
            // Suntikkan data dari Llama-3.2 Vision ke elemen HTML
            document.getElementById('resFoodName').innerText = resData.data.nama_makanan;
            document.getElementById('resPrediction').innerText = resData.data.prediksi_lonjakan_gula;
            document.getElementById('resSuggestion').innerText = resData.data.saran_substitusi;
            badgeGI.innerText = `GI: ${resData.data.estimasi_indeks_glikemik}`;
            
            // --- STRATEGI UX: MODIFIKASI WARNA TEMA BERDASARKAN INDEKS GLIKEMIK ---
            const giStatus = resData.data.estimasi_indeks_glikemik.toLowerCase();
            if (giStatus.includes('tinggi')) {
                resultHeader.className = "px-4 py-3 bg-red-50 text-red-800 font-bold text-sm flex items-center justify-between border-b border-red-100";
                badgeGI.className = "text-xs px-2.5 py-0.5 rounded-full font-semibold uppercase bg-red-100 text-red-800 border border-red-200";
            } else if (giStatus.includes('sedang')) {
                resultHeader.className = "px-4 py-3 bg-amber-50 text-amber-800 font-bold text-sm flex items-center justify-between border-b border-amber-100";
                badgeGI.className = "text-xs px-2.5 py-0.5 rounded-full font-semibold uppercase bg-amber-100 text-amber-800 border border-amber-200";
            } else {
                resultHeader.className = "px-4 py-3 bg-green-50 text-green-800 font-bold text-sm flex items-center justify-between border-b border-green-100";
                badgeGI.className = "text-xs px-2.5 py-0.5 rounded-full font-semibold uppercase bg-green-100 text-green-800 border border-green-200";
            }
        } else {
            alert("Gagal menganalisis gambar: " + resData.error);
        }
    } catch (error) {
        console.error(error);
        alert("Terjadi kegagalan komunikasi dengan backend. Pastikan server lokal/Vercel Anda menyala.");
        loadingIndicator.classList.add('hidden');
    }
}