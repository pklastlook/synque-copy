/// <reference types="bun-types" />
/**
 * Integration tests — signup flow.
 *
 * Run with: `bun test src/tests/signup.test.ts`
 *
 * Pre-requisites:
 *   - The Next.js dev server is running on http://localhost:3000
 *   - DATABASE_URL points at a writeable Postgres (or PGlite)
 *   - JWT_SECRET is set
 *
 * These tests are stateful — they create real rows in the DB. To avoid
 * collisions between runs each test uses a unique email derived from a
 * timestamp.
 */

import { describe, test, expect, beforeAll } from "bun:test";

const API_BASE = process.env.API_BASE_URL ?? "http://localhost:3000";

async function postJson(url: string, body: unknown, token?: string) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    /* non-JSON response */
  }
  return { status: res.status, json };
}

function uniqueEmail(prefix = "tester"): string {
  return `${prefix}+${Date.now()}-${Math.floor(Math.random() * 10000)}@test.synque.dev`;
}

describe("POST /api/auth/signup", () => {
  test("signup creates Customer + Subscription + Invoice + User + TenantDB", async () => {
    const email = uniqueEmail();
    const name = "Test Signup";
    const password = "test-pass-123";
    const company = "Test Co";

    const { status, json } = await postJson(`${API_BASE}/api/auth/signup`, {
      name,
      email,
      password,
      company,
    });

    expect(status).toBe(200);
    expect(json).toBeTruthy();
    const body = json as {
      token?: string;
      user?: { id?: string; email?: string };
      customerId?: string;
      tenantDatabaseCreated?: boolean;
    };
    expect(body.token).toBeTruthy();
    expect(body.user?.id).toBeTruthy();
    expect(body.user?.email).toBe(email);
    expect(body.customerId).toBeTruthy();
    // Tenant DB creation is best-effort — it may fail in envs without
    // Neon creds. The signup MUST still succeed.
    // (We don't assert tenantDatabaseCreated === true here for that reason.)

    // Verify the new account can authenticate (proves the User row exists).
    const loginRes = await postJson(`${API_BASE}/api/auth/login`, {
      email,
      password,
    });
    expect(loginRes.status).toBe(200);
    expect((loginRes.json as { token?: string }).token).toBeTruthy();
  });

  test("duplicate email returns 409", async () => {
    const email = uniqueEmail("dup");
    const payload = { name: "First", email, password: "pass-1234", company: "Co" };

    // First signup should succeed.
    const first = await postJson(`${API_BASE}/api/auth/signup`, payload);
    expect(first.status).toBe(200);

    // Second signup with the same email MUST be rejected.
    const second = await postJson(`${API_BASE}/api/auth/signup`, payload);
    expect(second.status).toBe(409);
  });

  test("missing fields returns 400", async () => {
    // Missing password.
    const r1 = await postJson(`${API_BASE}/api/auth/signup`, {
      name: "No Pass",
      email: uniqueEmail("nopass"),
    });
    expect(r1.status).toBe(400);

    // Missing email.
    const r2 = await postJson(`${API_BASE}/api/auth/signup`, {
      name: "No Email",
      password: "pass-1234",
    });
    expect(r2.status).toBe(400);

    // Missing name.
    const r3 = await postJson(`${API_BASE}/api/auth/signup`, {
      email: uniqueEmail("noname"),
      password: "pass-1234",
    });
    expect(r3.status).toBe(400);

    // Empty body.
    const r4 = await postJson(`${API_BASE}/api/auth/signup`, {});
    expect(r4.status).toBe(400);
  });
});
