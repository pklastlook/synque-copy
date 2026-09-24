import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
async function main() {
  const u = await db.user.findFirst({ where: { email: "it.ashraf@outlook.com" } });
  if (!u) { console.log("NOT FOUND"); process.exit(1); }
  console.log("user:", u.email, "id:", u.id, "role:", u.role);
  console.log("pw hash len:", u.password?.length);
  for (const pw of ["admin123", "admin1234", "password", "admin", "socialflow", "Ashraf123", "ashraf"]) {
    if (u.password) {
      const ok = await bcrypt.compare(pw, u.password);
      console.log("  try", pw, "=>", ok);
    }
  }
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
