/**
 * One-time migration: move the OAuth 2.0 user token from `accessToken`
 * (where the OLD callback code stored it) into the NEW `oauth2UserToken`
 * column so the publish route's PRIORITY 1 path can find it.
 *
 * Only migrates rows where:
 *  - platform = 'twitter'
 *  - oauth2UserToken is NULL (not already migrated)
 *  - clientId + clientSecret are SET (OAuth 2.0 app was configured)
 *  - accessToken is long enough to plausibly be an OAuth 2.0 token (>60 chars;
 *    OAuth 1.0a access tokens are ~50 chars)
 */
import { db } from "@/lib/db";

async function main() {
  const rows = await db.platformCredential.findMany({
    where: { platform: "twitter", oauth2UserToken: null },
  });
  console.log(`Found ${rows.length} Twitter PlatformCredential row(s) with null oauth2UserToken.`);

  let migrated = 0;
  for (const r of rows) {
    const looksLikeOAuth2 =
      !!r.accessToken &&
      r.accessToken.length > 60 &&
      !!r.clientId &&
      !!r.clientSecret;

    if (!looksLikeOAuth2) {
      console.log(`  → skipping ${r.userId}: accessToken not a plausible OAuth 2.0 token (len=${r.accessToken?.length ?? 0})`);
      continue;
    }

    await db.platformCredential.update({
      where: { userId_platform: { userId: r.userId, platform: "twitter" } },
      data: { oauth2UserToken: r.accessToken },
    });
    console.log(`  ✓ migrated userId=${r.userId}: accessToken (len=${r.accessToken!.length}) → oauth2UserToken`);
    migrated++;
  }
  console.log(`Done. Migrated ${migrated} row(s).`);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
