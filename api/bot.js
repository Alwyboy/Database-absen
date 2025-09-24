import { createClient } from "@supabase/supabase-js";
import fetch from "node-fetch";

// Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// =============================
// 🔹 Fungsi ngobrol dengan xGPT
// =============================
async function askXGPT(user, message, history) {
  const prompt = `
Kamu adalah AI bernama "NightbotGPT".
Gaya bicara: ramah, pintar, sedikit humoris.
Jawaban harus singkat (maks 2 kalimat), cocok untuk live chat YouTube.

Riwayat obrolan dengan ${user}:
${history.map(h => `- ${h.role}: ${h.message}`).join("\n")}

Pesan terbaru dari user: ${message}
`;

  try {
    const res = await fetch(
      `https://xgpt.gerhard.dev/api/command?q=${encodeURIComponent(prompt)}`
    );
    return (await res.text()).trim();
  } catch {
    return "Hehe, aku lagi ngelag nih 🤖⚡";
  }
}

// =============================
// 🔹 Handler utama
// =============================
export default async function handler(req, res) {
  const user = (req.query.user || "anonymous").toLowerCase();
  const command = (req.query.command || "").toLowerCase();
  const message = (req.query.q || "").trim();

  // ----------------------------
  // RESET ABSEN
  // ----------------------------
  if (command.includes("resetabsen")) {
    await supabase.from("absen").delete().neq("id", 0);
    return res.send("✅ Daftar absen sudah direset yang mulia.");
  }

  // ----------------------------
  // CEK ABSEN
  // ----------------------------
  if (command.includes("cekabsen")) {
    const { data, error } = await supabase
      .from("absen")
      .select("username, nomor")
      .order("nomor", { ascending: true });

    if (error) return res.send("⚠️ Gagal cek absen.");
    if (!data || data.length === 0) return res.send("Belum ada yang absen.");

    const total = data.length;
    const daftar = data
      .map((row) => `${row.nomor}.${row.username}`)
      .slice(0, 10)
      .join(", ");

    return res.send(
      `Total ${total} absen. Hadir: ${daftar}${total > 10 ? ", ..." : ""}`
    );
  }

  // ----------------------------
  // ABSEN (FLEKSIBEL)
  // ----------------------------
  if (command.includes("absen")) {
    const { data: existing, error: fetchError } = await supabase
      .from("absen")
      .select("*")
      .eq("username", user)
      .limit(1);

    if (fetchError) return res.send("⚠️ Error ambil data absen.");

    let nomor;
    if (existing && existing.length > 0) {
      nomor = existing[0].nomor;
    } else {
      const { count, error: countError } = await supabase
        .from("absen")
        .select("*", { count: "exact", head: true });

      if (countError) return res.send("⚠️ Error hitung absen.");

      nomor = count + 1;
      if (nomor > 100) return res.send("❌ Kuota absen penuh (100 orang).");

      await supabase.from("absen").insert([{ username: user, nomor }]);
    }

    return res.send(`Halo ${user}, kamu absen ke-${nomor}.`);
  }

  // ----------------------------
  // CHAT
  // ----------------------------
  if (command.includes("bot")) {
    if (!message) return res.send("Mau ngomong apa cuy? 😅");

    let { data: history } = await supabase
      .from("chat_history")
      .select("role, message")
      .eq("username", user)
      .order("id", { ascending: true })
      .limit(5);

    history = history || [];

    const reply = await askXGPT(user, message, history);

    await supabase.from("chat_history").insert([
      { username: user, role: "user", message },
      { username: user, role: "bot", message: reply }
    ]);

    return res.send(reply);
  }

  // ----------------------------
  // DEFAULT
  // ----------------------------
  return res.send("Perintah tidak dikenal. Coba  ketik absen, cekabsen, atau bot.");
      }
