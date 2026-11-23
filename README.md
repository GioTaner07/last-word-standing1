# Last Word Standing — Stage 1

Prototype frontend untuk game survival Bahasa Indonesia.

## Isi folder

- `index.html` — struktur halaman (Landing, Entry, Waiting Room, Preview)
- `style.css` — tampilan Battle Royale dark theme
- `script.js` — interaksi dasar dan simulasi lobby lokal

## Cara menjalankan

### Cara paling mudah
1. Ekstrak file ZIP.
2. Buka folder `last-word-standing`.
3. Klik dua kali `index.html`.
4. Website terbuka di browser.

### Menggunakan VS Code
1. Buka folder ini di Visual Studio Code.
2. Jika tersedia, pasang ekstensi **Live Server**.
3. Klik kanan `index.html`.
4. Pilih **Open with Live Server**.

## Uji fitur

1. Klik **Play Now**.
2. Isi nama pada bagian **Create Room**.
3. Klik **Create Arena**.
4. Kode room dan waiting room akan muncul.
5. Klik **Add Demo Player** untuk menambahkan pemain simulasi.
6. Setelah ada minimal 2 pemain, tombol **Start Match** aktif.
7. Klik tombol tersebut untuk melihat preview arena tahap berikutnya.

## Batasan prototype tahap 1

Room belum online dan belum tersinkron antarperangkat. Data pemain hanya berada di memori browser yang sedang digunakan. Tombol Add Demo Player hanya untuk pengujian tampilan lobby. Firebase Realtime Database dan validasi server akan ditambahkan pada tahap integrasi multiplayer.

## Tahap berikutnya

- Stage 2: gameplay screen, bank soal, timer, dan sistem nyawa.
- Stage 3: Firebase Authentication/anonymous identity, Realtime Database, dan sinkronisasi multiplayer.
- Stage 4: validasi jawaban di server, eliminasi, sudden death, dan winner screen.
- Stage 5: testing dan deployment.
