import { reclaimStaleJobs, processPendingQueuedJobs } from "./job-bridge";

export interface SchedulerConfig {
  pollIntervalMs?: number; // How often to check for QUEUED jobs (default: 3000ms)
  recoveryIntervalMs?: number; // How often to run reclaimStaleJobs (default: 30000ms)
  staleThresholdMs?: number; // Cutoff for considering a job stale (default: 120000ms)
  batchSize?: number; // Max jobs to process per poll (default: 5)
}

export interface SchedulerState {
  isRunning: boolean;
  timer: NodeJS.Timeout | null;
  lastQueueCheckAt: Date | null;
  lastRecoveryAt: Date | null;
  isExecuting: boolean;
  totalReclaimed: number;
  totalExhausted: number;
  totalProcessed: number;
}

const DEFAULT_POLL_INTERVAL_MS = 3_000;
const DEFAULT_RECOVERY_INTERVAL_MS = 30_000;
const DEFAULT_STALE_THRESHOLD_MS = 120_000;
const DEFAULT_BATCH_SIZE = 5;

// Singleton state attached to globalThis to survive HMR in development mode
const globalScheduler = globalThis as unknown as {
  __spanqc_scheduler_state__?: SchedulerState;
};

export function getSchedulerState(): SchedulerState {
  if (!globalScheduler.__spanqc_scheduler_state__) {
    globalScheduler.__spanqc_scheduler_state__ = {
      isRunning: false,
      timer: null,
      lastQueueCheckAt: null,
      lastRecoveryAt: null,
      isExecuting: false,
      totalReclaimed: 0,
      totalExhausted: 0,
      totalProcessed: 0,
    };
  }
  return globalScheduler.__spanqc_scheduler_state__;
}

/**
 * Runs a single tick of the scheduler.
 * Safe against concurrent invocations within the same process.
 */
export async function runSchedulerTick(options: {
  staleThresholdMs?: number;
  batchSize?: number;
  forceRecovery?: boolean;
  processQueued?: boolean;
} = {}): Promise<{
  reclaimedCount: number;
  exhaustedCount: number;
  processedCount: number;
}> {
  const state = getSchedulerState();
  if (state.isExecuting) {
    return { reclaimedCount: 0, exhaustedCount: 0, processedCount: 0 };
  }

  state.isExecuting = true;
  let reclaimedCount = 0;
  let exhaustedCount = 0;
  let processedCount = 0;

  try {
    const now = new Date();
    const staleThresholdMs = options.staleThresholdMs ?? DEFAULT_STALE_THRESHOLD_MS;
    const batchSize = options.batchSize ?? DEFAULT_BATCH_SIZE;

    // Run recovery if forced, or if recovery interval elapsed (default 30s)
    const shouldRunRecovery =
      options.forceRecovery ||
      !state.lastRecoveryAt ||
      now.getTime() - state.lastRecoveryAt.getTime() >= DEFAULT_RECOVERY_INTERVAL_MS;

    if (shouldRunRecovery) {
      const recoveryResult = await reclaimStaleJobs(staleThresholdMs);
      reclaimedCount = recoveryResult.reclaimedCount;
      exhaustedCount = recoveryResult.exhaustedCount;
      state.totalReclaimed += reclaimedCount;
      state.totalExhausted += exhaustedCount;
      state.lastRecoveryAt = now;
      if (reclaimedCount > 0 || exhaustedCount > 0) {
        console.log(
          `[QC_SCHEDULER_RECOVERY] Reclaimed: ${reclaimedCount}, Exhausted: ${exhaustedCount}`
        );
      }
    }

    // Process queued jobs (including those just reclaimed)
    const shouldProcessQueued = options.processQueued ?? true;
    if (shouldProcessQueued) {
      processedCount = await processPendingQueuedJobs(batchSize);
      state.totalProcessed += processedCount;
      state.lastQueueCheckAt = now;
    }
  } catch (err) {
    console.error("[QC_SCHEDULER_ERROR] Error during scheduler tick:", err);
  } finally {
    state.isExecuting = false;
  }

  return { reclaimedCount, exhaustedCount, processedCount };
}

/**
 * Starts the background single-instance QC scheduler.
 */
export function startQCScheduler(config: SchedulerConfig = {}): void {
  const state = getSchedulerState();
  if (state.isRunning) {
    return; // Already running
  }

  const pollIntervalMs = config.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const staleThresholdMs = config.staleThresholdMs ?? DEFAULT_STALE_THRESHOLD_MS;
  const batchSize = config.batchSize ?? DEFAULT_BATCH_SIZE;

  state.isRunning = true;
  console.log(
    `[QC_SCHEDULER_STARTED] Background worker & recovery loop active (poll: ${pollIntervalMs}ms, stale threshold: ${staleThresholdMs}ms).`
  );

  // Run immediate recovery & queue check on startup
  runSchedulerTick({ staleThresholdMs, batchSize, forceRecovery: true }).catch((err) => {
    console.error("[QC_SCHEDULER_STARTUP_ERROR] Initial tick failed:", err);
  });

  // Schedule recurring interval
  state.timer = setInterval(() => {
    runSchedulerTick({ staleThresholdMs, batchSize }).catch((err) => {
      console.error("[QC_SCHEDULER_INTERVAL_ERROR] Tick failed:", err);
    });
  }, pollIntervalMs);

  // Attach graceful process shutdown listeners once
  const shutdownHandler = () => {
    stopQCScheduler();
  };

  process.once("SIGTERM", shutdownHandler);
  process.once("SIGINT", shutdownHandler);
}

/**
 * Stops the QC scheduler and clears intervals.
 */
export function stopQCScheduler(): void {
  const state = getSchedulerState();
  if (state.timer) {
    clearInterval(state.timer);
    state.timer = null;
  }
  state.isRunning = false;
  console.log("[QC_SCHEDULER_STOPPED] Background worker & recovery loop stopped.");
}
