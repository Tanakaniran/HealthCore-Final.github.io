const supabaseUrl = 'https://gcriviaxtdsptxzjjtgz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdjcml2aWF4dGRzcHR4empqdGd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNTA1MjYsImV4cCI6MjA5MDYyNjUyNn0.3B_iz3oc7kN3bm9upmLIcDDQaq1oYJPGA2L4AtUrorg';

const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

let myChart;

document.addEventListener("DOMContentLoaded", async () => {
    await loadDashboardData();
    setupSearch();
});

async function loadDashboardData() {
    try {
        const { data, error } = await supabaseClient
            .from('glucose_logs')
            .select('*')
            .order('created_at', { ascending: true });

        if (error) throw error;

        if (data && data.length > 0) {
            updateQuickStats(data);
            updateTable(data);
            renderChart(data);
        } else {
            document.getElementById('logTableBody').innerHTML = `<tr><td colspan="4" class="p-4 text-center text-gray-500">Belum ada data pemeriksaan.</td></tr>`;
        }
    } catch (err) {
        console.error("Gagal mengambil data:", err.message);
    }
}

function updateQuickStats(data) {
    const totalChecks = data.length;
    let sum = 0;
    data.forEach(row => sum += row.sugar_level);
    const average = Math.round(sum / totalChecks);
    
    document.getElementById('statTotal').innerText = totalChecks;
    document.getElementById('statAvg').innerHTML = `${average} <span class="text-sm font-normal text-gray-500">mg/dL</span>`;
    
    const lastDiagnosis = data[data.length - 1].status;
    document.getElementById('statCondition').innerText = lastDiagnosis;
}

// FUNGSI UPDATE TABLE (Hanya 1, sudah termasuk fitur WhatsApp Rujukan)
function updateTable(data) {
    const tableBody = document.getElementById('logTableBody');
    tableBody.innerHTML = ""; 
    const reversedData = [...data].reverse();
    
    const nomorWA = "6287859700135"; 

    reversedData.forEach(row => {
        const dateObj = new Date(row.created_at);
        const dateStr = dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
        const timeStr = dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        
        let badgeColor = "bg-green-100 text-green-700";
        let isHighRisk = false; 
        
        // Deteksi risiko
        if(row.status.includes("Diabetes") || row.status.includes("Tinggi") || row.status.includes("Pra-Diabetes")) {
            badgeColor = (row.status.includes("Pra")) ? "bg-orange-100 text-orange-700" : "bg-red-100 text-red-700";
            isHighRisk = true; 
        }

        // Tombol Hapus Default
        let actionButtons = `
            <button onclick="deleteEntry('${row.id}')" class="text-red-500 hover:text-red-700 transition p-2" title="Hapus Data">
                <i class="fa-solid fa-trash-can"></i>
            </button>
        `;

        // Tambahan Ikon Dokter jika Risiko Tinggi
        if (isHighRisk) {
            let waText = `Halo HealthCore, hasil cek gula darah saya adalah ${row.sugar_level} mg/dL dengan status [${row.status}]. Saya butuh informasi rujukan klinik mitra terdekat.`;
            actionButtons = `
                <a href="https://wa.me/${nomorWA}?text=${encodeURIComponent(waText)}" target="_blank" class="text-blue-500 hover:text-blue-700 transition p-2" title="Rujukan Medis">
                    <i class="fa-solid fa-user-doctor"></i>
                </a>
                ${actionButtons}
            `;
        }

        const tr = document.createElement('tr');
        tr.className = "hover:bg-gray-50 dark:hover:bg-slate-700 transition row-item";
        tr.innerHTML = `
            <td class="p-4">
                <div class="font-bold text-gray-800 dark:text-gray-200">${dateStr}</div>
                <div class="text-xs text-gray-500">${timeStr}</div>
            </td>
            <td class="p-4 font-bold text-brandDark dark:text-white">${row.sugar_level}</td>
            <td class="p-4"><span class="px-3 py-1 ${badgeColor} rounded-full text-xs font-bold">${row.status}</span></td>
            <td class="p-4 text-center">
                <div class="flex justify-center gap-2">
                    ${actionButtons}
                </div>
            </td>
        `;
        tableBody.appendChild(tr);
    });
}

async function deleteEntry(id) {
    if (confirm("Apakah Anda yakin ingin menghapus data ini?")) {
        try {
            const { error } = await supabaseClient
                .from('glucose_logs')
                .delete()
                .eq('id', id);
            if (error) throw error;
            alert("Data berhasil dihapus!");
            await loadDashboardData();
        } catch (err) {
            alert("Gagal menghapus data.");
        }
    }
}

function renderChart(data) {
    const labels = data.slice(-10).map(row => {
        const dateObj = new Date(row.created_at);
        return dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    });
    const sugarLevels = data.slice(-10).map(row => row.sugar_level);
    const ctx = document.getElementById('glucoseChart').getContext('2d');
    
    if (myChart) myChart.destroy();
    
    myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'mg/dL',
                data: sugarLevels,
                borderColor: '#16a34a',
                backgroundColor: 'rgba(22, 163, 74, 0.2)',
                fill: true,
                tension: 0.4
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    if(!searchInput) return;
    searchInput.addEventListener('keyup', function(e) {
        const term = e.target.value.toLowerCase();
        document.querySelectorAll('.row-item').forEach(row => {
            const txt = row.innerText.toLowerCase();
            row.style.display = txt.includes(term) ? '' : 'none';
        });
    });
}