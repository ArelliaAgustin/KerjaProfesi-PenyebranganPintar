
# Smart Pedestrian Crossing

**Deteksi dan Pemantauan Penyeberang Jalan Berbasis Kamera**

---

## 📌 Urgensi Proyek

Proyek **Smart Pedestrian Crossing** bertujuan meningkatkan keselamatan pejalan kaki melalui sistem penyeberangan otomatis berbasis kamera dan people counting. Sistem ini dirancang untuk mengatur lampu penyeberangan secara responsif, menyajikan data secara real-time melalui dashboard web, serta mendukung pengembangan kota cerdas (*Smart City*).

---

## 📍 Ruang Lingkup Proyek

- Sistem difokuskan pada satu titik lokasi zebra cross.
- Deteksi terbatas pada pejalan kaki (tidak mencakup kendaraan atau hewan).
- Kamera pengawas digunakan sebagai input utama (tanpa sensor tambahan).
- Keputusan pengaktifan lampu penyeberangan berdasarkan jumlah pejalan kaki yang menunggu.
- Terintegrasi dengan antarmuka website untuk pemantauan data real-time.
- Fokus utama adalah keamanan pejalan kaki, bukan sistem lalu lintas secara keseluruhan.
- Tidak mencakup kontrol kendaraan atau deteksi kendaraan pintar.

---

## 🎯 Output yang Diharapkan

- Lampu penyeberangan menyala otomatis saat terdeteksi pejalan kaki.
- Jumlah pejalan kaki tercatat otomatis setiap kali terjadi penyeberangan.
- Dashboard web menampilkan:
  - Grafik jumlah pejalan kaki per hari/jam.
  - Status lampu penyeberangan secara real-time.
  - Tanggal dan waktu aktivitas penyeberangan.

---

## 🔁 Bisnis Proses Sistem

1. Kamera 1 dan 2 memantau area zebra cross secara real-time.
2. Model deteksi objek (misalnya YOLO) mendeteksi keberadaan pejalan kaki.
3. Jika terdeteksi selama lebih dari 10 detik, lampu penyeberangan berubah menjadi hijau.
4. Saat pejalan kaki melewati garis counting, sistem mencatat jumlah dan waktu ke dalam basis data.
5. Data diperbarui otomatis ke dashboard web.
6. Jika tidak ada pejalan kaki terdeteksi, lampu berubah menjadi merah kembali.
7. Semua proses berjalan secara otomatis dan real-time, serta dapat dipantau melalui antarmuka web.

---

## 🌐 Teknologi yang Digunakan

- Python + Flask (Backend dan API)
- SQLite (Database lokal)
- OpenCV dan YOLO (Deteksi objek)
- JavaScript + Chart.js (Visualisasi data di dashboard)
- HTML/CSS (Antarmuka pengguna)
- Git & GitHub (Kolaborasi dan pengelolaan versi)

---

## 👥 Kontributor

- **Indah Hairunisah** - Pengembang utama dan dokumentasi
- 

---

## 📄 Lisensi

Proyek ini dibuat untuk tujuan pembelajaran dan riset dalam proyek bersama PT. MarkTel
