# 10 — Ganti Password (Change Password)

> Status: Implementasi
> Referensi: [`backend-integration-spec.md`](../backend-integration-spec.md)

## 1. Ringkasan & Motivasi

Pengguna yang login perlu mengganti password sendiri. Sebelumnya hanya ada reset
password via token (`requestPasswordReset`/`confirmPasswordReset`). Fitur ini
menambah alur **ganti password saat login** yang memverifikasi password lama.

## 2. Arsitektur & Komponen

- `DataSource.changePassword()` ditambahkan ke kontrak (`src/api/source.ts`).
- `PocketBaseSource` memakai `users.update(id, { oldPassword, password, passwordConfirm })`.
- `MockSource` memvalidasi password lama sesuai aturan mock, lalu sukses tanpa menyimpan.
- UI berada di `src/pages/ProfilePage.vue` (kartu "Change Password").

## 3. Kontrak Data

```ts
changePassword(input: {
  currentPassword: string
  newPassword: string
}): Promise<void>
```

Validasi sisi klien (`src/lib/validation.ts` `changePasswordSchema`):

- `currentPassword` minimal 6 karakter.
- `newPassword` minimal 8 karakter, mengandung huruf dan angka.
- Konfirmasi harus sama.
- Password baru harus berbeda dari password lama.

## 4. Otorisasi & Keamanan

- Server (PocketBase) hanya mengizinkan pemilik record memperbarui password-nya.
- Password tidak pernah dikirim/disimpan di state, log, atau `localStorage`.
- `PocketBaseSource` melempar `LOGIN_REQUIRED` bila tidak ada sesi.

## 5. Panduan Penggunaan (UI/UX)

1. Buka halaman Profil.
2. Pada kartu "Change Password", isi password lama, password baru, dan konfirmasi.
3. Klik "Update password".
4. Sukses → notifikasi "Password updated"; error validasi / password lama salah → pesan di form.

## 6. Pengujian & Verifikasi

- Unit test adapter: `changePassword` memanggil `users.update` dengan payload benar.
- Verifikasi CI: `vue-tsc --noEmit`, `eslint .`, `vitest run`, `vite build`.
- Manual: ganti password `demo`, logout, login dengan password baru berhasil.
