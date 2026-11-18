import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

// 1. Enforce test environment
(process.env as Record<string, string | undefined>).NODE_ENV = "test";

// 2. Enforce dedicated test database URL
if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes("dev.db") || process.env.DATABASE_URL.startsWith("file:")) {
  if (process.env.TEST_DATABASE_URL) {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  } else if (process.env.CI) {
    process.env.DATABASE_URL = "postgresql://postgres:postgrespassword@localhost:5432/spanqc_test";
  } else {
    process.env.DATABASE_URL = "postgresql://postgres:postgrespassword@localhost:5432/spanqc_test";
  }
}

// 3. Fallback secret for test run if not configured
process.env.AUTH_SECRET =
  process.env.AUTH_SECRET || "spanqc_test_secret_0123456789abcdef0123456789abcdef";

// 4. Ensure test database schema is in sync
if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith("postgres")) {
  try {
    execSync("npx prisma db push --skip-generate --accept-data-loss", {
      stdio: "ignore",
      env: { ...process.env },
    });
  } catch (err) {
    console.warn("Prisma db push in test setup:", err);
  }
}
