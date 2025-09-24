# Nightbot Bot API

API custom untuk Nightbot, dengan fitur:
- absen → catat absen + quotes motivasi dari xGPT
- cekabsen → cek daftar hadir
- resetabsen → reset daftar hadir (khusus moderator)
- Nightbot → ngobrol dengan xGPT (ramah, pintar, humoris, ingat history user)

## Deploy
1. Fork / clone repo ini.
2. Tambahkan ke GitHub.
3. Deploy ke Vercel.
4. Set environment variable di Vercel:
   - SUPABASE_URL
   - SUPABASE_KEY

## Nightbot Commands
- absen → `$(urlfetch https://namaproject.vercel.app/api/bot?user=$(user)&command=absen)`
- cekabsen → `$(urlfetch https://namaproject.vercel.app/api/bot?command=cekabsen)`
- resetabsen → `$(urlfetch https://namaproject.vercel.app/api/bot?command=resetabsen)`
- Nightbot → `$(urlfetch https://namaproject.vercel.app/api/bot?user=$(user)&command=nightbot&q=$(querystring))`
  
