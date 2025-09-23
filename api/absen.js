import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export default async function handler(req, res) {
  const user = (req.query.user || "anonymous").toLowerCase();
  const command = (req.query.command || "").toLowerCase();

  // 🔹 RESET ABSEN
  if (command === "reset") {
    const { error } = await supabase.from("absen").delete().neq("id", 0);
    if (error) return res.send("⚠️ Gagal reset absen.");
    return res.send("✅ Daftar absen sudah direset untuk live baru.");
  }

  // 🔹 CEK ABSEN
  if (command === "cek") {
    const { data, error } = await supabase
      .from("absen")
      .select("username, nomor")
      .order("nomor", { ascending: true });

    if (error) return res.send("⚠️ Gagal cek absen.");

    if (!data || data.length === 0) {
      return res.send("Belum ada yang absen.");
    }

    const total = data.length;
    // batasi agar pesan tidak kepanjangan (YouTube live chat max 200 karakter)
    const daftar = data
      .map((row) => `${row.nomor}.${row.username}`)
      .slice(0, 10) // tampilkan 10 pertama
      .join(", ");

    return res.send(`Total ${total} peserta. Hadir: ${daftar}${total > 10 ? ", ..." : ""}`);
  }

  // 🔹 ABSEN BIASA
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

    if (nomor > 100) {
      return res.send("❌ Kuota absen penuh (100 orang).");
    }

    await supabase.from("absen").insert([{ username: user, nomor }]);
  }

  return res.send(`Halo ${user}, nomor absen kamu ${nomor}.`);
}
