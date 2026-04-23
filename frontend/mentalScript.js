const mentalForm = document.getElementById('mentalForm');

if (mentalForm) {
    mentalForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const category = document.getElementById('mentalCategory').value;
        const feeling = document.getElementById('mentalInput').value;
        const submitBtn = document.getElementById('submitBtn');
        const btnText = document.getElementById('btnText');
        const resultSection = document.getElementById('resultSection');
        
        // UI State: Loading
        submitBtn.disabled = true;
        submitBtn.classList.add('opacity-70', 'cursor-not-allowed');
        btnText.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menganalisis...';
        resultSection.classList.add('hidden');

        try {
            // Tembak API Mental Backend
            const response = await fetch("/api/antrean", {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ category: category, feeling: feeling })
            });

            const result = await response.json();

            if (response.ok) {
                // Tampilkan Data ke UI
                document.getElementById('resAdvice').innerText = result.advice;
                
                // Munculkan hasil
                resultSection.classList.remove('hidden');
                
                // Scroll perlahan ke arah hasil
                resultSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            } else {
                alert("Error: " + result.error);
            }
        } catch (error) {
            alert("Gagal terhubung ke server. Pastikan backend Node.js Anda menyala.");
            console.error(error);
        } finally {
            // UI State: Normal kembali
            submitBtn.disabled = false;
            submitBtn.classList.remove('opacity-70', 'cursor-not-allowed');
            btnText.innerHTML = 'Minta Panduan AI <i class="fa-solid fa-brain ml-2"></i>';
        }
    });
}