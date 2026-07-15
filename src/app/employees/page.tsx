import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Badge, Button, Input, Field } from "@/components/ui";
import { toIsoDate } from "@/lib/datetime";
import { resolveOrgAssignmentAt, resolveBasicInfoAt } from "@/lib/versioning";

export const dynamic = "force-dynamic";

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; asOf?: string }>;
}) {
  const { q, asOf } = await searchParams;
  const qTrim = q?.trim();
  const asOfDate = asOf ? new Date(asOf) : null;
  const useAsOf = !!asOfDate && !Number.isNaN(asOfDate.getTime());

  const employees = await prisma.adhrsEmployees.findMany({
    where: qTrim
      ? { deletedAt: null, OR: [{ name: { contains: qTrim } }, { code: { contains: qTrim } }] }
      : { deletedAt: null },
    orderBy: { code: "asc" },
  });

  // Reconstruct each employee's state at the as-of date (or now). This is the
  // time-axis read path: resolveOrgAssignmentAt / resolveBasicInfoAt pick the
  // version effective on refDate — the same rule the daily scheduler uses.
  const refDate = useAsOf ? asOfDate! : new Date();
  const rows = await Promise.all(
    employees.map(async (employee) => ({
      employee,
      assignment: await resolveOrgAssignmentAt(employee.id, refDate),
      person: await resolveBasicInfoAt(employee.id, refDate),
    })),
  );

  const orgIds = [...new Set(rows.map((r) => r.assignment?.orgId).filter(Boolean))] as number[];
  const posIds = [...new Set(rows.map((r) => r.assignment?.positionId).filter(Boolean))] as number[];
  const [orgs, positions] = await Promise.all([
    orgIds.length ? prisma.adhrsOrganizations.findMany({ where: { id: { in: orgIds }, deletedAt: null } }) : [],
    posIds.length ? prisma.adhrsPositions.findMany({ where: { id: { in: posIds }, deletedAt: null } }) : [],
  ]);
  const orgName = (id: number | null | undefined) => orgs.find((o) => o.id === id)?.orgName ?? "—";
  const posName = (id: number | null | undefined) => positions.find((p) => p.id === id)?.positionName ?? "—";

  return (
    <div>
      <PageHeader
        title="Employees"
        subtitle="Master + version + person profile. Codes are generated from the org prefix."
        action={<Link href="/employees/new"><Button>+ New employee</Button></Link>}
      />

      <form method="get" className="mb-4 flex flex-wrap items-end gap-3">
        <Field label="搜索（姓名 / 工号）">
          <Input name="q" type="search" defaultValue={qTrim ?? ""} />
        </Field>
        <Field label="截至日期（时间轴）">
          <Input name="asOf" type="date" defaultValue={asOf ?? ""} />
        </Field>
        <Button type="submit">搜索</Button>
        {(qTrim || useAsOf) && (
          <a href="?"><Button type="button" variant="subtle">清除</Button></a>
        )}
      </form>

      {useAsOf && (
        <div className="mb-3 rounded-lg bg-indigo-50 px-3 py-2 text-sm text-indigo-700">
          Showing state as of <strong>{toIsoDate(refDate)}</strong>（时间轴重建：每行按当天生效的任职/个人基本信息解析）
        </div>
      )}

      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-muted">
              <th className="px-4 py-3 font-medium">Code</th>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Organization</th>
              <th className="px-4 py-3 font-medium">Position</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Hire date</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td className="px-4 py-8 text-center text-muted" colSpan={7}>
                No employees{qTrim || useAsOf ? " match your search" : " yet"}.{" "}
                <Link href="/employees/new" className="text-accent hover:underline">Create one →</Link>
              </td></tr>
            )}
            {rows.map(({ employee: e, assignment, person }) => (
              <tr key={e.id} className="trow border-b border-line/60">
                <td className="px-4 py-2.5"><Badge tone="indigo">{e.code}</Badge></td>
                <td className="px-4 py-2.5 font-medium">{e.name}</td>
                <td className="px-4 py-2.5 text-muted">{orgName(assignment?.orgId)}</td>
                <td className="px-4 py-2.5 text-muted">{posName(assignment?.positionId)}</td>
                <td className="px-4 py-2.5 text-muted">{person?.email ?? "—"}</td>
                <td className="px-4 py-2.5 text-muted">{toIsoDate(e.hireDate)}</td>
                <td className="px-4 py-2.5 text-right">
                  <Link href={`/employees/${e.id}`} className="text-accent hover:underline">Open →</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
