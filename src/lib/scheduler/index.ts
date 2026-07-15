// Registers the daily version-switch cron job at UTC midnight.
// Guarded to the nodejs server runtime (not edge, not build collection).

import cron from "node-cron";
import { runDailyVersionSwitch } from "./dailyVersionSwitch";

let registered = false;

export function registerScheduler(): void {
  if (registered) return;
  registered = true;
  try {
    // 03:07 UTC — an off-the-minute time (avoids the 00:00 fleet spike); still
    // runs once per UTC day. Adjust to "0 0 * * *" for exact UTC midnight.
    cron.schedule(
      "7 3 * * *",
      () => {
        runDailyVersionSwitch().catch((e) => {
          // eslint-disable-next-line no-console
          console.error("[scheduler] daily switch failed:", e);
        });
      },
      { timezone: "UTC" },
    );
    // eslint-disable-next-line no-console
    console.log("[scheduler] registered daily version switch (03:07 UTC)");
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("[scheduler] failed to register:", e);
  }
}

export { runDailyVersionSwitch } from "./dailyVersionSwitch";
