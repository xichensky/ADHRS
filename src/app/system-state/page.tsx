import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Badge } from "@/components/ui";
import { RunSwitchButton } from "./RunSwitchButton";

export const dynamic = "force-dynamic";

export default async function SystemStatePage() {
  const rows = await prisma.adhrs_system_state.findMany({ orderBy: { state_key: "asc" } });

  return (
    <div>
      <PageHeader
        title="System state"
        subtitle="The adhrs_system_state KV store is the authoritative source for code generation."
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_24rem]">
        <Card>
          <h3 className="mb-3 text-sm font-semibold">Keys</h3>
          <div className="space-y-3">
            {rows.length === 0 && <div className="text-sm text-muted">No state yet.</div>}
            {rows.map((r) => (
              <div key={r.id} className="rounded-lg border border-line bg-slate-50/60 p-3">
                <div className="mb-1 flex items-center gap-2">
                  <Badge tone="indigo">{r.state_key}</Badge>
                </div>
                <pre className="overflow-x-auto text-xs text-muted">
                  {JSON.stringify(r.state_value, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        </Card>
        <RunSwitchButton />
      </div>
    </div>
  );
}
