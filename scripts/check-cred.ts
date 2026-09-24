import { db } from "@/lib/db";

async function main() {
  const creds = await db.platformCredential.findMany({
    where: { platform: "twitter" },
    select: {
      userId: true,
      clientId: true,
      clientSecret: true,
      apiKey: true,
      apiSecret: true,
      accessToken: true,
      accessSecret: true,
      oauth2UserToken: true,
      bearerToken: true,
      connected: true,
      updatedAt: true,
    },
  });
  for (const c of creds) {
    console.log("--- Twitter PlatformCredential ---");
    console.log("userId:", c.userId);
    console.log("connected:", c.connected);
    console.log("clientId:", c.clientId ? c.clientId.slice(0, 15) + "… (len=" + c.clientId.length + ")" : "NULL");
    console.log("clientSecret:", c.clientSecret ? "SET (len=" + c.clientSecret.length + ")" : "NULL");
    console.log("apiKey (OAuth 1.0a Consumer Key):", c.apiKey ? c.apiKey.slice(0, 15) + "…" : "NULL");
    console.log("apiSecret (OAuth 1.0a Consumer Secret):", c.apiSecret ? "SET" : "NULL");
    console.log("accessToken:", c.accessToken ? c.accessToken.slice(0, 20) + "… (len=" + c.accessToken.length + ")" : "NULL");
    console.log("accessSecret:", c.accessSecret ? c.accessSecret.slice(0, 10) + "… (len=" + c.accessSecret.length + ")" : "NULL");
    console.log("oauth2UserToken:", c.oauth2UserToken ? c.oauth2UserToken.slice(0, 20) + "… (len=" + c.oauth2UserToken.length + ")" : "NULL");
    console.log("bearerToken:", c.bearerToken ? "SET" : "NULL");
    console.log("updatedAt:", c.updatedAt.toISOString());
  }
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
