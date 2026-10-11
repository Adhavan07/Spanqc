import { randomBytes } from "node:crypto";
import { db } from "../src/lib/server/db";
import { hashPassword } from "../src/lib/server/auth/passwords";
import { revokeAllUserSessions } from "../src/lib/server/auth/session";

export interface ProvisionOptions {
  email: string;
  name?: string;
  orgName?: string;
  password?: string;
  force?: boolean;
}

export interface ProvisionResult {
  action: "created" | "updated";
  userId: string;
  email: string;
  name: string;
  role: string;
  tenantId: string;
  generatedPassword?: string;
}

/**
 * Validate RFC 5322 compatible email format and length.
 */
export function validateEmail(email: string): string {
  if (!email || typeof email !== "string") {
    throw new Error("Email address is required and must be a string.");
  }
  const normalized = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalized) || normalized.length > 254) {
    throw new Error(`Invalid email address format: "${email}". Please provide a valid work email.`);
  }
  return normalized;
}

/**
 * Validate organization name and generate a url-safe slug.
 */
export function validateOrgName(orgName: string): { name: string; slug: string } {
  if (!orgName || typeof orgName !== "string") {
    throw new Error("Organization name is required and must be a string.");
  }
  const name = orgName.trim();
  if (name.length < 2) {
    throw new Error(`Invalid organization name: "${orgName}". Must contain at least 2 characters.`);
  }
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!slug || slug.length < 2) {
    throw new Error(`Organization name "${orgName}" does not produce a valid slug identifier.`);
  }
  return { name, slug };
}

/**
 * Provision or elevate an administrator account with explicit safety guards.
 * Refuses to modify existing users unless options.force is true.
 */
export async function provisionAdmin(options: ProvisionOptions): Promise<ProvisionResult> {
  // 1. Validate email and organization
  const normalizedEmail = validateEmail(options.email);
  const orgInput = options.orgName || "Spandsons Horizon Engineering Pvt. Ltd.";
  const { name: resolvedOrgName, slug } = validateOrgName(orgInput);

  // 2. Check if user already exists
  const existingUser = await db.user.findUnique({
    where: { email: normalizedEmail },
    include: { tenant: true },
  });

  // 3. Refuse to overwrite existing user without explicit --force
  if (existingUser && !options.force) {
    throw new Error(
      `Safety Guard: User "${normalizedEmail}" already exists with role "${existingUser.role}" in organization "${existingUser.tenant.name}" (${existingUser.tenantId}). Refusing to modify without explicit --force flag.`
    );
  }

  // 4. Resolve or create tenant
  let tenant = await db.tenant.findUnique({ where: { slug } });
  if (!tenant) {
    tenant = await db.tenant.create({
      data: {
        name: resolvedOrgName,
        slug,
        status: "ACTIVE",
        plan: "ENTERPRISE",
        checkQuota: 500,
        quotaUsed: 0,
      },
    });
  }

  // 5. Handle user creation or update
  if (existingUser) {
    // Existing user override with --force
    let newPasswordHash: string | undefined = undefined;
    if (options.password && options.password.trim()) {
      newPasswordHash = await hashPassword(options.password.trim());
    }

    const updated = await db.user.update({
      where: { id: existingUser.id },
      data: {
        name: options.name?.trim() || existingUser.name,
        ...(newPasswordHash ? { passwordHash: newPasswordHash } : {}),
        role: "ADMIN",
        status: "ACTIVE",
        tenantId: tenant.id,
      },
    });

    // Invalidate active sessions to enforce fresh login under updated credentials/role
    await revokeAllUserSessions(existingUser.id);

    return {
      action: "updated",
      userId: updated.id,
      email: updated.email,
      name: updated.name,
      role: updated.role,
      tenantId: updated.tenantId,
    };
  }

  // New user provisioning
  let finalPassword = options.password?.trim();
  let generated = false;

  if (!finalPassword) {
    const raw = randomBytes(18).toString("base64").replace(/[+/=]/g, "X");
    finalPassword = `${raw}!9Aa`;
    generated = true;
  }

  const passwordHash = await hashPassword(finalPassword);
  const created = await db.user.create({
    data: {
      email: normalizedEmail,
      name: options.name?.trim() || "System Administrator",
      passwordHash,
      role: "ADMIN",
      status: "ACTIVE",
      tenantId: tenant.id,
    },
  });

  return {
    action: "created",
    userId: created.id,
    email: created.email,
    name: created.name,
    role: created.role,
    tenantId: created.tenantId,
    generatedPassword: generated ? finalPassword : undefined,
  };
}

async function main() {
  const args = process.argv.slice(2);

  const getArg = (name: string): string | undefined => {
    const prefix = `--${name}=`;
    const match = args.find((a) => a.startsWith(prefix));
    if (match) return match.slice(prefix.length).trim();
    const idx = args.indexOf(`--${name}`);
    if (idx !== -1 && idx + 1 < args.length && !args[idx + 1].startsWith("--")) {
      return args[idx + 1].trim();
    }
    return undefined;
  };

  const hasFlag = (name: string): boolean => {
    return args.some(
      (a) => a === `--${name}` || a === `-${name}` || a === `--${name}=true`
    );
  };

  const email = getArg("email");
  const name = getArg("name");
  const orgName = getArg("org");
  const password = getArg("password");
  const force = hasFlag("force");

  if (!email) {
    console.error("Usage: npx tsx scripts/provision-admin.ts --email=admin@example.com [--name='Name'] [--org='Org Name'] [--password='...'] [--force]");
    process.exit(1);
  }

  const result = await provisionAdmin({
    email,
    name,
    orgName,
    password,
    force,
  });

  if (result.action === "created") {
    console.log(`[PROVISION] Created new administrator user: ${result.email} (${result.userId}) in tenant ${result.tenantId}.`);
    if (result.generatedPassword) {
      console.log("================================================================================");
      console.log("NEW ADMINISTRATOR CREDENTIALS (STORE SECURELY):");
      console.log(`Email:    ${result.email}`);
      console.log(`Password: ${result.generatedPassword}`);
      console.log("");
      console.log("SECURITY NOTICE:");
      console.log("1. This temporary initial password is only displayed once.");
      console.log("2. Store immediately in an enterprise password manager or secure vault.");
      console.log("3. The administrator must change this password upon initial login.");
      console.log("4. Never commit or log this password in unencrypted channels.");
      console.log("================================================================================");
    } else {
      console.log(`[PROVISION] Custom password configured. (Password suppressed from logs for security).`);
    }
  } else {
    console.log(`[PROVISION OVERRIDE] Existing user updated to ADMIN with --force: ${result.email} (${result.userId}).`);
    if (password) {
      console.log(`[PROVISION] Password updated as requested. (Password suppressed from logs for security).`);
    } else {
      console.log(`[PROVISION] Existing user password preserved.`);
    }
  }
}

if (require.main === module || process.argv[1]?.endsWith("provision-admin.ts")) {
  main()
    .catch((e) => {
      console.error("[PROVISION ERROR]", e instanceof Error ? e.message : e);
      process.exit(1);
    })
    .finally(async () => {
      await db.$disconnect();
    });
}
