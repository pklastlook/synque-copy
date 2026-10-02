/**
 * SYNQUE — Push .env variables to Railway mini-services via GraphQL API
 *
 * Usage:
 *   RAILWAY_TOKEN=your_token bun run scripts/push-env-to-railway.ts
 *
 * Get your token at: https://railway.app/account/tokens
 *
 * This script:
 * 1. Lists all Railway projects to find the 3 mini-services
 * 2. Pushes the correct env vars to each service
 */

const RAILWAY_TOKEN = process.env.RAILWAY_TOKEN;
if (!RAILWAY_TOKEN) {
  console.error("❌ RAILWAY_TOKEN is required. Get yours at: https://railway.app/account/tokens");
  process.exit(1);
}

const API_URL = "https://backboard.railway.app/graphql";

// Environment variables for each service
const SERVICE_VARS: Record<string, Record<string, string>> = {
  // WhatsApp Service — only needs PORT (Railway sets it automatically,
  // but we push it anyway for consistency)
  whatsapp: {
    PORT: "3002",
  },
  // Scheduler Service — needs DB access + app URL + API key
  scheduler: {
    PORT: "3003",
    DATABASE_URL: "postgresql://neondb_owner:REDACTED_DB_PASSWORD@ep-spring-darkness-auk3ozf9-pooler.c-10.us-east-1.aws.neon.tech/neondb?sslmode=require",
    DIRECT_URL: "postgresql://neondb_owner:REDACTED_DB_PASSWORD@ep-spring-darkness-auk3ozf9.c-10.us-east-1.aws.neon.tech/neondb?sslmode=require",
    APP_URL: "https://synque.vercel.app",
    SCHEDULER_API_KEY: "REDACTED_SCHEDULER_KEY",
  },
  // AI Service — needs ZAI SDK credentials
  ai: {
    PORT: "3004",
    ZAI_API_KEY: "Z.ai",
    ZAI_BASE_URL: "https://internal-api.z.ai/v1",
    ZAI_CHAT_ID: "chat-b8e092a6-6649-4a04-b709-d6b3d6038f56",
    ZAI_TOKEN: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiMjhmZWU5OTEtNjczYy00NDc2LWI0ZTYtZDljYWFhZGY5ZWQ1IiwiY2hhdF9pZCI6ImNoYXQtYjhlMDkyYTYtNjY0OS00YTA0LWI3MDktZDZiM2Q2MDM4ZjU2IiwicGxhdGZvcm0iOiJ6YWkifQ.rVhhVlYSk8zQsc2RF56Qri9vv8wtKsJd2UWyLJ1XBqE",
    ZAI_USER_ID: "28fee991-673c-4476-b4e6-d9caaadf9ed5",
  },
};

async function gql(query: string, variables?: Record<string, unknown>) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RAILWAY_TOKEN}`,
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) {
    throw new Error(`Railway API error: ${res.status} ${await res.text()}`);
  }
  const json = await res.json();
  if (json.errors) {
    throw new Error(`GraphQL error: ${JSON.stringify(json.errors)}`);
  }
  return json.data;
}

async function main() {
  console.log("🚂 SYNQUE — Push env vars to Railway mini-services");
  console.log("================================================\n");

  // Step 1: List all projects
  console.log("📋 Fetching Railway projects...");
  const data = await gql(`
    query {
      projects {
        edges {
          node {
            id
            name
            services {
              edges {
                node {
                  id
                  name
                }
              }
            }
          }
        }
      }
    }
  `);

  const projects = data.projects.edges.map((e: any) => e.node);
  console.log(`   Found ${projects.length} projects\n`);

  // Step 2: For each project, find services and match by name
  for (const project of projects) {
    const services = project.services.edges.map((e: any) => e.node);
    for (const service of services) {
      const svcName = service.name.toLowerCase();
      const matchKey = Object.keys(SERVICE_VARS).find((key) =>
        svcName.includes(key)
      );

      if (matchKey) {
        console.log(`📦 ${service.name} (project: ${project.name})`);
        console.log(`   Service ID: ${service.id}`);
        console.log(`   Matched: ${matchKey} service`);

        const vars = SERVICE_VARS[matchKey];
        for (const [key, value] of Object.entries(vars)) {
          try {
            await gql(
              `
              mutation VariableUpsert($input: VariableUpsertInput!) {
                variableUpsert(input: $input)
              }
            `,
              {
                input: {
                  serviceId: service.id,
                  environmentId: project.id, // uses project's production environment
                  name: key,
                  value,
                },
              }
            );
            console.log(`   ✅ ${key}`);
          } catch (err) {
            console.log(`   ❌ ${key}: ${err instanceof Error ? err.message : String(err)}`);
          }
        }
        console.log("");
      }
    }
  }

  console.log("================================================");
  console.log("✅ Done! All Railway mini-service env vars pushed.");
  console.log("\nNext steps:");
  console.log("  1. Verify in Railway dashboard: each service → Variables tab");
  console.log("  2. Redeploy each service for the variables to take effect.");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
