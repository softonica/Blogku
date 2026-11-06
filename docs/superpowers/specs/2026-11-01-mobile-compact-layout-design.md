# Mobile Compact Layout — Design (Short)

Tanggal: 2026-11-01
Status: draft (menunggu persetujuan)

## Intent & why
Layout mobile saat ini boros space: padding/margin/gap besar dan border radius lebar (rounded-2xl/3xl) sehingga konten terasa renggang di layar sempit. Target: layout mobile lebih compact & hemat space, desktop tidak berubah.

## Goals / Non-Goals
- Goals: kurangi padding, margin, gap, dan border radius pada breakpoint `< sm` (640px) di semua halaman (publik + admin). Hilangkan info duplikat di mobile (aturan "1 info 1x").
- Non-goals: tidak mengubah layout desktop (sm+). Tidak mengubah tipografi, warna, ikon, atau perilaku (data/logika). Tidak mengubah rounded-full (tombol/pill) & spacing < 4.

## Aturan transformasi (base = mobile, sm: = desktop lama)
| Properti | Mobile (base) | Desktop (sm:) |
|---|---|---|
| rounded-3xl / rounded-[2rem] | rounded-xl | sm:rounded-3xl / sm:rounded-[2rem] |
| rounded-2xl | rounded-lg | sm:rounded-2xl |
| rounded-xl | rounded-lg | sm:rounded-xl |
| p/px/py/ps/pe ≥ 4 | turun 1 langkah (8→6, 6→4, 5→4, 4→3) | sm: nilai lama |
| m/mx/my/ms/me ≥ 4 | turun 1 langkah (8→6, 7→5, 6→4, 5→4, 4→3) | sm: nilai lama |
| gap/space-x/space-y ≥ 4 | turun 1 langkah (sama) | sm: nilai lama |
| spacing < 4, rounded-full, h-/w-/text- | tidak diubah | — |

## Deduplikasi (mobile-only) — PostPage
1. Box "Post details" di bawah konten (sidebar gaya magazine) → `hidden lg:block`.
2. Box "Written by" di bawah konten (gaya non-magazine) → `hidden sm:flex` (info penulis/date sudah ada di header).
3. Sidebar magazine ("Written by" + "Post details" + aksi) → `hidden lg:block` di mobile (aksi Like/Save/Share sudah ada di action row).
4. Action row: tambahkan counter komentar (ikon MessageCircle + jumlah) **sebelum** tombol Share, menggantikan info yang dihapus dari "Post details". Muncul di mobile dan desktop (aksi baris sama).
5. Perbaikan serupa diterapkan di halaman lain bila ditemukan duplikasi informasi yang sama (diputuskan saat implementasi, dicatat di changelog).

## Verifikasi
- `npm run typecheck` (vue-tsc --noEmit), `npm run lint`, `npm run test` (vitest), `npm run build`.
- Manual: cek mobile (375px) tiap halaman utama + admin; bandingkan desktop (sm+).

## Dokumentasi (wajib repo)
- `docs/features/19-mobile-compact-layout.md`
- Entri `CHANGELOG.md` (format team-work).
