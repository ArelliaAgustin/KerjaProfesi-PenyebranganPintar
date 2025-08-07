let currentMode = 'harian';
let currentKamera = 'CAM1';

const ctx1 = document.getElementById('chart1').getContext('2d');
const ctx2 = document.getElementById('chart2').getContext('2d');
let chart1, chart2;

function setKamera(kam) {
  currentKamera = kam;
  loadData();
}

function setMode(mode) {
  currentMode = mode;
  loadData();
}

function loadData() {
  const today = new Date().toISOString().split('T')[0];
  const bulan = today.slice(0, 7);
  const tanggalParam = currentMode === 'bulanan' ? bulan : today;
  const url = `/api/${currentMode}?kamera=${currentKamera}&tanggal=${tanggalParam}`;

  fetch(url)
    .then(res => res.json())
    .then(data => {
      updateTable(data);
      updateCharts(data);
    })
    .catch(err => {
      console.error('Gagal mengambil data:', err);
    });
}

function updateTable(data) {
  const head = document.getElementById("table-head");
  const body = document.getElementById("table-body");

  head.innerHTML = '';
  body.innerHTML = '';

  let headers = ['JAM', 'TOTAL CROSSING', 'JAM TERSIBUK', 'TOTAL DURASI'];
  if (currentMode === 'mingguan') headers[0] = 'HARI';
  if (currentMode === 'bulanan') headers[0] = 'TANGGAL';

  headers.forEach(h => {
    const th = document.createElement("th");
    th.textContent = h;
    head.appendChild(th);
  });

  data.forEach(row => {
    const label = row.jam !== undefined && row.jam !== null
      ? row.jam
      : row.hari || row.tanggal;

    const jamSibuk = row.jam_tersibuk !== undefined
      ? row.jam_tersibuk
      : row.jam_sibuk;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${label}</td>
      <td>${row.total_crossing}</td>
      <td>${jamSibuk}</td>
      <td>${row.total_durasi}</td>
    `;
    body.appendChild(tr);
  });

  document.getElementById("tabel-title").textContent = `Tabel ${capitalize(currentMode)}`;
}

function updateCharts(data) {
  if (chart1) chart1.destroy();
  if (chart2) chart2.destroy();

  if (!data || data.length === 0) {
    ctx2.canvas.style.display = 'none';
    return;
  }

  let labels = data.map(row =>
    row.jam !== undefined && row.jam !== null
      ? row.jam
      : row.hari || row.tanggal
  );

  let crossing = data.map(row => row.total_crossing);

  // === CHART 1: Total Crossing ===
  if (currentMode === 'bulanan') {
    const minggu = [0, 0, 0, 0];
    data.forEach(row => {
      const day = parseInt(row.tanggal.split('-')[2]);
      const weekIndex = Math.min(3, Math.floor((day - 1) / 7));
      minggu[weekIndex] += row.total_crossing;
    });
    labels = ['Minggu 1', 'Minggu 2', 'Minggu 3', 'Minggu 4'];
    crossing = minggu;
  }

  chart1 = new Chart(ctx1, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Total Crossing',
        data: crossing,
        borderColor: 'blue',
        fill: false
      }]
    }
  });

  // === CHART 2: Jam Tersibuk ===
  if (currentMode === 'mingguan') {
    const hariUrut = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
    const ordered = hariUrut.map(hari => {
      const found = data.find(row => row.hari.toLowerCase() === hari.toLowerCase());
      return {
        label: hari,
        jam_tersibuk: found && found.jam_tersibuk != null ? found.jam_tersibuk : 0
      };
    });

    const hariLabel = ordered.map(row => row.label);
    const jam = ordered.map(row => row.jam_tersibuk);

    chart2 = new Chart(ctx2, {
      type: 'bar',
      data: {
        labels: hariLabel,
        datasets: [{
          label: 'Jam Tersibuk (Per Hari)',
          data: jam,
          backgroundColor: 'purple'
        }]
      }
    });

  } else if (currentMode === 'bulanan') {
    const mingguLabel = ['Minggu 1', 'Minggu 2', 'Minggu 3', 'Minggu 4'];
    const jamMingguan = [[], [], [], []];

    data.forEach(row => {
      const day = parseInt(row.tanggal.split('-')[2]);
      const weekIndex = Math.min(3, Math.floor((day - 1) / 7));
      const jam = parseInt(row.jam_tersibuk);
      if (!isNaN(jam)) jamMingguan[weekIndex].push(jam);
    });

    const rataJam = jamMingguan.map(arr => {
      if (arr.length === 0) return 0;
      const sum = arr.reduce((a, b) => a + b, 0);
      return Math.round(sum / arr.length);
    });

    chart2 = new Chart(ctx2, {
      type: 'bar',
      data: {
        labels: mingguLabel,
        datasets: [{
          label: 'Jam Tersibuk (Rata-rata per Minggu)',
          data: rataJam,
          backgroundColor: 'purple'
        }]
      }
    });

  } else {
    ctx2.canvas.style.display = 'none';
    return;
  }

  ctx2.canvas.style.display = 'block';
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

window.onload = loadData;
