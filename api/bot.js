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
    const message = (req.query.q || "").trim();

    // ====== ABSEN ======
    if (command.includes("absen")) {
      // Cek apakah user sudah absen
      let { data: existing } = await supabase
        .from("absen")
        .select("id")
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

      const daftar = data.map((d) => `${d.nomor}.${d.username}`).join(", ");
      return res.send(`Total ${data.length} peserta. Hadir: ${daftar}`);
    }

    // ====== RESETABSEN ======
    if (command.includes("resetabsen")) {
      await supabase.from("absen").delete().neq("id", 0);
      return res.send("✅ Daftar absen sudah direset yg mulia.");
    }

    // ====== CHAT (AI) ======
    if (command.includes("bot")) {
      // Ambil history 5 chat terakhir user
      let { data: history } = await supabase
        .from("chat_history")
        .select("role, message")
        .eq("username", user)
        .order("id", { ascending: true })
        .limit(5);

      const messages = (history || []).map((h) => ({
        role: h.role,
        content: h.message,
      }));

      // Tambahkan pesan baru user
      messages.push({ role: "user", content: message });

      // Kirim ke xGPT API
      const reply = await fetch(
        `https://xgpt.gerhard.dev/api/command?q=${encodeURIComponent(
          message
        )}%20reply%20in%20casual%20Indonesian%20as%20if%20chatting%20with%20a%20friend`
      ).then((r) => r.text());

      // Simpan history baru
      await supabase.from("chat_history").insert([
        { username: user, role: "user", message },
        { username: user, role: "bot", message: reply },
      ]);

      return res.send(reply);
    }

    // ====== DEFAULT ======
    return res.send("Perintah tidak dikenal 🤔");
  } catch (err) {
    console.error("Error bot.js:", err);
    return res.status(500).send("Terjadi kesalahan di server.");
  }
}
