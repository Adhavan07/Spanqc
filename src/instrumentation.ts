export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Only start background worker & recovery scheduler if not explicitly disabled
    if (process.env.SPANQC_DISABLE_WORKER !== "true") {
      const { startQCScheduler } = await import("@/lib/server/qc/scheduler");
      startQCScheduler();
    }
  }
}
