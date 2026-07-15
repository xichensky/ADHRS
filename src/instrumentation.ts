// Next.js instrumentation — registers the daily cron job at server start.
// Loaded only in the nodejs runtime (dynamic import keeps node-cron out of the
// edge bundle and the build collect phase).
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { registerScheduler } = await import("./lib/scheduler");
    registerScheduler();
  }
}
