import { db } from "../src/lib/server/db";
import { hashPassword } from "../src/lib/server/auth/passwords";

export const TEST_PASSWORDS = {
  pravin: "PravinQC@2026!",
  gogulnath: "GogulnathQC@2026!",
  inspector: "InspectorQC@2026!",
  alice: "AcmeAero@2026!",
};

export async function runSeed() {
  console.log("[SEED] Initializing multi-tenant staging seed data...");

  // 1. Spandsons Horizon Engineering Tenant
  const spandsons = await db.tenant.upsert({
    where: { slug: "spandsons-horizon" },
    update: {
      name: "Spandsons Horizon Engineering Pvt. Ltd.",
      status: "ACTIVE",
      plan: "SUBSCRIPTION",
      checkQuota: 120,
      quotaUsed: 38,
    },
    create: {
      id: "f8c5091c-50a3-4436-88bd-369c7c6b1727",
      name: "Spandsons Horizon Engineering Pvt. Ltd.",
      slug: "spandsons-horizon",
      status: "ACTIVE",
      plan: "SUBSCRIPTION",
      checkQuota: 120,
      quotaUsed: 38,
    },
  });

  // Users in Spandsons
  const pravinHash = await hashPassword(TEST_PASSWORDS.pravin);
  const pravin = await db.user.upsert({
    where: { email: "pravin@spandsons.com" },
    update: {
      name: "Pravin",
      role: "ADMIN",
      status: "ACTIVE",
      passwordHash: pravinHash,
      tenantId: spandsons.id,
    },
    create: {
      id: "bc4a8b56-47da-4de2-b4ab-da448f4163dc",
      email: "pravin@spandsons.com",
      name: "Pravin",
      role: "ADMIN",
      status: "ACTIVE",
      passwordHash: pravinHash,
      tenantId: spandsons.id,
    },
  });

  const gogulHash = await hashPassword(TEST_PASSWORDS.gogulnath);
  await db.user.upsert({
    where: { email: "gogulnath@spandsons.com" },
    update: {
      name: "Gogulnath",
      role: "ENGINEER",
      status: "ACTIVE",
      passwordHash: gogulHash,
      tenantId: spandsons.id,
    },
    create: {
      id: "b82954d0-7a22-4af1-a030-74ad5c0a6f00",
      email: "gogulnath@spandsons.com",
      name: "Gogulnath",
      role: "ENGINEER",
      status: "ACTIVE",
      passwordHash: gogulHash,
      tenantId: spandsons.id,
    },
  });

  const inspectorHash = await hashPassword(TEST_PASSWORDS.inspector);
  await db.user.upsert({
    where: { email: "inspector@spandsons.com" },
    update: {
      name: "Lead QC Inspector",
      role: "REVIEWER",
      status: "ACTIVE",
      passwordHash: inspectorHash,
      tenantId: spandsons.id,
    },
    create: {
      id: "f33cd61a-e604-41a2-8756-241777740b9d",
      email: "inspector@spandsons.com",
      name: "Lead QC Inspector",
      role: "REVIEWER",
      status: "ACTIVE",
      passwordHash: inspectorHash,
      tenantId: spandsons.id,
    },
  });

  // Projects in Spandsons
  await db.project.upsert({
    where: { id: "proj-777x" },
    update: { tenantId: spandsons.id },
    create: {
      id: "proj-777x",
      tenantId: spandsons.id,
      name: "Commercial Avionics Harness WD-777",
      description: "Boeing 777X wing and avionics bay harness assembly validation against IPC/WHMA-A-620D Class 3.",
      customer: "Boeing Defense & Space",
      standard: "IPC/WHMA-A-620D",
      status: "ACTIVE",
    },
  });

  await db.project.upsert({
    where: { id: "proj-mcc" },
    update: { tenantId: spandsons.id },
    create: {
      id: "proj-mcc",
      tenantId: spandsons.id,
      name: "Industrial VFD Motor Control Cabinet",
      description: "480VAC 3-Phase automated manufacturing conveyor control panel inspection per UL 508A.",
      customer: "Siemens Energy Automation",
      standard: "UL 508A",
      status: "ACTIVE",
    },
  });

  await db.project.upsert({
    where: { id: "proj-tb200" },
    update: { tenantId: spandsons.id },
    create: {
      id: "proj-tb200",
      tenantId: spandsons.id,
      name: "EV High-Voltage Bus Bar Relay Interface",
      description: "800V DC electric vehicle battery pack contactor and relay interconnect drawing verification.",
      customer: "Tesla Powertrain Engineering",
      standard: "IPC/WHMA-A-620D",
      status: "ACTIVE",
    },
  });

  // 2. Isolated Second Tenant (Acme Aerospace) for testing isolation
  const acme = await db.tenant.upsert({
    where: { slug: "acme-aerospace" },
    update: {
      name: "Acme Aerospace Inc.",
      status: "ACTIVE",
      plan: "MID_TIER",
      checkQuota: 50,
      quotaUsed: 5,
    },
    create: {
      id: "tenant-acme-aerospace-9999",
      name: "Acme Aerospace Inc.",
      slug: "acme-aerospace",
      status: "ACTIVE",
      plan: "MID_TIER",
      checkQuota: 50,
      quotaUsed: 5,
    },
  });

  const aliceHash = await hashPassword(TEST_PASSWORDS.alice);
  await db.user.upsert({
    where: { email: "alice@acme-aero.com" },
    update: {
      name: "Alice Vance",
      role: "ADMIN",
      status: "ACTIVE",
      passwordHash: aliceHash,
      tenantId: acme.id,
    },
    create: {
      id: "usr-alice-acme-1111",
      email: "alice@acme-aero.com",
      name: "Alice Vance",
      role: "ADMIN",
      status: "ACTIVE",
      passwordHash: aliceHash,
      tenantId: acme.id,
    },
  });

  await db.project.upsert({
    where: { id: "proj-acme-satellite" },
    update: { tenantId: acme.id },
    create: {
      id: "proj-acme-satellite",
      tenantId: acme.id,
      name: "Acme Satellite Solar Array Bus",
      description: "Private satellite solar array power bus harness.",
      customer: "Acme Space Systems",
      standard: "ISO 7200",
      status: "ACTIVE",
    },
  });

  console.log(`[SEED] Completed. Seeded Tenants: Spandsons (${spandsons.id}), Acme (${acme.id})`);
}

if (require.main === module || process.argv[1]?.endsWith("seed.ts")) {
  runSeed()
    .catch((e) => {
      console.error("[SEED ERROR]", e);
      process.exit(1);
    })
    .finally(async () => {
      await db.$disconnect();
    });
}
