import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Badge } from "@/components/ui";
import { toIsoDate } from "@/lib/datetime";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const [orgs, positions, employees, contracts, legalEntities, contractTypes, stateRows] =
    await Promise.all([
      prisma.adhrsOrganizations.count(),
      prisma.adhrsPositions.count(),
      prisma.adhrsEmployees.count(),
      prisma.adhrs_contract.count({ where: { deletedAt: null } }),
      prisma.adhrs_legal_entity.count({ where: { deletedAt: null } }),
      prisma.adhrs_hrs_contract_type.count({ where: { deletedAt: null } }),
      prisma.adhrs_system_state.findMany({ orderBy: { state_key: "asc" } }),
    ]);

  const stats = [
    { label: "Organizations", value: orgs, href: "/organizations", tone: "indigo" as const },
    { label: "Positions", value: positions, href: "/positions", tone: "indigo" as const },
    { label: "Employees", value: employees, href: "/employees", tone: "green" as const },
    { label: "Contracts", value: contracts, href: "/contracts", tone: "amber" as const },
    { label: "Legal Entities", value: legalEntities, href: "/legal-entities", tone: "neutral" as const },
    { label: "Contract Types", value: contractTypes, href: "/contract-types", tone: "neutral" as const },
  ];

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="HRS reproduction — main + version pattern, code generation, contract→CMS, daily schedule."
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {stats.map((s) => (
          <Link key={s.label} href={s.href}>
            <Card className="transition-shadow hover:shadow-md">
              <div className="text-xs font-medium uppercase tracking-wider text-muted">
                {s.label}
              </div>
              <div className="mt-1 text-3xl font-semibold">{s.value}</div>
            </Card>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Code-generation state</h3>
            <Link href="/system-state" className="text-xs text-accent hover:underline">
              Manage →
            </Link>
          </div>
          <p className="mb-3 text-xs text-muted">
            Persisted in <code className="rounded bg-slate-100 px-1">adhrs_system_state</code>. The last
            code/seq per prefix is the baseline for the next generated number.
          </p>
          <div className="space-y-2">
            {stateRows.length === 0 && <div className="text-sm text-muted">No state yet.</div>}
            {stateRows.map((r) => (
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

        <Card>
          <h3 className="mb-3 text-sm font-semibold">What this reproduces</h3>
          <ul className="space-y-2 text-sm text-muted">
            <li>• <span className="text-foreground">Main + Version</span> tables for employee / org / position / bank / social-security, switched by <code className="rounded bg-slate-100 px-1">effectiveDate</code>.</li>
            <li>• <span className="text-foreground">Code generation</span>: orgCode / positionCode / employeeCode / contractNo via the KV store.</li>
            <li>• <span className="text-foreground">Pre-checks</span>: email/ID/contract-no/register-no uniqueness, last-version-delete protection, effectiveDate duplication.</li>
            <li>• <span className="text-foreground">Contract → CMS</span> push (stubbed adapter) with UUID mapping tables.</li>
            <li>• <span className="text-foreground">Daily schedule</span> at the UTC day boundary switches current versions.</li>
          </ul>
          <div className="mt-4 text-xs text-muted">Server date (UTC): {toIsoDate(new Date())}</div>
        </Card>
      </div>
    </div>
  );
}
