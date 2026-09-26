/**
 * SYNQUE — Database Bootstrap
 *
 * Creates the initial admin user on first run.
 * Usage: bun run prisma/seed.ts
 */

import { PrismaClient } from "../generated/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import bcrypt from "bcryptjs";

async function main() {
  console.log("Bootstrapping SYNQUE database...");

  const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
  const db = new PrismaClient({ adapter });

  // Check if any admin user already exists
  const existingAdmin = await db.user.findFirst({
    where: { role: "admin" },
  });

  if (existingAdmin) {
    console.log("Admin user already exists — skipping bootstrap.");
    await db.$disconnect();
    return;
  }

  // Hash a default admin password
  const hashedPassword = await bcrypt.hash("admin123", 12);

  // Create the initial admin user
  const admin = await db.user.create({
    data: {
      name: "Admin",
      email: "admin@synque.app",
      password: hashedPassword,
      role: "admin",
      title: "Administrator",
      department: "Leadership",
      color: "blue",
      permissions: JSON.stringify(["*"]),
      status: "active",
      lastActive: new Date(),
    },
  });

  console.log(`✅ Created admin user: ${admin.email}`);
  console.log("   Default password: admin123");
  console.log("   ⚠️  Change this password after first login!");
  console.log("Database bootstrap complete. All other data will be created through the UI.");
  await db.$disconnect();
}

main()
  .catch((e) => {
    console.error("Bootstrap failed:", e);
    process.exit(1);
  });
