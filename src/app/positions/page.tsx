import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Badge, Button } from "@/components/ui";
import { toIsoDate, toMidnightUtc } from "@/lib/datetime";
import { deletePositionAction } from "./actions";

export const dynamic = "force-dynamic";

type PositionWithVersions = Awaited<ReturnType<typeof loadPositions>>[number];
type PositionVersion = PositionWithVersions["versions"][number];

async function loadPositions() {
  return prisma.adhrsPositions.findMany({
    where: { deletedAt: null },
    include: {
      versions: {
        where: { deletedAt: null },
        orderBy: [{ effectiveDate: "asc" }, { id: "asc" }],
      },
      _count: { select: { versions: true } },
    },
    orderBy: { code: "asc" },
  });
}

function pickVersionAt(versions: PositionVersion[], asOf: Date): PositionVersion | null {
  const asOfMs = asOf.getTime();
  let selected: PositionVersion | null = null;

  for (const version of versions) {
    const effectiveMs = version.effectiveDate.getTime();
    if (effectiveMs > asOfMs) continue;
    const expirationMs = version.expirationDate?.getTime();
    if (expirationMs !== undefined && expirationMs < asOfMs) continue;
    if (!selected || effectiveMs > selected.effectiveDate.getTime()) {
      selected = version;
    }
  }

  return selected;
}

async function deletePositionFromList(fd: FormData): Promise<void> {
  "use server";
  await deletePositionAction({ error: null }, fd);
}

export default async function PositionsPage() {
  const asOfDate = toMidnightUtc(new Date());
  const positions = await loadPositions();
  const rows = positions.map((position) => ({
    position,
    version: pickVersionAt(position.versions, asOfDate),
  }));
  const orgIds = [
    ...new Set(rows.map((row) => row.version?.orgId).filter((id): id is number => id != null)),
  ];
  const orgs = orgIds.length
    ? await prisma.adhrsOrganizations.findMany({ where: { id: { in: orgIds }, deletedAt: null } })
    : [];
  const orgName = (id: number | null) => orgs.find((o) => o.id === id)?.orgName ?? "—";

  return (
    <div>
      <PageHeader
        title="Positions"
        subtitle="Master table with version history. Codes use the job-level letter (e.g. L0001)."
        action={
          <Link href="/positions/new">
            <Button>+ New position</Button>
          </Link>
        }
      />

      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-muted">
              <th className="px-4 py-3 font-medium">Code</th>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Level</th>
              <th className="px-4 py-3 font-medium">Org</th>
              <th className="px-4 py-3 font-medium">Effective</th>
              <th className="px-4 py-3 font-medium">Versions</th>
              <th className="px-4 py-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {positions.length === 0 && (
              <tr>
                <td className="px-4 py-8 text-center text-muted" colSpan={7}>
                  No positions yet. {" "}
                  <Link href="/positions/new" className="text-accent hover:underline">Create one →</Link>
                </td>
              </tr>
            )}
            {rows.map(({ position, version }) => (
              <tr key={position.id} className="trow border-b border-line/60">
                <td className="px-4 py-2.5"><Badge tone="indigo">{position.code}</Badge></td>
                <td className="px-4 py-2.5 font-medium">{version?.positionName ?? position.positionName}</td>
                <td className="px-4 py-2.5">{version?.job_level ?? "—"}</td>
                <td className="px-4 py-2.5 text-muted">{orgName(version?.orgId ?? null)}</td>
                <td className="px-4 py-2.5 text-muted">
                  {version ? toIsoDate(version.effectiveDate) : "—"}
                </td>
                <td className="px-4 py-2.5 text-muted">{position._count.versions}</td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2 text-muted">
                    <Link
                      href={`/positions/${position.id}${version ? `?version=${version.id}` : ""}`}
                      className="text-accent hover:underline text-xs"
                    >
                      编辑
                    </Link>
                    <form action={deletePositionFromList} className="inline">
                      <input type="hidden" name="positionId" value={position.id} />
                      <Button
                        type="submit"
                        variant="ghost"
                        className="h-auto px-0 py-0 text-xs text-red-600 hover:bg-transparent hover:underline"
                      >
                        删除
                      </Button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
