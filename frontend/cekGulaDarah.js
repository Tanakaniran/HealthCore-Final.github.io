// 1. Tangkap elemen form
const sugarForm = document.getElementById('sugarForm');

// 2. LOGIKA PELINDUNG
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
            // PERBAIKAN: Hapus tanda ` (backtick) yang membungkus fetch!
            const response = await fetch('/api/sugar-check', {
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
                alert("Error dari AI: " + (result.error || "Gagal"));
            }
        } catch (error) {
            console.error("Error Detail:", error);
            alert("Gagal terhubung ke server Backend. Pastikan mesin menyala.");
        } finally {
            submitBtn.disabled = false;
            submitBtn.classList.remove('opacity-70', 'cursor-not-allowed');
            btnText.innerHTML = 'Proses AI <i class="fa-solid fa-microchip ml-2"></i>';
        }
    });
}