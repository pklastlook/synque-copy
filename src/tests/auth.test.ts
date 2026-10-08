/// <reference types="bun-types" />
/**
 * Integration tests — authentication (login + protected-route guard).
 *
 * Run with: `bun test src/tests/auth.test.ts`
 *
 * Pre-requisites:
 *   - The Next.js dev server is running on http://localhost:3000
 *   - A test user exists (TEST_USER_EMAIL + TEST_USER_PASSWORD)
 *   - The test user has emailVerified=null OR a real verified email
 *     (the 2FA path is NOT exercised here — set TEST_USER_2FA=1 to skip
 *     the password-login test when 2FA is on for the test account)
 */

import { describe, test, expect } from "bun:test";

const API_BASE = process.env.API_BASE_URL ?? "http://localhost:3000";
const TEST_EMAIL = process.env.TEST_USER_EMAIL ?? "";
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD ?? "";

async function postJson(url: string, body: unknown, headers: Record<string, string> = {}) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    /* non-JSON */
  }
  return { status: res.status, json };
}

async function getJson(url: string, headers: Record<string, string> = {}) {
  const res = await fetch(url, { headers });
  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    /* non-JSON */
  }
  return { status: res.status, json };
}

describe("POST /api/auth/login", () => {
  test("login with correct credentials returns token", async () => {
    if (!TEST_EMAIL || !TEST_PASSWORD) {
      console.log("[auth.test] skipping — set TEST_USER_EMAIL + TEST_USER_PASSWORD to run");
      return;
    }

    const { status, json } = await postJson(`${API_BASE}/api/auth/login`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });

    if (status === 200) {
      const r = json as { token?: string; user?: { id?: string; email?: string } };
      expect(r.token).toBeTruthy();
      expect(r.user?.id).toBeTruthy();
      expect(r.user?.email).toBe(TEST_EMAIL);
    } else if (status === 200 && (json as { requires2FA?: boolean }).requires2FA) {
      // 2FA is on for the test account — the login flow returned a
      // temp token instead of a full session. That's still a success
      // from the API's perspective; the test just verifies the shape.
      const r = json as { requires2FA?: boolean; tempToken?: string; email?: string };
      expect(r.requires2FA).toBe(true);
      expect(r.tempToken).toBeTruthy();
      expect(r.email).toBe(TEST_EMAIL);
    } else {
      // Login failed — surface the response for debugging.
      console.error("[auth.test] login failed:", status, json);
      throw new Error(`Login failed with status ${status}`);
    }
  });

  test("login with wrong password returns 401", async () => {
    if (!TEST_EMAIL) {
      console.log("[auth.test] skipping — set TEST_USER_EMAIL to run");
      return;
    }

    const { status, json } = await postJson(`${API_BASE}/api/auth/login`, {
      email: TEST_EMAIL,
      password: "definitely-the-wrong-password-xyz",
    });

    expect(status).toBe(401);
    const r = json as { error?: string };
    expect(r.error).toBeTruthy();
    // Don't leak whether the email exists — generic "Invalid email or password".
    expect(r.error).toMatch(/invalid email or password/i);
  });
});

describe("Protected route auth guard", () => {
  test("protected route without token returns 401", async () => {
    // /api/team is a tenant-scoped protected route that requires auth.
    // Hitting it WITHOUT a Bearer token (or cookie) must return 401.
    const { status, json } = await getJson(`${API_BASE}/api/team`);

    expect(status).toBe(401);
    const r = json as { error?: string };
    expect(r.error).toMatch(/auth/i);
  });

  test("protected route with malformed token returns 401", async () => {
    const { status } = await getJson(`${API_BASE}/api/team`, {
      Authorization: "Bearer not-a-real-jwt",
    });
    expect(status).toBe(401);
  });
});
