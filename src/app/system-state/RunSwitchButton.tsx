"use client";

import { useActionState } from "react";
import { Button, Alert, Card } from "@/components/ui";
import { runDailySwitchAction } from "./actions";

export function RunSwitchButton() {
  const [state, action, pending] = useActionState(runDailySwitchAction, {
    error: null,
    result: null,
  });
  return (
    <Card>
      <h3 className="mb-1 text-sm font-semibold">Daily version switch</h3>
      <p className="mb-3 text-xs text-muted">
        Runs the same logic as the scheduled UTC job (03:07 UTC): for every entity with a version
        effective today, recompute its <code className="rounded bg-slate-100 px-1">current_version</code>.
      </p>
      <form action={action}>
        <Button type="submit" disabled={pending}>
          {pending ? "Running…" : "Run now"}
        </Button>
      </form>
      {state.error && <div className="mt-3"><Alert>{state.error}</Alert></div>}
      {state.result && (
        <div className="mt-3 rounded-lg border border-line bg-slate-50/60 p-3 text-xs">
          <div className="mb-1 font-medium text-muted">Ran for {state.result.day} (UTC)</div>
          <div className="grid grid-cols-5 gap-2 text-center">
            <Stat label="Employee" value={state.result.employee} />
            <Stat label="Org" value={state.result.organization} />
            <Stat label="Position" value={state.result.position} />
            <Stat label="Social" value={state.result.socialSecurity} />
            <Stat label="Bank" value={state.result.bankAccount} />
          </div>
          <div className="mt-2 text-muted">entities updated (0 = none effective today).</div>
        </div>
      )}
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-lg font-semibold">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-muted">{label}</div>
    </div>
  );
}
