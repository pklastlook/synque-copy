import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getDbForUser } from "@/lib/tenant-db";
import bcrypt from "bcryptjs";
import { issueSession, setAuthCookie } from "@/lib/auth-session";
import { provisionTenantDatabase } from "@/lib/tenant-provision";
import { sendVerificationEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/signup
 *
 * Trial signup flow — creates a new client (tenant) with a dedicated Neon
 * database, provisions the schema, and creates the first admin user.
 *
 * This uses the SAME provisioning flow as the Owner module's client
 * registration (POST /api/customers):
 *   1. Create a Customer record (the client/tenant registry)
 *   2. Provision a separate Neon database (createTenantDatabase + pushSchema)
 *   3. Register it in TenantDatabase (encrypted connection URL)
 *   4. Create the User in the MAIN database (for auth/login lookup) with
 *      customerId set so getDbForUser routes queries to the tenant DB.
 *   5. Create the User in the TENANT database (for foreign keys)
 *   6. Issue session + log in
 *
 * Each client gets their own isolated database. All tenant-specific data
 * (posts, accounts, media, comments, etc.) lives in the tenant DB — the
 * main DB only stores the Customer registry, TenantDatabase connection
 * strings, and User auth records.
 *
 * Body: { name, email, password, company }
 */
export async function POST(req: NextRequest) {
  try {
    const { name, email, password, company } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Name, email, and password are required" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if user already exists in the main DB
    const existing = await db.user.findUnique({ where: { email: normalizedEmail } }).catch((e) => console.error("[api]", e));
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 12);

    // === 1. Create a Customer (the tenant/client registry) ===
    const customer = await db.customer.create({
      data: {
        name,
        email: normalizedEmail,
        company: company || name,
        status: "trial",
        plan: "starter",
      },
    });

    // === 1b. Auto-generate the trial Subscription + draft Invoice ===
    // Trial signup creates a Starter plan ($299/mo) subscription on a 15-day
    // trial. A draft invoice is created so the owner can send it the moment
    // the trial ends. Both records are best-effort: a failure here MUST NOT
    // block the signup (the user is already created in step 3+).
    const TRIAL_DAYS = 15;
    const STARTER_PRICE = 299;
    const now = new Date();
    const trialEnds = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);

    try {
      // Subscription (status=trial, plan=starter, amount=299 USD/mo). The
      // discount + tax fields are left null/0 (no discount applied to trials;
      // owner can edit later from the Subscriptions tab).
      await db.subscription.create({
        data: {
          customerId: customer.id,
          plan: "starter",
          status: "trial",
          amount: STARTER_PRICE,
          currency: "USD",
          startDate: now,
          trialEnds,
          billingCycle: "monthly",
          discountType: null,
          discountValue: null,
          discountAmount: 0,
          taxRate: null,
          taxAmount: 0,
          totalAmount: STARTER_PRICE,
          // endDate is left null until the trial converts to active.
        },
      });
    } catch (e) {
      console.error("[auth/signup] Subscription creation failed (non-fatal):", e instanceof Error ? e.message : String(e));
    }

    try {
      // Draft invoice with full payment breakdown:
      // - Line item: Starter Plan — Monthly ($299)
      // - Discount: none (0)
      // - Tax: none (0%) — owner can add tax rate from Subscriptions tab
      // - Subtotal: $299
      // - Discount amount: $0
      // - Taxable base: $299
      // - Tax amount: $0
      // - Total receivable: $299
      const itemCount = await db.invoice.count();
      const invoiceNumber = `INV-${String(itemCount + 1).padStart(4, "0")}`;
      const lineItems = [
        {
          description: "Starter Plan — Monthly Subscription",
          qty: 1,
          price: STARTER_PRICE,
          amount: STARTER_PRICE,
        },
      ];
      const subtotal = STARTER_PRICE;
      const discountAmount = 0;
      const taxableBase = subtotal - discountAmount;
      const taxRate = 0;
      const taxAmount = 0;
      const total = taxableBase + taxAmount;

      await db.invoice.create({
        data: {
          number: invoiceNumber,
          customerId: customer.id,
          status: "draft",
          issueDate: now,
          dueDate: trialEnds,
          subtotal,
          discountType: null,
          discountValue: null,
          discountAmount,
          taxRate,
          taxAmount,
          total,
          items: JSON.stringify(lineItems),
          notes: `Trial subscription invoice — due ${trialEnds.toLocaleDateString()}. Payment required when trial ends.`,
        },
      });
    } catch (e) {
      console.error("[auth/signup] Invoice creation failed (non-fatal):", e instanceof Error ? e.message : String(e));
    }

    // === 2. Provision a dedicated Neon database for this client ===
    // Same flow as the Owner module's POST /api/customers with createDatabase: true
    let tenantDbCreated = false;
    let tenantDbError: string | undefined;
    try {
      const rawName = (company || name).replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
      const { dbName, encryptedDbUrl } = await provisionTenantDatabase(rawName);

      await db.tenantDatabase.create({
        data: {
          customerId: customer.id,
          dbName,
          dbUrl: encryptedDbUrl,
          status: "active",
        },
      });
      tenantDbCreated = true;
    } catch (e) {
      console.error("[auth/signup] Tenant DB provisioning failed:", e instanceof Error ? e.message : String(e));
      tenantDbError = e instanceof Error ? e.message : "Database creation failed";
      // Don't fail signup — the user can still use the main DB as a fallback.
      // The owner can manually provision a DB later.
    }

    // === 3. Create the User in the MAIN database (for auth/login lookup) ===
    // This user has customerId set so getDbForUser routes queries to the tenant DB.
    const user = await db.user.create({
      data: {
        name,
        email: normalizedEmail,
        password: hashedPassword,
        role: "admin", // First user in a new tenant is the admin
        title: "Administrator",
        department: company || null,
        color: "blue",
        permissions: JSON.stringify(["*"]),
        status: "active",
        customerId: customer.id, // Link to the tenant
        lastActive: new Date(),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        title: true,
        avatar: true,
        bio: true,
        timezone: true,
        language: true,
        department: true,
        customerId: true,
        emailVerified: true,
        twoFactorEnabled: true,
        permissions: true,
      },
    });

    // === 4. Create the User in the TENANT database (for foreign keys) ===
    // The tenant DB needs its own User table so Post.authorId, Account.ownerId,
    // MediaAsset.uploadedById, etc. resolve correctly within the tenant.
    if (tenantDbCreated) {
      try {
        const { db: tenantDb } = await getDbForUser({ role: "admin", customerId: customer.id });
        await tenantDb.user.create({
          data: {
            id: user.id, // Same ID as the main DB for consistency
            name,
            email: normalizedEmail,
            password: hashedPassword,
            role: "admin",
            title: "Administrator",
            department: company || null,
            color: "blue",
            permissions: JSON.stringify(["*"]),
            status: "active",
            customerId: customer.id,
            lastActive: new Date(),
          },
        }).catch((e) => {
          // Non-fatal — the tenant DB User table may not exist yet if schema
          // push failed. The main DB user is the source of truth for auth.
          console.error("[auth/signup] Tenant DB user creation failed (non-fatal):", e instanceof Error ? e.message : String(e));
        });
      } catch (e) {
        console.error("[auth/signup] Tenant DB user creation failed:", e instanceof Error ? e.message : String(e));
      }
    }

    // === 5. Issue the session (JWT + Session row + cookie) ===
    const { token, userPublic } = await issueSession({ user, req });

    // Auto-send a verification email — best-effort
    let verifySent = false;
    let verifyUrl: string | undefined;
    try {
      const result = await sendVerificationEmail({
        req,
        email: user.email,
        name: user.name,
      });
      verifySent = result.sent;
      verifyUrl = result.verifyUrl;
    } catch (e) {
      console.error("[auth/signup] sendVerificationEmail failed:", e instanceof Error ? e.message : String(e));
    }

    const response = NextResponse.json({
      token,
      user: userPublic,
      emailVerificationSent: verifySent,
      verifyUrl: verifySent ? undefined : verifyUrl,
      tenantDatabaseCreated: tenantDbCreated,
      tenantDbError,
      customerId: customer.id,
    });
    setAuthCookie(response, token);
    return response;
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
  }
}
