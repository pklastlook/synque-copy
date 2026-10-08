/// <reference types="bun-types" />
/**
 * Integration tests — publish flow.
 *
 * Run with: `bun test src/tests/publish.test.ts`
 *
 * Pre-requisites:
 *   - The Next.js dev server is running on http://localhost:3000
 *   - A test user exists with a connected Twitter account in the DB
 *   - The user has PlatformCredential rows for `twitter` with valid
 *     oauth2UserToken / apiKey / apiSecret / accessToken / accessSecret
 *   - For the rate-limit test: the account's AccountProtection row must
 *     be configured with a dailyPostLimit=1 (or the test must publish
 *     enough posts to exceed the configured limit).
 *
 * NOTE: these tests are intentionally end-to-end against the live server.
 * They DO make real platform API calls when credentials are configured —
 * the "valid token returns 200" assertion is skipped if the test env
 * does not have real Twitter credentials set up. See the `RUN_PUBLISH`
 * env var below to opt out of the live-call tests in CI.
 */

import { describe, test, expect } from "bun:test";

const API_BASE = process.env.API_BASE_URL ?? "http://localhost:3000";
// Set RUN_PUBLISH=0 in CI to skip the live-API-publish test (it makes a
// real Twitter call which requires real credentials).
const RUN_LIVE_PUBLISH = process.env.RUN_PUBLISH !== "0";

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

describe("POST /api/publish/:platform", () => {
  // The test environment must supply a valid JWT + accountId via env vars.
  // See .env.example for the expected variables.
  const TEST_TOKEN = process.env.TEST_AUTH_TOKEN ?? "";
  const TEST_USER_ID = process.env.TEST_USER_ID ?? "";
  const TWITTER_ACCOUNT_ID = process.env.TEST_TWITTER_ACCOUNT_ID ?? "";
  const RATE_LIMITED_ACCOUNT_ID = process.env.TEST_RATE_LIMITED_ACCOUNT_ID ?? "";

  test("publish to Twitter with valid token returns 200", async () => {
    if (!RUN_LIVE_PUBLISH) {
      console.log("[publish.test] skipping live-API test (RUN_PUBLISH=0)");
      return;
    }
    if (!TEST_TOKEN || !TWITTER_ACCOUNT_ID || !TEST_USER_ID) {
      console.log(
        "[publish.test] skipping live-API test — set TEST_AUTH_TOKEN, TEST_USER_ID, TEST_TWITTER_ACCOUNT_ID to run it",
      );
      return;
    }

    const { status, json } = await postJson(
      `${API_BASE}/api/publish/twitter`,
      {
        userId: TEST_USER_ID,
        accountId: TWITTER_ACCOUNT_ID,
        content: `Integration test post — ${new Date().toISOString()}`,
      },
      { Authorization: `Bearer ${TEST_TOKEN}` },
    );

    // The platform API may legitimately return 429 if Twitter rate-limits
    // us; we only assert that we got past our own auth (i.e. NOT 401/403).
    expect([200, 429]).toContain(status);
    expect(json).toBeTruthy();
  });

  test("publish without credentials returns 400", async () => {
    if (!TEST_TOKEN || !TEST_USER_ID) {
      console.log("[publish.test] skipping — set TEST_AUTH_TOKEN + TEST_USER_ID to run");
      return;
    }

    // Use a random cuid-shaped account id that we know has no
    // PlatformCredential row. The publish route returns 400 with the
    // "credentials not configured" message.
    const { status, json } = await postJson(
      `${API_BASE}/api/publish/twitter`,
      {
        userId: TEST_USER_ID,
        accountId: "nonexistent-account-id-12345",
        content: "should not publish",
      },
      { Authorization: `Bearer ${TEST_TOKEN}` },
    );

    expect(status).toBe(400);
    const body = json as { error?: string };
    expect(body.error).toBeTruthy();
    expect(body.error).toMatch(/credentials|configured/i);
  });

  test("publish with rate-limited account returns 429", async () => {
    if (!TEST_TOKEN || !RATE_LIMITED_ACCOUNT_ID || !TEST_USER_ID) {
      console.log(
        "[publish.test] skipping rate-limit test — set TEST_RATE_LIMITED_ACCOUNT_ID (+ ensure the account's AccountProtection is configured with a low dailyPostLimit)",
      );
      return;
    }

    // Publish once to fill the daily quota (assumes dailyPostLimit=1).
    const firstContent = `Rate-limit warmup — ${Date.now()}`;
    const first = await postJson(
      `${API_BASE}/api/publish/twitter`,
      {
        userId: TEST_USER_ID,
        accountId: RATE_LIMITED_ACCOUNT_ID,
        content: firstContent,
      },
      { Authorization: `Bearer ${TEST_TOKEN}` },
    );
    if (first.status !== 200) {
      console.log(
        `[publish.test] rate-limit warmup call returned ${first.status} — account may already be at quota, proceeding to the assertion call`,
      );
    }

    // Second publish in the same day should be rejected by the
    // AccountProtection guard before the platform API is ever hit.
    const { status, json } = await postJson(
      `${API_BASE}/api/publish/twitter`,
      {
        userId: TEST_USER_ID,
        accountId: RATE_LIMITED_ACCOUNT_ID,
        content: `Second post — should be blocked ${Date.now()}`,
      },
      { Authorization: `Bearer ${TEST_TOKEN}` },
    );

    expect(status).toBe(429);
    const body = json as { error?: string };
    expect(body.error).toMatch(/limit/i);
  });
});
