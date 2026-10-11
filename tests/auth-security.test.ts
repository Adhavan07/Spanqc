import "./setup";
import { POST as loginHandler } from "../src/app/api/v1/auth/login/route";
import { GET as getMeHandler } from "../src/app/api/v1/auth/me/route";
import { POST as logoutHandler } from "../src/app/api/v1/auth/logout/route";
import { GET as getOrgHandler } from "../src/app/api/v1/organizations/me/route";
import { GET as getProjectsHandler, POST as createProjectHandler } from "../src/app/api/v1/projects/route";
import { proxy } from "../src/proxy";
import { NextRequest } from "next/server";
import { db } from "../src/lib/server/db";
import { TEST_PASSWORDS, runSeed } from "../prisma/seed";
import { SESSION_COOKIE_NAME, signSessionToken } from "../src/lib/server/auth/session";
import { provisionAdmin, validateEmail, validateOrgName } from "../scripts/provision-admin";
import { verifyPassword } from "../src/lib/server/auth/passwords";

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`  FAIL: ${message}`);
    failedCount++;
    throw new Error(`Assertion failed: ${message}`);
  } else {
    console.log(`  PASS: ${message}`);
    passedCount++;
  }
}

async function runTestSuite() {
  console.log("================================================================================");
  console.log("SPANQC PHASE 1 SECURITY & MULTI-TENANT TEST SUITE");
  console.log("================================================================================");

  // Reset and seed dedicated test database to guarantee clean test state
  await db.session.deleteMany();
  await db.project.deleteMany();
  await db.user.deleteMany();
  await db.tenant.deleteMany();
  await runSeed();

  // ----------------------------------------------------------------------------
  // Test 1: Invalid Login without Password
  // ----------------------------------------------------------------------------
  console.log("\n[TEST 1] Login rejects request with missing password");
  {
    const req = new Request("http://localhost:3000/api/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "pravin@spandsons.com" }),
    });
    const res = await loginHandler(req);
    assert(res.status === 400, "Returns HTTP 400 Bad Request when password is missing");
  }

  // ----------------------------------------------------------------------------
  // Test 2: Invalid Login with Wrong Password
  // ----------------------------------------------------------------------------
  console.log("\n[TEST 2] Login rejects request with invalid password");
  {
    const req = new Request("http://localhost:3000/api/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "pravin@spandsons.com", password: "wrong_password_999!" }),
    });
    const res = await loginHandler(req);
    assert(res.status === 401, "Returns HTTP 401 Unauthorized for incorrect password");
    const json = await res.json();
    assert(json.detail === "Invalid email or password.", "Returns generic error without leaking password status");
  }

  // ----------------------------------------------------------------------------
  // Test 3: Unknown User is Rejected (No Automatic Admin Account Creation)
  // ----------------------------------------------------------------------------
  console.log("\n[TEST 3] Unknown user is rejected and never auto-created as admin");
  {
    const strangerEmail = "attacker_99@evil.corp";
    const req = new Request("http://localhost:3000/api/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: strangerEmail, password: "any_password" }),
    });
    const res = await loginHandler(req);
    assert(res.status === 401, "Returns HTTP 401 Unauthorized for unknown user");

    const userInDb = await db.user.findUnique({ where: { email: strangerEmail } });
    assert(userInDb === null, "Verified user was NOT created in the database");
  }

  // ----------------------------------------------------------------------------
  // Test 4: Successful Valid Login & HttpOnly Cookie Security Flags
  // ----------------------------------------------------------------------------
  console.log("\n[TEST 4] Valid login succeeds and sets HttpOnly, SameSite=Lax cookie");
  let pravinCookieHeader = "";
  let pravinToken = "";
  {
    const req = new Request("http://localhost:3000/api/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "pravin@spandsons.com", password: TEST_PASSWORDS.pravin }),
    });
    const res = await loginHandler(req);
    assert(res.status === 200, "Returns HTTP 200 OK for valid credentials");

    const cookie = res.cookies.get(SESSION_COOKIE_NAME);
    assert(cookie !== undefined, "Cookie spanqc_session was set in response");
    assert(cookie?.httpOnly === true, "Cookie has httpOnly = true");
    assert(cookie?.sameSite === "lax", "Cookie has sameSite = 'lax'");
    assert(cookie?.path === "/", "Cookie has path = '/'");

    pravinToken = cookie?.value || "";
    pravinCookieHeader = `${SESSION_COOKIE_NAME}=${pravinToken}`;
    assert(pravinToken.length > 20, "Session token is valid non-empty string");
  }

  // ----------------------------------------------------------------------------
  // Test 5: Authenticated /api/v1/auth/me with Cookie Session
  // ----------------------------------------------------------------------------
  console.log("\n[TEST 5] Authenticated /api/v1/auth/me returns caller profile");
  {
    const req = new Request("http://localhost:3000/api/v1/auth/me", {
      method: "GET",
      headers: { Cookie: pravinCookieHeader },
    });
    const res = await getMeHandler(req);
    assert(res.status === 200, "Returns HTTP 200 OK with valid session cookie");
    const json = await res.json();
    assert(json.email === "pravin@spandsons.com", "Identifies correct authenticated user");
    assert(json.role === "ADMIN", "Profile reflects database role");
  }

  // ----------------------------------------------------------------------------
  // Test 6: Missing / Invalid Session on /api/v1/auth/me Returns 401 (No Admin Fallback)
  // ----------------------------------------------------------------------------
  console.log("\n[TEST 6] Unauthenticated /api/v1/auth/me returns 401 without defaulting to admin");
  {
    // Request with no cookie
    const reqNoCookie = new Request("http://localhost:3000/api/v1/auth/me", { method: "GET" });
    const resNoCookie = await getMeHandler(reqNoCookie);
    assert(resNoCookie.status === 401, "Returns HTTP 401 when unauthenticated");

    // Request with forged/tampered token
    const reqForged = new Request("http://localhost:3000/api/v1/auth/me", {
      method: "GET",
      headers: { Cookie: `${SESSION_COOKIE_NAME}=forged.token.here` },
    });
    const resForged = await getMeHandler(reqForged);
    assert(resForged.status === 401, "Returns HTTP 401 when token signature is invalid");
  }

  // ----------------------------------------------------------------------------
  // Test 7: Expired Session Enforcement
  // ----------------------------------------------------------------------------
  console.log("\n[TEST 7] Expired session token is rejected with 401");
  {
    const expiredPayload = {
      userId: "usr-expired-test",
      tenantId: "tenant-expired-test",
      role: "ENGINEER",
      email: "expired@test.com",
      sessionId: "sess-expired-id",
      exp: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
    };
    const expiredToken = signSessionToken(expiredPayload);

    const reqExpired = new Request("http://localhost:3000/api/v1/auth/me", {
      method: "GET",
      headers: { Cookie: `${SESSION_COOKIE_NAME}=${expiredToken}` },
    });
    const resExpired = await getMeHandler(reqExpired);
    assert(resExpired.status === 401, "Returns HTTP 401 when session expiration has passed");
  }

  // ----------------------------------------------------------------------------
  // Test 8: Logout Invalidation
  // ----------------------------------------------------------------------------
  console.log("\n[TEST 8] Logout revokes server session in DB and clears cookie");
  {
    // 1. Call logout
    const reqLogout = new Request("http://localhost:3000/api/v1/auth/logout", {
      method: "POST",
      headers: { Cookie: pravinCookieHeader },
    });
    const resLogout = await logoutHandler(reqLogout);
    assert(resLogout.status === 200, "Logout returns HTTP 200 OK");

    // 2. Validate token is now rejected
    const reqAfterLogout = new Request("http://localhost:3000/api/v1/auth/me", {
      method: "GET",
      headers: { Cookie: pravinCookieHeader },
    });
    const resAfterLogout = await getMeHandler(reqAfterLogout);
    assert(resAfterLogout.status === 401, "Session is revoked in database and rejected on subsequent calls");
  }

  // ----------------------------------------------------------------------------
  // Test 9: Server-Side Proxy Enforcement
  // ----------------------------------------------------------------------------
  console.log("\n[TEST 9] Server-side proxy blocks unauthenticated web and API traffic");
  {
    // Log in again to get fresh valid token
    const loginReq = new Request("http://localhost:3000/api/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "pravin@spandsons.com", password: TEST_PASSWORDS.pravin }),
    });
    const loginRes = await loginHandler(loginReq);
    const freshToken = loginRes.cookies.get(SESSION_COOKIE_NAME)!.value;

    // Test unauthenticated API request to proxy
    const proxyReqApiUnauth = new NextRequest("http://localhost:3000/api/v1/projects");
    const proxyResApiUnauth = proxy(proxyReqApiUnauth);
    assert(proxyResApiUnauth.status === 401, "Proxy returns HTTP 401 for unauthenticated API routes");

    // Test unauthenticated Web request to proxy
    const proxyReqWebUnauth = new NextRequest("http://localhost:3000/app/check");
    const proxyResWebUnauth = proxy(proxyReqWebUnauth);
    assert(proxyResWebUnauth.status === 307, "Proxy redirects unauthenticated web requests to /login");
    assert(
      proxyResWebUnauth.headers.get("location")?.includes("/login") === true,
      "Redirect target is /login"
    );

    // Test authenticated API request to proxy
    const proxyReqApiAuth = new NextRequest("http://localhost:3000/api/v1/projects", {
      headers: { Cookie: `${SESSION_COOKIE_NAME}=${freshToken}` },
    });
    const proxyResApiAuth = proxy(proxyReqApiAuth);
    assert(proxyResApiAuth.status === 200, "Proxy allows authenticated requests to proceed");
    assert(
      proxyResApiAuth.headers.get("x-user-id") !== null,
      "Proxy injects verified x-user-id header into downstream context"
    );
  }

  // ----------------------------------------------------------------------------
  // Test 10: Strict Multi-Tenant Isolation
  // ----------------------------------------------------------------------------
  console.log("\n[TEST 10] Multi-tenant isolation: Tenant A cannot see Tenant B projects");
  {
    // 1. Log in as Tenant A (Pravin @ Spandsons Horizon)
    const loginSpandsons = await loginHandler(
      new Request("http://localhost:3000/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "pravin@spandsons.com", password: TEST_PASSWORDS.pravin }),
      })
    );
    const spandsonsCookie = `${SESSION_COOKIE_NAME}=${loginSpandsons.cookies.get(SESSION_COOKIE_NAME)!.value}`;

    // 2. Log in as Tenant B (Alice @ Acme Aerospace)
    const loginAcme = await loginHandler(
      new Request("http://localhost:3000/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "alice@acme-aero.com", password: TEST_PASSWORDS.alice }),
      })
    );
    const acmeCookie = `${SESSION_COOKIE_NAME}=${loginAcme.cookies.get(SESSION_COOKIE_NAME)!.value}`;

    // Query projects as Spandsons
    const spandsonsProjectsRes = await getProjectsHandler(
      new Request("http://localhost:3000/api/v1/projects", {
        method: "GET",
        headers: { Cookie: spandsonsCookie },
      })
    );
    const spandsonsProjects = await spandsonsProjectsRes.json();

    // Query projects as Acme
    const acmeProjectsRes = await getProjectsHandler(
      new Request("http://localhost:3000/api/v1/projects", {
        method: "GET",
        headers: { Cookie: acmeCookie },
      })
    );
    const acmeProjects = await acmeProjectsRes.json();

    // Verification
    assert(Array.isArray(spandsonsProjects), "Spandsons received projects list");
    assert(Array.isArray(acmeProjects), "Acme received projects list");

    const spandsonsHasAcme = spandsonsProjects.some((p: { name: string }) => p.name.includes("Acme"));
    const acmeHasSpandsons = acmeProjects.some((p: { name: string }) => p.name.includes("Avionics") || p.name.includes("VFD"));

    assert(!spandsonsHasAcme, "Tenant Spandsons CANNOT see Acme Aerospace projects");
    assert(!acmeHasSpandsons, "Tenant Acme CANNOT see Spandsons Horizon projects");

    // Query organization as Acme
    const acmeOrgRes = await getOrgHandler(
      new Request("http://localhost:3000/api/v1/organizations/me", {
        method: "GET",
        headers: { Cookie: acmeCookie },
      })
    );
    const acmeOrg = await acmeOrgRes.json();
    assert(acmeOrg.name === "Acme Aerospace Inc.", "Acme user receives Acme organization details only");
  }

  // ----------------------------------------------------------------------------
  // Test 11: Administrator Provisioning Safety & Guard Enforcement
  // ----------------------------------------------------------------------------
  console.log("\n[TEST 11] Administrator provisioning safety, validation, and override guards");
  const testOverrideEmail = "fixture.override.engineer@spandsons.com";
  const testNewAdminEmail = "fixture.new.admin@spandsons.com";

  try {
    // A. Input validation: invalid email format
    let invalidEmailCaught = false;
    try {
      await provisionAdmin({ email: "invalid-email-string" });
    } catch (err: unknown) {
      invalidEmailCaught = err instanceof Error && err.message.includes("Invalid email address format");
    }
    assert(invalidEmailCaught, "Provisioning rejects malformed email address format");

    // B. Input validation: invalid organization name
    let invalidOrgCaught = false;
    try {
      await provisionAdmin({ email: "valid.ops@spandsons.com", orgName: " " });
    } catch (err: unknown) {
      invalidOrgCaught = err instanceof Error && err.message.includes("Invalid organization name");
    }
    assert(invalidOrgCaught, "Provisioning rejects whitespace-only or empty organization name");

    // C. Safety guard: existing administrator must never be overwritten without explicit authorization
    // Assert expected refusal using the isolated known admin account (pravin@spandsons.com).
    // Do NOT use --force to bypass this safety check; verify the existing admin remains untouched.
    const adminBefore = await db.user.findUnique({
      where: { email: "pravin@spandsons.com" },
    });
    assert(adminBefore !== null && adminBefore.role === "ADMIN", "Known test admin exists with role ADMIN prior to test");

    let adminRefusalCaught = false;
    try {
      await provisionAdmin({
        email: "pravin@spandsons.com",
        orgName: "Hostile Takeover Org",
        name: "Imposter Admin",
        password: "MaliciousPassword123!",
        force: false,
      });
    } catch (err: unknown) {
      adminRefusalCaught = err instanceof Error && err.message.includes("Safety Guard");
    }
    assert(adminRefusalCaught, "Provisioning refuses to modify existing administrator without --force flag");

    // Verify existing administrator was NOT mutated or overwritten
    const adminAfterRefusal = await db.user.findUnique({
      where: { email: "pravin@spandsons.com" },
    });
    assert(adminAfterRefusal !== null, "Administrator record is intact");
    assert(adminAfterRefusal?.role === "ADMIN", "Administrator role remained ADMIN");
    assert(adminAfterRefusal?.name === adminBefore?.name, "Administrator name remained completely unchanged");
    assert(adminAfterRefusal?.passwordHash === adminBefore?.passwordHash, "Administrator password hash remained completely unchanged");
    assert(adminAfterRefusal?.tenantId === adminBefore?.tenantId, "Administrator tenant remained completely unchanged");

    // D. Controlled update with explicit --force using an isolated test fixture account
    // Create dedicated fixture account (role: ENGINEER) to test elevation and credential update
    const tenantSpandsons = await db.tenant.findUnique({ where: { slug: "spandsons-horizon" } });
    assert(tenantSpandsons !== null, "Tenant Spandsons Horizon exists");

    await db.user.upsert({
      where: { email: testOverrideEmail },
      update: { role: "ENGINEER", status: "ACTIVE" },
      create: {
        email: testOverrideEmail,
        name: "Fixture Engineer",
        passwordHash: "$scrypt$initial",
        role: "ENGINEER",
        status: "ACTIVE",
        tenantId: tenantSpandsons!.id,
      },
    });

    // Verify refusal on the fixture user without --force
    let fixtureRefusalCaught = false;
    try {
      await provisionAdmin({
        email: testOverrideEmail,
        force: false,
      });
    } catch (err: unknown) {
      fixtureRefusalCaught = err instanceof Error && err.message.includes("Safety Guard");
    }
    assert(fixtureRefusalCaught, "Provisioning refuses to modify fixture account without --force flag");

    // Elevate with explicit --force
    const forcedResult = await provisionAdmin({
      email: testOverrideEmail,
      password: "UpdatedAdminPassword@2026!",
      force: true,
    });
    assert(forcedResult.action === "updated", "Provisioning reports action: 'updated' when --force is supplied");
    assert(forcedResult.role === "ADMIN", "Returned role reflects elevation to ADMIN");

    const elevatedDbUser = await db.user.findUnique({
      where: { email: testOverrideEmail },
    });
    assert(elevatedDbUser?.role === "ADMIN", "Database record reflects elevated ADMIN role");
    const isNewPasswordValid = await verifyPassword("UpdatedAdminPassword@2026!", elevatedDbUser!.passwordHash);
    assert(isNewPasswordValid, "Updated password authenticates against new database hash");

    // E. Provision new administrator with generated credentials
    const newAdminResult = await provisionAdmin({
      email: testNewAdminEmail,
      name: "Operations Lead",
      orgName: "Spandsons Horizon Engineering Pvt. Ltd.",
    });
    assert(newAdminResult.action === "created", "Provisioning reports action: 'created' for new administrator");
    assert(
      typeof newAdminResult.generatedPassword === "string" && newAdminResult.generatedPassword.length >= 20,
      "Secure temporary password was generated for new administrator"
    );

    const createdDbUser = await db.user.findUnique({
      where: { email: testNewAdminEmail },
    });
    assert(createdDbUser !== null && createdDbUser.role === "ADMIN", "New administrator user created in database");
    const isGenPassValid = await verifyPassword(newAdminResult.generatedPassword!, createdDbUser!.passwordHash);
    assert(isGenPassValid, "Generated temporary password verifies against stored salted hash");
  } finally {
    // Ensure cleanup runs in finally block so test failures do not leave inconsistent test data
    try {
      await db.user.deleteMany({
        where: {
          email: {
            in: [testOverrideEmail, testNewAdminEmail],
          },
        },
      });
      await runSeed();
    } catch (cleanErr) {
      console.warn("[CLEANUP WARNING]", cleanErr);
    }
  }

  console.log("\n================================================================================");
  console.log(`TEST SUITE COMPLETE: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log("================================================================================");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTestSuite()
  .catch((err) => {
    console.error("[FATAL ERROR IN TEST SUITE]", err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
