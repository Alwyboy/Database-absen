import { createClient } from "@supabase/supabase-js";

// Koneksi ke Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export default async function handler(req, res) {
  try {
    const user = (req.query.user || "anon").toLowerCase();
    const command = (req.query.command || "").toLowerCase();

    // ====== ABSEN FLEXIBLE ======
    if (command.includes("absen")) {
      // Cek apakah user sudah absen
      let { data: existing } = await supabase
        .from("absen")
        .select("id, nomor")
        .eq("username", user)
        .maybeSingle();

      if (existing) {
        return res.send(`Halo ${user}, kamu sudah absen 👍`);
      }

      // Hitung nomor absen
      let { count } = await supabase
        .from("absen")
        .select("*", { count: "exact", head: true });

      const nomor = count + 1;

      // Simpan ke tabel
      await supabase.from("absen").insert([{ username: user, nomor }]);

      return res.send(`Halo ${user}, nomor absen kamu ${nomor}.`);
    }

    // ====== CEKABSEN ======
    if (command.includes("cekabsen")) {
      let { data } = await supabase.from("absen").select("username, nomor");

      if (!data || data.length === 0) {
        return res.send("Belum ada yang absen 😅");
      }

      const daftar = data
        .map((d) => `${d.nomor}.${d.username}`)
        .slice(0, 10) // batasi 10 nama agar chat tidak panjang
        .join(", ");

      return res.send(
        `Total ${data.length} peserta. Hadir: ${daftar}${data.length > 10 ? ", ..." : ""}`
      );
    }

    // ====== RESETABSEN ======
    if (command.includes("resetabsen")) {
      await supabase.from("absen").delete().neq("id", 0);
      return res.send("✅ Daftar absen sudah direset untuk live baru.");
    }

    // ====== DEFAULT ======
    return res.send("Perintah absen tidak dikenal 🤔");

  } catch (err) {
    console.error("Error absen.js:", err);
    return res.status(500).send("Terjadi kesalahan di server.");
  }
}
