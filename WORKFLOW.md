# 📱 Workflow Instalasi & Pengembangan Lucky Scoop 3D

Dokumen ini menjelaskan alur sistematis instalasi game ke perangkat Android (PWA & APK mandiri) serta alur kerja pengembangan (development workflow).

---

## 🚀 1. Alur Instalasi Cepat di Android (PWA / WebAPK)

Game ini dibangun dengan standar **Progressive Web App (PWA)** lengkap dengan manifest, service worker (`vite-plugin-pwa`), ikon maskable, dan kemampuan offline.

### Langkah Pemasangan Langsung di Smartphone Android:
1. Buka browser **Google Chrome** atau **Brave** di smartphone Android Anda.
2. Akses tautan game ini.
3. Muncul notifikasi atau tombol hijau **"Pasang di Android"** di menu utama.
4. Atau, ketuk menu titik tiga **(⋮)** di sudut kanan atas browser Chrome.
5. Pilih **"Tambahkan ke Layar Utama" (Add to Home screen)** atau **"Instal Aplikasi" (Install App)**.
6. Ketuk **Instal**.
7. Game akan langsung terpasang di App Drawer & Homescreen Android dengan logo resmi, berjalan di layar penuh (*fullscreen* tanpa bilah URL browser), performa 60fps dengan Three.js, dan getaran haptic Android aktif.

---

## 📦 2. Alur Pembuatan File APK Mandiri (.apk / .aab untuk Play Store)

Untuk mendistribusikan game sebagai file `.apk` mandiri atau mengunggahnya ke **Google Play Store**, Anda dapat menggunakan Google **Bubblewrap** (Trusted Web Activity - TWA) atau **PWABuilder**.

### Menggunakan Bubblewrap CLI (Resmi dari Google):
```bash
# 1. Pasang Bubblewrap CLI secara global
npm install -g @bubblewrap/cli

# 2. Inisialisasi proyek Android dari manifest PWA
bubblewrap init --manifest https://[URL_APPLET]/manifest.webmanifest

# 3. Bangun file APK / AAB Android
bubblewrap build
```
File `.apk` siap dipasang langsung ke smartphone Android (*sideload*), dan file `.aab` siap diunggah ke Google Play Console.

### Menggunakan PWABuilder (Online GUI):
1. Kunjungi [https://www.pwabuilder.com/](https://www.pwabuilder.com/).
2. Masukkan URL game ini lalu klik **Start**.
3. Di tab **Android**, klik **Generate Package**.
4. Unduh file `.zip` berisi APK siap pasang dan source code Android Studio.

---

## 💻 3. Alur Kerja Pengembangan (Developer Workflow)

### Menjalankan Server Pengembangan Lokal:
```bash
# Instal dependensi
npm install

# Jalankan dev server lokal di port 3000
npm run dev
```

### Validasi Kode & Linting (TypeScript):
```bash
npm run lint
```

### Membangun Paket Produksi:
```bash
npm run build
```
Hasil build produksi tersimpan di direktori `dist/` siap di-hosting atau di-deploy.

---

## ⚙️ 4. Alur Kerja Otomatis (CI/CD GitHub Actions)

File workflow `.github/workflows/ci.yml` secara otomatis memvalidasi setiap *commit*, *pull request*, atau eksekusi manual (*workflow_dispatch*):
- Menggunakan `package-lock.json` dan `.npmrc` dengan resolusi peer dependency otomatis (`legacy-peer-deps=true`).
- Menginstal dependensi dengan aman (`npm ci --legacy-peer-deps || npm install --legacy-peer-deps`).
- Menjalankan static type checking (`npm run lint`).
- Mengompilasi build produksi PWA (`npm run build`).

Jika terjadi kendala pada GitHub Actions sebelumnya, penyebab utamanya adalah ketiadaan file `package-lock.json` yang diwajibkan oleh perintah `npm ci` bawaan serta konflik resolusi peer dependencies esbuild pada npm versi lama. Masalah ini kini telah diperbaiki secara tuntas dengan pembuatan `package-lock.json` resmi, konfigurasi `.npmrc`, dan penyesuaian versi esbuild yang kompatibel dengan Vite 8.
