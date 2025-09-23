import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export default async function handler(req, res) {
  const user = (req.query.user || "anonymous").toLowerCase();

  // cek apakah user sudah tercatat
  const { data: existing, error: fetchError } = await supabase
    .from("absen")
    .select("*")
    .eq("username", user)
    .limit(1);

  if (fetchError) return res.send("⚠️ Error ambil data absen.");

  let nomor;
  if (existing && existing.length > 0) {
    // sudah ada → ambil nomor lama
    nomor = existing[0].nomor;
  } else {
    // belum ada → kasih nomor baru
    const { count, error: countError } = await supabase
      .from("absen")
      .select("*", { count: "exact", head: true });

    if (countError) return res.send("⚠️ Error hitung absen.");

    nomor = count + 1;

    if (nomor > 100) {
      return res.send("❌ Maaf, kuota absen sudah penuh (100 orang).");
    }

    await supabase.from("absen").insert([{ username: user, nomor }]);
  }

  return res.send(`Halo ${user}, kamu tercatat hadir dengan nomor absen ${nomor}.`);
}
