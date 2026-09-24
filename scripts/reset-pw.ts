import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
async function main() {
  const pw = await bcrypt.hash("admin123", 12);
  const u = await db.user.update({
    where: { email: "it.ashraf@outlook.com" },
    data: { password: pw },
  });
  console.log("✓ password reset for", u.email);
  const ok = await bcrypt.compare("admin123", u.password!);
  console.log("verify:", ok);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
