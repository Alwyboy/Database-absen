import { createClient } from "@supabase/supabase-js";
import fetch from "node-fetch";

// Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// =============================
// 🔹 Fungsi ambil motivasi dari xGPT
// =============================
async function getMotivasi(user, nomor) {
  try {
    const seed = `${user}-${nomor}-${Date.now()}`;
    const res = await fetch(
      `https://xgpt.gerhard.dev/api/command?q=random%20motivasi%20singkat%20bahasa%20Indonesia%20(max%2020%20kata)%20seed:${encodeURIComponent(seed)}`
    );
    return (await res.text()).trim();
  } catch {
    return "Tetap semangat ya 💪"; // fallback
  }
}

// =============================
// 🔹 Fungsi ngobrol dengan xGPT
// =============================
async function askXGPT(user, message, history) {
  const prompt = `
Kamu adalah AI seperti manusia bernama "Nightbot".
Gaya bicara: ramah, pintar, sedikit humoris, dan jangan kaku, boleh pakai emoji.
Jawaban harus super singkat (maks 2 kalimat), cocok untuk live chat YouTube.

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
  if (command === "resetabsen") {
    await supabase.from("absen").delete().neq("id", 0);
    return res.send("✅ Daftar absen direset untuk live baru.");
  }

  // ----------------------------
  // CEK ABSEN
  // ----------------------------
  if (command === "cekabsen") {
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
      `Total ${total} peserta. Hadir: ${daftar}${total > 10 ? ", ..." : ""}`
    );
  }

  // ----------------------------
  // ABSEN
  // ----------------------------
  if (command === "absen") {
    const { data: existing } = await supabase
      .from("absen")
      .select("*")
      .eq("username", user)
      .limit(1);

    let nomor;
    if (existing && existing.length > 0) {
      nomor = existing[0].nomor;
    } else {
      const { count } = await supabase
        .from("absen")
        .select("*", { count: "exact", head: true });

      nomor = count + 1;
      if (nomor > 100) return res.send("❌ Kuota absen penuh (100 orang).");

      await supabase.from("absen").insert([{ username: user, nomor }]);
    }

    const motivasi = await getMotivasi(user, nomor);
    return res.send(`Halo ${user}, kamu absen ke- ${nomor}. ${motivasi}`);
  }

  // ----------------------------
  // CHAT
  // ----------------------------
  if (command === "nightbot") {
    if (!message) return res.send("kenapa sayang? 😅");

    // Ambil history user
    let { data: history } = await supabase
      .from("chat_history")
      .select("role, message")
      .eq("username", user)
      .order("id", { ascending: true })
      .limit(5);

    history = history || [];

    // Tanya xGPT
    const reply = await askXGPT(user, message, history);

    // Simpan history baru
    await supabase.from("chat_history").insert([
      { username: user, role: "user", message },
      { username: user, role: "bot", message: reply }
    ]);

    return res.send(reply);
  }

  // ----------------------------
  // DEFAULT
  // ----------------------------
  return res.send("Perintah tidak dikenal. Coba ketik absen, cekabsen, atau nightbot.");
}
