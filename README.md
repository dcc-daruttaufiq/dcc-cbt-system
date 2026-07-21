# DCC CBT

Pondasi (foundation) proyek **Computer Based Test** berbasis React + Vite.
Repo ini baru berisi *fondasi* — belum ada halaman dashboard atau fitur ujian.
Tujuannya: siapkan struktur, styling, routing, dan tooling yang rapi supaya
pengembangan fitur berikutnya tinggal lanjut tanpa perlu bongkar ulang setup.

## Tech Stack

| Layer      | Tools |
|------------|-------|
| Build tool | Vite 6 |
| UI         | React 18 |
| Styling    | Tailwind CSS 3 (dark theme by default) |
| Routing    | React Router 6 |
| HTTP       | Axios |
| Animasi    | Framer Motion |
| Ikon       | Lucide React |
| Font       | Rajdhani (display) + Poppins (body) via Google Fonts |

## Struktur Folder

```
dcc-cbt/
├── client/                    # Aplikasi React (Vite)
│   ├── public/                 # Aset statis publik (favicon, dll.)
│   ├── src/
│   │   ├── assets/
│   │   │   ├── fonts/           # Font lokal (opsional, saat ini pakai Google Fonts CDN)
│   │   │   ├── icons/           # Ikon kustom (SVG/PNG di luar Lucide)
│   │   │   ├── images/          # Gambar umum
│   │   │   └── logo/            # Logo brand
│   │   ├── components/          # Komponen UI reusable (mis. components/ui/Button.jsx)
│   │   ├── layouts/             # Shell/layout halaman (mis. MainLayout.jsx)
│   │   ├── pages/                # Halaman (route-level components)
│   │   ├── routes/               # Definisi routing terpusat (AppRoutes.jsx)
│   │   ├── services/             # Instance Axios & pemanggilan API
│   │   ├── hooks/                # Custom React hooks
│   │   ├── utils/                # Helper & konstanta
│   │   ├── styles/                # global.css, variables.css (design tokens), typography.css
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js           # termasuk alias @, @components, @pages, dst.
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── .env.example
├── server/                    # Placeholder backend/API (belum diimplementasikan)
├── docs/                      # Dokumentasi proyek
└── README.md
```

## Konfigurasi yang Sudah Disiapkan

- **Tailwind CSS** — dikonfigurasi dengan `darkMode: 'class'` dan token warna
  custom yang dibaca dari CSS variables (lihat `src/styles/variables.css`),
  sehingga tema bisa diganti tanpa mengubah `tailwind.config.js`.
- **Dark theme (default aktif)** — class `dark` sudah dipasang di `<html>`
  (`index.html`). Struktur token juga sudah menyiapkan varian `.light`
  untuk pengembangan tema terang di masa depan.
- **Color variables** — didefinisikan di `src/styles/variables.css`:
  - Background: `#0B0F17` (base), `#121826` (surface), `#1A2133` (elevated)
  - Accent: `#4DE1C1` (mint/cyan — warna utama tombol & highlight)
  - Warning: `#FFB020`, Danger: `#FF5470`
- **Typography** — `Rajdhani` untuk heading/label/angka (kesan teknikal,
  cocok untuk timer & skor ujian), `Poppins` untuk body text. Diatur di
  `src/styles/typography.css` dan `tailwind.config.js` (`font-display`,
  `font-body`).
- **React Router** — `BrowserRouter` dipasang di `main.jsx`, definisi route
  terpusat di `src/routes/AppRoutes.jsx` dengan satu layout dasar
  (`MainLayout`) yang membungkus seluruh halaman.
- **Axios** — instance terpusat di `src/services/api.js`, sudah dilengkapi
  interceptor untuk menyisipkan token dari `localStorage` secara otomatis.
- **Alias import** — `@`, `@components`, `@layouts`, `@pages`, `@routes`,
  `@services`, `@hooks`, `@utils`, `@styles`, `@assets` sudah dikonfigurasi
  di `vite.config.js`.

## Cara Menjalankan

```bash
cd dcc-cbt/client
npm install
npm run dev
```

Buka `http://localhost:5173`. Halaman awal (`src/pages/Home.jsx`) berfungsi
sebagai halaman verifikasi bahwa Tailwind, Router, dan Framer Motion sudah
terpasang dengan benar — **ini bukan dashboard**, hanya placeholder fondasi.

### Script lain

```bash
npm run build     # build production ke client/dist
npm run preview   # preview hasil build
npm run lint      # jalankan ESLint
```

## Environment Variable

Salin `.env.example` menjadi `.env` di dalam folder `client/` bila backend
sudah tersedia:

```bash
cp client/.env.example client/.env
```

```
VITE_API_BASE_URL=http://localhost:8000/api
```

## Langkah Selanjutnya (belum dikerjakan di fondasi ini)

- Halaman dashboard & fitur ujian (CBT flow: login, kerjakan soal, timer, hasil)
- Autentikasi (guard route, context/state management)
- Implementasi backend di folder `server/`
- Dokumentasi API & alur sistem di folder `docs/`
