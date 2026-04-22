// 1. Tangkap elemen form
const sugarForm = document.getElementById('sugarForm');

// 2. LOGIKA PELINDUNG: Hanya jalankan kode ini JIKA form ditemukan di halaman yang sedang dibuka
if (sugarForm) {
    sugarForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const sugarInput = document.getElementById('sugarInput').value;
        const submitBtn = document.getElementById('submitBtn');
        const btnText = document.getElementById('btnText');
        const resultSection = document.getElementById('resultSection');
        
        // Mode Loading
        submitBtn.disabled = true;
        submitBtn.classList.add('opacity-70', 'cursor-not-allowed');
        btnText.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Memproses...';
        resultSection.classList.add('hidden');

        try {
            // Tembak API. Juga pastikan server.js nyala di port 5000
            const response = await fetch('http://localhost:5000/api/sugar-check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sugarLevel: parseInt(sugarInput) })
            });

            const result = await response.json();

            if (response.ok) {
                // Render Hasil ke UI
                document.getElementById('resLevel').innerText = result.data.sugar_level + " mg/dL";
                const statusEl = document.getElementById('resStatus');
                statusEl.innerText = result.data.status;
                
                // Pewarnaan Status Medis
                if (result.data.status === 'Normal') statusEl.className = 'text-2xl font-bold text-green-600';
                else if (result.data.status === 'Tinggi') statusEl.className = 'text-2xl font-bold text-red-600';
                else statusEl.className = 'text-2xl font-bold text-yellow-600';

                document.getElementById('resFood').innerText = result.data.food_advice;
                document.getElementById('resActivity').innerText = result.data.activity_advice;
                
                resultSection.classList.remove('hidden');
            } else {
                alert("Error dari AI: " + result.error);
            }
        } catch (error) {
            console.error(error);
            alert("Gagal terhubung ke server Backend. Pastikan mesin menyala.");
        } finally {
            // Kembalikan tombol ke mode awal
            submitBtn.disabled = false;
            submitBtn.classList.remove('opacity-70', 'cursor-not-allowed');
            btnText.innerHTML = 'Proses AI <i class="fa-solid fa-microchip ml-2"></i>';
        }
    });
}