-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "plan" TEXT NOT NULL DEFAULT 'SUBSCRIPTION',
    "checkQuota" INTEGER NOT NULL DEFAULT 120,
    "quotaUsed" INTEGER NOT NULL DEFAULT 38,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "role" TEXT NOT NULL DEFAULT 'ENGINEER',
    "tenantId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "users_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "organizations" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "sessions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "organizations" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "customer" TEXT,
    "standard" TEXT NOT NULL DEFAULT 'IPC/WHMA-A-620D',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "projects_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "organizations" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "qc_jobs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "idempotencyKey" TEXT,
    "documentName" TEXT NOT NULL,
    "documentSha256" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "standard" TEXT NOT NULL DEFAULT 'IPC/WHMA-A-620D',
    "expectedNetlistJson" TEXT,
    "specificationIsComplete" BOOLEAN,
    "extractionIsVerified" BOOLEAN,
    "scopeDescription" TEXT,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "overallOutcome" TEXT,
    "totalPageCount" INTEGER NOT NULL DEFAULT 1,
    "processedPageCount" INTEGER NOT NULL DEFAULT 0,
    "failedPageCount" INTEGER NOT NULL DEFAULT 0,
    "unprocessedPages" TEXT,
    "failedPages" TEXT,
    "resultReportJson" TEXT,
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 2,
    "claimToken" TEXT,
    "claimedAt" DATETIME,
    "quotaRefunded" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "qc_jobs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "organizations" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "qc_jobs_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "qc_job_reviews" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "decision" TEXT NOT NULL,
    "notes" TEXT,
    "observationDecisions" TEXT,
    "idempotencyKey" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "qc_job_reviews_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "qc_jobs" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "qc_job_reviews_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "organizations" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "qc_job_reviews_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_tenantId_idx" ON "users"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_tokenHash_key" ON "sessions"("tokenHash");

-- CreateIndex
CREATE INDEX "sessions_tokenHash_idx" ON "sessions"("tokenHash");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE INDEX "sessions_tenantId_idx" ON "sessions"("tenantId");

-- CreateIndex
CREATE INDEX "projects_tenantId_idx" ON "projects"("tenantId");

-- CreateIndex
CREATE INDEX "qc_jobs_tenantId_idx" ON "qc_jobs"("tenantId");

-- CreateIndex
CREATE INDEX "qc_jobs_projectId_idx" ON "qc_jobs"("projectId");

-- CreateIndex
CREATE INDEX "qc_jobs_status_idx" ON "qc_jobs"("status");

-- CreateIndex
CREATE INDEX "qc_jobs_status_claimedAt_idx" ON "qc_jobs"("status", "claimedAt");

-- CreateIndex
CREATE UNIQUE INDEX "qc_jobs_tenantId_idempotencyKey_key" ON "qc_jobs"("tenantId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "qc_job_reviews_jobId_idx" ON "qc_job_reviews"("jobId");

-- CreateIndex
CREATE INDEX "qc_job_reviews_tenantId_idx" ON "qc_job_reviews"("tenantId");

-- CreateIndex
CREATE INDEX "qc_job_reviews_reviewerId_idx" ON "qc_job_reviews"("reviewerId");

-- CreateIndex
CREATE INDEX "qc_job_reviews_jobId_createdAt_idx" ON "qc_job_reviews"("jobId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "qc_job_reviews_jobId_version_key" ON "qc_job_reviews"("jobId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "qc_job_reviews_jobId_idempotencyKey_key" ON "qc_job_reviews"("jobId", "idempotencyKey");

